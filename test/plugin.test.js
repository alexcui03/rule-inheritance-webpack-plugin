/**
 * @license
 * Copyright 2026 Alex Cui
 * SPDX-License-Identifier: MIT
 */

const path = require('node:path');
const webpack = require('webpack');

const RuleInheritancePlugin = require('../index');

/**
 * Transform all RegExp in object to its string value, to fix jest issue with
 * structuredClone.
 * @param {object} object Object to transform.
 * @returns {object} Transformed object.
 */
function transformRegExp(object) {
  for (const key in object) {
    if (object[key].constructor.name === 'RegExp') {
      object[key] = object[key].source;
    } else if (typeof object[key] === 'object') {
      transformRegExp(object[key]);
    }
  }

  return object;
}

describe('RuleInheritancePlugin', () => {
  test('simple', () => {
    /** @type {webpack.Configuration} */
    const options = {
      module: {
        rules: [{
          test: /\.svg$/,
          loader: 'sample-loader'
        }]
      },
      plugins: [
        new RuleInheritancePlugin({
          packages: [
            path.resolve(__dirname, 'fixtures/sample-package')
          ]
        })
      ]
    };

    const compiler = webpack(options);
    const rules = transformRegExp(compiler.options.module.rules);

    expect(rules).toEqual([
      {
        test: /\.txt$/.source,
        loader: path.resolve(__dirname, 'fixtures/sample-loader/index.js'),
        include: [
          path.resolve(__dirname, 'fixtures/sample-package')
        ]
      },
      {
        test: /\.svg$/.source,
        loader: 'sample-loader'
      }
    ]);
  });

  test('recursive', () => {
    /** @type {webpack.Configuration} */
    const options = {
      plugins: [
        new RuleInheritancePlugin({
          packages: [
            path.resolve(__dirname, 'fixtures/another-package')
          ]
        })
      ]
    };

    const compiler = webpack(options);
    const rules = transformRegExp(compiler.options.module.rules);

    expect(rules).toEqual([
      {
        test: /\.txt$/.source,
        loader: path.resolve(__dirname, 'fixtures/sample-loader/index.js'),
        include: [
          path.resolve(__dirname, 'fixtures/sample-package')
        ]
      },
      {
        test: /\.png$/.source,
        loader: path.resolve(__dirname, 'fixtures/sample-loader/index.js'),
        include: [
          path.resolve(__dirname, 'fixtures/another-package')
        ]
      }
    ]);
  });

  test('non recursive', () => {
    /** @type {webpack.Configuration} */
    const options = {
      plugins: [
        new RuleInheritancePlugin({
          packages: [
            path.resolve(__dirname, 'fixtures/another-package')
          ],
          recursive: false
        })
      ]
    };

    const compiler = webpack(options);
    const rules = transformRegExp(compiler.options.module.rules);

    expect(rules).toEqual([
      {
        test: /\.png$/.source,
        loader: path.resolve(__dirname, 'fixtures/sample-loader/index.js'),
        include: [
          path.resolve(__dirname, 'fixtures/another-package')
        ]
      }
    ]);
  });

  test('duplicated packages', () => {
    /** @type {webpack.Configuration} */
    const options = {
      plugins: [
        new RuleInheritancePlugin({
          packages: [
            path.resolve(__dirname, 'fixtures/sample-package'),
            path.resolve(__dirname, 'fixtures/another-package')
          ],
          recursive: true
        })
      ]
    };

    const compiler = webpack(options);
    const rules = transformRegExp(compiler.options.module.rules);

    expect(rules).toEqual([
      {
        test: /\.txt$/.source,
        loader: path.resolve(__dirname, 'fixtures/sample-loader/index.js'),
        include: [
          path.resolve(__dirname, 'fixtures/sample-package')
        ]
      },
      {
        test: /\.png$/.source,
        loader: path.resolve(__dirname, 'fixtures/sample-loader/index.js'),
        include: [
          path.resolve(__dirname, 'fixtures/another-package')
        ]
      }
    ]);
  });
});
