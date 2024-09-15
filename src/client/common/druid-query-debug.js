import {decompressUrlQuery, parseQuery, tryJsonParse} from '../../common/sugo-utils'
import _ from 'lodash'
import Fetch from './fetch-final'
import {noCache} from './fetch-utils'

let dataSourceList, dataSourceIdDict
export async function getDataSourceNameById(dsId) {
  if (_.isEmpty(dataSourceIdDict)) {
    dataSourceList = dataSourceList
      || (_.get(window.sugo, 'user.id') && _.get(await Fetch.get('/app/datasource/get?q=N4IglgdgxgNgrgEwKYGEAWYYJALgIwC%2BQA'), 'result'))
      || _.get(await Fetch.get('/api/datasources/list?sCache=PT5M&cCache=PT5M'), 'result')
    dataSourceIdDict = _.keyBy(dataSourceList, ds => ds.id)
    setTimeout(() => {
      dataSourceList = null;
      dataSourceIdDict = null
    }, 5 * 60 * 1000)
  }
  return _.get(dataSourceIdDict[dsId], 'title')
}

/**
 * fetchD：展示 查询条件，项目，单图，结果，错误信息，支持数据API，结果集中到一个对象
 *
 * 用法，Chrome -> 开启控制台 -> 在 Network 中找到需要检查的请求，右键 -> copy -> copy as fetch -> 在控制台
 * 粘贴，把 fetch(...) 改为 fetchD(...) 然后执行
 * @param url
 * @param opts
 */
export async function druidQueryDebug(url, opts) {
  let prePrint = {}
  try {
    let res = await fetch(url, _.defaultsDeep({}, noCache, opts))
    let q = !opts?.body ? parseQuery(url?.split('?')?.[1])?.q : tryJsonParse(opts.body).q;
  
    const cond = tryJsonParse(decompressUrlQuery(q))
    prePrint['查询条件'] = cond
    prePrint['所属项目'] = await getDataSourceNameById(cond.druid_datasource_id)
    // prePrint['关联单图'] = decodeURIComponent(opts?.headers?.['x-slice-name'])
    prePrint['返回结果'] = await res.json()
    prePrint['错误信息'] = decodeURIComponent(res.headers.get('x-druid-query-error'))
    // prePrint['关联数据 API'] = null
  } catch (e) {
    console.error(e)
  }
  console.log(JSON.stringify(prePrint, null, 2))
}
