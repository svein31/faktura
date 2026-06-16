# Auth Testing Playbook — Faktura KSeF App

Unified session auth (email/password + Google). Opaque `session_token` in `user_sessions`.

## Quick API test (email/password)
```
# Register (returns session_token)
curl -s -X POST http://localhost:8001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"tester1@test.pl","password":"Secret123","name":"Tester"}'

# Login
curl -s -X POST http://localhost:8001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@faktura.pl","password":"Admin123!"}'

# Authenticated call (Bearer)
curl -s http://localhost:8001/api/auth/me -H 'Authorization: Bearer <TOKEN>'
curl -s http://localhost:8001/api/companies -H 'Authorization: Bearer <TOKEN>'
```

## Browser testing
For Google flow, prefer the Bearer-token bypass: register a user, then set the
`session_token` cookie or send `Authorization: Bearer <token>`.

Set cookie in Playwright:
```
await page.context.add_cookies([{
  "name": "session_token", "value": "<TOKEN>",
  "domain": "<app-domain>", "path": "/",
  "httpOnly": True, "secure": True, "sameSite": "None"
}])
```

## Success indicators
- `/api/auth/me` returns user with `user_id`, `email`, `name`.
- Protected `/api/*` endpoints return data (not 401) with valid token.
- User B never sees User A data.
