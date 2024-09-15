/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/19
 * @description 全局监听函数，在App启动后触发
 */

import CONFIG from './config'

let __listener = []

const Listener = {
  /**
   * @param {function} listener
   */
  subscribe(listener) {
    if (typeof  listener === 'function') {
      __listener.push(listener)
    }
  },
  /**
   * @param {function} listener
   */
  unsubscribe(listener){
    __listener = __listener.filter(fn => fn !== listener)
  },

  /**
   * @return {Promise.<void>}
   */
  async trigger() {
    for (const listener of __listener) {
      await listener()
    }
  }
}

if (CONFIG.app.listener.length > 0) {
  CONFIG.app.listener.forEach(function (desc) {
    const listener = require(desc.path).default
    Listener.subscribe(listener)
  })
}

export default Listener
