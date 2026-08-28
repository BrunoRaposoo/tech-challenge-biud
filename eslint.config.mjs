import shared from './packages/eslint-config/index.js';

export default [
  ...shared,
  {
    ignores: [
      'dist/**',
      '**/dist/**',
      'build/**',
      '**/build/**',
      '.next/**',
      '**/.next/**',
      'coverage/**',
      '**/coverage/**',
      'node_modules/**',
      'prisma/**',
    ],
  },
];
