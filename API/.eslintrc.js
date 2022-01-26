module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  rules: {
    'linebreak-style': ['error', 'windows'],
  },
  parserOptions: {
    ecmaVersion: 'latest',
  },
};
