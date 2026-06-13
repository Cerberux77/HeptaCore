# Oreshnik Preflight Command (HeptaCore)

When a user identifies themselves or asks for pending tasks, run the Oreshnik preflight from the Oreshnik repo.

## Trigger phrases
- "soy Jean", "soy Architect", "soy Manuel"
- "dame mis pendientes", "mis tareas", "what are my tasks"  
- "alineame", "preflight", "preparame", "que debo hacer"

## Action
1. Detect operator name from the user's message (Jean, Architect, Manuel)
2. If not detected, check `git config user.name`
3. Determine sprint: if the user specifies one, use it. Otherwise use `S-HC-{OPERATOR}-{today}`
4. Run the Oreshnik CLI from its repo (relative path from HeptaCore):
   ```
   node ..\oreshnik\dist\cli.js preflight --sprint S-HC-XX --operator {name} --desc "trabajo en curso"
   ```
5. If the CLI doesn't exist (not built), build it first:
   ```
   cd ..\oreshnik && npm run build
   ```
6. Show the operator their task summary from the output
7. If blockers exist, explain what blocks them and how to fix
8. If the operator has pool tasks, suggest they pick them up

## After preflight
- Tasks can be worked on directly in HeptaCore
- Zone-map controls what files each operator can touch
- Before closing a sprint: `node ..\oreshnik\dist\cli.js evidence --check`
- Sprint closure requires evidence (diff, tests, QA checklist)
