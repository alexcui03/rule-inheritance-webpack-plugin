/**
 * @license
 * Copyright 2026 Simon Shiki
 * SPDX-License-Identifier: MIT
 */

const RuleInheritancePlugin = require('../../index');

describe('recursive inheritance callbacks', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('mergeCallbacks should update callbacks and loaderCallbacks map', () => {
    const plugin = new RuleInheritancePlugin();
    const callback = jest.fn();

    plugin.mergeCallbacks({
      'custom-loader': callback
    });

    expect(plugin.options.callbacks['custom-loader']).toBe(callback);
    expect(plugin.loaderCallbacks.get('custom-loader')).toBe(callback);
  });

  test('doRuleInheritance should not mutate nested plugin', () => {
    const callback = jest.fn();
    const parentPlugin = new RuleInheritancePlugin({
      packages: ['parent-package'],
      callbacks: {
        'custom-loader': callback
      }
    });

    const spyDoRuleInheritance = jest.fn().mockReturnValue([]);

    class ChildPluginClass {
      constructor(options) {
        this.options = options || {};
      }

      doRuleInheritance = spyDoRuleInheritance;
      getResolveOptionsFromWebpack = jest.fn().mockReturnValue({});
    }

    const childPlugin = new ChildPluginClass();

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    jest.spyOn(parentPlugin, 'getPackageConfig').mockReturnValue({
      resolve: {
        modules: [],
        aliasFields: [],
        conditionNames: [],
        mainFiles: [],
        mainFields: [],
        extensions: [],
        exportsFields: [],
        roots: [],
        byDependency: {
          commonjs: {}
        }
      },
      plugins: [childPlugin]
    });

    jest.spyOn(parentPlugin, 'getPluginClassFromPackage').mockReturnValue(ChildPluginClass);

    parentPlugin.doRuleInheritance({}, logger);

    expect(childPlugin.options.callbacks).toBeUndefined();
    expect(spyDoRuleInheritance).toHaveBeenCalledTimes(1);
  });
});
