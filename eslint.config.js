import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'dev-dist', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  // Mechanical Hexagonal Purity & Determinism Gate (src/engine/**)
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'src/engine/** must stay 100% pure TypeScript with zero React imports.',
            },
            {
              name: 'react-dom',
              message: 'src/engine/** must stay 100% pure TypeScript with zero React DOM imports.',
            },
            {
              name: 'three',
              message: 'src/engine/** must stay 100% pure TypeScript with zero Three.js imports.',
            },
            {
              name: 'zustand',
              message: 'src/engine/** must stay 100% pure TypeScript with zero Zustand store imports.',
            },
          ],
          patterns: [
            {
              group: ['**/ui/**', '**/scene/**', '**/store/**', '**/art/**', '**/audio/**'],
              message:
                'src/engine/** must stay 100% pure domain TypeScript (never import from ui, scene, store, art, or audio).',
            },
            {
              group: ['@testing-library/*'],
              message: 'src/engine/** tests must test pure domain logic without DOM testing libraries.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'window',
          message: 'src/engine/** must not access browser globals (window).',
        },
        {
          name: 'document',
          message: 'src/engine/** must not access browser globals (document).',
        },
        {
          name: 'localStorage',
          message: 'src/engine/** must not access browser persistence globals directly.',
        },
        {
          name: 'sessionStorage',
          message: 'src/engine/** must not access browser persistence globals directly.',
        },
        {
          name: 'indexedDB',
          message: 'src/engine/** must not access IndexedDB directly (keep persistence in src/store/**).',
        },
        {
          name: 'navigator',
          message: 'src/engine/** must not access browser globals (navigator).',
        },
        {
          name: 'fetch',
          message: 'src/engine/** must be pure and offline-first (no network fetch).',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use SeededRng (src/engine/rng/seededRng.ts) instead of Math.random() for deterministic simulation.',
        },
      ],
    },
  },
  // CRAP-lite Complexity & Nesting Gate for pure production engine code
  {
    files: ['src/engine/**/*.ts'],
    ignores: ['src/engine/**/*.test.ts'],
    rules: {
      complexity: ['error', { max: 10 }],
      'max-depth': ['error', 3],
    },
  },
  // Seeded Determinism Gate for procedural art
  {
    files: ['src/art/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use SeededRng (src/engine/rng/seededRng.ts) instead of Math.random() so procedural art stays reproducible.',
        },
      ],
    },
  },
);
