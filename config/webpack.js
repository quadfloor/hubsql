var webpack = require("webpack");
var path = require("path");
var fs = require("fs");

var nodeModules = {};
fs
  .readdirSync("node_modules")
  .filter(function(x) {
    return [".bin"].indexOf(x) === -1;
  })
  .forEach(function(mod) {
    nodeModules[mod] = "commonjs " + mod;
  });

module.exports = {
  entry: "./src/index.js",
  target: "node",
  output: {
    path: path.join(__dirname, "../bundle"),
    filename: "hubsql.js"
  },
  externals: nodeModules,
  mode: "production"
};
