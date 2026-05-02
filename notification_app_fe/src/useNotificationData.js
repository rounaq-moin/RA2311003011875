import { useCallback, useEffect, useState } from "react";
import { fetchNotifications, fetchPriorityNotifications, writeFrontendLog } from "./api.js";

export function useNotificationData() {
  const [notifications, setNotifications] = useState([]);
  const [priorityNotifications, setPriorityNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    setError("");

    try {
      const [allNotifications, topNotifications] = await Promise.all([
        fetchNotifications(),
        fetchPriorityNotifications()
      ]);

      setNotifications(allNotifications);
      setPriorityNotifications(topNotifications);
      setLastUpdated(new Date());
      writeFrontendLog("info", "hook", "notification data refreshed");
    } catch {
      setError("Unable to load notifications right now.");
      writeFrontendLog("error", "hook", "notification data refresh failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    writeFrontendLog("info", "component", "notification dashboard mounted");
    refresh();

    const intervalId = window.setInterval(refresh, 10000);
    return () => window.clearInterval(intervalId);
  }, [refresh]);

  return {
    notifications,
    priorityNotifications,
    loading,
    error,
    lastUpdated,
    refresh
  };
}
