/**
 * @license
 * Copyright 2026 Alex Cui
 * SPDX-License-Identifier: MIT
 */

const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');

const webpack = require('webpack');
const { cleverMerge } = require('webpack/lib/util/cleverMerge');
const { create: createResolver } = require('enhanced-resolve');

/**
 * @typedef {import('webpack').Compiler} Compiler
 * @typedef {import('webpack').Configuration} Configuration
 * @typedef {import('webpack').RuleSetRule} Rule
 * @typedef {ReturnType<Compiler['getInfrastructureLogger']>} Logger
 * @typedef {import('enhanced-resolve').ResolveOptionsOptionalFS} ResolveOptions
 */

/**
 * Custom callback function to process loader options.
 * @callback Callback
 * @param {Rule} rule Rule object or {loader: string; options: any} object in the 'use' field.
 *    If rule.use is set, it should be a string specifying a loader.
 * @param {string} loader Loader name.
 * @param {string} packagePath Path to package.
 * @returns {void}
 */

/**
 * @typedef {object} Options
 * @property {string[]} packages Path to packages to inherit webpack configuration from.
 * @property {boolean} [recursive] Whether process rules recursively.
 * @property {{[key: string]: Callback}} [callbacks] Custom callback function to process loader options.
 * @property {boolean} [ignoreBuiltinCallbacks] Whether ignore builtin callback functions.
 */

const builtinCallbacks = {
  /** @type {Callback} */
  'ts-loader': (rule, loader, packagePath) => {
    const tsconfig = path.join(packagePath, 'tsconfig.json');
    if (!fs.existsSync(tsconfig)) {
      return;
    }

    if (typeof rule.use === 'string') {
      rule.use = {
        loader: rule.use,
        options: {
          configFile: tsconfig
        }
      };
    } else {
      if (rule.options) {
        if (rule.options.configFile) {
          rule.options.configFile = path.resolve(packagePath, rule.options.configFile);
        } else {
          rule.options.configFile = tsconfig;
        }
      } else {
        rule.options = {
          configFile: tsconfig
        };
      }
    }
  }
};

/** @type {Required<Options>} */
const defaultOptions = {
  packages: [],
  recursive: true,
  callbacks: {},
  ignoreBuiltinCallbacks: false
};

class RuleInheritancePlugin {
  /**
   * @param {Options} options Options.
   */
  constructor(options) {
    /** @type {Required<Options>} */
    this.options = Object.assign({}, defaultOptions, options);

    /** @type {Map<string, Callback>} */
    this.loaderCallbacks = new Map();

    if (!this.options.ignoreBuiltinCallbacks) {
      for (const loader in builtinCallbacks) {
        if (Object.prototype.hasOwnProperty.call(builtinCallbacks, loader)) {
          this.loaderCallbacks.set(loader, builtinCallbacks[loader]);
        }
      }
    }

    if (this.options.callbacks) {
      const callbacks = this.options.callbacks;
      for (const loader in callbacks) {
        if (Object.prototype.hasOwnProperty.call(callbacks, loader)) {
          this.loaderCallbacks.set(loader, callbacks[loader]);
        }
      }
    }
  }

  /**
   * Get resolve options from webpack config.
   * @param {Required<webpack.ResolveOptions>} options Resovle options of webpack config.
   * @param {string} [type] Type of dependency, default to commonjs. (e.g. commonjs, esm, loader, etc.)
   * @returns {ResolveOptions} Resolve options.
   */
  getResolveOptionsFromWebpack(options, type = 'commonjs') {
    const resolveOption = {
      modules: options.modules,
      aliasFields: options.aliasFields,
      conditionNames: options.conditionNames,
      mainFiles: options.mainFiles,
      mainFields: options.mainFields,
      extensions: options.extensions,
      exportsFields: options.exportsFields,
      roots: options.roots
    };
    // @todo decide which config to use.
    return cleverMerge(resolveOption, options.byDependency[type]);
  }

  /**
   * Get module real path that required from specific package.
   * @param {string} name Module name.
   * @param {string} packagePath Path to apply the require.
   * @returns {string} Path of module.
   */
  getModulePath(name, packagePath) {
    const targetPath = path.join(packagePath, 'package.json');
    const packageRequire = Module.createRequire(targetPath);
    return packageRequire.resolve(name);
  }

