import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "src");
const all = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    if (/\.(ts|tsx)$/.test(entry.name)) all.push(fullPath);
  }
}

walk(src);

const runtime = all.filter(
  (filePath) =>
    !/\.test\.(ts|tsx)$/.test(filePath) &&
    !filePath.includes(`${path.sep}test${path.sep}`) &&
    !filePath.endsWith("vite-env.d.ts")
);
const runtimeSet = new Set(runtime);
const extensions = [".ts", ".tsx", ".js", ".jsx"];

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    ...extensions.map((extension) => base + extension),
    path.join(base, "index.ts"),
    path.join(base, "index.tsx")
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

const importPattern =
  /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]|export\s+[^'"]*from\s+['"]([^'"]+)['"]/g;
const graph = new Map();

for (const filePath of runtime) {
  const text = readFileSync(filePath, "utf8");
  const dependencies = [];
  let match;
  while ((match = importPattern.exec(text))) {
    const resolved = resolveImport(filePath, match[1] || match[2]);
    if (resolved && runtimeSet.has(resolved)) dependencies.push(resolved);
  }
  graph.set(filePath, dependencies);
}

const seen = new Set();
function visit(filePath) {
  if (seen.has(filePath)) return;
  seen.add(filePath);
  for (const dependency of graph.get(filePath) ?? []) visit(dependency);
}

visit(path.join(src, "main.tsx"));

const unused = runtime.filter((filePath) => !seen.has(filePath));
if (unused.length === 0) {
  console.log("NO_RUNTIME_UNUSED_SOURCE_FILES");
} else {
  console.log(unused.map((filePath) => path.relative(root, filePath)).join("\n"));
  process.exit(1);
}
