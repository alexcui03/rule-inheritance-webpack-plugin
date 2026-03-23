# rule-inheritance-webpack-plugin

![NPM Version](https://img.shields.io/npm/v/rule-inheritance-webpack-plugin?style=flat-square)

Inherit webpack rules from sub-packages. This plugin will copy all configuration from `module.rules` with additional `include` option to make rules are only applied in sub-packages. It will be useful when working with a monorepo with multiple webpack configurations.

Note: All loaders used in sub-packages should also be available in parent package. (e.g. as dev dependencies of parent package)

## Usage

```js
const RuleInheritancePlugin = require('rule-inheritance-webpack-plugin');

module.exports = {
  // ...
  plugins: [
    new RuleInheritancePlugin({
      packages: [
        path.resolve(__dirname, '../packages/package-a'),
        path.resolve(__dirname, '../packages/package-b')
      ]
    })
  ],
};
```
