import { Store, storeViewModelCreator } from 'sugo-store'
import Vm, { Action as VmAction, DisplayTabsEnum } from './view-model'
import _ from 'lodash'
import { typesBuilder, untypedTreeId } from '../../tag-type-list'
import * as ls from '../../../../common/localstorage'
import { deepFlat } from '../user-list/actions'
import { browserHistory } from 'react-router'

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
  async initData(project, dataSourceDimensions, commonMetric, id = '', refresh = false) {
    let projectId = project.id, datasourceId = project.datasource_id, tagDatasourceName = project.tag_datasource_name
    let changeState =  { loadding: true, queryKey: '', queryDim: '' }
    if(!refresh) {
      changeState = {
        ...changeState,
        message: {},
        microcosmicId: '',
        microcosmicData: {},
        tagsInfo: {},
        microcosmicUserGroups: [],
        tagsLineHeight: 0,
        displayPanel: 'baseTags'
      }
      browserHistory.push('/console/microcosmic-portrait')
    }
    await this.dispatchAsyn(struct(VmAction.change, changeState))
    await this.dispatchAsyn(struct(VmAction.getTagsInfo, { projectId, datasourceId }))
    if (!refresh) {
      await this.dispatchAsyn(struct(VmAction.change, { loadding: false, message: {} }))
    } else {
      await this.getMicrocosmicInfo(project, dataSourceDimensions, commonMetric, id)
      await this.dispatchAsyn(struct(VmAction.change, { loadding: false, message: {} }))
    }
  }
  async dispatchAsyn(actionOrActions) {
    return new Promise(resolve => this.dispatch(actionOrActions, resolve))
  }

  async changeState(obj) {
    this.dispatchAsyn(struct(VmAction.change, obj))
  }

  async getMicrocosmicInfo(tagProject, dataSourceDimensions, commonMetric, id = '') {
    let where = {}
    if (id) {
      where = { name: commonMetric, value: id }
    }
    else {
      const { queryDim, queryKey } = this.state.vm
      if (!queryDim || !queryKey) {
        return
      }
      where = { name: queryDim, value: queryKey }
    }
    await this.dispatchAsyn(struct(VmAction.change, { loadding: true, queryKey: ''}))
    if (!_.isEmpty(where)) {
      await this.dispatchAsyn(struct(VmAction.getMicrocosmicInfo, {
        project: tagProject,
        where,
        dataSourceDimensions,
        commonMetric
      }))
    }
    browserHistory.push(`/console/microcosmic-portrait/${this.state.vm.microcosmicId}`)
    await this.dispatchAsyn(struct(VmAction.change, { loadding: false, message: {} }))
  }

  async queryMicrocosmicId(tagDatasourceName, commonMetric) {
    const { queryDim, queryKey } = this.state.vm
    const where = { name: queryDim, value: queryKey }
    if (!_.isEmpty(where)) {
      await this.dispatchAsyn(struct(VmAction.change, { loadding: true }))
      await this.dispatchAsyn(struct(VmAction.queryMicrocosmicId, { tagDatasourceName, where, commonMetric }))
      await this.dispatchAsyn(struct(VmAction.change, { loadding: false, message: {} }))
      browserHistory.push(`/console/microcosmic-portrait/${this.state.vm.microcosmicId}`)
    }
  }

  async queryLike(project, val, notQueryLike) {
    const { queryDim } = this.state.vm
    if (notQueryLike) {
      await this.dispatchAsyn(struct(VmAction.change, { queryKey: val }))
    } else {
      const where = { name: queryDim, value: val }
      if (!_.isEmpty(where)) {
        await this.dispatchAsyn(struct(VmAction.change, { queryLikeLoadding: true, queryLikeValues: [] }))
        await this.dispatchAsyn(struct(VmAction.queryLike, { project, where }))
        await this.dispatchAsyn(struct(VmAction.change, { queryLikeLoadding: false, message: {} }))
      }
    }
  }
}

export default Creator
