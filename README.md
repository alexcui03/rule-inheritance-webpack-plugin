# rule-inheritance-webpack-plugin

![NPM Version](https://img.shields.io/npm/v/rule-inheritance-webpack-plugin?style=flat-square)

Inherit webpack rules from sub-packages. This plugin will copy all configuration from `module.rules` with additional `include` option to make rules are only applied in sub-packages. It will be useful when working with a monorepo with multiple webpack configurations.

## Usage

```js
const RuleInheritancePlugin = require('rule-inheritance-webpack-plugin');

module.exports = {
  // ...
  plugins: [
    new RuleInheritancePlugin({
      // List of paths to sub-packages.
      packages: [
        path.resolve(__dirname, '../packages/package-a'),
        path.resolve(__dirname, '../packages/package-b')
      ],

      // [Optional] True to inherit rules recursively if sub-package also have
      // a RuleInheritancePlugin. Default value is `true`.
      recursive: true,

      // [Optional] Map from loader name to callback function which is called
      // when processing loader options. (e.g. Redirect to correct config path)
      callbacks: {},

      // [Optional] True ignore builtin callback functions. Default value is
      // `false`.
      ignoreBuiltinCallbacks: false
    })
  ],
};
```
