/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-20 17:55:54
 * @description 智能营销路由组件定义文件
 */

export default reducerRegistry => {
  return [
    {
      path: '/console/market-brain-models',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/MarketBrain/events/store/models').default)
            reducerRegistry.model(require('../components/MarketBrain/events/store/scenes').default)
          }
          cb(null, require('../components/MarketBrain/events/models-entry').default)
        }, 'market-brain-models')
      }
    },
    {
      path: '/console/market-brain-events',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/MarketBrain/events/store/events').default)
          }
          cb(null, require('../components/MarketBrain/events/events-entry').default)
        }, 'market-brain-events')
      }
    },
    {
      path: '/console/market-brain-events/new',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/MarketBrain/events/store/events').default)
          }
          cb(null, require('../components/MarketBrain/events/event-form').default)
        }, 'market-brain-events')
      }
    },
    {
      path: '/console/market-brain-acts',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/MarketBrain/events/store/events').default)
          }
          cb(null, require('../components/MarketBrain/events/actives-entry').default)
        }, 'actives-entry')
      }
    },
    {
      path: '/console/market-brain-acts/new',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/MarketBrain/events/store/events').default)
          }
          cb(null, require('../components/MarketBrain/events/event-form').default)
        }, 'event-form')
      }
    },
    {
      path: '/console/market-brain-tasks',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/MarketBrain/task/store/task').default)
          }
          cb(null, require('../components/MarketBrain/task/index').default)
        }, 'market-brain-tasks')
      }
    },
    {
      path: '/console/market-brain-acts/result',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          if (reducerRegistry) { // 动态注入saga-model
            reducerRegistry.model(require('../components/MarketBrain/result/store/index').default)
          }
          cb(null, require('../components/MarketBrain/result/index').default)
        }, 'market-brain-acts/result')
      }
    }
  ]
}
