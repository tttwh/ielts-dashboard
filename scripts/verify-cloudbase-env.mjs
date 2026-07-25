import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_ENV_FILE = ".env.local";

const allowedKeys = new Set([
  "VITE_CLOUDBASE_ENV_ID",
  "VITE_CLOUDBASE_REGION",
  "VITE_CLOUDBASE_ACCESS_KEY",
]);

const placeholderPatterns = [
  /^<.*>$/,
  /^your[-_]/i,
  /demo[-_]?cloudbase/i,
  /demo[-_]?public[-_]?web/i,
  /placeholder/i,
];

const parseArgs = (args) => {
  const fileFlagIndex = args.indexOf("--file");
  if (fileFlagIndex === -1) return DEFAULT_ENV_FILE;

  const fileName = args[fileFlagIndex + 1];
  if (!fileName) {
    throw new Error("Missing value after --file.");
  }
  return fileName;
};

const parseDotEnv = (contents) => {
  const entries = new Map();
  const errors = [];

  contents.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      errors.push(`line ${index + 1} is not KEY=value`);
      return;
    }

    const [, key, rawValue] = match;
    const value = rawValue.replace(/^(['"])(.*)\1$/, "$2").trim();
    entries.set(key, value);
  });

  return { entries, errors };
};

const isIgnoredByGit = (envFileName, gitignoreContents) => {
  const normalizedEnvFile = envFileName.replace(/\\/g, "/");
  return gitignoreContents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .some((pattern) => {
      if (pattern === ".env.*.local" && /^\.env\..+\.local$/.test(normalizedEnvFile)) return true;
      return pattern === normalizedEnvFile || pattern === path.posix.basename(normalizedEnvFile);
    });
};

const validate = (envFileName) => {
  const missing = [];
  const envPath = path.resolve(envFileName);
  const gitignorePath = path.resolve(".gitignore");

  if (!existsSync(envPath)) {
    missing.push(`Create ${envFileName} before running live CloudBase checks.`);
    return missing;
  }

  if (!existsSync(gitignorePath)) {
    missing.push(".gitignore is required before creating local CloudBase env files.");
    return missing;
  }

  const { entries, errors } = parseDotEnv(readFileSync(envPath, "utf8"));
  for (const error of errors) missing.push(error);

  for (const key of entries.keys()) {
    if (!allowedKeys.has(key)) {
      missing.push(`forbidden or unsupported env key: ${key}`);
    }
  }

  for (const key of allowedKeys) {
    const value = entries.get(key);
    if (!value) {
      missing.push(`${key} must be set.`);
    } else if (placeholderPatterns.some((pattern) => pattern.test(value))) {
      missing.push(`${key} must replace placeholder values before local testing.`);
    }
  }

  const gitignoreContents = readFileSync(gitignorePath, "utf8");
  if (!isIgnoredByGit(envFileName, gitignoreContents)) {
    missing.push(`${envFileName} must be ignored by git.`);
  }

  return missing;
};

try {
  const envFileName = parseArgs(process.argv.slice(2));
  const missing = validate(envFileName);

  if (missing.length > 0) {
    console.error(`CloudBase env verification failed:\n${missing.join("\n")}`);
    process.exit(1);
  }

  console.log("CloudBase env verification passed");
} catch (error) {
  console.error(`CloudBase env verification failed:\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
