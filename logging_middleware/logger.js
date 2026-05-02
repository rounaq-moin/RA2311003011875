let token = "";

const allowedPackages = {
  backend: new Set(["handler", "service", "api", "utils"]),
  frontend: new Set(["component", "api", "hook", "state", "style"])
};

const allowedLevels = new Set(["debug", "info", "warn", "error", "fatal"]);

export function setToken(nextToken) {
  token = nextToken || "";
}

export function Log(stack, level, pkg, message) {
  const payload = createPayload(stack, level, pkg, message);
  if (!payload || !token) return;

  void sendWithRetry(payload);
}

function createPayload(stack, level, pkg, message) {
  if (!allowedPackages[stack]) return null;
  if (!allowedLevels.has(level)) return null;
  if (!allowedPackages[stack].has(pkg)) return null;
  if (!message || typeof message !== "string") return null;

  return {
    stack,
    level,
    package: pkg,
    message
  };
}

async function sendWithRetry(payload) {
  try {
    await send(payload);
  } catch {
    try {
      await send(payload);
    } catch {
      // Logging should never break the application flow.
    }
  }
}

async function send(payload) {
  const response = await fetch(`${getBaseUrl()}/logs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`log request failed with status ${response.status}`);
  }
}

function getBaseUrl() {
  const baseUrl = (process.env.EVAL_BASE_URL || "http://20.207.122.201/evaluation-service").replace(/\/$/, "");
  return baseUrl.endsWith("/evaluation-service") ? baseUrl : `${baseUrl}/evaluation-service`;
}
