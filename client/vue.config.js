var path = require('path');

function resolvePath(localPath) {
  return path.resolve(__dirname, localPath);
}

module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:1337'
      },
      '/sockjs-node': {
        target: 'http://localhost:1337',
        ws: true,
        changeOrigin: true,
        logLevel: 'debug'
      }
    }
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
