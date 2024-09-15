/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-20 17:55:54
 * @description 智能营销路由组件定义文件
 */

export default reducerRegistry => {
  return [
    {
      path: '/console/marketing-models',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/Marketing/events/store/models').default)
            reducerRegistry.model(require('../components/Marketing/events/store/scenes').default)
          }
          cb(null, require('../components/Marketing/events/models-entry').default)
        }, 'marketing-models')
      }
    },
    {
      path: '/console/marketing-events',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/Marketing/events/store/events').default)
          }
          cb(null, require('../components/Marketing/events/events-entry').default)
        }, 'marketing-events')
      }
    },
    {
      path: '/console/marketing-events/result',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/Marketing/events/store/result').default)
          }
          cb(null, require('../components/Marketing/events/result').default)
        }, 'result')
      }
    },
    {
      path: '/console/marketing-act-groups',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/Marketing/active/store/marketing-act-groups').default)
          }
          cb(null, require('../components/Marketing/active/marketing-act-groups').default)
        }, 'marketing-act-groups')
      }
    },
    {
      path: '/console/marketing-events/new',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/Marketing/events/store/events').default)
          }
          cb(null, require('../components/Marketing/events/event-form').default)
        }, 'marketing-events')
      }
    },
    {
      path: '/console/marketing-acts',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/Marketing/active/store/actives').default)
          }
          cb(null, require('../components/Marketing/active/marketing-acts').default)
        }, 'marketing-acts')
      }
    },
    {
      path: '/console/marketing-acts/new',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/Marketing/active/store/create-act').default)
          }
          cb(null, require('../components/Marketing/active/create-act').default)
        }, 'create-act')
      }
    },
    {
      path: '/console/marketing-acts/result',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/Marketing/active/store/result').default)
          }
          cb(null, require('../components/Marketing/active/result').default)
        }, 'result')
      }
    },
    {
      path: '/console/marketing-pushs',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/Marketing/push-land-page/store/push-land').default)
          }
          cb(null, require('../components/Marketing/push-land-page/index').default)
        }, 'marketing-pushs')
      }
    },
    {
      path: '/console/marketing-tasks',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/Marketing/task/store/task').default)
          }
          cb(null, require('../components/Marketing/task/index').default)
        }, 'marketing-tasks')
      }
    }
  ]
}
