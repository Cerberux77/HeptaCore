# Correct PUB-04 cron execution semantics

1. Implement `publishing-cron-executor.ts` per Pub04CronDeps contract
2. Implement `publishing-scheduler-service.ts` per Pub04ScheduleRepository contract
3. Rewrite cron route to delegate to `executePublishingCron`
4. Rewrite publish route to delegate to `schedulePublication`
5. Run all gates until pass
