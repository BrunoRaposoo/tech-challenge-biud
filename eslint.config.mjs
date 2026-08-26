import shared from './packages/eslint-config/index.js';

export default [
  ...shared,
  {
    ignores: ['dist/**', 'build/**', '.next/**', 'coverage/**', 'node_modules/**', 'prisma/**'],
  },
];
