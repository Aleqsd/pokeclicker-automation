# Repository Guidelines

## Project Structure & Module Organization
The Tampermonkey entry point lives in `Automation-UserScript.js`, which bootstraps the loader in `src/ComponentLoader.js`. Feature code sits in `src/lib`, split into top-level automation classes (for example `src/lib/Farm.js`) and submodules such as `Focus/`, `Instances/`, and `Utils/`. Shared configuration for editor tooling is captured in `src/jsconfig.json`. Test scaffolding is isolated under `tst/`: runtime stubs in `tst/stubs/`, import bundles in `tst/imports/`, helpers in `tst/utils/`, and Jest specs in `tst/tests/` (note the `Hachery/` typo is intentional and matches runtime code). Keep new assets alongside their nearest automation module and expose them via the loader to preserve deterministic load order.

## Build, Test, and Development Commands
- `npm install --prefix tst`: set up Jest and related tooling inside the dedicated test workspace.
- `./tst/resolve_test_imports.sh`: expand `.test.in.js` fixtures into runnable `.test.js` files; rerun after changing imports.
- `npm test --prefix tst`: execute the Jest suite with verbose output once the import resolver has run.
- `make test`: convenience wrapper that installs the test workspace, resolves imports, runs Jest, and cleans up the generated `.test.js` artifacts.
- Browser smoke test: load `Automation-UserScript.js` in Tampermonkey and point `releaseLabel` at your branch for manual verification.

## Coding Style & Naming Conventions
JavaScript modules follow four-space indentation with Allman-style braces. Classes and automation modules use `PascalCase`, while internal helpers favour `camelCase`; internal-only members often carry an `__internal__` prefix. Prefer `const`/`let` over `var`, except where legacy compatibility is required by the game runtime. Log lines should remain consistent with the existing `[timestamp] %cMessage` format to keep browser console output searchable. When adding new modules, export a single automation class and wire it through `Automation` in `src/Automation.js` and the loader in dependency order.

## Testing Guidelines
Jest drives the suite, relying on the browser and game stubs within `tst/stubs/`. Tests mirror runtime areas via `.test.in.js` naming; create new specs with that suffix so the resolver can inline shared imports. Favour deterministic timers (`jest.useFakeTimers`) to keep automation loops predictable. High-value paths—farm unlocks, hatchery cycles, underground routines—should carry regression coverage; backfill tests when altering automation heuristics or changing DOM contract assumptions. After generating `.test.js` files, clean them (`git checkout -- tst/tests/*.test.js`) before committing to avoid noise.
Always run `make test` (or the equivalent setup/resolve/test steps) to confirm changes do not introduce regressions.

## Commit & Pull Request Guidelines
Existing history uses `Area: short imperative summary (issue #123)` messages; match that style and include the issue reference when applicable. Commits should remain scoped to one automation feature or bug fix so users can cherry-pick patches. Pull requests need a concise problem statement, a bullet summary of changes, and either reproduction steps or Tampermonkey screenshots when UI toggles move. Confirm the Jest suite passes and call out any manual verification performed so reviewers can prioritise their testing.
