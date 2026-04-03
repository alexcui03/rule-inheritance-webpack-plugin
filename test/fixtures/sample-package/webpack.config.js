const path = require('node:path');

/** @type {import('webpack').Configuration} */
module.exports = {
  mode: 'development',
  entry: 'index.js',
  output: {
    filename: '[name].js',
  },
  module: {
    rules: [{
      test: /\.txt$/,
      loader: 'sample-loader'
    }]
  }
};
