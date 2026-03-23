/**
 * @license
 * Copyright 2026 Alex Cui
 * SPDX-License-Identifier: MIT
 */

const path = require('node:path');
const fs = require('node:fs');
const {isRegExp} = require('node:util/types');
const Module = require('node:module');

/**
 * @typedef {import('webpack').Compiler} Compiler
 * @typedef {import('webpack').Configuration} Configuration
 * @typedef {import('webpack').RuleSetRule} RuleSetRule
 * @typedef {Array<RuleSetRule>} Rules
 */

/**
 * @typedef {object} Options
 * @property {string[]} packages Path to packages to inherit webpack configuration from.
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
  _getModulePath(name, packagePath) {
    const packageRequire = Module.createRequire(packagePath);
    return packageRequire.resolve(name);
  }

  /**
   * Process the rule to fit the parent environment.
   * @param {RuleSetRule} rule Original rule object.
   * @param {string} packagePath Sub-package path.
   * @returns Processed rule object.
   */
  _processRule(rule, packagePath) {
    // Update loader path.
    if (rule.loader) {
      rule.loader = this._getModulePath(rule.loader, packagePath);
    } else if (rule.use) {
      if (typeof rule.use === 'string') {
        // use: 'string'
        rule.use = this._getModulePath(rule.use, packagePath);
      } else if (Array.isArray(rule.use)) {
        // use: [{loader, options}, {loader}]
        for (const loader of rule.use) {
          if (loader.loader) {
            loader.loader = this._getModulePath(loader.loader, packagePath);
          }
        }
      } else if (typeof rule.use === 'object') {
        // use: {loader, options}
        if (rule.use.loader) {
          rule.use.loader = this._getModulePath(rule.use.loader, packagePath);
        }
      } else {
        // @todo other cases
      }
    }

    // Update rule.include fields.
    if (rule.include) {
      if (typeof rule.include === 'object' && !Array.isArray(rule.include) && !isRegExp(rule.include)) {
        // rule.include is {and?, or?, not?} object
        if (rule.include.and) {
          rule.include.and.push(packagePath);
        } else {
          rule.include.and = [packagePath];
        }
      } else {
        rule.include = {
          and: [
            packagePath,
            rule.include
          ]
        }
      }
    } else {
      rule.include = [packagePath];
    }

    return rule;
  }

  /**
   * @param {Compiler} compiler
   */
  apply(compiler) {
    compiler.hooks.afterEnvironment.tap('RuleInheritancePlugin', () => {
      const logger = compiler.getInfrastructureLogger('rule-inheritance-webpack-plugin');

      /** @type {Rules} */
      const newRules = [];
      let lastNewRuleLength = 0; // Used for logging.

      for (const packagePath of this.options.packages) {
        const webpackConfigPath = path.join(packagePath, 'webpack.config.js');
        if (!fs.existsSync(webpackConfigPath)) {
          logger.error(`${packagePath} doesn't contain webpack.config.js`);
          continue;
        }

        /** @type {Configuration | Configuration[]} */
        let config = require(webpackConfigPath);
        if (Array.isArray(config)) config = config[0];

        if (!config.module || !config.module.rules) continue;

        for (const rule of config.module.rules) {
          newRules.push(this._processRule(rule, packagePath));
        }

        logger.info(`copied ${newRules.length - lastNewRuleLength} rules from ${webpackConfigPath}`);
        lastNewRuleLength = newRules.length;
      }

      compiler.options.module.rules.push(...newRules);
    });
  }
}

module.exports = RuleInheritancePlugin;
