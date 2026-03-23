/**
 * @license
 * Copyright 2026 Alex Cui
 * SPDX-License-Identifier: MIT
 */

const path = require('node:path');
const fs = require('node:fs');

/**
 * @typedef {import('webpack').Compiler} Compiler
 * @typedef {import('webpack').Configuration} Configuration
 * @typedef {Array<undefined | null | false | "" | 0 | import('webpack').RuleSetRule>} Rules
 */

/**
 * @typedef {object} Options
 * @property {string[]} packages Path to packages to inherit webpack configuration from.
 */

class InheritConfigPlugin {
  /**
   * @param {Options} options
   */
  constructor(options = {packages: []}) {
    this.options = options;
  }

  /**
   * @param {Compiler} compiler
   */
  apply(compiler) {
    compiler.hooks.afterEnvironment.tap('InheritConfigPlugin', () => {
      const logger = compiler.getInfrastructureLogger('inherit-config-webpack-plugin');

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
          if (rule.include) {
            // @todo process with complicated match rules
          } else {
            rule.include = [packagePath];
          }

          if (rule.exclude) {
            // @todo process with complicated match rules
          }

          newRules.push(rule);
        }

        logger.info(`copied ${newRules.length - lastNewRuleLength} rules from ${webpackConfigPath}`);
        lastNewRuleLength = newRules.length;
      }

      compiler.options.module.rules.push(...newRules);
    });
  }
}

module.exports = InheritConfigPlugin;
