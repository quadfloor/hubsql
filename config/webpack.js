var webpack = require("webpack");
var path = require("path");
var fs = require("fs");

var nodeModules = {};
fs.readdirSync("node_modules")
  .filter(function (x) {
    return [".bin"].indexOf(x) === -1;
  })
  .forEach(function (mod) {
    nodeModules[mod] = "commonjs " + mod;
  });

module.exports = {
  entry: "./src/index.js",
  target: "node",
  output: {
    path: path.join(__dirname, "../bundle"),
    filename: "hubsql.js",
  },
  externals: nodeModules,
  mode: "production",
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [["@babel/preset-env", { targets: "defaults" }]],
          },
        },
      },
    ],
  },
};
