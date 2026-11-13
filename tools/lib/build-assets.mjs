import { createHash } from 'node:crypto';

export function validateVersion(value) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value)) throw new Error('BUILD_VERSION must be 1-80 letters, digits, dots, underscores or hyphens.');
  return value;
}

export function hashAssetEntries(entries) {
  const hash = createHash('sha256');
  for (const [name, content] of [...entries].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const bytes = Buffer.from(content);
    hash.update(`${name.length}:${name}:${bytes.length}:`);
    hash.update(bytes);
  }
  return hash.digest('hex').slice(0, 16);
}

export function isReleaseInput(name) {
  return /^(?:js|css|img|THSarabunNew|partials)\//.test(name) ||
    /^[^/]+\.(?:html|webmanifest)$/.test(name) || name === 'sw.js' ||
    name === 'tools/build-static.mjs' || name === 'tools/lib/build-assets.mjs';
}

// Keep other query parameters and fragments; never rewrite CDN/API URLs.
export function versionUrl(ref, version) {
  if (!ref || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(ref)) return ref;
  const [beforeHash, ...hashParts] = ref.split('#');
  const [pathname, ...queryParts] = beforeHash.split('?');
  if (!/\.(?:js|css|png|jpe?g|webp|svg|ico|woff2?|ttf)$/i.test(pathname)) return ref;
  const params = new URLSearchParams(queryParts.join('?'));
  params.set('v', validateVersion(version));
  return `${pathname}?${params}${hashParts.length ? '#' + hashParts.join('#') : ''}`;
}

export function versionHtml(source, version) {
  return source
    .replace(/(\b(?:src|href)\s*=\s*)(["'])([^"']+)\2/gi, (_, attr, quote, ref) =>
      `${attr}${quote}${versionUrl(ref.replaceAll('&amp;', '&'), version).replaceAll('&', '&amp;')}${quote}`)
    .replace(/(window\.sgcuAssetVersion\s*=\s*)(["'])[^"']*\2/g, `$1"${validateVersion(version)}"`)
    .replace(/(window\.sgcuServiceWorkerUrl\s*=\s*)(["'])([^"']+)\2/g, (_, prefix, quote, ref) => `${prefix}${quote}${versionUrl(ref, version)}${quote}`);
}

export function versionJavaScript(source, version) {
  // Local ESM dependencies do not inherit their importing module's query string.
  return source.replace(/(\b(?:import|export)\s+(?:(?:[\w$*{},\s]+)\s+from\s*)?|\bimport\s*\(\s*)(["'])(\.{1,2}\/[^"']+\.js(?:\?[^"'#]*)?(?:#[^"']*)?)\2/g,
    (_, prefix, quote, ref) => `${prefix}${quote}${versionUrl(ref, version)}${quote}`);
}

export function versionCss(source, version) {
  return source.replace(/url\(\s*(["']?)([^\s)"']+)\1\s*\)/gi,
    (_, quote, ref) => `url(${quote}${versionUrl(ref, version)}${quote})`);
}

export function versionServiceWorker(source, version) {
  return source
    .replace(/const CACHE_VERSION = ["'][^"']*["'];/, `const CACHE_VERSION = "${validateVersion(version)}";`)
    .replace(/(["'])(\.\/(?:css|js|img)\/[^"']+)\1/g, (_, quote, ref) => `${quote}${versionUrl(ref, version)}${quote}`);
}
