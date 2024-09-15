import { log } from '../utils/log'

export default async db => {

  await db.client.transaction(function (t) {

    return (async function () {

      let trans = {
        transaction: t
      }

      //数据源
      await db.Route.update({
        group: '数据源管理'
      }, {
        where: {
          $or: [
            {
              title: {
                $like: '%数据源%'
              }
            },
            {
              title: '数据接入'
            }
          ]
        },
        ...trans
      })

      //维度
      await db.Route.update({
        group: '维度管理'
      }, {
        where: {
          title: {
            $like: '%维度%'
          }
        },
        ...trans
      })

      //指标
      await db.Route.update({
        group: '指标管理'
      }, {
        where: {
          title: {
            $like: '%指标%'
          }
        },
        ...trans
      })

      //分群
      await db.Route.update({
        group: '分群管理'
      }, {
        where: {
          title: {
            $like: '%分群%'
          }
        },
        ...trans
      })

      //用户组
      await db.Route.update({
        group: '用户组管理'
      }, {
        where: {
          title: {
            $like: '%用户组%'
          }
        },
        ...trans
      })

      //用户
      await db.Route.update({
        group: '用户管理'
      }, {
        where: {
          title: {
            $in: [
              '用户管理',
              '添加用户',
              '删除用户',
              '更新用户'
            ]
          }
        },
        ...trans
      })

      //漏斗分析
      await db.Route.update({
        group: '漏斗分析'
      }, {
        where: {
          title: {
            $like: '%漏斗%'
          }
        },
        ...trans
      })

      //留存分析
      await db.Route.update({
        group: '留存分析'
      }, {
        where: {
          title: {
            $like: '%留存%'
          }
        },
        ...trans
      })

      //概览
      await db.Route.update({
        group: '概览'
      }, {
        where: {
          title: {
            $like: '%概览%'
          }
        },
        ...trans
      })

      //单图
      await db.Route.update({
        group: '单图'
      }, {
        where: {
          title: {
            $like: '%单图%'
          }
        },
        ...trans
      })

      //数据看板
      await db.Route.update({
        group: '数据看板'
      }, {
        where: {
          title: {
            $like: '%数据看板%'
          }
        },
        ...trans
      })

      //单图详情，留存图详情，数据看板详情 去掉
      let ids = await db.Route.findAll({
        where: {
          title: {
            $in: [
              '单图详情',
              '留存图详情',
              '数据看板详情'
            ]
          }
        },
        ...trans
      })

      ids = ids.map(a => a.id)
      //rm SugoRoleRoute
      await db.SugoRoleRoute.destroy({
        where: {
          route_id: {
            $in: ids
          }
        },
        ...trans
      })
      await db.Route.update({
        common: false,
        requirePermission: false
      }, {
        where: {
          id: {
            $in: ids
          }
        },
        ...trans
      })

      //概览 -》 概览页面
      await db.Route.update({
        title: '概览列表'
      }, {
        where: {
          title: '概览'
        },
        ...trans
      })
      //用户管理 -》用户列表
      await db.Route.update({
        title: '用户列表'
      }, {
        where: {
          title: '用户管理'
        },
        ...trans
      })
      //用户组管理 -》用户组列表
      await db.Route.update({
        title: '用户组列表'
      }, {
        where: {
          title: '用户组管理'
        },
        ...trans
      })
      //用户分群 -》用户分群列表
      await db.Route.update({
        title: '用户分群列表'
      }, {
        where: {
          title: '用户分群'
        },
        ...trans
      })
      //数据看板 -》数据看板列表
      await db.Route.update({
        title: '数据看板列表'
      }, {
        where: {
          title: '数据看板'
        },
        ...trans
      })
      //单图-》单图列表
      await db.Route.update({
        title: '单图列表'
      }, {
        where: {
          title: '单图'
        },
        ...trans
      })
      //留存分析 留存列表
      await db.Route.update({
        title: '留存列表'
      }, {
        where: {
          title: '留存分析'
        },
        ...trans
      })
      //漏斗分析 漏斗列表
      await db.Route.update({
        title: '漏斗列表'
      }, {
        where: {
          title: '漏斗分析'
        },
        ...trans
      })

      await db.Meta.create({
        name: 'update-log',
        value: '0.6.2'
      }, trans)

      await db.Meta.update({
        value: '0.6.2'
      }, {
        where: {
          name: 'version'
        },
        ...trans
      })

      log('update 0.6.2 done')

      //end
    })()
  })
}
