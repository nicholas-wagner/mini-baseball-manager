---
name: ub-tdd-craft
description: Disciplined TDD, Clean Code, and hexagonal architecture workflow inspired by Uncle Bob's ub-mode. Use when implementing any engine rule, simulation formula, RPG modifier, economy calculation, persistence migration, or refactoring task in Mini Baseball Manager.
---

# Clean TDD Craft (`ub-mode` Adapted for Mini Baseball Manager)

Use this workflow whenever creating or modifying domain logic, simulation math, persistence, or interactive components.

## Phase 1 — First Make It Work

1. **Attack the Premise & Subtract Before Adding**
   - Read `docs/ARCHITECTURE.md` and existing modules first.
   - Ask whether an existing module can be simplified or generalized instead of adding a parallel abstraction.
   - Prefer deleting dead branches and unifying formulas over adding special-case flags.

2. **Strict Red → Green TDD (Test Behavior, Not Implementation)**
   - Write a failing Vitest test **before** writing production code.
   - Assert **observable behavior and domain invariants** (inputs → outputs, probability distributions, edge cases, error contracts) rather than internal helper calls or private implementation details.
   - Run the targeted test first and confirm it fails for the expected reason (**RED**).
   - Write the smallest clean TypeScript implementation that makes it pass (**GREEN**).

3. **Hexagonal Boundary & Type Discipline**
   - `src/engine/**` MUST stay 100% pure TypeScript — zero imports from `react`, `three`, `zustand`, `ui`, `scene`, `store`, `art`, `audio`, or browser globals (`window`, `document`, `localStorage`, `indexedDB`). Enforced mechanically by `eslint.config.js`.
   - Thread `SeededRng` (`src/engine/rng/seededRng.ts`) explicitly; `Math.random()` is banned in `src/engine/**` and `src/art/**`.
   - Use discriminated unions, `readonly` records, and explicit domain types so invalid states are rejected by `tsc -b --noEmit`.

## Phase 2 — Then Make It Right

1. **Fix Root Causes**
   - Never hide a defect behind a magic offset, silent catch, or redundant guard.
   - Trace bugs back to the underlying state, coordinate system, or math invariant and fix it at the source.

2. **CRAP-Lite Complexity & Clarity**
   - Keep pure engine functions small, cohesive, and single-purpose.
   - Respect the mechanical ESLint caps on `src/engine/**/*.ts`: cyclomatic `complexity <= 10` and `max-depth <= 3`.
   - Extract well-named pure helpers when branching grows, and remove structural duplication.

3. **Deterministic Quality Gates**
   - `src/engine/**/*.ts` MUST stay at **>= 90%** across statements, branches, functions, and lines (enforced by `vitest.config.ts`).
   - Run the full verification pipeline:
     ```bash
     ./node_modules/.bin/vitest run --coverage
     ./node_modules/.bin/tsc -b --noEmit
     ./node_modules/.bin/eslint .
     ./node_modules/.bin/vite build
     ```

## Phase 3 — Practice

1. Work in small, atomic slices aligned to `docs/TASKS.md`.
2. Leave the tree cleaner than you found it — no stray scratch files, unused exports, or skipped tests.
3. Update `docs/TASKS.md`, `PLAN.md`, and (for visual/milestone updates) `README.md` + `docs/screenshots/`, then commit with a clear message referencing the Task ID.
