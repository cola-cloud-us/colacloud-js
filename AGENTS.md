# COLA Cloud JavaScript SDK

This is the public JavaScript/TypeScript SDK for the COLA Cloud API. Keep this repo safe for public GitHub: do not add private workspace notes, credentials, customer data, or internal-only infrastructure details.

## Development

- Use `npm install` to install dependencies.
- Run tests with `npm test`.
- Run type checks with `npm run typecheck`.
- Build with `npm run build`.
- Source code lives in `src`; tests live in `tests`.

## API Work

- Unit tests should mock HTTP calls rather than hitting production services.
- Smoke tests may require `COLA_API_KEY`; do not hardcode API keys or tokens.
- Avoid accidental public API breaks. If a breaking change is intentional, make it explicit in the versioning/release notes.
