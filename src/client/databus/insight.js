import Fetch from '../common/fetch-final'
import moment from 'moment'
import {remoteUrl} from '../constants'
import _ from 'lodash'

//获取用户群组
export async function getUserGroups() {
  return await Fetch.get('/app/usergroup/get')
}

//获取用户列表
export async function getUserList(usergroup, index = 0, pageSize = 30) {
  let {dataConfig} = window.sugo
  // usergroup.params = JSON.parse(usergroup.params)
  let groupId = usergroup.params.md5 ? usergroup.params.md5 : 'usergroup_' + usergroup.id
  let query = {
    groupReadConfig: {
      pageIndex: index, // 页数
      pageSize: pageSize //每页条数
    },
    dataConfig: {
      ...dataConfig,
      groupId // 用户分群redis key：groupId_1,
    }
  }
  return await Fetch.get('/app/usergroup/info', {query})
}

//获取数据源行为字段
export async function getDatasourceSetting(datasource_id) {
  let res = await Fetch.get(remoteUrl.GET_DATASOURCES, {
    where: {
      id: datasource_id
    },
    withDim: true
  })
  return res.result[0]
}

//获取数据源维度
export async function getDatasourceDimension(datasource_id) {
  return await Fetch.get('/app/dimension/get/' + datasource_id)
}

//根据用户id获取用户事件
export async function getDataByUserId(data) {

  let {
    id,
    id_name,
    datasource_name,
    date,
    dimensions
  } = data

  if (!id) return Promise.resolve({
    result: []
  })

  let keys = Object.keys(dimensions).concat('__time')

  let dateStr = date ? `AND __time BETWEEN '${moment(date).toISOString()}' AND '${moment(date).add(1, 'days').toISOString()}'` : ''
  const query = {query: `SELECT * FROM \`${datasource_name}\` WHERE \`${id_name}\` = '${id}' ${dateStr}`}
  let res = await Fetch.post('/app/plyql/sql', query)

  if (res) {
    res.result = res.result.map(r => {
      return _.pick(r, keys)
    })
    return res
  }

  return {
    result: []
  }

}
