import MarketBrainMobileEntry from '../../components/MarketBrain/mobile'
import {browserHistory, Link, Router} from 'react-router'
import Exception from '../../components/Exception/index'

let getChildrens = () => ([
  {
    path: '/market-brain/active-claim',
    getComponent(nextState, cb) {
      require.ensure([], (require) => {
        cb(null, require('../../components/MarketBrain/mobile/active-claim').default)
      }, 'marketbrain-active-claim')
    }
  },
  {
    path: '/market-brain/claim-customer',
    getComponent(nextState, cb) {
      require.ensure([], (require) => {
        cb(null, require('../../components/MarketBrain/mobile/claim-customer').default)
      }, 'marketbrain-claim-customer')
    }
  },
  {
    path: '/market-brain/claim-customer/:id',
    getComponent(nextState, cb) {
      require.ensure([], (require) => {
        cb(null, require('../../components/MarketBrain/mobile/claim-customer').default)
      }, 'marketbrain-claim-customer-id')
    }
  },
  {
    path: '/market-brain/active-detail',
    getComponent(nextState, cb) {
      require.ensure([], (require) => {
        cb(null, require('../../components/MarketBrain/mobile/active-detail').default)
      }, 'marketbrain-active-detail')
    }
  },
  {
    path: '/market-brain/active-detail/:id',
    getComponent(nextState, cb) {
      require.ensure([], (require) => {
        cb(null, require('../../components/MarketBrain/mobile/active-detail').default)
      }, 'marketbrain-active-detail-id')
    }
  },
  {
    path: '/market-brain/task-exec',
    getComponent(nextState, cb) {
      require.ensure([], (require) => {
        cb(null, require('../../components/MarketBrain/mobile/task-exec').default)
      }, 'marketbrain-task-exec')
    }
  },
  {
    path: '/market-brain/task-exec/:id',
    getComponent(nextState, cb) {
      require.ensure([], (require) => {
        cb(null, require('../../components/MarketBrain/mobile/task-exec').default)
      }, 'marketbrain-task-exec-id')
    }
  }
])

const getRootRoute = () => {
  return {
    childRoutes: [
      {
        path: '/market-brain',
        component: MarketBrainMobileEntry,
        getIndexRoute(nextState, cb) {
          require.ensure([], (require) => {
            cb(null, require('../../components/MarketBrain/mobile/active-claim').default)
          }, 'marketbrain-active-claim')
        },
        childRoutes: [
          ...getChildrens(),
          {
            // 500
            path: '/market-brain/500',
            component: () => <Exception type="500"  />
          },
          {
            // 403
            path: '/market-brain/403',
            component: () => <Exception type="403"  />
          },
          {
            // 404
            path: '/market-brain/*',
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
