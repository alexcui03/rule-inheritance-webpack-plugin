
/**
 * @license
 * Copyright 2026 Alex Cui
 * SPDX-License-Identifier: MIT
 */

const RuleInheritancePlugin = require('../../index');

const TEST_MODULE_PATH = 'TEST_MODULE_PATH';

describe('updateLoader', () => {
  beforeAll(() => {
    const plugin = new RuleInheritancePlugin();
    const mockGetModulePath = jest.spyOn(plugin, 'getModulePath');
    mockGetModulePath.mockReturnValue(TEST_MODULE_PATH);

    this.plugin = plugin;
  });

  test('{ loader: \'loader-name\' }', () => {
    const rule = this.plugin.updateLoader({
      loader: 'test-loader',
      options: {}
    }, 'test-package');

    expect(rule).toStrictEqual({
      loader: TEST_MODULE_PATH,
      options: {}
    });
  });

  test('{ use: \'loader-name\' }', () => {
    const rule = this.plugin.updateLoader({
      use: 'test-loader'
    }, 'test-package');

    expect(rule).toStrictEqual({
      use: TEST_MODULE_PATH
    });
  });

  test('{ use: { loader: \'loader-name\' } }', () => {
    const rule = this.plugin.updateLoader({
      use: {
        loader: 'test-loader'
      }
    }, 'test-package');

    expect(rule).toStrictEqual({
      use: {
        loader: TEST_MODULE_PATH
      }
    });
  });

  test('{ use: [{ loader: \'loader-name\' }] }', () => {
    const rule = this.plugin.updateLoader({
      use: [{
        loader: 'test-loader'
      }, {
        loader: 'another-test-loader'
      }]
    }, 'test-package');

    expect(rule).toStrictEqual({
      use: [{
        loader: TEST_MODULE_PATH
      }, {
        loader: TEST_MODULE_PATH
      }]
    });
  });
});
