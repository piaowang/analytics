import * as bus from '../../../../databus/datasource'
import DruidQueryResource from '../../../../models/druid-query/resource'
import TagDictResource from '../../../../models/tag-dict/resources'
import { QUERY_ENGINE, DimDatasourceType } from 'common/constants'
import _ from 'lodash'
import Resource from '../../../../models/resource'
import { convertTagsValue } from 'common/convertTagsValue'
import {getTagTrees} from '../../../../actions/tag-tree'

const $resource = {
  tagTypes: Resource.create('/app/tag-type/get')
}

const Action = {
  getDimensionList: 'get-dimension-list',
  change: 'change-state',
  getSingleUserData: 'get-single-user-data',
  getTreeList: 'get-signgle-tag-tree-list',
  getTagList: 'get-signgle-tag-list'
}

const DisplayTabsEnum = {
  tagValues: 'tagValues',
  userActions: 'userActions'
}

const DisplayTabNameDict = {
  tagValues: '标签画像',
  userActions: '行为序列'
}


const Def = {
  loading: true,
  singleData: [],
  dimensions: [],
  tagTypes: [],
  data: {},
  activeTypes: [],
  activeTreeIds: [],
  activeChildIds: [],
  types: [],
  tagTrees: [],
  uuidFieldName: '',
  displayTabName: DisplayTabsEnum.tagValues
}

const Actions = {
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
      let dimNameDict = _.keyBy(res.data, 'name')
      done({
        dimensions: res.data,
        uuidFieldName,
        dimNameDict
      })
    } else {
      done({
        dimensions: [],
        uuidFieldName: '',
        dimNameDict: {}
      })
    }
  },

  async getTagList(datasource_id, done) {
    const tags = await $resource.tagTypes.get({}, { where: { datasource_id } }).json()
    done({ tagTypes: tags.result || [] })
  },

  async getTreeList(datasource_id, done) {
    let tagTrees = await getTagTrees(datasource_id, {
      parentId: 'all'
    }, false)(_.noop)
    tagTrees = _.get(tagTrees, 'result.trees') || []
    done({ tagTrees })
  },

  async getSingleUserData(project, commonMetric, datasource_name, reference_tag_name, uid, done) {
    // sql查询uindex接口数据
    const sql = `SELECT * FROM \`${datasource_name}\` WHERE  ${commonMetric}= '${uid}'`
    let childProjectId = project.parent_id ? project.id : null
    const { result } = await DruidQueryResource.sql(sql, QUERY_ENGINE.UINDEX, childProjectId)
    const { result: resTag } = await TagDictResource.findAllValid(project.id)
    if (result.length) {
      let res = convertTagsValue(result, resTag)
      done({ singleData: res[0] })
    } else {
      done({ singleData: [] })
    }
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
    case Action.getDimensionList:
      return Actions.dimensionList(action.payload.datasource, done)
    case Action.getTagList:
      return Actions.getTagList(action.payload.datasource_id, done)
    case Action.getTreeList:
      return Actions.getTreeList(action.payload.datasource_id, done)
    case Action.getSingleUserData:
      return Actions.getSingleUserData(
        action.payload.project,
        action.payload.commonMetric,
        action.payload.datasource_name,
        action.payload.reference_tag_name,
        action.payload.uid,
        done
      )
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
  Action,
  DisplayTabsEnum,
  DisplayTabNameDict
}
