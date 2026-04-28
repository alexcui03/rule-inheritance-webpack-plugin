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

  test('doRuleInheritance should merge callbacks into nested plugin', () => {
    const callback = jest.fn();
    const parentPlugin = new RuleInheritancePlugin({
      packages: ['parent-package'],
      callbacks: {
        'custom-loader': callback
      }
    });
    const childPlugin = new RuleInheritancePlugin();

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

    jest.spyOn(parentPlugin, 'getPluginClassFromPackage').mockReturnValue(RuleInheritancePlugin);

    const mergeCallbacksSpy = jest.spyOn(childPlugin, 'mergeCallbacks');
    const doRuleInheritanceSpy = jest.spyOn(childPlugin, 'doRuleInheritance').mockReturnValue([]);

    parentPlugin.doRuleInheritance({}, logger);

    expect(mergeCallbacksSpy).toHaveBeenCalledWith(parentPlugin.options.callbacks);
    expect(doRuleInheritanceSpy).toHaveBeenCalled();
    expect(childPlugin.options.callbacks['custom-loader']).toBe(callback);
    expect(mergeCallbacksSpy.mock.invocationCallOrder[0]).toBeLessThan(
      doRuleInheritanceSpy.mock.invocationCallOrder[0]
    );
  });
});
