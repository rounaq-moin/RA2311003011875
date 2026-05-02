import { Log, setToken } from "../../logging_middleware/logger.js";
import { config } from "./env.js";

async function main() {
  const token = await authenticate();
  setToken(token);

  const [depots, vehicles] = await Promise.all([
    fetchDepots(token),
    fetchVehicles(token)
  ]);

  const tasks = vehicles.map(normalizeTask).filter(isUsableTask);
  const schedules = depots.map(depot => buildScheduleForDepot(normalizeDepot(depot), tasks));

  process.stdout.write(`${JSON.stringify({ schedules }, null, 2)}\n`);
}

async function authenticate() {
  assertCredentials();

  const response = await fetch(`${config.baseUrl}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(config.credentials)
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`authentication failed with status ${response.status}`);
  }

  const token = body.access_token || body.accessToken;
  if (!token) {
    throw new Error("authentication response did not include access token");
  }

  return token;
}

async function fetchDepots(token) {
  Log("backend", "info", "api", "fetching depot capacity data");
  const body = await getJson("/depots", token);
  return Array.isArray(body?.depots) ? body.depots : [];
}

async function fetchVehicles(token) {
  Log("backend", "info", "api", "fetching vehicle task data");
  const body = await getJson("/vehicles", token);
  return Array.isArray(body?.vehicles) ? body.vehicles : [];
}

async function getJson(path, token) {
  const response = await fetch(`${config.baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed with status ${response.status}`);
  }

  return body;
}

function normalizeDepot(depot) {
  return {
    id: depot.id ?? depot.ID,
    capacity: Number(depot.mechanicHours ?? depot.MechanicHours ?? 0)
  };
}

function normalizeTask(task) {
  return {
    id: task.taskId ?? task.TaskID ?? task.id ?? task.ID,
    depotId: task.depotId ?? task.DepotID ?? null,
    duration: Number(task.duration ?? task.Duration ?? 0),
    impact: Number(task.impact ?? task.Impact ?? 0)
  };
}

function isUsableTask(task) {
  return task.id && task.duration > 0 && task.impact > 0;
}

function buildScheduleForDepot(depot, tasks) {
  const depotTasks = tasks.some(task => task.depotId !== null)
    ? tasks.filter(task => String(task.depotId) === String(depot.id))
    : tasks;

  const result = knapsack(depotTasks, depot.capacity);
  return {
    depotId: depot.id,
    mechanicHours: depot.capacity,
    selectedTasks: result.selected,
    usedHours: result.selected.reduce((sum, task) => sum + task.duration, 0),
    totalImpact: result.totalImpact
  };
}

export function knapsack(tasks, capacity) {
  const dp = Array.from({ length: tasks.length + 1 }, () => Array(capacity + 1).fill(0));

  for (let i = 1; i <= tasks.length; i += 1) {
    const task = tasks[i - 1];

    for (let hours = 0; hours <= capacity; hours += 1) {
      dp[i][hours] = dp[i - 1][hours];

      if (hours >= task.duration) {
        const withTask = dp[i - 1][hours - task.duration] + task.impact;
        dp[i][hours] = Math.max(dp[i][hours], withTask);
      }
    }
  }

  const selected = [];
  let hoursLeft = capacity;

  for (let i = tasks.length; i > 0; i -= 1) {
    if (dp[i][hoursLeft] !== dp[i - 1][hoursLeft]) {
      const task = tasks[i - 1];
      selected.push(task);
      hoursLeft -= task.duration;
    }
  }

  return {
    selected: selected.reverse(),
    totalImpact: dp[tasks.length][capacity]
  };
}

function assertCredentials() {
  const missing = Object.entries(config.credentials)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`missing credentials: ${missing.join(", ")}`);
  }
}

main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
