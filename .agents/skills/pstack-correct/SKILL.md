---
name: pstack-correct
description: Root-cause engineering, architectural sketching, and mistake-elimination workflow inspired by pstack (/correct, deep work first, and fearless verification). Use when fixing a bug, solving a recurring agent mistake, designing a multi-file slice, or hardening architectural invariants in Mini Baseball Manager.
---

# Root-Cause & `/correct` Workflow (`pstack` Adapted for Mini Baseball Manager)

Use this workflow when designing complex slices, investigating defects, or ensuring a mistake can never happen twice.

## 1. Architectural Sketch First (Types & Contracts Before Code)

Before writing implementation code for a multi-file feature or engine slice:

1. Check `docs/ARCHITECTURE.md` and `docs/TASKS.md` for canonical interfaces and slice boundaries.
2. Sketch the exact exported types, pure function signatures, and data flow first:
   - Pure rules & state transitions live in `src/engine/**`.
   - Imperative 3D rendering lives in `src/scene/**` (with pure math helpers runnable in Node/jsdom without WebGL).
   - Store wiring lives in `src/store/**`; thin React views live in `src/ui/**`.
3. Confirm the smallest clean diff that satisfies all acceptance criteria without leaking state across layers.

## 2. Fix Root Causes & Subtract Before Adding

- Diagnose *why* a bug, visual mismatch, or test flake occurred before touching code.
- If a fix feels like a workaround (e.g., an ad-hoc offset, a hardcoded retry, or a duplicated check), stop and look for the shared invariant that broke.
- Prefer deleting fragile branches and tightening a shared formula over bolting on exceptions.

## 3. The `/correct` Mistake-Elimination Ladder

Whenever you resolve a bug, visual regression, or agent slip, climb as high up this enforcement ladder as practical so future contributors and agents cannot repeat it:

1. **Type System (`tsc -b --noEmit`)** *(Strongest)*
   - Tighten union types, required properties, or helper signatures so the bad state fails to compile.
2. **Mechanical Lint Rule (`eslint.config.js`)**
   - Encode architectural boundaries and banned APIs (`no-restricted-imports`, `no-restricted-properties`, `no-restricted-globals`, `complexity`, `max-depth`) with actionable error messages.
3. **Seeded Regression Test (`vitest`)**
   - Write a deterministic Vitest test that reproduces the exact bug first (**RED**), then passes after the root-cause fix (**GREEN**).
4. **Visual / E2E Guard (`playwright`)**
   - For 2.5D chibi SVG anatomy, card layouts, or 3D ballpark changes, verify live renders across Desktop (`1280×800`) and Android Mobile (`390×844`).
5. **Documented Pitfall (`AGENTS.md` §5)** *(Context supplement, never the only defense)*
   - Add a brief entry to `AGENTS.md` §5 only after encoding every mechanical check above.

## 4. Verification Before Claiming Done

- Never declare a fix complete from code reading alone.
- Run the actual failing check/test before fixing when practical, then verify the full green toolchain (`vitest run --coverage`, `tsc -b --noEmit`, `eslint .`, `vite build`, and `playwright test` for UI/SVG/3D work).
