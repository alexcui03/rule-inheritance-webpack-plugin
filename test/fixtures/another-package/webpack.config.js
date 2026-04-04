const path = require('path');
const RuleInheritancePlugin = require('../../../index');

/** @type {import('webpack').Configuration} */
module.exports = {
  mode: 'development',
  entry: 'index.js',
  output: {
    filename: '[name].js'
  },
  module: {
    rules: [{
      test: /\.png$/,
      loader: 'sample-loader'
    }]
  },
  plugins: [
    new RuleInheritancePlugin({
      packages: [
        path.resolve(__dirname, '../sample-package')
      ]
    })
  ]
};
