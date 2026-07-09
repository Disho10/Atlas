import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Next.js 16 removed `next lint` and the `eslint` option in next.config.js —
// linting is now the ESLint CLI's job, driven by this file. See:
// https://nextjs.org/docs/app/api-reference/config/eslint
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    'supabase/functions/**', // Deno runtime, not part of the Next.js app's TS project
  ]),
]);
