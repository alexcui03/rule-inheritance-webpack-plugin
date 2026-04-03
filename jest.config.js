/** @type {import('jest').Config} **/
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/test/unit/**/*.test.js',
    '<rootDir>/test/*.test.js'
  ],
  moduleNameMapper: {
    '^sample-package$': '<rootDir>/test/fixtures/sample-package',
    '^sample-loader$': '<rootDir>/test/fixtures/sample-loader'
  }
};
