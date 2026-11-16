import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('../../web/', import.meta.url));

// Build-time fragments share their entrypoint's lexical scope. Do not load them
// as browser scripts: declarations and listener setup must keep their order.
export function readScriptSource(file, { root = webRoot } = {}) {
  const rootPath = fs.realpathSync(root);
  function read(target, stack) {
    const resolved = fs.realpathSync(target);
    if (!resolved.startsWith(rootPath + path.sep)) {
      throw new Error(`Source include escapes root: ${target}`);
    }
    if (stack.includes(resolved)) {
      throw new Error(`Circular source include: ${[...stack, resolved].join(' -> ')}`);
    }
    return fs.readFileSync(resolved, 'utf8').replace(
      /^[\t ]*\/\* @include ([^\s]+) \*\/(?:\r?\n|$)/gm,
      (_, relative) => read(path.resolve(path.dirname(resolved), relative), [...stack, resolved])
    );
  }
  return read(file instanceof URL ? fileURLToPath(file) : file, []);
}

// Flatten local imports in place, including nested entrypoints such as
// operations.css. Never reorder rules: later overrides depend on this order.
export function readCssSource(file, { root = webRoot } = {}) {
  const rootPath = fs.realpathSync(root);
  function read(target, stack) {
    const resolved = fs.realpathSync(target);
    if (!resolved.startsWith(rootPath + path.sep)) {
      throw new Error(`CSS import escapes root: ${target}`);
    }
    if (stack.includes(resolved)) throw new Error(`Circular CSS import: ${resolved}`);
    return fs.readFileSync(resolved, 'utf8').replace(
      /^@import\s+url\(["'](\.\/[^"']+?\.css)(?:\?[^"']*)?["']\);\r?\n?/gm,
      (_, relative) => read(path.resolve(path.dirname(resolved), relative), [...stack, resolved])
    );
  }
  return read(file instanceof URL ? fileURLToPath(file) : file, []);
}
