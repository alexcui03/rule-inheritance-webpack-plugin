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

  test('simple', () => {
    const rule = this.plugin.updateLoader({
      use: {
        loader: 'test-loader',
        options: {}
      }
    }, 'test-package');

    expect(rule).toEqual({
      use: {
        loader: TEST_MODULE_PATH,
        options: {}
      }
    });
  });
});
