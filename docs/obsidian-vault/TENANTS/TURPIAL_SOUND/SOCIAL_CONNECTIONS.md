---
type: social-connections
project: "HeptaCore"
tenant: "turpial-sound"
last_updated: "2026-06-09"
tags:
  - "#oauth"
  - "#vault"
  - "#turpial"
---

# Turpial Sound Social Connections

## Instagram

```json
{
  "provider": "instagram",
  "providerUserId": "28189853417270950",
  "status": "connected",
  "encryptedBlobPresent": true,
  "tokenRefPresent": true
}
```

Verify:

```bash
node .\scripts\verify-turpial-oauth-vault.mjs
```

## Facebook

```json
{
  "provider": "facebook",
  "pageId": "1129437930248909",
  "providerUserId": "1129437930248909",
  "status": "connected",
  "encryptedBlobPresent": true,
  "tokenRefPresent": true
}
```

Verify:

```bash
node .\scripts\verify-turpial-facebook-vault.mjs
```

## Seguridad

- No imprimir tokens.
- No pedir tokens en chat.
- No rotar ni borrar conexiones en este sprint.
- Usar vault cifrado existente.
- `S-HC-PUB-01` puede verificar conexiones pero no publicar sin gate de Manuel.
