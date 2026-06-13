# Oreshnik Preflight Command (HeptaCore)

When a user identifies themselves or asks for pending tasks from HeptaCore, run Oreshnik preflight. CRITICAL: rebuild CLI first.

## Trigger phrases
- "soy Jean", "soy Architect", "soy Manuel"
- "dame mis pendientes", "mis tareas", "what are my tasks"
- "alineame", "preflight", "preparame", "que debo hacer"

## Action (STRICT)
1. Extract operator name (Jean, Architect, Manuel). Fallback: `git config user.name`.
2. ALWAYS rebuild Oreshnik CLI:
   ```
   cd ..\oreshnik && npm run build
   ```
3. Generate sprint: `S-HC-{OPERATOR}-{today}`
4. Run preflight from HeptaCore directory:
   ```
   node ..\oreshnik\dist\cli.js preflight --sprint {sprint} --operator {name} --desc "trabajo en curso"
   ```
5. Show preflight output AS-IS. Do NOT run your own task-board queries.

## Cross-operator blocking
- Preflight step 6 shows [BLOCK] for tasks in your zones being worked by other operators
- If [BLOCK] appears, coordinate with the other operator before touching those files
