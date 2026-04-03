const { defineConfig } = require('eslint/config');
const js = require('@eslint/js');
const globals = require('globals');

module.exports = defineConfig([
  {
		files: [
      'index.js',
      'eslint.config.js'
    ],
    plugins: {
      js
    },
    extends: [
      'js/recommended'
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      }
    }
	},
  {
    files: [
      'test/**/*.js'
    ],
    plugins: {
      js
    },
    extends: [
      'js/recommended'
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    }
  }
]);
