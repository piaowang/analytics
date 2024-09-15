
import Resource from '../../../models/resource'
import _ from 'lodash'
import * as bus from '../../../databus/datasource'
import { DimDatasourceType } from 'common/constants'
import { getTagChildren } from '../../../actions'
import {EMPTY_VALUE_OR_NULL, TagType} from '../../../../common/constants'

const $resource = {
  list: Resource.create('/app/tag-enhance/getlist'),
  info: Resource.create('/app/tag-enhance/get/:id'),
  save: Resource.create('/app/tag-enhance/update'),
  del: Resource.create('/app/tag-enhance/delete'),
  recalculate: Resource.create('/app/tag-enhance/recalculate'),
  tagTypes: Resource.create('/app/tag-type/get')
}

const Action = {
  getTagValueEnhanceList: 'get-tag-value-enhance-list',
  delTagValueEnhance: 'del-tag-value-enhance',
  saveTagValueEnhance: 'save-tag-value-enhance',
  recalculateValueEnhance: 'recalculate-tag-value-enhance',
  getTagList: 'get-signgle-tag-list',
  getDimensionList: 'get-dimension-list',
  getTagChildren: 'get-tag-children',
  change: 'change-state'
}

const Def = {
  listLoading: false,
  saveing: false,
  quering: false,
  modelList: [],
  model: {},
  addPanelVisible: false,
  message: {},
  cardWidth: 300,
  maxItem: 4,
  tagTypes: {},
  dimensions: [],
  uuidFieldName: '',
  selectTagChildren: []
}

const Actions = {
  async getList(projId, done) {
    const tags = await $resource.list.get({}, { projId }).json()
    done({ modelList: tags.result || [] })
  },
  async del(id, done) {
    let res = await $resource.del.post({}, { id }).json()
    if (!res.success) {
      done({ message: { type: 'error', text: res.message } })
      return
    }
    done({ message: { type: 'success', text: '删除成功' } })
  },
  async save(data, done) {
    let res = await $resource.save.post({}, data).json()
    if (!res.success) {
      done({ message: { type: 'error', text: res.message } })
      return
    }
    done({})
  },
  async recalculate(id, done) {
    let res = await $resource.recalculate.get({}, { id }).json()
    if (!res.success) {
      done({ message: { type: 'error', text: res.message } })
      return
    }
    done({})
  },
  async getTagList(datasource, done) {
    let tags = await $resource.tagTypes.get({}, { where: { datasource_id: datasource.id } }).json()
    tags = _.groupBy(tags.result, p => p.type)
    done({ tagTypes: tags || [] })
  },
  /**
 * 获取项目维度
 * @param {String} datasource
 * @param {Function} done
 */
  async dimensionList(datasource, done) {
    let datasource_type = datasource.tag_datasource_name
      ? DimDatasourceType.tag
      : DimDatasourceType.default
    let res = await bus.getDimensions(datasource.id, {
      datasource_type
    })
    if (res) {
      let uuidFieldName = _.get(datasource, 'params.loginId') || _.get(datasource, 'params.commonMetric[0]')
      if (uuidFieldName) {
        let uuidField = res.data.find(p => p.name === uuidFieldName)
        uuidFieldName = uuidField && uuidField.title || uuidFieldName
      }
      done({
        dimensions: res.data,
        uuidFieldName
      })
    } else {
      done({
        dimensions: [],
        uuidFieldName: ''
      })
    }
  },
  async getTagChildren(data, done) {
    const { dimension, projectCurrent, datasourceCurrent } = data
    let { children } = await getTagChildren(dimension, projectCurrent, datasourceCurrent)
    const getValue = (value) => {
      let [va, vb] = value
      let res = 0
      if (_.isNull(va)) {
        res = -Infinity
      } else if (_.isNull(vb)) {
        res = Infinity
      } else {
        res = va + vb
      }
      return res
    }
    children = children.sort((a, b) => {
      // a: ['空值null']
      // 空值始终排在第一位
      if (a.value[0] === EMPTY_VALUE_OR_NULL) return -1
      if (b.value[0] === EMPTY_VALUE_OR_NULL) return 1
      // a,b类型必然一样
      if (a.type === TagType.String) {
        return a.title > b.title ? 1 : -1
      }
      return getValue(a.value) - getValue(b.value)
    })
    done({
      selectTagChildren: children || []
    })
  }
}

/**
 * @param {ViewModel} state
 * @param {Object} action
 * @param {Function} done
 * @return {Object}
 */
function scheduler(state, action, done) {
  switch (action.type) {
    case Action.change:
      return { ...state, ...action.payload }
    case Action.getTagValueEnhanceList:
      return Actions.getList(action.payload.proj_id, done)
    case Action.getInfoById:
      return Actions.getInfoById(action.payload.id, done)
    case Action.delTagValueEnhance:
      return Actions.del(action.payload.id, done)
    case Action.saveTagValueEnhance:
      return Actions.save(action.payload, done)
    case Action.getTagList:
      return Actions.getTagList(action.payload.datasource, done)
    case Action.getDimensionList:
      return Actions.dimensionList(action.payload.datasource, done)
    case Action.getTagChildren:
      return Actions.getTagChildren(action.payload, done)
    case Action.recalculateValueEnhance:
      return Actions.recalculate(action.payload.id, done)
    default:
      return state
  }
}

export default {
  name: 'vm',
  scheduler,
  state: { ...Def }
}

export {
  Action
}
