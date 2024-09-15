import { Store, storeViewModelCreator } from 'sugo-store'
import Vm, {Action as VmAction, DisplayTabsEnum} from './view-model'
import _ from 'lodash'
import { typesBuilder, untypedTreeId } from '../../tag-type-list'
//import checkProjectType from '../../tag-require'
import * as ls from '../../../../common/localstorage'
import {deepFlat} from '../user-list/actions'

/**
 * @param {String} type
 * @param {Object} [payload={}]
 * @return {{type: String, payload: Object}}
 */
function struct(type, payload = {}) {
  return { type, payload }
}

class Creator extends Store {
  constructor() {
    super()
    storeViewModelCreator([Vm], this)
    this.initialize()
  }

  async dispatchAsyn(actionOrActions) {
    return new Promise(resolve => this.dispatch(actionOrActions, resolve))
  }

  /**
   * 获取初始化数据
   *
   * @param {ProjectStoreModel} project
   * @return {Creator}
   */
  async initViewListModel(project, datasource, userDimName, uid) {
    let isInspectUserActions = _.includes(location.pathname, 'inspect-user')
    let uidDimName = userDimName || (isInspectUserActions
      ? _.get(datasource, 'params.commonMetric[0]')
      : _.get(datasource, 'params.loginId') || _.get(datasource, 'params.commonMetric[0]'))

    if (isInspectUserActions) {
      await this.dispatchAsyn([
        struct(VmAction.getDimensionList, { datasource })
      ])
      let {uuidFieldName} = this.state.vm
      await this.dispatchAsyn(struct(VmAction.change, {
        loading: false,
        displayTabName: DisplayTabsEnum.userActions,
        uuidFieldName: userDimName || uuidFieldName
      }))
      return this
    }

    this.dispatch(struct(VmAction.change, { loading: true }))
    await this.dispatchAsyn([
      struct(VmAction.getDimensionList, { datasource }),
      struct(VmAction.getSingleUserData, {
        project: project,
        commonMetric: uidDimName,
        datasource_name: datasource.tag_datasource_name,
        reference_tag_name: project.reference_tag_name,
        uid
      }),
      struct(VmAction.getTreeList, { datasource_id: project.datasource_id, uid }),
      struct(VmAction.getTagList, { datasource_id: project.datasource_id, uid })
    ])
    let { dimensions, singleData, tagTypes, tagTrees } = this.state.vm
    let { types } = await typesBuilder({ dimensions, tagTypes, tagTrees, datasourceCurrent: datasource })
    let singleUserSelectTags = ls.get('singleUserSelectTags')
    let activeChildIds = []
    const fields = deepFlat(types)
    const selectedTags = _.take(fields, 10).filter(d => d)
    let activeTreeIds = _.uniq(
      (selectedTags || []).reduce((prev, d) => {
        return [
          ...prev,
          ...(d ? (d.treeIds || []) : [])
        ]
      }, [])
    )
    if (singleUserSelectTags) {
      activeChildIds = _.get(singleUserSelectTags, `${project.id}.${window.sugo.user.id}`, [])
      let actives = fields.filter(d => activeChildIds.includes(d.id))
      activeTreeIds = _.uniq(
        actives.reduce((p, c) => {
          return [
            ...p,
            ...(c ? (c.treeIds || []) : [])
          ]
        }, [])
      )
    } 
    
    if(!activeChildIds.length) {
      activeChildIds = selectedTags.map(d => d.id)
    }
    let res = this.convertData({ activeChildIds, dimensions, singleData }, tagTypes)
    await this.dispatchAsyn(struct(VmAction.change, {
      data: res,
      loading: false,
      types,
      tagTrees,
      activeChildIds,
      activeTreeIds,
      displayTabName: isInspectUserActions ? DisplayTabsEnum.userActions : DisplayTabsEnum.tagValues
    }))
    return this
  }

  /**
     * 修改状态
     *
     * @param {ProjectStoreModel} state
     * @return {Creator}
     */
  async changeState(state, projectId) {
    let newState = {
      ...state,
      loading: false
    }
    if (state.activeChildIds || state.tagTypes) {
      newState.data = this.convertData(state)
      if (state.activeChildIds) {
        let singleUserSelectTags = ls.get('singleUserSelectTags') || {}
        _.set(singleUserSelectTags, `${projectId}.${window.sugo.user.id}`, state.activeChildIds)
        ls.set('singleUserSelectTags', singleUserSelectTags)
      }
    }
    await this.dispatchAsyn(struct(VmAction.change, newState))
    return this
  }

  convertData(state) {
    let { singleData, activeChildIds, dimensions, tagTypes } = state
    if (!singleData) {
      singleData = this.state.vm.singleData
    }
    if (!dimensions) {
      dimensions = this.state.vm.dimensions
    }
    if (!dimensions) {
      dimensions = this.state.vm.dimensions
    }
    if (!tagTypes) {
      tagTypes = this.state.vm.tagTypes
    }
    let displayDimensions = _.map(dimensions, p => {
      if (activeChildIds.includes(p.id) && p.id !== '__time') {
        return p.name
      }
    }).filter(_.identity)
    singleData = _.pick(singleData, displayDimensions)
    let res = _.map(_.keys(singleData), k => {
      let dimension = _.find(dimensions, p => p.name === k) || {}
      let tagTyp = _.find(tagTypes, p => p.dimension_id === dimension.id) || { type: '未分类', tag_tree_id: untypedTreeId }
      return {
        type: tagTyp.type,
        treeId: tagTyp.tag_tree_id,
        id: k,
        value: singleData[k]
      }
    })
    return _.groupBy(res, p => p.treeId)
  }
}

export default Creator
