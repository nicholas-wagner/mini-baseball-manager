# Contributing to Mini Baseball Manager

Thank you for helping build **Mini Baseball Manager**! This project is open source under the [MIT License](./LICENSE) and welcomes both human developers and AI-assisted contributions.

---

## Getting Started

1. Read **[PLAN.md](./PLAN.md)** for the big-picture vision and **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** for canonical TypeScript interfaces.
2. Browse **[docs/TASKS.md](./docs/TASKS.md)** and pick a ticket marked **`READY`** (or open an issue proposing a new feature or bug fix).
3. If you are using an AI coding agent, point it directly at **[AGENTS.md](./AGENTS.md)** first—it contains all hard architectural invariants, verification steps, and links to our portable engineering skills in **`.agents/skills/`** ([`ub-tdd-craft`](./.agents/skills/ub-tdd-craft/SKILL.md) and [`pstack-correct`](./.agents/skills/pstack-correct/SKILL.md), inspired by `unclebob/ub-mode` and `cursor/plugins/pstack`).

---

## Core Engineering Standards

1. **Strict Hexagonal Separation** *(mechanically enforced by `eslint.config.js`)*:
   - `src/engine/**` MUST remain 100% pure TypeScript with **zero** imports from `react`, `three`, `zustand`, `ui`, `scene`, `store`, `art`, `audio`, or DOM/browser globals.
   - Production `src/engine/**/*.ts` enforces cyclomatic `complexity <= 10` and `max-depth <= 3`.
   - Always use `SeededRng` (`src/engine/rng/seededRng.ts`) instead of `Math.random()` inside `src/engine/**` and `src/art/**`.
2. **Test-Driven Development (TDD)** *(mechanically enforced by `vitest.config.ts`)*:
   - Write failing Vitest tests **before** implementing new rules, simulation math, economy formulas, persistence migrations, or interactive UI components.
   - `src/engine/**/*.ts` must pass **≥90% coverage** across statements, branches, functions, and lines (`npm run test:coverage`).
3. **Offline-First & Mobile-First**:
   - Never add centralized backend database dependencies or runtime remote asset fetches (fonts, icons, and audio must stay bundled/procedural for Android PWA offline play).
   - Verify UI layouts on both Desktop (`1280×800`) and Android Mobile Portrait (`390×844`) with `>= 44px` tap targets.

---

## Pull Request Checklist

Before opening a PR, run the full local verification pipeline and ensure zero errors:

```bash
npm run test:coverage
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

- [ ] Failing TDD tests added first and passing with ≥90% `src/engine/` coverage (`npm run test:coverage`).
- [ ] `npm run typecheck`, `npm run lint`, and `npm run build` pass cleanly.
- [ ] If touching UI, SVG art, or 3D scenes, tested visually on desktop & mobile viewports and refreshed `README.md` / `docs/screenshots/` previews as needed.
- [ ] Updated `docs/TASKS.md`, `PLAN.md`, and `README.md` progress/features if completing a roadmap ticket or milestone.
