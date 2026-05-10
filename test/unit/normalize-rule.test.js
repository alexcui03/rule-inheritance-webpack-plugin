/**
 * @license
 * Copyright 2026 Alex Cui
 * SPDX-License-Identifier: MIT
 */

const RuleInheritancePlugin = require('../../index');

describe('normalizedRule', () => {
  beforeAll(() => {
    this.plugin = new RuleInheritancePlugin();
  });

  test('{ loader: \'loader-name\' }', () => {
    const rule = this.plugin.normalizeRule({
      loader: 'test-loader',
      options: {}
    }, 'test-package');

    expect(rule).toEqual({
      use: {
        loader: 'test-loader',
        options: {}
      }
    });
  });

  test('{ use: \'loader-name\' }', () => {
    const rule = this.plugin.normalizeRule({
      use: 'test-loader'
    }, 'test-package');

    expect(rule).toStrictEqual({
      use: {
        loader: 'test-loader'
      }
    });
  });

  test('{ use: { loader: \'loader-name\' } }', () => {
    const rule = this.plugin.normalizeRule({
      use: {
        loader: 'test-loader'
      }
    }, 'test-package');

    expect(rule).toStrictEqual({
      use: {
        loader: 'test-loader'
      }
    });
  });

  test('{ use: [{ loader: \'loader-name\' }] }', () => {
    const rule = this.plugin.normalizeRule({
      use: [
        { loader: 'test-loader' },
        'another-test-loader'
      ]
    }, 'test-package');

    expect(rule).toStrictEqual({
      use: [{
        loader: 'test-loader'
      }, {
        loader: 'another-test-loader'
      }]
    });
  });
});
