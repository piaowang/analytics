/**
 * uindex 动态维度管理
 */

import Fetch from '../utils/fetch-kit'
import uindexDatasourceService from './uindex-datasource.service'

const getDimensions = async ({ datasource_name }) => {
  const leaderHost = await uindexDatasourceService.getInstance().getLeaderHost()
  let url = `http://${leaderHost}/druid/hmaster/v1/datasources/dimensions/${datasource_name}`
  return Fetch.get(url)
}

const addDimension = async ({ names, datasource_name }) => {
  debug(names)
  debug('================================')
  const leaderHost = await uindexDatasourceService.getInstance().getLeaderHost()
  let url = `http://${leaderHost}/druid/hmaster/v1/datasources/dimensions/add/${datasource_name}`
  let res = await Fetch.post(url, names, {
    handleResponse: res => res.text()
  })
  debug('try add uindex dims', names.join(','), 'to', datasource_name, res)
  return res
}

const delDimension = async ({ names, datasource_name }) => {
  const leaderHost = await uindexDatasourceService.getInstance().getLeaderHost()
  let url = `http://${leaderHost}/druid/hmaster/v1/datasources/dimensions/delete/${datasource_name}`
  let res = await Fetch.post(url, names, {
    handleResponse: res => res.text()
  })
  debug('try del uindex dims', names.join(','), 'to', datasource_name, res)
  return res
}

export default {
  getDimensions,
  addDimension,
  delDimension
}
