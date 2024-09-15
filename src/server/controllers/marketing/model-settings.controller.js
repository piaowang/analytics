import SugoMarketingModelSettingsService from '../../services/marketing/model-settings.service'
import { Response } from '../../utils/Response'
import { MARKETING_MODEL_TYPE, MARKETING_MODEL_STATUS } from 'common/constants'
import _ from 'lodash'
import Config from '../../config'
import shortid from 'shortid'
import toUgFilters from '../../../common/slice-filter-to-ug-filter'
import { ugfilterToLuceneFilterStr } from '../../utils/param-transform'
import moment from 'moment'
import { createOrUpdateLookup, removeLookup } from '../../services/segment.service'
import { forAwaitAll } from '../../../common/sugo-utils'
import conf from '../../config'

export default class SugoMarketingModelSettingsController {

  constructor() {
    this.marketingModelSettingsService = new SugoMarketingModelSettingsService()
  }

  getRFMName(arr, key) {
    return arr.length === 1
      ? `${key}>${arr[0]}`
      : `${arr[0]}<=${key}<=${arr[1]}`
  }

  getRFMTitle(obj) {
    return ['R', 'F', 'M'].map(key => this.getRFMName(obj[key], key)).join(', ')
  }

  lifeCycleTitle = ['引入期', '发展期', '成熟期', '衰退期', '流失期']

  valueSliceTitle = ['A类高价值', 'B类一般价值', 'C类低价值']


