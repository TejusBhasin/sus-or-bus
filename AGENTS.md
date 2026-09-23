# AGENTS.md

## Project Context

This is the **Sus or Bus** app repository — a web-safety verification platform (React + Vite frontend, serverless backend, browser extensions). Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for project overview and structure.

## Key Files

- `src/`: frontend application source.
- `src/api/`: SDK client initialization.
- `vite.config.js`: Vite config and build plugin setup.
- `base44/`: backend — entities (data schemas), functions (API logic), shared modules.
- `extension/`: Chrome and Safari browser extension source.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Reuse the existing SDK client and build plugin patterns before adding new integration paths.
- Prefer the existing workflow over adding new npm scripts for backend-specific tasks.
- Run `npm run lint` and `npm run typecheck` from `package.json` before finishing code changes.
- Frontend uses Tailwind CSS tokens (`src/index.css` + `tailwind.config.js`) — never hardcode colors or fonts.
- All UI copy goes through the i18n system (`src/lib/i18n.jsx`), which supports 16 languages.