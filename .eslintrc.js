module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true
  },
  // extends: ["eslint:recommended"],
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['prettier'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    'no-unused-vars': ['warn', { vars: 'all', args: 'after-used', ignoreRestSiblings: false }]
    // 'prettier/prettier': ['error'],
    // indent: ['error', 'tab'],
    // 'linebreak-style': ['error', 'unix'],
    // quotes: ['error', 'single'],
    // semi: ['error', 'never']
  }
};
