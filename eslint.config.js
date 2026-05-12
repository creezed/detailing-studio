import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import nx from '@nx/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import unicornPlugin from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = fileURLToPath(new URL('.', import.meta.url));

const depConstraints = [
  { sourceTag: 'platform:node', onlyDependOnLibsWithTags: ['platform:node', 'platform:any'] },
  { sourceTag: 'platform:angular', onlyDependOnLibsWithTags: ['platform:angular', 'platform:any'] },
  {
    sourceTag: 'platform:mobile',
    onlyDependOnLibsWithTags: ['platform:mobile', 'platform:angular', 'platform:any'],
  },
  {
    sourceTag: 'platform:desktop',
    onlyDependOnLibsWithTags: ['platform:desktop', 'platform:angular', 'platform:any'],
  },
  { sourceTag: 'platform:any', onlyDependOnLibsWithTags: ['platform:any'] },

  {
    sourceTag: 'type:domain',
    onlyDependOnLibsWithTags: ['type:domain', 'type:util', 'type:types'],
  },
  {
    sourceTag: 'type:application',
    onlyDependOnLibsWithTags: [
      'type:domain',
      'type:application',
      'type:contracts',
      'type:util',
      'type:types',
    ],
  },
  {
    sourceTag: 'type:infrastructure',
    onlyDependOnLibsWithTags: [
      'type:domain',
      'type:application',
      'type:infrastructure',
      'type:contracts',
      'type:util',
      'type:types',
    ],
  },
  {
    sourceTag: 'type:interfaces',
    onlyDependOnLibsWithTags: [
      'type:application',
      'type:interfaces',
      'type:contracts',
      'type:util',
      'type:types',
    ],
  },
  {
    sourceTag: 'type:feature',
    onlyDependOnLibsWithTags: [
      'type:feature',
      'type:data-access',
      'type:ui',
      'type:contracts',
      'type:util',
      'type:types',
    ],
  },
  {
    sourceTag: 'type:data-access',
    onlyDependOnLibsWithTags: ['type:data-access', 'type:contracts', 'type:util', 'type:types'],
  },
  { sourceTag: 'type:ui', onlyDependOnLibsWithTags: ['type:ui', 'type:util', 'type:types'] },

  { sourceTag: 'scope:iam', onlyDependOnLibsWithTags: ['scope:iam', 'scope:shared'] },
  { sourceTag: 'scope:catalog', onlyDependOnLibsWithTags: ['scope:catalog', 'scope:shared'] },
  {
    sourceTag: 'scope:inventory',
    onlyDependOnLibsWithTags: ['scope:inventory', 'scope:shared'],
  },
  { sourceTag: 'scope:crm', onlyDependOnLibsWithTags: ['scope:crm', 'scope:shared'] },
  {
    sourceTag: 'scope:scheduling',
    onlyDependOnLibsWithTags: ['scope:scheduling', 'scope:shared'],
  },
  {
    sourceTag: 'scope:work-order',
    onlyDependOnLibsWithTags: ['scope:work-order', 'scope:shared'],
  },
  {
    sourceTag: 'scope:notifications',
    onlyDependOnLibsWithTags: ['scope:notifications', 'scope:shared'],
  },
  { sourceTag: 'scope:billing', onlyDependOnLibsWithTags: ['scope:billing', 'scope:shared'] },
  { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
];

const importOrderRule = [
  'error',
  {
    alphabetize: {
      caseInsensitive: true,
      order: 'asc',
    },
    groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'object', 'type'],
    'newlines-between': 'always',
    pathGroups: [
      {
        group: 'internal',
        pattern: '@det/**',
        position: 'before',
      },
    ],
    pathGroupsExcludedImportTypes: ['builtin'],
  },
];

const processEnvRule = [
  'error',
  {
    message:
      'process.env разрешён только в apps/backend/api/src/config/**. В остальных местах используй ConfigService.',
    object: 'process',
    property: 'env',
  },
];

const backendPlatformRestrictedImports = {
  patterns: [
    {
      group: ['@angular/*'],
      message: 'platform:node не должен импортировать Angular-код.',
    },
  ],
};

