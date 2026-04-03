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
 * @property {boolean} [recursive] Process rules recursively.
 */

class RuleInheritancePlugin {
  /**
   * @param {Options} options
   */
  constructor(options = {packages: []}) {
    this.options = options;
  }

  /**
   * Get module real path that required from specific package.
   * @param {string} name Module name.
   * @param {string} packagePath Path to apply the require.
   * @returns Path of module.
   */
  getModulePath(name, packagePath) {
    const packageRequire = Module.createRequire(packagePath);
    return packageRequire.resolve(name);
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
   * @param {*} packagePath Path to package.
   * @returns {Configuration | null} Webpack config object, null if config doesn't exist.
   */
  getPackageConfig(packagePath) {
    const webpackConfigPath = path.join(packagePath, 'webpack.config.js');
    if (!fs.existsSync(webpackConfigPath)) {
      logger.error(`${packagePath} doesn't contain webpack.config.js`);
      return null;
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
      this.updateLoader(rule, packagePath);
      this.updateRuleCondition(rule, packagePath);
      return rule;
    });
  }

  /**
   * Get nherited rules from given packages.
   * @param {any} logger Webpack logger.
   * @returns Inherited rules.
   */
  doRuleInheritance(logger) {
    /** @type {Rule[]} */
    const newRules = [];

    for (const packagePath of this.options.packages) {
      const config = this.getPackageConfig(packagePath);
      if (!config) continue;

      // Inherit rules recursively.
      if (this.options.recursive && Array.isArray(config.plugins)) {
        for (const plugin of config.plugins) {
          if (plugin instanceof RuleInheritancePlugin) {
            newRules = newRules.concat(plugin.doRuleInheritance());
          }
        }
      }

      const inheritedRules = this.getInheritedRules(config, packagePath);
      logger.info(`inherit ${inheritedRules.length} rules from ${packagePath}`);
      newRules = newRules.concat(inheritedRules);
    }

    return newRules;
  }

  /**
   * @param {Compiler} compiler
   */
  apply(compiler) {
    compiler.hooks.afterEnvironment.tap('RuleInheritancePlugin', () => {
      const logger = compiler.getInfrastructureLogger('rule-inheritance-webpack-plugin');
      const newRules = this.doRuleInheritance(logger);
      compiler.options.module.rules.push(...newRules);
    });
  }
}

module.exports = RuleInheritancePlugin;
