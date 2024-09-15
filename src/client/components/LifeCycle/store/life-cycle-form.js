import * as lifeCycleService from '../../../services/life-cycle'
import { defaultStages } from './constants' 
import {browserHistory} from 'react-router'

export const namespace = 'lifeCycleForm'

export default {
  namespace,
  state: {
    updateHour: 1,
    editUpdateHour: false,
    usergroups: [],
    relatedBehaviorProjectId: null, 
    relatedUserTagProjectId: null,
    groupby: '',
    dimensionTree: [],
    stage: [],
    stageState: [],
    saving: false
  },
  reducers: {
    setState(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    *init({ payload }, { call, put, take, select }){

      yield take('sagaCommon/changeState')
      const projectCurrent = yield select(state => state.sagaCommon.projectCurrent)
      let project_id = projectCurrent.id

      const { result: lifeCycle = {} } = yield call(lifeCycleService.findOne, project_id)

      if (!_.isEmpty(lifeCycle)) {
        const { stages, relatedBehaviorProjectId, relatedUserTagProjectId, group_by_name } = lifeCycle


        yield put({
          type: 'setState',
          payload: {
            stage: stages,
            relatedBehaviorProjectId,
            relatedUserTagProjectId,
            groupby: group_by_name
          }
        })

      } else {
        yield put({
          type: 'setState',
          payload: {
            stage: defaultStages
          }
        })
      }

    },
    *createUsergroup({ payload }, { call, put }) {
      //default
      const { datasourceCurrent } = payload
      const { id, name } = datasourceCurrent

      yield put({
        type: 'setState',
        payload: {
          stageState: defaultStages.map( () => ({
            id: '', //usergroupId
            druid_datasource_id: id,
            datasource_name: name,
            params: { composeInstruction: [] }
          }))
        }
      })
    },
    *createLifeCycle({ payload }, { call, put }) {
      const { success } = yield call(lifeCycleService.create, payload)
      if (success) browserHistory.push('/console/life-cycle')
      yield put({
        type: 'setState',
        payload: {
          saving: false
        }
      })
    },
    *updateLifeCycle({ payload }, { call, put }) {
      const { success } = yield call(lifeCycleService.update, payload)
      if (success) browserHistory.push('/console/life-cycle')
      yield put({
        type: 'setState',
        payload: {
          saving: false
        }
      })
    },
    *getUserGroups({ payload }, { call, put }) {
      // const { result } = yield call(actsService.getUserGroups, payload)
      if (result) {
        yield put({
          type: 'setState',
          payload: {
            usergroups: result
          }
        })
      }
    },
    *fetchLifeCycle({ payload }, { call, put, take, select }) {

      yield take('sagaCommon/changeState')
      const projectCurrent = yield select(state => state.sagaCommon.projectCurrent)
      let project_id = projectCurrent.id
      const { result: lifeCycle = {} } = yield call(lifeCycleService.findOne, project_id)

      const { result: ugs } = yield call(lifeCycleService.findAllUg, { ugIds: (lifeCycle.stages || []).map( i => i.id ) } )

      const { stages, group_by_name, trigger_timer: { updateHour }, relatedbehaviorprojectid, relatedusertagprojectid} = lifeCycle

      yield put({
        type: 'setState',
        payload: {
          stage: stages,
          stageState: ugs,
          groupby: group_by_name,
          relatedBehaviorProjectId: relatedbehaviorprojectid,
          relatedUserTagProjectId: relatedusertagprojectid,
          updateHour
        }
      })

    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname, query } = history.getCurrentLocation()
      // 可以做异步加载数据处理
      if (pathname === '/console/life-cycle/new' ) {
        dispatch({ type: 'init', payload: {} })
      }
    }
  }
}