  /**
   * Get RuleInheritancePlugin class from specific package.
   * @param {string} packagePath Path to apply the require.
   * @returns {(new (...args: any[]) => any) | null} RuleInheritancePlugin class, null if no
   * package named 'rule-inheritance-webpack-plugin'.
   */
  getPluginClassFromPackage(packagePath) {
    try {
      const targetPath = path.join(packagePath, 'package.json');
      const packageRequire = Module.createRequire(targetPath);
      return packageRequire('rule-inheritance-webpack-plugin');
    } catch {
      return null;
    }
  }

  /**
   * Update rules by loader type. (e.g. ts-loader needs a correct tsconfig.json path
   * when it is not specified)
   * @param {Rule} rule Rule object, might be modified by this function.
   * @param {string} loader Loader name.
   * @param {string} packagePath Path to package.
   */
  updateLoaderByType(rule, loader, packagePath) {
    if (this.loaderCallbacks.has(loader)) {
      const callback = this.loaderCallbacks.get(loader);
      callback(rule, loader, packagePath);
    }
  }

  /**
   * Update loader path to make it accessiable in parent package.
   * @param {Rule} rule Rule object.
   * @param {string} packagePath Path to package.
   * @returns {Rule} Updated rule.
   */
  updateLoader(rule, packagePath) {
    if (rule.loader) {
      // { loader: 'loader-name' }
      const loader = rule.loader;
      rule.loader = this.getModulePath(rule.loader, packagePath);
      this.updateLoaderByType(rule, loader, packagePath);
    } else if (rule.use) {
      if (typeof rule.use === 'string') {
        // { use: 'loader-name' }
        const loader = rule.use;
        rule.use = this.getModulePath(rule.use, packagePath);
        this.updateLoaderByType(rule, loader, packagePath);
      } else if (Array.isArray(rule.use)) {
        // { use: [{ loader: 'loader-name' }] }
        for (const loader of rule.use) {
          if (loader.loader) {
            const loaderName = loader.loader;
            loader.loader = this.getModulePath(loader.loader, packagePath);
            this.updateLoaderByType(loader, loaderName, packagePath);
          }
        }
      } else if (typeof rule.use === 'object') {
        // { use: { loader: 'loader-name' } }
        if (rule.use.loader) {
          const loader = rule.use.loader;
          rule.use.loader = this.getModulePath(rule.use.loader, packagePath);
          this.updateLoaderByType(rule.use, loader, packagePath);
        }
      } else {
        // @todo other cases
      }
    }

    return rule;
  }

  /**
   * Update condition of rule object to make rules only make effects inside sub-packages.
   * @param {Rule} rule Rule object.
   * @param {string} packagePath Path to package.
   * @returns {Rule} Updated rule.
   */
  updateRuleCondition(rule, packagePath) {
    if (rule.include) {
      rule.include = {
        and: [
          packagePath,
          rule.include
        ]
      };
    } else {
      rule.include = [packagePath];
    }

    return rule;
  }

  /**
   * Get webpack configuration from given package.
   * @param {string} packagePath Path to package.
   * @param {ResolveOptions} resolveOptions Resolve options.
   * @param {Logger} logger Webpack logger.
   * @returns {webpack.WebpackOptionsNormalized} Webpack config object.
   *    An error will be thrown if package doesn't exist.
   */
  getPackageConfig(packagePath, resolveOptions, logger) {
    // Check that package path should be a existing directory and package.json must exists.
    if (
      !fs.existsSync(packagePath) ||
      !fs.statSync(packagePath).isDirectory() ||
      !fs.existsSync(path.join(packagePath, 'package.json'))
    ) {
      throw new Error(`${packagePath} is not a valid package`);
    }

    // Load webpack.config.js.
    const webpackConfigPath = path.join(packagePath, 'webpack.config.js');
    if (!fs.existsSync(webpackConfigPath)) {
      throw new Error(`${packagePath} doesn't contain webpack.config.js`);
    }

    /** @type {webpack.Configuration | webpack.Configuration[]} */
    let webpackConfigs = require(webpackConfigPath);
    if (!Array.isArray(webpackConfigs)) {
      webpackConfigs = [webpackConfigs];
    }
    if (webpackConfigs.length === 0) {
      throw new Error(`invalid webpack config, get: ${JSON.stringify(webpackConfigs)}`);
    }

    // Get entry in current condition name.
    if (resolveOptions.conditionNames) {
      // Ignore "webpack" condition name.
      resolveOptions.conditionNames = resolveOptions.conditionNames.filter((value) => value !== 'webpack');
    }
    const resolver = createResolver.sync(resolveOptions);
    const resolvedPath = resolver({}, packagePath, '.');

    let firstOption = null; // Record the first normalized options, it will be returned by default.

    // Check for each webpack config and choose the config that has the same output path to resolved path.
    for (const config of webpackConfigs) {
      // Change working directory to load default configs for webpack.
      const cwd = process.cwd();
      process.chdir(packagePath);

      const options = webpack.config.getNormalizedWebpackOptions(config);
      webpack.config.applyWebpackOptionsDefaults(options);

      // Restore working directory.
      process.chdir(cwd);

      if (!firstOption) firstOption = options;

      if (typeof options.entry === 'function') {
        // @TODO options.entry is Promise<EntryStaticNormalized>
        throw new Error('options.entry with function type is not supported now');
      } else {
        for (const entry of Object.keys(options.entry)) {
          const outputPath = path.resolve(
            options.output.path,
            options.output.filename.replaceAll('[name]', entry) // @todo support for other placeholders
          );

          // Check if output path fits resolved path.
          if (path.relative(resolvedPath, outputPath) === '') {
            return options;
          }
        }
      }
    }

    logger.warn(`no satisfied config found in ${packagePath}, the first config will be used`);
    return firstOption;
  }

