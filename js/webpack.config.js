const config = require('flarum-webpack-config')();

config.entry = {
  forum: './src/forum/index.js'
};

module.exports = config;
