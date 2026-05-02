const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

export async function fetchNotifications() {
  return request("/notifications", "notifications");
}

export async function fetchPriorityNotifications() {
  return request("/notifications/priority", "priority notifications");
}

export function writeFrontendLog(level, pkg, message) {
  void fetch(`${API_BASE_URL}/logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      stack: "frontend",
      level,
      package: pkg,
      message
    })
  }).catch(() => {
    // Logging must not affect the user interface.
  });
}

async function request(path, label) {
  writeFrontendLog("info", "api", `loading ${label}`);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`);
    const data = await response.json();

    if (!response.ok) {
      writeFrontendLog("error", "api", `${label} failed with status ${response.status}`);
      throw new Error(`${label} request failed`);
    }

    writeFrontendLog("info", "api", `${label} loaded`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    writeFrontendLog("error", "api", `${label} request failed`);
    throw error;
  }
}
