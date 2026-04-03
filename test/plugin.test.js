
/**
 * @license
 * Copyright 2026 Alex Cui
 * SPDX-License-Identifier: MIT
 */

const path = require('node:path');
const webpack = require('webpack');

const RuleInheritancePlugin = require('../index');

describe('RuleInheritancePlugin', () => {
  test('simple', () => {
    /** @type {webpack.Configuration} */
    const options = {
      plugins: [
        new RuleInheritancePlugin({
          packages: [
            path.resolve(__dirname, 'fixtures/sample-package')
          ]
        })
      ]
    };

    const compiler = webpack(options);
    const rules = compiler.options.module.rules;

    expect(rules).toStrictEqual([
      {
        test: /\.txt$/,
        loader: path.resolve(__dirname, 'fixtures/sample-loader/index.js'),
        include: [
          path.resolve(__dirname, 'fixtures/sample-package')
        ]
      }
    ])
  });
});
