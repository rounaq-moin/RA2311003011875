import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "..");

loadEnvFile(path.join(repoRoot, ".env"));
loadEnvFile(path.join(appRoot, ".env"));

export const config = {
  baseUrl: cleanUrl(process.env.EVAL_BASE_URL || "http://20.207.122.201/evaluation-service"),
  port: Number(process.env.BACKEND_PORT || 3001),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "*",
  credentials: {
    email: process.env.EVAL_EMAIL || "",
    name: process.env.EVAL_NAME || "",
    rollNo: process.env.EVAL_ROLL_NO || "",
    accessCode: process.env.EVAL_ACCESS_CODE || "",
    clientID: process.env.EVAL_CLIENT_ID || "",
    clientSecret: process.env.EVAL_CLIENT_SECRET || ""
  }
};

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
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

function cleanUrl(value) {
  return value.replace(/\/$/, "");
}
