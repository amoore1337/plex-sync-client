var path = require('path');

function resolvePath(localPath) {
  return path.resolve(__dirname, localPath);
}

module.exports = {
  devServer: {
    proxy: 'http://localhost:1337'
  },
  configureWebpack: {
    resolve: {
      alias: {
        styles: resolvePath('./src/styles')
      }
    }
  },
  css: {
    loaderOptions: {
      scss: {
        data: `
          @import "@/styles/global.scss";
          @import "@/styles/colors.scss";
        `
      }
    }
  }
}
