const js = require('@eslint/js');
const jsdoc = require('eslint-plugin-jsdoc');
const googleStyle = require('eslint-config-google');
const globals = require('globals');

// These rules are no longer supported, but the Google style package we depend
// on hasn't been updated in years to remove them, even though they have been
// removed from the repo. Manually delete them here to avoid breaking linting.
delete googleStyle.rules['valid-jsdoc'];
delete googleStyle.rules['require-jsdoc'];

module.exports = [
  {
    ignores: [
      'node_modules/*',
      'coverage/*'
    ]
  },
  js.configs.recommended,
  jsdoc.configs['flat/recommended'],
  googleStyle,
  {
    rules: {
      'max-len': ['error', {
        code: 120,
        tabWidth: 2
      }],
      'comma-dangle': ['error', 'never'],
      'jsdoc/check-values': ['off'],
      'object-curly-spacing': ['error', 'always'],
      'indent': ['error', 2, {
        SwitchCase: 1
      }]
    }
  },
  {
    files: [
      'index.js',
      '*.config.js'
    ],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: [
      'test/**/*.{js,cjs,mjs}'
    ],
    rules: {
      'no-invalid-this': ['off']
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    }
  }
];
