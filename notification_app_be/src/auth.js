import { setToken, Log } from "../../logging_middleware/logger.js";
import { config } from "./config.js";
import { ExternalApiError, readJson } from "./http.js";

let accessToken = "";
let authInFlight = null;

export async function authenticate(force = false) {
  if (accessToken && !force) return accessToken;
  if (authInFlight) return authInFlight;

  authInFlight = requestToken()
    .finally(() => {
      authInFlight = null;
    });

  return authInFlight;
}

export async function safeCall(callback) {
  try {
    const token = await authenticate();
    return await callback(token);
  } catch (error) {
    if (error.status === 401) {
      const token = await authenticate(true);
      return callback(token);
    }
    throw error;
  }
}

async function requestToken() {
  assertCredentials();
  Log("backend", "info", "api", "requesting evaluation API token");

  const response = await fetch(`${config.baseUrl}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(config.credentials)
  });

  const body = await readJson(response);
  if (!response.ok) {
    Log("backend", "error", "api", `token request failed with status ${response.status}`);
    throw new ExternalApiError("authentication failed", response.status);
  }

  const token = body?.access_token || body?.accessToken;
  if (!token) {
    Log("backend", "error", "api", "token response did not include access token");
    throw new ExternalApiError("authentication response missing token", response.status);
  }

  accessToken = token;
  setToken(token);
  Log("backend", "info", "api", "evaluation API token stored");
  return accessToken;
}

function assertCredentials() {
  const missing = Object.entries(config.credentials)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new ExternalApiError(`missing credentials: ${missing.join(", ")}`, 500);
  }
}
