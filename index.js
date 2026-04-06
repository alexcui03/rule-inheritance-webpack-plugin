/**
 * @license
 * Copyright 2026 Alex Cui
 * SPDX-License-Identifier: MIT
 */

const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');

/**
 * @typedef {import('webpack').Compiler} Compiler
 * @typedef {import('webpack').Configuration} Configuration
 * @typedef {import('webpack').RuleSetRule} Rule
 */

/**
 * @typedef {object} Options
 * @property {string[]} packages Path to packages to inherit webpack configuration from.
 * @property {boolean} recursive Process rules recursively.
 */

/** @type {Options} */
const defaultOptions = {
  packages: [],
  recursive: true
};

class RuleInheritancePlugin {
  /**
   * @param {Partial<Options>} options Options.
   */
  constructor(options) {
    this.options = Object.assign({}, defaultOptions, options);
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
   * Update loader path to make it accessiable in parent package.
   * @param {Rule} rule Rule object.
   * @param {string} packagePath Path to package.
   * @returns {Rule} Updated rule.
   */
  updateLoader(rule, packagePath) {
    if (rule.loader) {
      // { loader: 'loader-name' }
      rule.loader = this.getModulePath(rule.loader, packagePath);
    } else if (rule.use) {
      if (typeof rule.use === 'string') {
        // { use: 'loader-name' }
        rule.use = this.getModulePath(rule.use, packagePath);
      } else if (Array.isArray(rule.use)) {
        // { use: [{ loader: 'loader-name' }] }
        for (const loader of rule.use) {
          if (loader.loader) {
            loader.loader = this.getModulePath(loader.loader, packagePath);
          }
        }
      } else if (typeof rule.use === 'object') {
        // { use: { loader: 'loader-name' } }
        if (rule.use.loader) {
          rule.use.loader = this.getModulePath(rule.use.loader, packagePath);
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
   * @returns {Configuration} Webpack config object. An error will be thrown if package doesn't exist.
   */
  getPackageConfig(packagePath) {
    if (
      !fs.existsSync(packagePath) ||
      !fs.statSync(packagePath).isDirectory() ||
      !fs.existsSync(path.join(packagePath, 'package.json'))
    ) {
      throw new Error(`${packagePath} is not a valid package`);
    }

    const webpackConfigPath = path.join(packagePath, 'webpack.config.js');
    if (!fs.existsSync(webpackConfigPath)) {
      throw new Error(`${packagePath} doesn't contain webpack.config.js`);
    }

    /** @type {Configuration | Configuration[]} */
    let config = require(webpackConfigPath);
    if (Array.isArray(config)) config = config[0]; // use first webpack config

    return config;
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
   * Get nherited rules from given packages.
   * @param {any} logger Webpack logger.
   * @param {Set<string>} inheritedPackages Set of packages' path that are inherited.
   * @returns {Rule[]} Inherited rules.
   */
  doRuleInheritance(logger, inheritedPackages) {
    /** @type {Rule[]} */
    const newRules = [];

    for (const packagePath of this.options.packages) {
      if (inheritedPackages.has(packagePath)) {
        logger.error(`skip ${packagePath} since it has been inherited`);
        continue;
      } else {
        inheritedPackages.add(packagePath);
      }

      let config;
      try {
        config = this.getPackageConfig(packagePath);
      } catch (error) {
        logger.error(error.message);
        continue;
      }

      // Inherit rules recursively.
      if (this.options.recursive && Array.isArray(config.plugins)) {
        const PluginClass = this.getPluginClassFromPackage(packagePath);
        if (PluginClass !== null) {
          for (const plugin of config.plugins) {
            if (plugin instanceof PluginClass) {
              if (typeof plugin.doRuleInheritance === 'function') {
                newRules.push(...plugin.doRuleInheritance(logger, inheritedPackages));
              }
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

      const inheritedPackages = new Set();
      const newRules = this.doRuleInheritance(logger, inheritedPackages);
      compiler.options.module.rules = newRules.concat(compiler.options.module.rules);
    });
  }
}

module.exports = RuleInheritancePlugin;
