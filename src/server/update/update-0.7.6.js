import { log } from '../utils/log'

export default async db => {


  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    // 删除路由
    /*
    /app/sdk/device
    /app/sdk/screenshot
    /app/sdk/testevent
    留存图详情
    获取留存指标和维度
    */

    await db.Route.destroy({
      where: {
        path: {
          $in: [
            '/app/sdk/device',
            '/app/sdk/screenshot',
            '/app/sdk/testevent'
          ]
        }
      },
      ...transaction
    })

    let toDels = await db.Route.findAll({
      where: {
        title: {
          $in: [
            '留存图详情',
            '获取留存指标和维度'
          ]
        }
      },
      ...transaction
    })

    let ids = toDels.map(d => d.id)

    await db.SugoRoleRoute.destroy({
      where: {
        route_id: {
          $in: ids
        }
      },
      ...transaction
    })

    await db.Route.destroy({
      where: {
        id: {
          $in: ids
        }
      },
      ...transaction
    })

    //项目管理 -》group改为数据源管理，title改为埋点项目
    await db.Route.update({
      group: '数据源管理',
      title: '埋点项目'
    }, {
      where: {
        title: '项目管理'
      },
      ...transaction
    })

    // /console/livefeed 改为需要权限
    await db.Route.update({
      requirePermission: true,
      group: '实时大屏',
      title: '实时大屏列表'
    }, {
      where: {
        path: '/console/livefeed'
      },
      ...transaction
    })

    // path: '/console/livefeed/:livefeedId' 改为不需要权限
    let one = await db.Route.findOne({
      where: {
        path: '/console/livefeed/:livefeedId'
      },
      ...transaction
    })

    await one.update({
      requirePermission: false
    }, transaction)

    await db.SugoRoleRoute.destroy({
      where: {
        route_id: one.id
      },
      ...transaction
    })

    //获取数据源接入的token值 取消权限
    let one0 = await db.Route.findAll({
      where: {
        title: '获取数据源接入的token值'
      },
      ...transaction
    })
    
    let ids2 = one0.map(d => d.id)

    await db.Route.update({
      requirePermission: false
    }, {
      where: {
        id: {
          $in: ids2
        }
      },
      ...transaction
    })

    await db.SugoRoleRoute.destroy({
      where: {
        route_id: {
          $in: ids2
        }
      },
      ...transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.7.6'
    }, transaction)

    await db.Meta.update({
      value: '0.7.6'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.7.6 done')
}
