import type {
  Pub04ScheduleInput,
  Pub04ScheduleResult,
  Pub04ScheduleRepository,
} from "../../../contracts/S-HC-PUB-04/pub04-contract.js";

function buildDeterministicJobId(draftId: string, network: string, scheduledFor: Date): string {
  if (isNaN(scheduledFor.getTime())) {
    throw new Error("INVALID_SCHEDULED_AT: date is invalid");
  }
  const ts = scheduledFor.getTime().toString(36);
  return `pj_sched_${draftId}_${network}_${ts}`;
}

export async function schedulePublication(
  input: Pub04ScheduleInput,
  repo: Pub04ScheduleRepository
): Promise<Pub04ScheduleResult> {
  if (isNaN(input.scheduledFor.getTime())) {
    throw new Error("INVALID_SCHEDULED_AT: date is invalid");
  }

  const jobId = buildDeterministicJobId(input.draftId, input.network, input.scheduledFor);

  const result = await repo.scheduleAtomic({
    jobId,
    tenantId: input.tenantId,
    draftId: input.draftId,
    network: input.network,
    scheduledFor: input.scheduledFor,
  });

  return {
    jobId: result.jobId,
    status: result.status,
    scheduledFor: input.scheduledFor.toISOString(),
  };
}