  async save(ctx) {
    const model = ctx.q
    const { id } = ctx.params
    const { id: userId } = ctx.session.user
    if (model.type === undefined || !model.projectId) {
      return ctx.body = Response.error(ctx, '保存失败，缺少模型类型或项目ID参数')
    }
    const existed = await this.marketingModelSettingsService.findOne({ projectId: model.projectId }, { raw: true })
    let query = []
    let intervals = '1000/3000'
    if (model.type === MARKETING_MODEL_TYPE.VALUE_SLICE || model.type === MARKETING_MODEL_TYPE.RFM) {
      const { historyStart, historyEnd } = model.params
      intervals = `${moment(historyStart).toISOString()}/${moment(historyEnd).endOf('d').toISOString()}`
    }
    if (model.datasets.tag_datasource_name) {
      const filters = !_.isEmpty(model.datasets.tag_filters) ? toUgFilters(model.datasets.tag_filters) : {}
      const filter = !_.isEmpty(filters)
        ? {
          filter: {
            'type': 'lucene',
            query: !_.isEmpty(filters) ? ugfilterToLuceneFilterStr(_.first(filters)) : {}
          }
        }
        : {}
      query.push({
        type: 'uindex',
        broker: _.get(Config, 'uindex.host', ''),
        query: {
          'queryType': 'lucene_scan',
          'dataSource': model.datasets.tag_datasource_name,
          'intervals': intervals,
          'granularity': 'all',
          'context': {
            'timeout': 180000,
            'groupByStrategy': 'v2'
          },
          ...filter,
          'resultFormat': 'compactedList',
          'columns': [_.get(model, 'dimensions.userIdKey')],
          'batchSize': 1000,
          'limit': 50
        }
      })
    }
    if (model.datasets.trade_datasource_name) {
      const filter = _.get(model, 'datasets.trade_filters.filters.length')
        ? {
          filter: {
            'type': 'lucene',
            query: ugfilterToLuceneFilterStr(model.datasets.trade_filters)
          }
        }
        : {}
      query.push(
        {
          'type': 'tindex',
          'broker': _.get(Config, 'druid.host', ''),
          'query': {
            'queryType': 'lucene_groupBy',
            'dataSource': model.datasets.trade_datasource_name,
            'granularity': 'all',
            'intervals': intervals,
            'context': {
              'timeout': 180000,
              'useOffheap': true,
              'groupByStrategy': 'v2'
            },
            dimensions: ['distinct_id'],
            ...filter
          }
        })
    }
    if (model.datasets.behavior_datasource_name) {
      const filter = _.get(model, 'datasets.behavior_filters.filters.length')
        ? {
          filter: {
            'type': 'lucene',
            query: ugfilterToLuceneFilterStr(model.datasets.trade_filters)
          }
        }
        : {}
      query.push(
        {
          'type': 'tindex',
          'broker': _.get(Config, 'druid.host', ''),
          'query': {
            'queryType': 'lucene_groupBy',
            'dataSource': model.datasets.behavior_datasource_name,
            'granularity': 'all',
            'intervals': intervals,
            'context': {
              'timeout': 180000,
              'useOffheap': true,
              'groupByStrategy': 'v2'
            },
            dimensions: ['distinct_id'],
            ...filter
          }
        })
    }

    if (model.type === 1) {
      const itemNames = ['uindexData', 'tradeData', 'behaviorData']
      model.datasets.query = _.reduce(query, (r, v, k) => {
        r[itemNames[k]] = v
        return r
      }, {})
    } else {
      model.datasets.query = query
    }

    // 新增营销模型设置操作
    if (!id) {
      const data = await this.marketingModelSettingsService.create({
        id: shortid(),
        ...model,
        created_by: userId
      })
      // TODO 定时任务操作
      // if (model.status === MARKETING_EVENT_STATUS.OPEN) {
      //   // 插入任务记录或更新任务状态
      //   await this.marketingModelSettingsService.addScheduleJob(data)
      // }
      // 同步任务状态信息
      // await this.tasksService.syncTaskStatus({
      //   data,
      // })
      return ctx.body = Response.ok(data)
    }

    /**---------------------更新操作-------------------------------- */
    await this.marketingModelSettingsService.update({
      ...model,
      updated_by: userId
    }, { id })
    const data = {
      id,
      ...model,
      updated_by: userId
    }

    // TODO 定时任务操作
    // if (!data.timer) {
    //   return ctx.body = Response.ok(data)
    // }

    // await this.marketingModelSettingsService.removeScheduleJob(data)
    // if (model.status === MARKETING_EVENT_STATUS.OPEN) {
    //   await this.marketingModelSettingsService.addScheduleJob(data)
    // }
    // // 同步任务状态信息
    // await this.tasksService.syncTaskStatus({
    //   data,
    //   type: MARKETING_TASK_TYPE.EVENTS
    // })
    ctx.body = Response.ok(data)
  }

  /**
   * 根据项目ID查询模型配置记录
   * @param {*} ctx
   */
  async findByProjectId(ctx) {
    const { projectId } = ctx.params
    const { type } = ctx.q
    if (!projectId && !type) {
      return ctx.body = Response.error(ctx, '非法请求，缺少projectId参数!')
    }
    const res = await this.marketingModelSettingsService.findByProjectId(projectId, type)
    ctx.body = Response.ok(res)
  }

  async remove(ctx) {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数')
    }
    // 删除营销模型的lookup
    const modelSetting = await this.marketingModelSettingsService.findOne({id}, { raw: true })
    const data = (_.get(modelSetting, 'result.data.groups') || _.get(modelSetting, 'result.data', [])).filter(p => p.userCount > 0)

