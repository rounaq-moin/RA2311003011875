import { Log } from "../../../logging_middleware/logger.js";
import { safeCall } from "../auth.js";
import { config } from "../config.js";
import { ExternalApiError, readJson } from "../http.js";

const typeWeight = {
  Placement: 3,
  Result: 2,
  Event: 1
};

export async function getNotifications() {
  Log("backend", "info", "service", "fetching notifications");

  const notifications = await safeCall(async token => {
    const response = await fetch(`${config.baseUrl}/notifications`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body = await readJson(response);
    if (!response.ok) {
      Log("backend", "error", "api", `notification API failed with status ${response.status}`);
      throw new ExternalApiError("notification API request failed", response.status);
    }

    return extractNotifications(body).map(normalizeNotification);
  });

  Log("backend", "info", "service", `fetched ${notifications.length} notifications`);
  return notifications;
}

export async function getPriorityNotifications() {
  const notifications = await getNotifications();
  const sorted = [...notifications].sort(compareByPriority);

  Log("backend", "info", "service", "priority inbox sorted");
  return sorted.slice(0, 10);
}

export function normalizeNotification(notification) {
  const id = notification.id ?? notification.ID;
  const type = notification.type ?? notification.Type;
  const message = notification.message ?? notification.Message;
  const timestamp = notification.timestamp ?? notification.createdAt ?? notification.Timestamp;

  return {
    ...notification,
    id,
    type,
    message,
    timestamp
  };
}

function compareByPriority(a, b) {
  const priorityDiff = (typeWeight[b.type] || 0) - (typeWeight[a.type] || 0);
  if (priorityDiff !== 0) return priorityDiff;

  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
}

function extractNotifications(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.notifications)) return body.notifications;
  return [];
}
