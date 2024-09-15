/**
 * 分扩展包打包程序
 * 每个包只打包一种扩展包
 * 全部打包 npm run pack
 * 只打包一种或者几种 PACK_NAME=saas,wxj npm run pack
 * 加入node包路径 NODE_PACK_PATH=path/to/node-release npm run pack
 * 最后生成 analytics-pack/sugo-analytics-saas.tar.gz analytics-pack/sugo-analytics-ds.tar.gz ....
 */
let start = new Date().getTime()
const cwd = process.cwd()
let { PACK_NAME, NODE_PACK_PATH, IBM_DB_INSTALLER_URL, FULL_BUILD = true, PACK_EXT} = process.env
const {mkdir, cp, rm, exec, echo, cd} = require('shelljs')
const {readdirSync} = require('fs')
const {resolve} = require('path')
const filterJs = require('sugo-analytics-common-tools/lib/filter-dist')
let exts = PACK_NAME
  ? PACK_NAME.split(',').map(n => `sugo-analytics-extend-${n}`)
  : readdirSync(
    resolve(__dirname, '../node_modules')
  )
    .filter(f => f.includes('sugo-analytics-extend-'))

if (!PACK_NAME) {
  throw new Error('PACK_NAME is null, please set it！')
  process.exit(0)
}
cd(resolve(__dirname, '..'))

echo('clean')
// rm('-rf', 'analytics-pack')
rm('-rf', [
  'analytics-pack/sugo-analytics/analytics/app',
  'analytics-pack/sugo-analytics/analytics/common',
  'analytics-pack/sugo-analytics/analytics/public',
  'analytics-pack/sugo-analytics/analytics/cmds'
])
rm('-rf', '*.gz')

echo('mk analytics dir')
mkdir('-p', 'analytics-pack/sugo-analytics/analytics')
cp(
  '-r',
  [
    'app',
    'common',
    'public',
    'cmds',
    'cmds/*',
    'views',
    'version',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'config.default.js'
  ],
  'analytics-pack/sugo-analytics/analytics/'
)

if (NODE_PACK_PATH) {
  echo('copy node release')
  cp('-r', NODE_PACK_PATH, 'analytics-pack/sugo-analytics/node')
}

echo('start packing...')

// 全量构建，安装node_modules依赖
if (FULL_BUILD === true) {
  echo('remove unused package')
  echo('yarn or npm install --production')
  echo('IBM_DB_INSTALLER_URL => ', IBM_DB_INSTALLER_URL)
  exec(`cd analytics-pack/sugo-analytics/analytics && IBM_DB_INSTALLER_URL=${IBM_DB_INSTALLER_URL} npm install --production`)
  echo('npm prune --production')
  exec(`cd analytics-pack/sugo-analytics/analytics && IBM_DB_INSTALLER_URL=${IBM_DB_INSTALLER_URL} && npm prune --production`)
}
mkdir('-p', 'analytics-pack/sugo-analytics/analytics/node_modules')

if (FULL_BUILD === true || PACK_NAME.includes('standard')) {
  echo('build sugo-analytics-full.tar.gz')
  exec(`cd analytics-pack && tar czf sugo-analytics-full.tar.gz sugo-analytics && cd ${cwd}`)
  echo('done build sugo-analytics-full.tar.gz')
}

for (let ext of exts) {
  let name = ext.replace('sugo-analytics-extend-', '')
  echo(`build sugo-analytics-${name}.tar.gz`)
  rm('-rf', 'analytics-pack/sugo-analytics/analytics/node_modules/sugo-analytics-extend-*')
  cp('-r', `node_modules/${ext}`, 'analytics-pack/sugo-analytics/analytics/node_modules/')
  cp('-r', 'public', 'analytics-pack/sugo-analytics/analytics/')
  rm('-rf', 'analytics-pack/sugo-analytics/analytics/pack-name')
  exec(`echo "${ext}" >> analytics-pack/sugo-analytics/analytics/pack-name`)
  filterJs(ext, resolve(cwd, 'analytics-pack/sugo-analytics/analytics/'))
  // 全量包，直接打包父目录
  if (FULL_BUILD === true) {
    exec(`cd analytics-pack && tar czf sugo-analytics-${name}.tar.gz sugo-analytics && cd ${cwd}`)
  } else {
    echo('packing incremental package...')
    const files = readdirSync(resolve(cwd, 'analytics-pack/sugo-analytics/analytics')).filter(f => !['pack-name', 'node_modules'].includes(f))
    let paths = files.map(f => `sugo-analytics/analytics/${f}`)
    // 增量包，node_modules包含扩展包依赖
    if (PACK_EXT === true) {
      paths = paths.concat(
        `sugo-analytics/analytics/node_modules/${ext}`
      )
    }
    exec(`cd analytics-pack && tar czf sugo-analytics-${name}.tar.gz ${paths.join(' ')} && cd ${cwd}`)
  }
  echo(`done build sugo-analytics-${name}.tar.gz`)
}

let end = new Date().getTime()
echo('done', 'time use:', (end - start)/1000, 's')
