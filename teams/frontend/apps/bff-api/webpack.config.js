/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const { DefinePlugin } = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const path = require('path');

module.exports = {
  optimization: {
    minimize: false,
    mangleExports: false,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        exclude: '/api/',
      }),
    ],
  },
  externals: [nodeExternals()],
  externalsPresets: { node: true },
  target: 'node',
  devtool: false,
  resolve: {
    extensions: ['.ts', '.js'],
    plugins: [new TsconfigPathsPlugin()],
  },
  stats: {
    warnings: false,
    modules: false,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  entry: {
    api: path.join(__dirname, './bin/api.ts'),
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, './dist'),
  },
  mode: 'production',
  plugins: [
    new CleanWebpackPlugin(),
    new DefinePlugin({
      GLOBAL_VAR_SERVICE_NAME: JSON.stringify('bff-api'),
      GLOBAL_VAR_NODE_ENV: JSON.stringify(process.env.NODE_ENV),
    }),
  ],
};
