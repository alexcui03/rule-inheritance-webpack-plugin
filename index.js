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
 * @typedef {import('webpack').RuleSetUse} RuleUse
 * @typedef {ReturnType<Compiler['getInfrastructureLogger']>} Logger
 * @typedef {import('enhanced-resolve').ResolveOptionsOptionalFS} ResolveOptions
 */

/**
 * @typedef {object} NormalizedRuleUse
 * @property {string} [ident] Unique loader options identifier.
 * @property {string} loader Loader name.
 * @property {string | Record<string, any>} [options] Loader options.
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
  'ts-loader': (options, packagePath) => {
    if (options.configFile) {
      options.configFile = path.resolve(packagePath, options.configFile);
    } else {
      const configFile = path.join(packagePath, 'tsconfig.json');
      if (fs.existsSync(configFile)) {
        options.configFile = configFile;
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

    /** @type {Logger} */
    this.logger = null;
  }

  /**
   * Set webpack logger.
   * @param {Logger} logger Webpac logger.
   */
  setLogger(logger) {
    this.logger = logger;
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
    const packageRequire = Module.createRequire(packagePath);
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
      const packageRequire = Module.createRequire(packagePath);
      return packageRequire('rule-inheritance-webpack-plugin');
    } catch {
      return null;
    }
  }

  /**
   * Update rules by loader type. (e.g. ts-loader needs a correct tsconfig.json path
   * when it is not specified)
   * @param {RuleUse} ruleUse Rule.use object, might be modified by this function.
   * @param {string} loader Loader name.
   * @param {string} packagePath Path to package.
   */
  updateLoaderByType(ruleUse, loader, packagePath) {
    if (this.loaderCallbacks.has(loader)) {
      const callback = this.loaderCallbacks.get(loader);
      if (!ruleUse.options) ruleUse.options = Object.create(null);
      callback(ruleUse.options, packagePath);
    }
  }

  /**
   * Update loader path to make it accessiable in parent package.
   * @param {Rule} rule Normalized rule object.
   * @param {string} packagePath Path to package.
   * @returns {Rule} Updated rule.
   */
  updateLoader(rule, packagePath) {
    if (Array.isArray(rule.use)) {
      for (const item of rule.use) {
        const loader = item.loader;
        item.loader = this.getModulePath(loader, packagePath);
        this.updateLoaderByType(item, item.loader, packagePath);
      }
    }

    if (typeof rule.use === 'object') {
      const loader = rule.use.loader;
      rule.use.loader = this.getModulePath(loader, packagePath);
      this.updateLoaderByType(rule.use, loader, packagePath);
    }

    // @todo other cases

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
   * @returns {webpack.WebpackOptionsNormalized} Webpack config object.
   *    An error will be thrown if package doesn't exist.
   */
  getPackageConfig(packagePath, resolveOptions) {
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

    this.logger.warn(`no satisfied config found in ${packagePath}, the first config will be used`);
    return firstOption;
  }

  /**
   * Normalize rule.use object.
   * @param {RuleUse} ruleUse Rule.use object.
   * @returns {NormalizedRuleUse} Normalized rule.use object.
   */
  normalizeRuleUse(ruleUse) {
    if (typeof ruleUse === 'string') {
      return {
        loader: ruleUse
      };
    }

    if (Array.isArray(ruleUse)) {
      return ruleUse.map((item) => this.normalizeRuleUse(item));
    }

    if (typeof ruleUse === 'object') {
      return ruleUse;
    }

    // @todo other cases
    return ruleUse;
  }

  /**
   * Normalize rule object.
   * @param {Rule} rule Rule object.
   * @returns {Rule} Normalized rule object.
   */
  normalizeRule(rule) {
    if (!rule.use && rule.loader) {
      rule.use = {
        loader: rule.loader
      };
      delete rule.loader;
      if (rule.options) {
        rule.use.options = rule.options;
        delete rule.options;
      }
    }

    rule.use = this.normalizeRuleUse(rule.use);
    return rule;
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
      this.normalizeRule(newRule);
      this.updateLoader(newRule, packagePath);
      this.updateRuleCondition(newRule, packagePath);
      return newRule;
    });
  }

  /**
   * Get nherited rules from given packages.
   * @param {ResolveOptions} resolveOptions Resolve options.
   * @param {Set<string>} [inheritedPackages] Set of paths to the packages that have been inherited.
   * @returns {Rule[]} Inherited rules.
   */
  doRuleInheritance(resolveOptions, inheritedPackages = new Set()) {
    /** @type {Rule[]} */
    const newRules = [];

    for (const packagePath of this.options.packages) {
      if (inheritedPackages.has(packagePath)) {
        this.logger.info(`skip ${packagePath} since it has been inherited`);
        continue;
      } else {
        inheritedPackages.add(packagePath);
      }

      let config;
      try {
        config = this.getPackageConfig(packagePath, resolveOptions);
      } catch (error) {
        this.logger.error(error.message);
        continue;
      }

      // Inherit rules recursively.
      if (this.options.recursive && Array.isArray(config.plugins)) {
        const PluginClass = this.getPluginClassFromPackage(packagePath);
        if (PluginClass !== null) {
          for (const plugin of config.plugins) {
            if (
              plugin instanceof PluginClass &&
              typeof plugin.setLogger === 'function' &&
              typeof plugin.doRuleInheritance === 'function'
            ) {
              plugin.setLogger(this.logger);
              const rules = plugin.doRuleInheritance(
                this.getResolveOptionsFromWebpack(config.resolve),
                inheritedPackages
              );
              newRules.push(...rules);
            }
          }
        }
      }

      const inheritedRules = this.getInheritedRules(config, packagePath);
      this.logger.info(`inherit ${inheritedRules.length} rules from ${packagePath}`);
      newRules.push(...inheritedRules);
    }

    return newRules;
  }

  /**
   * @param {Compiler} compiler Webpack compiler object.
   */
  apply(compiler) {
    compiler.hooks.afterEnvironment.tap('RuleInheritancePlugin', () => {
      this.logger = compiler.getInfrastructureLogger('rule-inheritance-webpack-plugin');
      const newRules = this.doRuleInheritance(
        this.getResolveOptionsFromWebpack(compiler.options.resolve)
      );
      compiler.options.module.rules = newRules.concat(compiler.options.module.rules);
    });
  }
}

RuleInheritancePlugin.builtinCallbacks = builtinCallbacks;

module.exports = RuleInheritancePlugin;
