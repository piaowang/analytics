
import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import { message } from 'antd'
import {modelType, lifeCycleTitle, valueSliceTitle  } from './constants'

export const namespace = 'usergroupsModalSetting'
const modelTypeArr = _.map(modelType, o => o.id)


function getRFMName(arr, key) {
  return arr.length === 1
    ? `${key}>${arr[0]}`
    : `${arr[0]}<=${key}<=${arr[1]}`
}


function getRFMTitle(obj) {
  return ['R', 'F', 'M'].map(key => getRFMName(obj[key], key)).join(', ')
}



export default (props) => ({
  namespace,
  state: {
    usergroupsModels: {},
    calcState: {},
    projectId: ''
  },
  reducers: {
    changeState (state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    *getModelUsergroups({payload = {}}, {call, put }) {
      const {projectId } = payload
      const url = `/app/marketing-model-settings/getModelUsergroups/${projectId}`
      const {success, result = [] } = yield call(Fetch.get, url, payload )
      const obj = {}
      for (let o of result) {
        // 前端测试用生成标题
        // if (o.type === 0) {
        //   if ( _.get(o, 'result.data.groups', []).length>0) {
        //     _.get(o, 'result.data.groups').forEach((p) => {
        //       p.title = getRFMTitle(p)
        //     })
        //   }
        // } else {
        //   if(_.isArray(_.get(o, 'result.data', []))  && _.get(o, 'result.data', []).length>0) {
        //     _.get(o, 'result.data').forEach((p, i) => {
        //       if (o.type === 1) {
        //         p.title = lifeCycleTitle[i]
        //       } else if (o.type === 2) {
        //         p.title = valueSliceTitle[i]
        //       }
        //     })
        //   }
        // }
        obj[modelType[o.type].id] = o
      }
    
      if(success) {
        const obj = {}
        result.forEach(o => {
          obj[modelType[o.type].id] = o
        })
        return  yield put({
          type: 'changeState',
          payload: {usergroupsModels: obj}
        })
      }
      return message.error('获取模型的用户分群列表失败')
    },
    *remove({ payload = {} }, { call, put, select }) {
      const { id} = payload
      const {projectId } = yield select(p => p[namespace])
      const url = `/app/marketing-model-settings/remove/${id}`
      const { success, result } = yield call(Fetch.delete, url )
      if (success) {
        message.success('删除成功')
        return yield put({
          type: 'getModelUsergroups',
          payload: {projectId }
        })
      }
      return message.error('删除失败')
    },
    *manualCalc({ payload = {} }, { call, put }) {
      const {projectId, type } = payload
      const url = `/app/marketing-model-settings/manaual-calc/${projectId}`
      const { success, result } = yield call(Fetch.get, url, {type: type+'' })
      if(success) {
        // yield put({
        //   type: 'changeState',
        //   payload: { usergroupsModels: result }
        // })
        message.success('计算成功')
        yield put({
          type: 'getCalcState',
          payload: {projectId }
        })
        return yield put({
          type: 'getModelUsergroups',
          payload: {projectId }
        })
      }
      return message.error('计算失败')
    },
    *getCalcState({ payload = {} }, { call, put }) {
      const {projectId } = payload
      const url = `/app/marketing-model-settings/getCalcState/${projectId}`
      const { success, result } = yield call(Fetch.get, url )
      const obj = {}
      _.keys(result).forEach(o => {
        obj[modelTypeArr[o]] = result[o]
      })
      if (success) {
        yield put({
          type: 'changeState',
          payload: { calcState: obj}
        })
      }
      return 
    },
    *saveTitle({payload = {}}, {call, put }) {
      const {projectId, type, newResult } = payload
      const url = `/app/marketing-model-settings/save-title/${projectId}`
      const { success } = yield call(Fetch.get, url, {type, newResult })
      if(success) {
        message.success('保存成功')
        return yield put({
          type: 'getModelUsergroups',
          payload: {projectId }
        })
      }
      return message.error('保存失败')
    }
  },
  subscriptions: {
  }
})
