const webpack = require('webpack')
const identity = require('lodash/identity')
const { moduleExtend } = require('sugo-analytics-common-tools/lib/file-extend')
const TerserPlugin = require('terser-webpack-plugin-legacy')
const HappyPack = require('happypack')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const sysConfigDefault = require('./src/server/config')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')
const packThreadCount = sysConfigDefault.devCPUCount
const happyThreadPool = packThreadCount === 0 ? null : HappyPack.ThreadPool({ size: packThreadCount })
const path = require('path')
const env = process.env.NODE_ENV

// debug out of memory
// require('node-oom-heapdump')({
//   path: path.resolve(__dirname, 'my_heapdump1')
// })

const happyConf = {
  loaders: ['babel-loader?cacheDirectory=true'],
  threadPool: happyThreadPool,
  verbose: true
}

// 用于抽离公共模块
const commonsChunkPlugin = new webpack.optimize.CommonsChunkPlugin({
  // name: 'common', // Move dependencies to our vender file
  children: true, // Look for common dependencies in all children,
  async: true,
  // 某个模块被加载两次即以上
  minChunks: 2 // How many times a dependency must come up before being extracted
})

// 提取第三方代码将它们进行抽离
const vendorsPlugin = new webpack.optimize.CommonsChunkPlugin({
  name: 'vendors',
  minChunks: ({ resource }) =>
    // 判断资源是否来自 node_modules，如果是，则说明是第三方模块，那就将它们抽离
    resource && resource.indexOf('node_modules') >= 0 && resource.match(/.js$/)
  // minChunks: Infinity
})

// webpack 启动运行的 runtime 代码（放置最后）
const manifestPlugin = new webpack.optimize.CommonsChunkPlugin({
  name: 'manifest',
  minChunks: Infinity
})

const extractTextPlugin = new ExtractTextPlugin({
  filename: 'css/[name].styles.css'
  //allChunks: true // 不要开这个，会导致打包很慢
})

const stylusSettingPlugin = new webpack.LoaderOptionsPlugin({
  test: /\.styl$/,
  stylus: {
    preferPathResolver: 'webpack'
  }
})

