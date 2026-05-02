import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "..");

loadEnvFile(path.join(repoRoot, ".env"));
loadEnvFile(path.join(appRoot, ".env"));

export const config = {
  baseUrl: cleanServiceUrl(process.env.EVAL_BASE_URL || "http://20.207.122.201/evaluation-service"),
  credentials: {
    email: getEnv("EVAL_EMAIL", "EMAIL"),
    name: getEnv("EVAL_NAME", "NAME"),
    rollNo: getEnv("EVAL_ROLL_NO", "ROLL_NO"),
    accessCode: getEnv("EVAL_ACCESS_CODE", "ACCESS_CODE"),
    clientID: getEnv("EVAL_CLIENT_ID", "CLIENT_ID"),
    clientSecret: getEnv("EVAL_CLIENT_SECRET", "CLIENT_SECRET")
  }
};

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsAt = trimmed.indexOf("=");
    if (equalsAt === -1) continue;

    const key = trimmed.slice(0, equalsAt).trim();
    const value = stripQuotes(trimmed.slice(equalsAt + 1).trim());
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function getEnv(primaryKey, fallbackKey) {
  return process.env[primaryKey] || process.env[fallbackKey] || "";
}

function cleanServiceUrl(value) {
  const baseUrl = value.replace(/\/$/, "");
  return baseUrl.endsWith("/evaluation-service") ? baseUrl : `${baseUrl}/evaluation-service`;
}
