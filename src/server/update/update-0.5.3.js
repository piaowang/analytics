import { log } from '../utils/log'

export default async db => {

  // '/api/slices/:id'
  // '/api/add/slice'
  // '/api/slices'
  // '/api/datasource/upload'
  // '/api/dimension/:id'
  // '/api/dimensionby/:name'
  // '/api/measure/:id'
  // '/api/druidTopN/:dataSourceName/:columnName'
  // '/api/queryDruid'
  // '/api/plyql/expression'
  // '/api/plyql/lucene'
  // '/api/plyql/sql'

  // '/app/plyql/expression' post
  // '/app/plyql/lucene' post
  await db.Route.destroy({
    where: {
      path: {
        $in: [
          '/api/slices/:id',
          '/api/add/slice',
          '/api/slices',
          '/api/datasource/upload',
          '/api/dimension/:id',
          '/api/dimensionby/:name',
          '/api/measure/:id',
          '/api/druidTopN/:dataSourceName/:columnName',
          '/api/queryDruid',
          '/api/plyql/expression',
          '/api/plyql/lucene',
          '/api/plyql/sql',
          '/api/datacubes',
          '/api/datasource'
        ]
      }
    }
  })

  let q = {
    where: {
      $or: [
        {
          path: '/app/plyql/expression',
          method: 'post'
        }, {
          path: '/app/plyql/lucene',
          method: 'post'
        }, {
          path: '/app/datasource/get/getDatasourcesWithDimSize'
        }, {
          path: '/app/datasource/get/getDatasourcesWithSetting'
        }
      ]
    }
  }

  let rs = db.Route.findAll(q)
  let ids = rs.map(r => r.id)
  await db.SugoRoleRoute.destroy({
    where: {
      route_id: {
        $in: ids
      }
    }
  })
  await db.Route.destroy(q)
  await db.Route.update({
    requireLogin: false
  }, {
    where: {
      path: {
        $like: '/api/%'
      }
    }
  })
  await db.Meta.update({
    value: '0.5.3'
  }, {
    where: {
      name: 'version'
    }
  })
  log('update 0.5.3 done')
}
