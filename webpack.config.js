const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    performance: {
      hints: false
    }
  }, argv);
  // Customize the config before returning it.
  config.plugins.push(new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /us/));
  // config.plugins.push(new BundleAnalyzerPlugin({ path: 'web-report' }));
  config.module.rules.push({
    test: /\.m?js/,
    resolve: {
      fullySpecified: false,
    },
  });
  return config;
};