  /**
   * Get inherited rules from webpack config object.
   * @param {Configuration} config Webpack config object.
   * @param {string} packagePath Path to package.
   * @returns {Rule[]} Inherited rules.
   */
  getInheritedRules(config, packagePath) {
    if (!config.module || !config.module.rules) return [];

    return config.module.rules.map((rule) => {
      const newRule = structuredClone(rule);
      this.updateLoader(newRule, packagePath);
      this.updateRuleCondition(newRule, packagePath);
      return newRule;
    });
  }

  /**
   * Merge custom callbacks into the plugin instance.
   * @param {{[key: string]: Callback}} callbacks Custom callbacks to merge.
   */
  mergeCallbacks(callbacks) {
    for (const loader in callbacks) {
      if (Object.prototype.hasOwnProperty.call(callbacks, loader)) {
        this.options.callbacks[loader] = callbacks[loader];
        this.loaderCallbacks.set(loader, callbacks[loader]);
      }
    }
  }

  /**
   * Get nherited rules from given packages.
   * @param {ResolveOptions} resolveOptions Resolve options.
   * @param {Logger} logger Webpack logger.
   * @param {Set<string>} [inheritedPackages] Set of packages' path that are inherited.
   * @returns {Rule[]} Inherited rules.
   */
  doRuleInheritance(resolveOptions, logger, inheritedPackages = new Set()) {
    /** @type {Rule[]} */
    const newRules = [];

    for (const packagePath of this.options.packages) {
      if (inheritedPackages.has(packagePath)) {
        logger.info(`skip ${packagePath} since it has been inherited`);
        continue;
      } else {
        inheritedPackages.add(packagePath);
      }

      let config;
      try {
        config = this.getPackageConfig(packagePath, resolveOptions, logger);
      } catch (error) {
        logger.error(error.message);
        continue;
      }

      // Inherit rules recursively.
      if (this.options.recursive && Array.isArray(config.plugins)) {
        const PluginClass = this.getPluginClassFromPackage(packagePath);
        if (PluginClass !== null) {
          for (const plugin of config.plugins) {
            if (
              plugin instanceof PluginClass &&
              typeof plugin.doRuleInheritance === 'function'
            ) {
              plugin.mergeCallbacks(this.options.callbacks);
              const rules = plugin.doRuleInheritance(
                this.getResolveOptionsFromWebpack(config.resolve),
                logger,
                inheritedPackages
              );
              newRules.push(...rules);
            }
          }
        }
      }

      const inheritedRules = this.getInheritedRules(config, packagePath);
      logger.info(`inherit ${inheritedRules.length} rules from ${packagePath}`);
      newRules.push(...inheritedRules);
    }

    return newRules;
  }

  /**
   * @param {Compiler} compiler Webpack compiler object.
   */
  apply(compiler) {
    compiler.hooks.afterEnvironment.tap('RuleInheritancePlugin', () => {
      const logger = compiler.getInfrastructureLogger('rule-inheritance-webpack-plugin');

      const newRules = this.doRuleInheritance(
        this.getResolveOptionsFromWebpack(compiler.options.resolve),
        logger
      );
      compiler.options.module.rules = newRules.concat(compiler.options.module.rules);
    });
  }
}

RuleInheritancePlugin.builtinCallbacks = builtinCallbacks;

module.exports = RuleInheritancePlugin;
