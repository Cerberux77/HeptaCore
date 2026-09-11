<!-- ORESHNIK:GENERATED:START -->
---
type: task-runtime
project: "HeptaCore"
task_id: "S-HC-PUB-07C-YOUTUBE-AUTH-CHANNEL-SMOKE"
sprint: "publishing"
status: "blocked"
owner: "Manuel"
last_updated: "2026-09-11T00:02:27.699Z"
source: "var/oreshnik/tasks/S-HC-PUB-07C-YOUTUBE-AUTH-CHANNEL-SMOKE.json"
---

# Task S-HC-PUB-07C-YOUTUBE-AUTH-CHANNEL-SMOKE

## Scope

Authorized YouTube OAuth and channel identity smoke (no publishing)

## Runtime

- estado: `blocked`
- owner: `Manuel`
- backup: `Manuel`
- intentos: `0`
- handoff: -

## Dependencias

- S-HC-PUB-07B-YOUTUBE-SCHEDULED-E2E

## Zonas

### Compat

- Ninguna

### Read

- `apps/web/lib/publishers/youtube.ts`
- `apps/web/lib/credential-resolver.ts`
- `apps/web/app/api/publishing/publish/route.ts`

### Write

- Ninguna

## Aceptacion

- Authorized runtime has a connected YOUTUBE SocialAccount for the intended tenant/channel.
- OAuthConnection.tokenRef resolves and decrypts the youtube_oauth vault item without exposing secret material.
- Required scope https://www.googleapis.com/auth/youtube.upload is confirmed.
- Read-only channels.list(part=id,snippet,mine=true) succeeds and records only non-secret channel identity plus HTTP/evidence fingerprints.
- No YouTube content is created, uploaded, scheduled, modified or published by this smoke.
- Parent S-HC-PUB-07-YOUTUBE-PUBLISHING may resume only after this smoke has real authorized PASS evidence.

## Runs

| Run | Operator | Mode | Task Status | Claim | Branch |
|---|---|---|---|---|---|
| Ninguno | - | - | - | - | - |

## Integracion

- Ninguna

## Train Mas Reciente

- Ninguno

<!-- ORESHNIK:GENERATED:END -->