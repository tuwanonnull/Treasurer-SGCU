import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const isCheckOnly = process.argv.includes("--check");
const buildVersion = process.env.BUILD_VERSION || new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 12);

const copyIgnoreNames = new Set([
  ".git",
  ".gitignore",
  ".DS_Store",
  ".github",
  "firebase-debug.log",
  "node_modules",
  "package.json",
  "package-lock.json",
  "partials",
  "tools"
]);

const scanIgnoreNames = new Set([
  ".git",
  ".DS_Store",
  "firebase-debug.log",
  "node_modules"
]);

function isIgnoredGeneratedDir(name) {
  return /^dist(?:\s+\d+)?$/.test(name);
}

const textFileExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".txt",
  ".webmanifest",
  ".yml",
  ".yaml"
]);

const textTransforms = new Map([
  ["index.html", transformIndexHtml],
  ["css/style.css", transformCssEntrypoint],
  ["sw.js", transformServiceWorker]
]);

async function exists(filePath) {
  try {
    await fs.access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function copyRecursive(source, target) {
  const entries = await fs.readdir(source, { withFileTypes: true });
  await fs.mkdir(target, { recursive: true });

  for (const entry of entries) {
    if (copyIgnoreNames.has(entry.name) || isIgnoredGeneratedDir(entry.name)) continue;

    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyRecursive(sourcePath, targetPath);
      continue;
    }
    if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

async function copyFeatureDirectories() {
  const sourceFeaturesDir = path.join(rootDir, "js", "features");
  const targetFeaturesDir = path.join(distDir, "js", "features");
  if (!(await exists(sourceFeaturesDir))) return;

  const entries = await fs.readdir(sourceFeaturesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    await copyRecursive(
      path.join(sourceFeaturesDir, entry.name),
      path.join(targetFeaturesDir, entry.name)
    );
  }
}

async function copyRuntimeScriptDirectories() {
  const runtimeDirs = ["core", "integrations", "motion"];
  for (const dirName of runtimeDirs) {
    const sourceDir = path.join(rootDir, "js", dirName);
    if (!(await exists(sourceDir))) continue;
    await copyRecursive(sourceDir, path.join(distDir, "js", dirName));
  }
}

async function listProjectFiles(source, ignoreNames = scanIgnoreNames) {
  const entries = await fs.readdir(source, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoreNames.has(entry.name) || isIgnoredGeneratedDir(entry.name)) continue;

    const sourcePath = path.join(source, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listProjectFiles(sourcePath, ignoreNames));
      continue;
    }
    if (entry.isFile()) {
      files.push(sourcePath);
    }
  }

  return files;
}

async function validateNoConflictMarkers() {
  const files = await listProjectFiles(rootDir);
  const conflictMarkerRe = /^(<<<<<<<|=======|>>>>>>>)\b/m;
  const offenders = [];

  for (const filePath of files) {
    const ext = path.extname(filePath);
    if (!textFileExtensions.has(ext)) continue;

    const content = await fs.readFile(filePath, "utf8");
    if (conflictMarkerRe.test(content)) {
      offenders.push(path.relative(rootDir, filePath));
    }
  }

  if (offenders.length) {
    throw new Error(`Conflict markers found:\n${offenders.map((item) => `- ${item}`).join("\n")}`);
  }
}

async function resolveIncludes(content, fromDir, seen = []) {
  const includeRe = /<!--\s*@include\s+([^\s]+)\s*-->/g;
  let output = "";
  let cursor = 0;
  let match;

  while ((match = includeRe.exec(content)) !== null) {
    output += content.slice(cursor, match.index);
    const includePath = match[1].trim();
    const targetPath = path.resolve(fromDir, includePath);

    if (!targetPath.startsWith(rootDir + path.sep)) {
      throw new Error(`Include path escapes project root: ${includePath}`);
    }
    if (seen.includes(targetPath)) {
      throw new Error(`Circular include detected: ${seen.concat(targetPath).map((item) => path.relative(rootDir, item)).join(" -> ")}`);
    }

    const partial = await fs.readFile(targetPath, "utf8");
    output += await resolveIncludes(partial, path.dirname(targetPath), seen.concat(targetPath));
    cursor = includeRe.lastIndex;
  }

  output += content.slice(cursor);
  return output;
}

function withVersionedLocalAssets(html) {
  return html
    .replace(/((?:src|href)=["'](?:\.\/)?(?:css|js)\/[^"']+?)(?:\?v=[^"']*)?(["'])/g, `$1?v=${buildVersion}$2`)
    .replace(/(window\.sgcuAssetVersion\s*=\s*["']).*?(["'])/g, `$1${buildVersion}$2`)
    .replace(/(window\.sgcuServiceWorkerUrl\s*=\s*["']\.\/sw\.js)(?:\?v=[^"']*)?(["'])/g, `$1?v=${buildVersion}$2`);
}

async function transformIndexHtml(html) {
  const resolvedHtml = await resolveIncludes(html, rootDir);
  return withVersionedLocalAssets(resolvedHtml);
}

function transformServiceWorker(source) {
  return source
    .replace(/const CACHE_VERSION = ".*?";/, `const CACHE_VERSION = "${buildVersion}";`)
    .replace(/(\.\/(?:css|js)\/[^"',]+?)(?:\?v=[^"',]*)?(["'])/g, `$1?v=${buildVersion}$2`);
}

async function transformCssEntrypoint(source) {
  const styleDir = path.join(distDir, "css");
  const importRe = /@import\s+url\(["']\.\/([^"']+?\.css)(?:\?v=[^"']*)?["']\);/g;
  let output = "";
  let cursor = 0;
  let match;

  while ((match = importRe.exec(source)) !== null) {
    output += source.slice(cursor, match.index);
    const importPath = match[1];
    const targetPath = path.resolve(styleDir, importPath);
    if (!targetPath.startsWith(styleDir + path.sep)) {
      throw new Error(`CSS import path escapes css directory: ${importPath}`);
    }
    const importedCss = await fs.readFile(targetPath, "utf8");
    output += `\n/* ${importPath} */\n${importedCss.trim()}\n`;
    cursor = importRe.lastIndex;
  }

  output += source.slice(cursor);
  return output;
}

async function applyTextTransforms() {
  for (const [relativePath, transform] of textTransforms) {
    const filePath = path.join(distDir, relativePath);
    if (!(await exists(filePath))) continue;
    const before = await fs.readFile(filePath, "utf8");
    const after = await transform(before);
    if (after !== before) {
      await fs.writeFile(filePath, after);
    }
  }
}

function getHashRoutes(html) {
  const routes = new Set();
  const pageRe = /\bdata-page=["']([^"']+)["']/g;
  let match;
  while ((match = pageRe.exec(html)) !== null) {
    const route = (match[1] || "").trim();
    if (/^[a-z0-9-]+$/i.test(route) && route !== "home") {
      routes.add(route);
    }
  }
  return Array.from(routes).sort();
}

function buildRouteRedirectHtml(route) {
  const safeRoute = JSON.stringify(route);
  return `<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0; url=../#${route}" />
    <title>กำลังเปิดหน้า...</title>
    <script>
      const route = ${safeRoute};
      const cleanPath = window.location.pathname.replace(/\\/$/, "");
      let basePath = cleanPath.endsWith("/" + route)
        ? cleanPath.slice(0, -(route.length + 1)) || "/"
        : "../";
      if (basePath !== "/" && !basePath.endsWith("/")) basePath += "/";
      window.location.replace(basePath + "#" + route);
    </script>
  </head>
  <body>
    <a href="../#${route}">เปิดหน้านี้</a>
  </body>
</html>
`;
}

function build404RedirectHtml(routes) {
  const safeRoutes = JSON.stringify(routes);
  return `<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>กำลังเปิดหน้า...</title>
    <script>
      const routes = new Set(${safeRoutes});
      const parts = window.location.pathname.split("/").filter(Boolean);
      const route = parts[parts.length - 1] || "";
      if (routes.has(route)) {
        const baseParts = parts.slice(0, -1);
        const basePath = "/" + (baseParts.length ? baseParts.join("/") + "/" : "");
        window.location.replace(basePath + "#" + route);
      } else {
        window.location.replace("./");
      }
    </script>
  </head>
  <body>
    <a href="./">กลับหน้าแรก</a>
  </body>
</html>
`;
}

async function createHashRouteRedirects() {
  const indexPath = path.join(distDir, "index.html");
  if (!(await exists(indexPath))) return;

  const html = await fs.readFile(indexPath, "utf8");
  const routes = getHashRoutes(html);
  for (const route of routes) {
    const routeDir = path.join(distDir, route);
    await fs.mkdir(routeDir, { recursive: true });
    await fs.writeFile(path.join(routeDir, "index.html"), buildRouteRedirectHtml(route));
  }
  await fs.writeFile(path.join(distDir, "404.html"), build404RedirectHtml(routes));
}

function getLocalAssetRefs(html) {
  const refs = [];
  const attrRe = /\b(?:src|href)=["']([^"']+)["']/g;
  let match;
  while ((match = attrRe.exec(html)) !== null) {
    const rawRef = match[1].trim();
    if (
      !rawRef ||
      rawRef.startsWith("#") ||
      rawRef.startsWith("http:") ||
      rawRef.startsWith("https:") ||
      rawRef.startsWith("mailto:") ||
      rawRef.startsWith("tel:") ||
      rawRef.startsWith("data:")
    ) {
      continue;
    }
    refs.push(rawRef);
  }
  return refs;
}

async function validateLocalAssetRefs() {
  const htmlFiles = ["index.html", "meeting-room-calendar.html", "googleb88e39dd5e406a95.html"];
  const missing = [];

  for (const htmlFile of htmlFiles) {
    const filePath = path.join(distDir, htmlFile);
    if (!(await exists(filePath))) continue;
    const html = await fs.readFile(filePath, "utf8");
    for (const ref of getLocalAssetRefs(html)) {
      const cleanRef = ref.split("#")[0].split("?")[0];
      if (!cleanRef || cleanRef === "./" || cleanRef === "/") continue;

      const targetPath = path.resolve(path.dirname(filePath), cleanRef);
      if (!targetPath.startsWith(distDir)) continue;
      if (!(await exists(targetPath))) {
        missing.push(`${htmlFile} -> ${ref}`);
      }
    }
  }

  if (missing.length) {
    throw new Error(`Missing local asset references:\n${missing.map((item) => `- ${item}`).join("\n")}`);
  }
}

async function build() {
  await validateNoConflictMarkers();
  await fs.rm(distDir, { recursive: true, force: true });
  await copyRecursive(rootDir, distDir);
  await copyRuntimeScriptDirectories();
  await copyFeatureDirectories();
  await applyTextTransforms();
  await createHashRouteRedirects();
  await validateLocalAssetRefs();
}

async function check() {
  await build();
}

try {
  if (isCheckOnly) {
    await check();
    console.log("Static asset check passed. - build-static.mjs:201");
  } else {
    await build();
    console.log(`Built static site to dist/ with version ${buildVersion}. - build-static.mjs:204`);
  }
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
