/**
 * @license
 * Copyright 2026 Alex Cui
 * SPDX-License-Identifier: MIT
 */

const path = require('node:path');
const fs = require('node:fs');

const RuleInheritancePlugin = require('../../index');

const TEST_PACKAGE_PATH = 'test-package';
const CUSTOM_CONFIG_FILE = 'tsconfig.custom.json';

describe('updateLoaderByType', () => {
  beforeAll(() => {
    const plugin = new RuleInheritancePlugin();
    const mockExistsSync = jest.spyOn(fs, 'existsSync');
    mockExistsSync.mockReturnValue(true);

    this.plugin = plugin;
  });

  test('ts-loader', () => {
    const rules = [{
      loader: 'ts-loader'
    }, {
      loader: 'ts-loader',
      options: {
        configFile: CUSTOM_CONFIG_FILE
      }
    }, {
      use: 'ts-loader'
    }];

    for (const rule of rules) {
      this.plugin.updateLoaderByType(rule, 'ts-loader', TEST_PACKAGE_PATH);
    }

    const expectConfig = path.join(TEST_PACKAGE_PATH, 'tsconfig.json');
    expect(rules).toStrictEqual([{
      loader: 'ts-loader',
      options: {
        configFile: expectConfig
      }
    }, {
      loader: 'ts-loader',
      options: {
        configFile: path.resolve(TEST_PACKAGE_PATH, CUSTOM_CONFIG_FILE)
      }
    }, {
      use: {
        loader: 'ts-loader',
        options: {
          configFile: expectConfig
        }
      }
    }]);
  });
});
