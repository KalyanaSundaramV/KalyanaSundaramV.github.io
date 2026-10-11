# Repository rules for GitHub Copilot

This repository is Kalyana Sundaram V's portfolio site: Vite 8, React 19,
@react-three/fiber, @react-three/rapier, Tailwind, Vitest. Claude Code works in
the same working tree at the same time, so follow the parallel-work protocol.

## Commands

`pnpm` is not on PATH. Use Corepack (pnpm 10.34.6) from the repo root:

```bash
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm run lint
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm run typecheck
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm exec vitest run <test file>
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm exec prettier --write <your files>
```

## Parallel-work protocol

- Edit only the files listed under "Allowed files" in your task brief
  (`docs/agent-tasks/`). Need a change anywhere else? Write the request in
  `docs/agent-tasks/STATUS.md` instead of editing.
- Format only your own files with the scoped prettier command above. Never run
  the repo-wide `pnpm run format`: it rewrites files Claude has open.
- Run focused tests on your test file. `lint` and `typecheck` are fine any
  time. Claude runs the full suite at integration.
- Start only tasks marked **Open** in `docs/agent-tasks/STATUS.md`.
- When done, append your report to `STATUS.md`: files changed, tests added and
  what each proves, commands run with results, unresolved concerns.

## Code rules

- No new dependencies.
- Pure logic goes in `src/lib` (web) or `scripts/lib` (Node tooling) and gets
  a Vitest test in `tests/` with at least one passing and one failing case.
- Never change the frozen types in `src/lib/contracts.ts`; ask in `STATUS.md`.
- CSS goes in `src/glass.css` (there is no `src/styles/` folder).
- The tool type is `ToolId` from `src/lib/destruction.ts`: `hammer`,
  `wrecking-ball`, `dynamite`, `crusher`, `plasma`.
- Never touch Unity files or anything outside this repository.
- No unrelated refactors. Do the assigned scope only.
- Match the surrounding code: comment density, naming, idioms.
- Do not commit.
