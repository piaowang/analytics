/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-04-10 17:34:19
 * @description 生命周期路由组件定义
 */

export default reducerRegistry => {
  return [
    {
      path: '/console/data-checking',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/DataChecking/store/data-checking').default)
          }
          cb(null, require('../components/DataChecking/index').default)
        }, 'data-checking')
      }
    }, 
    {
      path: '/console/data-checking/detail',
      getComponent(nextState, cb) {
        require.ensure([], (require) => {
          if (reducerRegistry) {
            reducerRegistry.model(require('../components/DataChecking/store/data-checking-detail').default)
          }
          cb(null, require('../components/DataChecking/detail').default)
        }, 'data-checking-detail')
      }
    }
  ]
}
