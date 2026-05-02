import express from "express";
import { Log } from "../../logging_middleware/logger.js";
import { authenticate } from "./auth.js";
import { getNotifications, getPriorityNotifications } from "./services/notificationService.js";

export const router = express.Router();

router.get("/health", (request, response) => {
  response.status(200).json({ status: "ok" });
});

router.get("/notifications", async (request, response) => {
  try {
    await authenticate();
    Log("backend", "info", "handler", "GET /notifications started");

    const notifications = await getNotifications();
    response.status(200).json(notifications);
  } catch {
    Log("backend", "error", "handler", "GET /notifications returned fallback response");
    response.status(500).json([]);
  }
});

router.get("/notifications/priority", async (request, response) => {
  try {
    await authenticate();
    Log("backend", "info", "handler", "GET /notifications/priority started");

    const notifications = await getPriorityNotifications();
    response.status(200).json(notifications);
  } catch {
    Log("backend", "error", "handler", "GET /notifications/priority returned fallback response");
    response.status(500).json([]);
  }
});

router.post("/logs", (request, response) => {
  const { stack, level, package: pkg, message } = request.body || {};

  void authenticate()
    .then(() => Log(stack, level, pkg, message))
    .catch(() => {
      // Frontend logging is best-effort and must never delay the UI.
    });

  response.status(202).json({ status: "queued" });
});
