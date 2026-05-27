# Contributing

Contributions are welcome. Keep changes focused, tested, and documented.

## Local setup

```bash
npm install
cp .env.example .env
npm run build
npm test
```

Fill `.env` only for local manual testing. Do not commit `.env`, database files, tokens, webhook URLs, or private content.

## Development workflow

1. Create a branch from `main`.
2. Make a focused change.
3. Add or update tests for behavior changes.
4. Run `npm run build` and `npm test`.
5. Open a pull request with a short summary, test results, and any setup notes.

## Code style

- Prefer small, explicit functions over broad abstractions.
- Keep Telegram command handlers thin where practical and move reusable logic into testable functions.
- Avoid hardcoded brand, industry, or account-specific values.
- Update the README when setup, commands, payloads, or limitations change.

## Pull request checklist

- `npm run build` passes.
- `npm test` passes.
- New behavior has tests where reasonable.
- No secrets, `.env` files, SQLite databases, logs, or generated build output are included.
- Documentation reflects user-visible changes.
