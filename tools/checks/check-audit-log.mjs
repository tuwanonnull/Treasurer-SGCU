import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

const auditActionPattern = /^[a-z]+(?:_[a-z]+)?\.[a-z0-9_]+(?:\.[a-z0-9_]+)?$/;

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(filePath));
    } else if (entry.isFile()) {
      files.push(filePath);
    }
  }
  return files;
}

function extractRulesActions(source) {
  const fnMatch = source.match(/function\s+validAuditLogAction\s*\([^)]*\)\s*\{[\s\S]*?return\s+action\s+in\s+\[([\s\S]*?)\];/);
  if (!fnMatch) {
    throw new Error("Could not find validAuditLogAction whitelist in firestore.rules");
  }
  return new Set(
    Array.from(fnMatch[1].matchAll(/"([^"]+)"/g), (match) => match[1])
      .filter((value) => auditActionPattern.test(value))
  );
}

function extractCodeActions(source) {
  const actions = new Set();
  for (const match of source.matchAll(/\baction:\s*"([^"]+)"/g)) {
    if (auditActionPattern.test(match[1])) actions.add(match[1]);
  }
  for (const match of source.matchAll(/\bwriteAuditLog\s*\(\s*"([^"]+)"/g)) {
    if (auditActionPattern.test(match[1])) actions.add(match[1]);
  }
  return actions;
}

const rulesPath = path.join(rootDir, "firestore.rules");
const rulesSource = await fs.readFile(rulesPath, "utf8");
const rulesActions = extractRulesActions(rulesSource);

const jsFiles = (await listFiles(path.join(rootDir, "web/js")))
  .filter((filePath) => filePath.endsWith(".js"));
const missing = [];

for (const filePath of jsFiles) {
  const source = await fs.readFile(filePath, "utf8");
  const actions = extractCodeActions(source);
  for (const action of actions) {
    if (!rulesActions.has(action)) {
      missing.push(`${path.relative(rootDir, filePath)}: ${action}`);
    }
  }
}

if (missing.length) {
  throw new Error(`Audit actions missing from firestore.rules whitelist:\n${missing.map((item) => `- ${item}`).join("\n")}`);
}

console.log(`Audit log check passed. ${rulesActions.size} whitelisted actions verified.`);
