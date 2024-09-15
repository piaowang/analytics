const ctrl = 'controllers/plyql.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  group: 'plyql查询',
  common: false
}

const routes = [
  {
    path: '/plyql/health',
    title: 'plyql/health',
    func: 'health',
    method: 'get'
  }, {
    path: '/plyql/sql',
    title: '/plyql/sql',
    method: 'post',
    func: 'queryBySQL'
  }, {
    path: '/plyql/expression',
    title: 'plyql/expression',
    method: 'post',
    func: 'queryByExpression'
  }, {
    path: '/plyql/lucene',
    title: 'plyql/lucene',
    method: 'get',
    func: 'queryByLucene'
  }, {
    path: '/plyql/formula',
    title: '/plyql/formula',
    method: 'post',
    func: 'queryByFormula'
  }, { // 为了方便调试，开放了 post 接口，不用传压缩后的 lz-string 参数
    path: '/plyql/lucene',
    title: 'plyql/lucene',
    method: 'post',
    func: 'queryByLucene'
  },
  {
    path: '/plyql/native/tindex',
    title: 'nativeQueryForTindex',
    method: 'get',
    func: 'nativeQueryForTindex'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app'
}
