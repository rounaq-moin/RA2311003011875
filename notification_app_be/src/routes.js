import express from "express";
import { Log } from "../../logging_middleware/logger.js";
import { getNotifications, getPriorityNotifications } from "./services/notificationService.js";

export const router = express.Router();

router.get("/health", (request, response) => {
  response.status(200).json({ status: "ok" });
});

router.get("/notifications", async (request, response) => {
  Log("backend", "info", "handler", "GET /notifications started");

  try {
    const notifications = await getNotifications();
    response.status(200).json(notifications);
  } catch {
    Log("backend", "error", "handler", "GET /notifications returned fallback response");
    response.status(500).json([]);
  }
});

router.get("/notifications/priority", async (request, response) => {
  Log("backend", "info", "handler", "GET /notifications/priority started");

  try {
    const notifications = await getPriorityNotifications();
    response.status(200).json(notifications);
  } catch {
    Log("backend", "error", "handler", "GET /notifications/priority returned fallback response");
    response.status(500).json([]);
  }
});

router.post("/logs", (request, response) => {
  const { stack, level, package: pkg, message } = request.body || {};
  Log(stack, level, pkg, message);
  response.status(202).json({ status: "queued" });
});
