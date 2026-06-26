import type {
  Pub04CronDeps,
  Pub04CronInput,
  Pub04CronResult,
} from "../../../contracts/S-HC-PUB-04/pub04-contract.js";

export async function executePublishingCron(
  _input: Pub04CronInput,
  _deps: Pub04CronDeps,
): Promise<Pub04CronResult> {
  throw new Error("PUB04_NOT_IMPLEMENTED");
}
