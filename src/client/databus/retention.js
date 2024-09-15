import {remoteUrl as URL} from '../constants'
import Fetch from '../common/fetch-final'
import {serialized} from '../common/fetch-final'
import {escape, compressUrlQuery} from '../../common/sugo-utils'

// 获取留存列表
export async function getRetentions(data) {
  let result = await Fetch.get(URL.GET_RENTENTIONS, data)
  return result
}

//创建新留存
export async function createRetention(data) {
  // console.log(data)
  return await Fetch.post('/app/retention/create', data)
}

//保存修改留存
export async function updateRetention(data) {
  // console.log(data)
  return await Fetch.post('/app/retention/update', data)
}

//删除留存
export async function deleteRetention(id) {
  // console.log(id)
  return await Fetch.post('/app/retention/delete', id)
}

// 获取dim值
export async function getSteps(datasource, field, where = '') {
  const query = {
    query: `select distinct \`${field}\` from \`${datasource}\` ${where} limit 100`
  }
  let result = await Fetch.post('/app/plyql/sql', query)
  return result
}

// 组装filter
function getFilter(step, dimensions) {
  let filter = '*:*'
  if (step.length) {
    filter = ''
    step.map((st, idx) => {
      if (st) {
        filter += filter === '' ? `(${dimensions[idx]}:${escape(st)})` : ` AND (${dimensions[idx]}:${escape(st)})`
      }
    })
  }
  return filter
}

//获取留存数据
//先获取概况，如果有对比维度或对比分群，再依次请求对比的数据
export async function getRetentionData(data) {

  let {
    datasource,
    dimension,
    metric,
    startStep,
    endStep,
    dateRange,
    granularityType,
    compareType,
    compareField = [],
    compareDimension,
    compareUsergroup
  } = data

  // console.log(data)

  let startFilter = getFilter(startStep, dimension)
  let endFilter = getFilter(endStep, dimension)

  let query = {
    'queryType': 'retention',
    'dataSource': datasource,
    'filter': '*:*',
    'field':  metric,
    'descending': 'false',
    'granularity': {'type': 'period', 'period': granularityType, 'timeZone': '+08:00'},
    'startStep': {'name': 'total', 'filter': startFilter},
    'returnStep': {'name': 'total', 'filter': endFilter},
    'intervals': [
      dateRange
    ]
  }
  let retentions = []
  console.log('query=>', query)
  let result = await Fetch.get(`/app/plyql/lucene?query=${compressUrlQuery(JSON.stringify(query))}`)
  if (result.expose === false) {
    return result
  }
  retentions[0] = {name: '概况', data: result}
  //获取对比维度的数据    
  if (compareType === 'dimension') {
    console.log('dimension query=>', query)
    if (compareField.length) {
      if (typeof compareField === 'string') {
        compareField = [compareField]
      }
      for (let i = 0; i < compareField.length; i++) {
        console.log('query' + i)
        let filter = compareDimension + ':' + compareField[i]
        query.filter = filter
        let result = await Fetch.get(`/app/plyql/lucene?query=${compressUrlQuery(JSON.stringify(query))}`)
        retentions[i + 1] = {name: compareField[i], data: result}
      }
    }
  } else if (compareType === 'usergroup') { //获取用户分群对比数据
    if (compareUsergroup.length) {
      let {dataConfig} = window.sugo
      for (let i = 0; i < compareUsergroup.length; i++) {
        console.log('query' + i)
        //query.filter = '*:*'
        query.filter = {
          type: 'lookup',
          dimension: compareUsergroup[i].params.groupby,
          lookup: 'usergroup_' + compareUsergroup[i].id
        }
        // query.groupFilter = {
        //   'dataConfig': {
        //     ...dataConfig,
        //     'groupId': 'usergroup_' + compareUsergroup[i].id
        //   },
        //   'dimension': compareUsergroup[i].params.groupby
        // }
        // query.groupFilter.dataConfig.;
        let result = await Fetch.get(`/app/plyql/lucene?query=${compressUrlQuery(JSON.stringify(query))}`)
        retentions[i + 1] = {name: compareUsergroup[i].title, data: result}
      }
    }
  }
  return retentions
}

//获取用户群组
export async function getUserGroups(datasource_id) {
  let q = serialized({
    where: {
      druid_datasource_id: datasource_id
    }
  })
  return await Fetch.get(`/app/usergroup/get${q}`)
}
