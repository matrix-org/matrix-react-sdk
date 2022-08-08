const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './demo',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: 'demo.[hash].js',
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.(jsx?|tsx?)$/,
        use: [
          'react-hot-loader/webpack',
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.demo.json',
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      hash: false,
      minify: false,
      filename: 'index.html',
      title: 'react-blurhash demo',
    }),
  ],
  devServer: {
    contentBase: path.join(__dirname, 'demo'),
    port: 9000,
  },
};
