module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true
  },
  // extends: ["eslint:recommended"],
  extends: ['airbnb-base', 'prettier'],
  plugins: ['prettier'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    'prettier/prettier': ['error'],
    'no-unused-vars': ['warn', { vars: 'all', args: 'after-used', ignoreRestSiblings: false }],
    'no-console': 0
    // indent: ['error', 'tab'],
    // 'linebreak-style': ['error', 'unix'],
    // quotes: ['error', 'single'],
    // semi: ['error', 'never']
  }
};
