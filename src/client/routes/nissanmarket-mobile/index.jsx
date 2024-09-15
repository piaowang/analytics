import NissanMarketMobileEntry from '../../components/MarketBrain/nissan-market'
import {browserHistory, Link, Router} from 'react-router'
import Exception from '../../components/Exception/index'

let getChildrens = () => ([
  {
    path: '/nissan-market/user-list',
    getComponent(nextState, cb) {
      require.ensure([], (require) => {
        cb(null, require('../../components/MarketBrain/nissan-market/user-list').default)
      }, '')
    }
  }, {
    path: '/nissan-market/user-detail',
    getComponent(nextState, cb) {
      require.ensure([], (require) => {
        cb(null, require('../../components/MarketBrain/nissan-market/user-detail').default)
      }, '')
    }
  }, {
    path: '/nissan-market/add-wechat',
    getComponent(nextState, cb) {
      require.ensure([], (require) => {
        cb(null, require('../../components/MarketBrain/nissan-market/add-wechat').default)
      }, '')
    }
  }
])

const getRootRoute = () => {
  return {
    childRoutes: [
      {
        path: '/nissan-market',
        component: NissanMarketMobileEntry,
        getIndexRoute(nextState, cb) {
          require.ensure([], (require) => {
            cb(null, require('../../components/MarketBrain/nissan-market/').default)
          }, '')
        },
        childRoutes: [
          ...getChildrens(),
          {
            // 500
            path: '/nissan-market/500',
            component: () => <Exception type="500"  />
          },
          {
            // 403
            path: '/nissan-market/403',
            component: () => <Exception type="403"  />
          },
          {
            // 404
            path: '/nissan-market/*',
            component: () => <Exception type="404"  />
          }
        ]
      },
      {
        // 404
        path: '*',
        component: () => <Exception type="500"  />
      }
    ].filter(_.identity)
  }
}

export const configureRoutes = () => {
  return (
    <Router history={browserHistory} routes={getRootRoute()}/>
  )
}