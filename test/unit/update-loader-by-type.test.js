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
    let ruleUse = {
      loader: 'ts-loader'
    };
    this.plugin.updateLoaderByType(ruleUse, 'ts-loader', TEST_PACKAGE_PATH);
    expect(ruleUse).toEqual({
      loader: 'ts-loader',
      options: {
        configFile: path.join(TEST_PACKAGE_PATH, 'tsconfig.json')
      }
    });

    ruleUse = {
      loader: 'ts-loader',
      options: {
        configFile: CUSTOM_CONFIG_FILE
      }
    };
    this.plugin.updateLoaderByType(ruleUse, 'ts-loader', TEST_PACKAGE_PATH);
    expect(ruleUse).toEqual({
      loader: 'ts-loader',
      options: {
        configFile: path.resolve(TEST_PACKAGE_PATH, CUSTOM_CONFIG_FILE)
      }
    });
  });

  test('babel-loader', () => {
    const rules = [{
      loader: 'babel-loader'
    }, {
      loader: 'babel-loader',
      options: {
        cwd: '/custom/cwd'
      }
    }, {
      loader: 'babel-loader',
      options: 'cacheDirectory=true'
    }];

    for (const rule of rules) {
      this.plugin.updateLoaderByType(rule, 'babel-loader', TEST_PACKAGE_PATH);
    }

    expect(rules).toStrictEqual([{
      loader: 'babel-loader',
      options: {
        cwd: TEST_PACKAGE_PATH
      }
    }, {
      loader: 'babel-loader',
      options: {
        cwd: '/custom/cwd'
      }
    }, {
      loader: 'babel-loader',
      options: 'cacheDirectory=true'
    }]);
  });
});
