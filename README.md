# subway-mcp-server

MCP server local que expone `codex`, `claude` (Claude Code) y `agy` (Antigravity) como tools de delegación, para que un agente orquestador les reparta tareas vía CLI en modo no interactivo.

## Tools

- `delegate_to_codex` — `codex exec`
- `delegate_to_claude` — `claude -p --output-format json`
- `delegate_to_agy` — `agy -p`

Todas comparten el mismo input:

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `prompt` | string | — | instrucciones para el sub-agente |
| `cwd` | string | cwd del server | directorio de trabajo absoluto |
| `model` | string | el default de cada CLI | override de modelo |
| `timeout_seconds` | number | 600 (máx 1800) | mata el proceso si excede |
| `auto_approve` | boolean | false | evita prompts de permisos de la CLI (necesario para casi cualquier tarea real, porque no hay terminal para aprobar) |

Output: `{ success, final_message, exit_code, timed_out, stderr? }` (stderr solo si `success=false`).

## Build

```
npm install
npm run build
```

## Registrar en Claude Code

```
claude mcp add subway -- node D:/Repo/subway/dist/index.js
```

## Notas

- Requiere que `codex`, `claude` y `agy` estén en el PATH y ya autenticados en la máquina.
- No hay gate de verificación (CCDD) ni orquestación de multi-tarea acá — es solo el mecanismo de delegación. Componer lógica de PM/orquestación por encima queda del lado del agente que use este MCP.