var config = {
  entry: {
    sugo: './src/client/entry/index.jsx', // 主入口文件
    login: './src/client/entry/login.jsx',
    verify: './src/client/entry/verify.jsx',
    reg: './src/client/entry/reg.jsx',
    ls: './src/client/entry/livescreen.jsx',
    mannings: './src/client/entry/mannings.jsx',
    'livescreen-broadcast-terminal': './src/client/entry/livescreen-broadcast-terminal-page.jsx',
    'common-css': './src/client/entry/common-css.jsx',
    'reset-password': './src/client/entry/reset-password.jsx',
    'retrieve-password': './src/client/entry/retrieve-password.jsx',
    czbbb: './src/client/entry/czbbb.jsx',
    marketbrain: './src/client/entry/marketbrain-entry.jsx',
    'nissan-market': './src/client/entry/nissan-market-entry.jsx'
  },
  output: {
    path: __dirname + '/public/', // 输出文件目录
    filename: 'js/[name].bundle.js', // 输出文件名
    publicPath: '/',
    chunkFilename: 'js/[id].[name].[hash].bundle.js',
    libraryTarget: 'var'
  },
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    echarts: 'echarts',
    d3: 'd3',
    antd: 'antd',
    moment: 'moment',
    'crypto-js': 'CryptoJS',
    'lz-string': 'LZString',
    'highlight.js': 'hljs',
    lodash: '_'
  },
  watch: true,
  watchOptions: {
    aggregateTimeout: 1500,
    ignored: ['node_modules']
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.json'],
    alias: {
      common: path.resolve(__dirname, 'src/common'),
      assets: path.resolve(__dirname, 'node_modules/sugo-analytics-static/assets'),
      client: path.resolve(__dirname, 'src/client'),
      '~': path.resolve(__dirname),
      '~/components/common': path.resolve(__dirname, 'src/client/components/Common'),
      './dist/cpexcel.js': '' // <-- js-xlsx omit international support
    }
  },
  resolveLoader: {
    modules: [path.resolve(__dirname, 'src/client/loaders'), path.join(process.cwd(), 'node_modules')]
  },
  node: {
    // Solving grok.js: can't resolve 'fs' when bundle with webpack
    // https://github.com/webpack-contrib/css-loader/issues/447
    fs: 'empty'
  },
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: { loader: 'worker-loader' }
      },
      {
        test: /\.m?jsx?$/,
        exclude: function (filename) {
          if (/\/src\/server/.test(filename)) {
            console.error(`\n客户端不能引用服务端的代码：${filename}`)
            process.exit(1)
          }
          return /node_modules(?!(\/sugo-analytics-extend|\/react-draggable))/.test(filename) // ignore node_modules
        },
        use: [packThreadCount === 0 ? 'babel-loader?cacheDirectory=true' : 'happypack/loader', env === 'production' ? 'remove-debug-loader' : null].filter(x => x)
      },
      {
        test: /\.less$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            'custom-css-replacer-loader',
            'css-loader',
            {
              loader: 'less-loader',
              options: {
                javascriptEnabled: true
              }
            }
            /*, {
           // 可在扩展包加入这个来扩展 antd 样式
           loader: 'path-replace-plus-loader',
           options: {
           list: [{
           path: 'src/client/entry/less-overwrite.less',
           replacePath: 'node_modules/sugo-analytics-extend-nh/src/client/entry/less-overwrite.less'
           }]
           }
           }*/
          ]
        })
      },
      {
        test: /\.styl$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          publicPath: '../',
          use: [
            'css-loader',
            {
              loader: 'stylus-loader',
              options: {
                // 可以通过扩展包修改主色调
                import: path.resolve(__dirname, 'src/client/css/modules/constants.styl')
              }
            }
          ]
        })
        //loader: ExtractTextPlugin.extract('style-loader', 'css!stylus')
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          publicPath: '../',
          use: ['css-loader']
        })
      },
      {
        test: /\.(png|jpg|svg|ttf)$/,
        use: ['url-loader?limit=10192&name=images/[hash].[ext]']
      }
    ]
  },
  devtool: 'eval-cheap-source-map',
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        LATER_COV: false
      }
    }),
    new webpack.HotModuleReplacementPlugin(),
    commonsChunkPlugin,
    vendorsPlugin,
    manifestPlugin,
    stylusSettingPlugin,
    packThreadCount === 0 ? null : new HappyPack(happyConf),
    extractTextPlugin,
    new MonacoWebpackPlugin({
      languages: ['sql', 'java']
    })
  ].filter(identity),
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
    },
    disableHostCheck: true,
    historyApiFallback: true,
    hot: true,
    // open: true,
    inline: true,
    progress: true,
    host: sysConfigDefault.host,
    port: sysConfigDefault.devPort,
    proxy: {
      // websocket代理
      '/webconn/*': {
        target: 'ws://localhost:8886',
        ws: true
      },
      '/conn/*': {
        target: 'ws://localhost:8886',
        ws: true
      },
      '/socket.io/*': {
        target: 'ws://localhost:8886',
        ws: true
      },
      '/taskConn/*': {
        target: 'ws://localhost:8000',
        ws: true
      },
      '*': {
        target: 'http://localhost:' + sysConfigDefault.port,
        // target: 'http://192.168.0.213:8000',
        secure: false,
        ws: false,
        bypass: function (req, res, opt) {
          let pth = req.path
          if (/^\/sql-pad/.test(pth)) {
            return
          }
          if (/^\/app/.test(pth) || /^\/api/.test(pth)) {
            // pass /app/**/*.jpg,*.png, ...
            return
          }
          if (/^\/static-apps/.test(pth) || req.headers['micro-apps']) {
            // pass for qiankun-apps /static-apps/**/*
            return
          }
          if ((/(\.json|\.jpg|\.png|\.css)$/.test(pth) && !/^\/static\//.test(pth) && !/^\/static-dashboard/.test(pth) && !/^\/_bc\//.test(pth)) || /\.bundle\.js/.test(pth)) {
            console.log('bypass', pth)
            return req.path
          }
        }
      }
    }
  }
}

// if (!process.env.NO_OPEN_BROWSER) {
//   config.plugins.push(new OpenBrowserPlugin({ url: 'http://localhost:' + sysConfigDefault.devPort }))
// }

if (env === 'production') {
  config.plugins = [
    // 根据模块的相对路径生成一个长度只有四位的字符串作为模块的ID(只有文件路径改变时，hash才会变)
    new webpack.HashedModuleIdsPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        LATER_COV: false,
        NODE_ENV: JSON.stringify('production')
      }
    }),
    packThreadCount === 0 ? null : new HappyPack(happyConf),
    //new webpack.optimize.DedupePlugin(),
    commonsChunkPlugin,
    vendorsPlugin,
    manifestPlugin,
    extractTextPlugin,
    stylusSettingPlugin,

    //new webpack.optimize.OccurenceOrderPlugin(),
    // 使用TerserPlugin替换UglifyJsPlugin压缩打包, 支持es6
    new TerserPlugin({
      parallel: true,
      cache: true,
      terserOptions: {
        parse: {
          ecma: 8
        },
        compress: {
          ecma: 5,
          warnings: false,
          comparisons: false,
          inline: 2
        }
      }
    }),
    // new UglifyJsPlugin({
    //   cache: true,
    //   parallel: true,
    //   exclude: /\.min\.js$/,
    //   uglifyOptions: {
    //     mangle: true,
    //     output: {
    //       comments: false
    //     },
    //     compress: {
    //       warnings: false,
    //       drop_console: false,
    //       drop_debugger: true
    //     }
    //   }
    // })
    new MonacoWebpackPlugin({
      languages: ['sql', 'java']
    })
  ].filter(identity)

  delete config.watch
  delete config.devtool
  delete config.devServer
}

module.exports = config
moduleExtend(__filename)
