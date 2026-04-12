/** @type {import('webpack').Configuration} */
module.exports = [
  {
    mode: 'development',
    entry: {
      index: 'index.js'
    },
    target: 'web',
    output: {
      filename: '[name].web.js'
    },
    module: {
      rules: [{
        test: /\.txt$/,
        loader: 'sample-loader'
      }]
    }
  },
  {
    mode: 'development',
    entry: {
      index: 'index.js'
    },
    target: 'node',
    output: {
      filename: '[name].node.js'
    },
    module: {
      rules: [{
        test: /\.node\.txt$/,
        loader: 'sample-loader'
      }]
    }
  }
];
