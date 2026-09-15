import { setTimeout } from "node:timers/promises";
import { getDb } from "../src/lib/db";
import {
  maintainWorker,
  processOneJob,
  stopWorker,
} from "../src/infrastructure/jobs/worker";

const workerId = crypto.randomUUID();

let stopping = false;

process.on("SIGTERM", () => {
  stopping = true;
});

process.on("SIGINT", () => {
  stopping = true;
});

let nextMaintenance = 0;

try {
  while (!stopping) {
    try {
      if (Date.now() >= nextMaintenance) {
        await maintainWorker(workerId);

        nextMaintenance = Date.now() + 60_000;
      }

      if (!(await processOneJob())) await setTimeout(2_000);
    } catch {
      console.error(
        "Worker operation failed. Check database and provider readiness."
      );

      await setTimeout(5_000);
    }
  }
} finally {
  await stopWorker(workerId);

  await getDb().$client.end();
}
