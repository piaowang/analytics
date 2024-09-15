/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-04-10 17:34:19
 * @description 生命周期路由组件定义
 */

export default reducerRegistry => {
  return [
    {
      path: '/console/life-cycle',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/LifeCycle/store/life-cycle').default)
          }
          cb(null, require('../components/LifeCycle/index').default)
        }, 'lify-cycle')
      }
    },
    {
      path: '/console/life-cycle/new',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/LifeCycle/store/life-cycle-form').default)
          }
          cb(null, require('../components/LifeCycle/new').default)
        }, 'lify-cycle-new')
      }
    },
    {
      path: '/console/life-cycle/edit/:lifeCycleId',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/LifeCycle/store/life-cycle-form').default)
          }
          cb(null, require('../components/LifeCycle/new').default)
        }, 'lify-cycle-new')
      }
    }
  ]
}
