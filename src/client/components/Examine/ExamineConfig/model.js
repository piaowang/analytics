import Fetch from '../../../common/fetch-final'
import {message } from 'antd'
import _ from 'lodash'

export const namespace = 'examine-config'
const modelUrl = '/app/examine-config/'

function makeTree(data) {
  let treeNodes = data.map(k => ({
    ...k,
    key: k.id,
    value: k.id,
    title: k.name,
    children: []
  }))
  let treeNodeskeyby = _.keyBy(treeNodes, 'key')

  let treeRoot = []

  let tree = treeNodes.reduce((arr, k) => {
    if (k.parent) {
      let parent = treeNodeskeyby[k.parent]
      if (!parent) {
        return [...arr, k]
      }
      parent.children.unshift(k)
      return arr
    }
    return [...arr, k]
  }, treeRoot)
  return tree
}

export default (props) => ({
  namespace,
  state: {
    tableData: {rows: [], count: 0 },
    configModalInfo: {},
    isShowConfigModal: false,
    institutionList: [],
    roleList: [],
    takedIds: [], // 已经有配置流的机构ids
  },
  reducers: {
    changeState(state, {payload }) {
      return {...state, ...payload }
    }
  },
  sagas: {
    *getTableData({ payload = {} }, { select, call, put }) {
      const { result: {rows = [], count, taked_ids}, success } = yield call(Fetch.get, `${modelUrl}getExamines`, payload)
      const res = rows.map(o => (
        _.omit({...o, institution_name: _.get(o, 'SugoInstitution.name', '')} , ['SugoInstitution'])
      ))
      if (success) {
        yield put({
          type: 'changeState',
          payload: { tableData: {rows: res, count}, takedIds: taked_ids}
        })
        return
      }
      return message.error('获取审核流列表失败')
    },
    *getInstitutions({payload = {}}, {call, put }) {
      const {result, success } = yield call(Fetch.get, `${modelUrl}getInstitutions`, payload)
      if(success) {
        return  yield put({
          type: 'changeState',
          payload: { institutionList: makeTree(result) }
        })
      }
      return message.error('获取机构列表失败')
    },
    *getMembersByInstitutionsId({ payload = {}, callback }, { call, put }) {
      const { result, success } = yield call(Fetch.get, `${modelUrl}getMembersByInstitutionsId`, payload)
      if (success) {
        const userId = window.sugo.user.id
        const filter = result.filter(o => o.id !== userId)
        yield put({
          type: 'changeState',
          payload: { roleList: filter }
        })
        callback && callback()
        return
      }
      return message.error('获取该机构下的角色列表失败')
    },
    *saveExamineConfig({payload = {}, callback}, {call, put }) {
      // const { success, message: msg } = yield call(Fetch.post, `${modelUrl}saveExamineConfig`, payload) || {}
      const res = yield call(Fetch.post, `${modelUrl}saveExamineConfig`, payload) || {}
      if (res && res.success) {
        yield put({
          type: 'changeState',
          payload: { isShowConfigModal: false }
        })
        callback && callback()
        return message.success('保存成功')
      }
      return message.error(`保存失败, ${res && res.message}`)
    },
    *getExamineConfigByExamineId({payload = {}}, {call, put}) {
      const {result, success } = yield call(Fetch.get, `${modelUrl}getExamineConfigByExamineId`, payload)
      if(success) {
        return yield put({
          type: 'changeState',
          payload: {configModalInfo: result }
        })
      }
      return message.error('获取审核流配置信息失败')
    },
    *deleteExamineConfig({payload = {}, callback}, {call, put}) {
      const {result, success } = yield call(Fetch.get, `${modelUrl}deleteExamineConfig`, payload)
      if(success) {
        callback && callback()
        return message.success('删除成功')
      }
      return message.error('删除失败')
    }
  },
  subscriptions: {
    
  }
})
