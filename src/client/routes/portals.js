/**
 * @author HeGanjie
 * @date  2020-04-13
 * @description 数据应用中心/智能数据门户
 */

export default reducerRegistry => {
  return [
    {
      path: '/console/portals-mgr',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          cb(null, require('../components/Portals').default)
        }, 'portals-mgr')
      }
    },
    {
      path: '/console/portals-mgr/:id',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          cb(null, require('../components/Portals/portal-edit').default)
        }, 'portals-edit')
      }
    },
    {
      path: '/console/portal-apps-mgr',
      getComponent(nextState, cb) {
        require.ensure([], require => {
          cb(null, require('../components/Portals/application-management/index').default)
        }, 'portal-apps-mgr')
      }
    }
  ]
}
