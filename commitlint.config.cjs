module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'iam',
        'catalog',
        'inventory',
        'crm',
        'scheduling',
        'work-order',
        'notifications',
        'billing',
        'shared',
        'api',
        'admin',
        'client',
        'master',
        'infra',
      ],
    ],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'test', 'docs', 'chore', 'ci', 'perf', 'style', 'build'],
    ],
  },
};
