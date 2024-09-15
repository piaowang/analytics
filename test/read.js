/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/19
 * @description
 */

// BatchDownloadController: join(ControllerPath, 'batch-download.controller.js'),

const fs = require('fs')

function dep(path, type, pre) {
  const controllers = fs.readdirSync(path)

  for (const ctrl of controllers) {
    let str = ctrl.replace('.js', '')
    if (str.indexOf(type) < 0) {
      str = str + '.' + type
    }
    let ret = []
    for (let i = 0; i < str.length; i++) {
      if (i === 0) {
        ret.push(str[i].toUpperCase())
        continue
      }

      if (str[i] === '.' || str[i] === '-') {
        i++
        ret.push(str[i].toUpperCase())
        continue
      }
      ret.push(str[i])
    }
    console.log(`${ret.join('')}: join(${pre}, '${ctrl}'),`)
  }
}

dep('../src/server/controllers', 'controller', 'ControllerPath')
dep('../src/server/services', 'service', 'ServicePath')


