# Contributing to Mini Baseball Manager

Thank you for helping build **Mini Baseball Manager**! This project is open source under the [MIT License](./LICENSE) and welcomes both human developers and AI-assisted contributions.

---

## Getting Started

1. Read **[PLAN.md](./PLAN.md)** for the big-picture vision and **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** for canonical TypeScript interfaces.
2. Browse **[docs/TASKS.md](./docs/TASKS.md)** and pick a ticket marked **`READY`** (or open an issue proposing a new feature or bug fix).
3. If you are using an AI coding agent, point it directly at **[AGENTS.md](./AGENTS.md)** first—it contains all hard architectural invariants and verification steps.

---

## Core Engineering Standards

1. **Strict Hexagonal Separation**:
   - `src/engine/**` MUST remain 100% pure TypeScript with **zero** imports from `react`, `three`, `zustand`, or DOM/browser APIs.
   - Always use `SeededRng` (`src/engine/rng/seededRng.ts`) instead of `Math.random()` inside `src/engine/**` and `src/art/**`.
2. **Test-Driven Development (TDD)**:
   - Write failing Vitest tests **before** implementing new rules, simulation math, economy formulas, persistence migrations, or interactive UI components.
   - Target **≥90% test coverage** across `src/engine/**`.
3. **Offline-First & Mobile-First**:
   - Never add centralized backend database dependencies or runtime remote asset fetches (fonts, icons, and audio must stay bundled/procedural for Android PWA offline play).
   - Verify UI layouts on both Desktop (`1280×800`) and Android Mobile Portrait (`390×844`) with `>= 44px` tap targets.

---

## Pull Request Checklist

Before opening a PR, run the full local verification pipeline and ensure zero errors:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

- [ ] Failing TDD tests added first and passing (`npm test`).
- [ ] `npm run typecheck`, `npm run lint`, and `npm run build` pass cleanly.
- [ ] If touching UI, SVG art, or 3D scenes, tested visually on desktop & mobile viewports.
- [ ] Updated `docs/TASKS.md` and `PLAN.md` progress counts if completing a roadmap ticket.
