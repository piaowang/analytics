/**
 * Created by asd on 17-6-10.
 * @file 每个项目的默认分群，包含所有的用户
 */

import _ from 'lodash'
import moment from 'moment'
import Fetch from '../../common/fetch-final'
import {DefaultDruidQueryCacheOpts, withExtraQuery} from '../../common/fetch-utils'

class GroupForAllUsers {

  constructor () {
    this.pages = 1
    this.pagesSize = 100
    this.count = null
    this.dataSource = {}
    this.dimension = []
    this.params = {}
    this.models = []
    this.url = withExtraQuery('/app/slices/query-druid', DefaultDruidQueryCacheOpts)
    this.groupby = ''
  }

  /**
   * @param size
   * @return {GroupForAllUsers}
   */
  setPageSize (size) {
    if (_.isNumber(size) && size > 0)
      this.pagesSize = size
    return this
  }

  /**
   * @param dataSource
   * @return {GroupForAllUsers}
   */
  setDataSource (dataSource) {
    this.dataSource = dataSource
    return this
  }

  setGroupBy (groupby) {
    this.groupby = groupby
    return this
  }

  /**
   * @param params
   * @return {GroupForAllUsers}
   */
  setParams (params) {
    this.params = { ...this.params, ...params }
    return this
  }

  /**
   * 返回虚拟 dataSource model
   * @return {Object}
   */
  getModel () {
    const dataSource = this.dataSource
    // 临时分群虚拟model
    return {
      id: '__all_user',
      created_by: null,
      updated_by: null,
      title: '所有用户',
      druid_datasource_id: dataSource.id,
      datasource_name: dataSource.title,
      params: {
        ...this.params,
        groupby: this.groupby
      },
      description: null,
      company_id: dataSource.company_id,
      created_at: moment().toISOString(),
      updated_at: moment().toISOString()
    }
  }

  /**
   * 获取下一页数据
   * @return {Promise.<Array.<Object>>}
   */
  async next () {
    const result = await this.queryDruid()
    const key = this.getModel().params.groupby
    this.pages++
    this.models = result.map(r => r[key])
    return this.models
  }

  /**
   * 获取用户总数
   * @return {Promise.<number>}
   */
  async getCount () {
    if (this.count === null) {
      const res = await Fetch.get(this.url, this.generateCountUserDruidParam())
      this.count = _.get(res, '[0].count') || 0
    }
    return this.count || 0
  }

  /**
   * @return {Promise.<Array<Object>>}
   */
  async queryDruid () {

    /**
     * @typedef {Object} DruidTopNQueryResult
     * @property {{resultSet: Array<Object>}} result
     */

    /** @type {DruidTopNQueryResult} */
    const res = await Fetch.get(this.url, this.generateDruidParam())
    return (_.get(res, '[0].resultSet') || this.models).slice()
  }

  /**
   * 生成查询总用户数的druid查询参数
   * @return {Object}
   */
  generateCountUserDruidParam () {
    const m = this.getModel()
    return {
      druid_datasource_id: m.druid_datasource_id,
      granularity: 'P1D',
      customMetrics: [
        {
          name: 'count',
          formula: `$main.countDistinct($${m.params.groupby})`
        }
      ],
      groupByAlgorithm: 'groupBy'
    }
  }

  /**
   * 生成druid查询参数
   * @return {Object}
   */
  generateDruidParam () {
    return {
      druid_datasource_id: this.dataSource.id,
      dimensions: [this.getModel().params.groupby],
      granularity: 'P1D',
      dimensionExtraSettings: [
        {
          sortCol: 'rowCount',
          sortDirect: 'desc',
          limit: this.pages * this.pagesSize
        }
      ],
      customMetrics: [
        {
          name: 'rowCount',
          formula: '$main.count()'
        }
      ],
      groupByAlgorithm: 'topN'
    }
  }
}

export default GroupForAllUsers