    if (data.length) {
      for (let i = 0; i < data.length; i++) {
        const lookupId = _.get(data, `${i}.groupId`)
        try {
          await removeLookup({ ...conf.dataConfig, groupId: lookupId }, true)
        } catch (error) {
          console.log(`删除lookup[${lookupId}]失败！${error.message}`)
        }
      }
    }
    // TODO 删除记录
    await this.marketingModelSettingsService.remove({ id })
    ctx.body = Response.ok()
  }

  /**
   * 手动计算策略用户群模型
   * @param {*} ctx
   */
  async manualCalc(ctx) {
    const { projectId } = ctx.params
    let { type } = ctx.q
    if (!projectId || !type) {
      return ctx.body = Response.error(ctx, '操作失败，缺少projectId或type参数')
    }
    type = _.toNumber(type)
    const params = {
      projectId,
      callbakHost: Config.site.websdk_app_host,
      type
    }
    // console.log('pamdmd', params)
    let res = {}
    switch (type) {
      case MARKETING_MODEL_TYPE.RFM:
      case MARKETING_MODEL_TYPE.LIFE_CYCLE:
      case MARKETING_MODEL_TYPE.VALUE_SLICE:

        // 调用策略模型计算接口
        res = await this.marketingModelSettingsService.calcModel(params)
        break
      default:
        return ctx.body = Response.error(ctx, '操作失败，未知的参数类型')
    }
    // 更新计算状态为计算中
    await this.marketingModelSettingsService.update({ status: 1 }, { project_id: projectId, type })
    ctx.body = Response.ok(res)
  }

  /**
   * 模型计算回调函数
   * @param {*} ctx
   */
  async callbakForCalcModel(ctx) {
    let result = ctx.request.body
    const { id } = ctx.query
    const modelSetting = await this.marketingModelSettingsService.findOne({id}, { raw: true })
    if (_.isEmpty(result) || _.isEmpty(modelSetting)) {
      return ctx.body = Response.fail(result)
    }

    if (modelSetting.type === 0) {
      if ( _.get(result, 'data.groups', []).length>0) {
        _.get(result, 'data.groups').forEach((p) => {
          p.title = this.getRFMTitle(p)
        })
      }
    } else {
      if(_.isArray(_.get(result, 'data', []))  && _.get(result, 'data', []).length>0) {
        _.get(result, 'data').forEach((p, i) => {
          if (modelSetting.type === 1) {
            p.title = this.lifeCycleTitle[i]
          } else if (modelSetting.type === 2) {
            p.title = this.valueSliceTitle[i]
          }
        })
      }
    }

    // TODO 需要回调里回传此参数
    // 1.保存回调模型分群数据
    // TODO  2.更新计算状态为计算完整
    const res = await this.marketingModelSettingsService.update({ result, status: MARKETING_MODEL_STATUS.DONE }, { id })
    // 创建lookup 
    const data = (_.get(result, 'data.groups', result.data) || []).filter(p => p.userCount > 0)
    if (data.length) {
      for (let i = 0; i < data.length; i++) {
        console.log('====回调分群数据==========', i)
        await createOrUpdateLookup({ dataConfig: { ...conf.dataConfig, groupId: data[i].groupId } }, true)
      }
    }
    return res
  }

  async getModelUsergroups(ctx) {
    const { projectId } = ctx.params
    const res = await this.marketingModelSettingsService.findAll({
      status: 2,
      project_id: projectId
    })
    const list = res.map(o => _.pick(o, ['id', 'type', 'status', 'params', 'updated_at', 'result']))
    ctx.body = Response.ok(list)
  }

  // 0 未开始计算 1 计算中 2 计算完成 3 计算失败 4 未设置参数
  async getCalcState(ctx) {
    const { projectId } = ctx.params
    const res = await this.marketingModelSettingsService.findAll({
      project_id: projectId
    })
    const list = res.map(o => _.pick(o, ['id', 'type', 'status', 'params']))
    const obj = {}
    list.forEach(o => {
      if (o.params && JSON.stringify(o.params) !== '{}') {
        obj[o.type] = o.status || 0
      } else {
        obj[o.type] = 4 // 未设置参数
      }
    })
    ctx.body = Response.ok(obj)
  }

  async saveTitle(ctx) {
    const { projectId } = ctx.params
    const { type, newResult } = ctx.q
    const res = await this.marketingModelSettingsService.update({
      result: newResult
    }, {
      project_id: projectId, type
    })
    ctx.body = Response.ok(res)
  }
}
