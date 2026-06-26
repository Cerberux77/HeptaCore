import type {
  Pub04ScheduleInput,
  Pub04ScheduleRepository,
  Pub04ScheduleResult,
} from "../../../contracts/S-HC-PUB-04/pub04-contract.js";

export async function schedulePublication(
  _input: Pub04ScheduleInput,
  _repo: Pub04ScheduleRepository,
): Promise<Pub04ScheduleResult> {
  throw new Error("PUB04_NOT_IMPLEMENTED");
}