const frontendPlatformRestrictedImports = {
  patterns: [
    {
      group: ['@nestjs/*', '@mikro-orm/*'],
      message: 'platform:angular не должен импортировать backend-код.',
    },
  ],
};

const domainRestrictedImports = {
  paths: [
    'axios',
    'bullmq',
    'dotenv',
    'pino',
    'rxjs',
    'telegraf',
    'winston',
    {
      name: '@nestjs/config',
      message: 'Domain-слой не должен зависеть от ConfigService.',
    },
  ],
  patterns: [
    {
      group: ['@angular/*', '@mikro-orm/*', '@nestjs/*', 'rxjs/*'],
      message:
        'Domain-слой должен оставаться чистым TypeScript без framework/infrastructure imports.',
    },
  ],
};

const sharedRestrictedImports = {
  paths: ['rxjs'],
  patterns: [
    {
      group: ['@angular/*', '@mikro-orm/*', '@nestjs/*', 'rxjs/*'],
      message: 'libs/shared/** должен оставаться platform:any и pure TypeScript.',
    },
  ],
};

const featureRestrictedImports = {
  patterns: [
    ...frontendPlatformRestrictedImports.patterns,
    {
      group: ['@det/frontend-*-feature-*'],
      message:
        'feature → feature import запрещён. Композиция — в apps/frontend/<app>/src/app/app.routes.ts',
    },
  ],
};

const commonPlugins = {
  import: importPlugin,
  prettier: prettierPlugin,
  unicorn: unicornPlugin,
};

const commonRules = {
  'import/no-duplicates': 'error',
  'import/order': importOrderRule,
  'no-console': 'error',
  'no-restricted-properties': processEnvRule,
  'prettier/prettier': 'error',
  'unicorn/no-useless-undefined': 'error',
  'unicorn/prefer-node-protocol': 'error',
  'unicorn/prefer-string-starts-ends-with': 'error',
};

const unsafeRules = {
  '@typescript-eslint/no-unsafe-argument': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/no-unsafe-declaration-merging': 'error',
  '@typescript-eslint/no-unsafe-enum-comparison': 'error',
  '@typescript-eslint/no-unsafe-function-type': 'error',
  '@typescript-eslint/no-unsafe-member-access': 'error',
  '@typescript-eslint/no-unsafe-return': 'error',
  '@typescript-eslint/no-unsafe-unary-minus': 'error',
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/out-tsc/**',
      '**/tmp/**',
      '.nx/**',
      '.opencode/**',
      '.windsurf/**',
    ],
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        module: 'readonly',
        require: 'readonly',
        URL: 'readonly',
      },
      sourceType: 'module',
    },
    plugins: commonPlugins,
    rules: {
      ...js.configs.recommended.rules,
      ...commonRules,
    },
  },
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.base.json'],
        tsconfigRootDir,
      },
    },
    plugins: {
      ...commonPlugins,
      '@nx': nx,
    },
    rules: {
      ...commonRules,
      ...unsafeRules,
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: [],
          depConstraints,
          enforceBuildableLibDependency: true,
        },
      ],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          disallowTypeAnnotations: false,
          fixStyle: 'separate-type-imports',
          prefer: 'type-imports',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
    },
  },
  {
    files: ['libs/backend/**/*.ts', 'apps/backend/**/*.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': [
        'error',
        {
          allowWithDecorator: true,
        },
      ],
      'no-restricted-imports': ['error', backendPlatformRestrictedImports],
    },
  },
  {
    files: ['libs/frontend/**/*.ts', 'apps/frontend/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', frontendPlatformRestrictedImports],
    },
  },
  {
    files: ['libs/backend/*/domain/**/*.ts', 'libs/backend/shared/ddd/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', domainRestrictedImports],
    },
  },
  {
    files: ['libs/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', sharedRestrictedImports],
    },
  },
  {
    files: ['libs/frontend/*/feature-*/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', featureRestrictedImports],
    },
  },
  {
    files: ['apps/backend/api/src/config/**/*.ts', 'apps/backend/notifications-worker/src/config/**/*.ts'],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
  {
    files: ['**/*.e2e.ts', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      ...Object.fromEntries(Object.keys(unsafeRules).map((ruleName) => [ruleName, 'off'])),
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
