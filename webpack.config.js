const path = require("path");
const webpack = require("webpack");

// Read config for build-time values only
const config = require("./config.json");

module.exports = {
  entry: {
    app: path.resolve(__dirname, "public", "js", "app.jsx"),
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "@babel/preset-env",
              ["@babel/preset-react", { runtime: "automatic" }],
            ],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        supportedFileTypes: JSON.stringify(config.supportedFileTypes.join(",")),
      },
    }),
    // Provide jQuery globally for Bootstrap
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
    }),
  ],
  resolve: {
    extensions: [".js", ".jsx"],
    fallback: {
      path: require.resolve("path-browserify"),
    },
    alias: {
      // Alias for config to use a browser-safe version
      config: path.resolve(__dirname, "public", "js", "config.js"),
    },
  },
  output: {
    path: path.join(__dirname, "public", "js"),
    filename: "[name].js",
    clean: false,
  },
  target: "web",
  performance: {
    hints: false,
  },
};
