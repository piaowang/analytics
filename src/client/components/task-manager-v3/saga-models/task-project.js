// import Fetch from "~/src/client/common/fetch-final"
import Fetch from '../../../common/fetch-final'
import { message } from 'antd'
import { recvJSON } from '../../../common/fetch-utils'
import _ from 'lodash'

export const namespace = 'TaskProjectModel'

export default () => ({
  namespace,
  state: {
    pList: [],
    usermapping: [],
    checkList: [],
    schemaList: [],
    data: {
      dbType: 'mysql'
    },
    isShowDBConnectModal: false,
    useDbList: [],
    dbList: [],
    search: '',
    useDbIds: [],
    showRoleSetting: false,
    updateUser: 0,
    globalProps: [],
    showPropsSetting: false
  },
  reducers: {
    save(state, action) {
      const { pList, usermapping } = action.payload
      const nextState = { ...state }

      if (pList) {
        nextState.pList = pList
      }
      if (usermapping) {
        nextState.usermapping = usermapping
      }
      return nextState
    },

    saveDepartment(state, action) {
      const { departments } = action.payload
      let nextState = {
        ...state,
        departments
      }
      return nextState
    },
    changeState(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    *query({ payload }, { call, put }) {
      let url = '/app/task-schedule-v3/get-project'
      const response = yield call(Fetch.get, url, payload)
      const { result = [], success } = response
      if (success) {
        yield put({
          type: 'save',
          payload: {
            pList: result
          }
        })
      }
    },

    *createTaskProject({ payload }, { call, put }) {
      let url = '/app/task-v3/create-project'
      const { data, callback = () => {} } = payload
      const response = yield call(Fetch.post, url, data)
      const { success } = response
      if (success) {
        yield put({ type: 'query' })
        callback()
      } else {
        callback(new Error())
      }
    },

    *ecitorTaskProject({ payload }, { call, put }) {
      let url = '/app/task-v3/editor-project'
      const { data, callback = () => {} } = payload
      const response = yield call(Fetch.post, url, data)
      const { result = [], success } = response
      if (success) {
        yield put({ type: 'query' })
        callback()
      } else {
        callback(new Error())
      }
    },

    *deleteTaskProject({ payload }, { call, put }) {
      let url = '/app/task-v3/delete-project'
      const { data, callback = () => {} } = payload
      const response = yield call(Fetch.post, url, data)
      const { result = [], success } = response
      if (success) {
        yield put({ type: 'query' })
        callback()
      } else {
        callback(response)
      }
    },

    *getMappingUser({ payload }, { call, put }) {
      let url = '/app/task-v3/get-task-mapping'
      const { data, updateTimes } = payload || {}
      const response = yield call(Fetch.get, url, data)
      const { result = [], success } = response
      if (success) {
        yield put({
          type: 'save',
          payload: {
            usermapping: result
          }
        })
        if (updateTimes) {
          yield put({
            type: 'changeState',
            payload: {
              updateTimes
            }
          })
        }
      }
    },

    *taskProjectMappingUser({ payload }, { call, put }) {
      let url = '/app/task-v3/task-mapping-user'
      const { data, callback = () => {} } = payload
      const response = yield call(Fetch.post, url, data)
      const { success } = response
      if (success) {
        yield put({
          type: 'getMappingUser',
          payload: {
            data: { id: data.project_id }
          }
        })
        callback()
      } else {
        callback(new Error())
      }
    },

    *editTaskProjectUser({ payload, callback }, { call, put }) {
      let url = '/app/task-v3/edit-task-project-user'
      const { data, projectId, updateTimes = 0 } = payload
      const response = yield call(Fetch.post, url, data)
      const { success } = response
      if (success) {
        yield put({
          type: 'getMappingUser',
          payload: {
            data: { id: projectId },
            updateTimes: updateTimes + 1
          }
        })
        message.success('设置成功')
        callback && callback()
      } else {
        message.error('保存失败')
      }
    },
    *taskProjectDeleteUser({ payload }, { call, put }) {
      let url = '/app/task-v3/task-delete-mapping'
      const { data, callback = () => {} } = payload
      const response = yield call(Fetch.post, url, data)
      const { success } = response
      if (success) {
        yield put({
          type: 'getMappingUser',
          payload: {
            data: { id: data.project_id }
          }
        })
        callback()
      } else {
        callback(new Error())
      }
    },

    *getUsedDB({ payload }, { call, put }) {
      let checkUrl = '/app/task-v3/getCheckDB'
      const {
        success,
        result: { dbList, useDbList }
      } = yield call(Fetch.get, checkUrl, payload)
      if (!success) {
        message.error('获取数据库表信息失败!')
        return
      }
      const dbLists = dbList.map(item => {
        return {
          label: item.dbAlais,
          value: item.id.toString()
        }
      })
      const useDbIds = useDbList.map(item => item.id.toString())
      yield put({
        type: 'changeState',
        payload: { dbList: dbLists, useDbList, useDbIds }
      })
    },
    *create({ payload: data }, { select, call, put }) {
      let params = {
        ...data,
        projectTypeId: 1,
        dbType: data.dbType.toLowerCase()
      }
      const url = '/app/new-task-schedule/dataBase?action=createDataBase'
      let res = yield call(Fetch.post, url, null, {
        ...recvJSON,
        body: JSON.stringify(params)
      })
      if (res.status === 'success') {
        message.success('操作成功')
        yield put({
          type: 'changeState',
          payload: {
            isShowDBConnectModal: false,
            search: ''
          }
        })
      } else {
        if (!res.connectFlag) {
          message.error('数据库连接失败，数据源别名已存在')
        } else {
          message.error('操作失败')
        }
      }
    },
    *updateCheckDB({ payload }, { call, put }) {
      const url = '/app/task-v3/updateCheckDB'
      const { success } = yield call(Fetch.post, url, payload)
      if (!success) return message.warn('操作失败')
      yield put({
        type: 'getUsedDB',
        payload
      })
      yield put({
        type: 'changeState',
        payload: { isShowDBConnectModal: false, search: '' }
      })
      message.success('操作成功！')
    },
    *delCheckDB({ payload }, { call, put }) {
      const url = '/app/task-v3/delCheckDB'
      const { success } = yield call(Fetch.post, url, payload)
      if (!success) return
      message.success('删除连接成功！')
      yield put({
        type: 'getUsedDB',
        payload
      })
    },
    *getSchemaList({ payload: data }, { select, call, put }) {
      let url = '/app/new-task-schedule/dataBase?action=fetchSchemas'
      let params = {
        ...data,
        dbType: data.dbType.toLowerCase()
      }
      let res = yield call(Fetch.post, url, null, {
        ...recvJSON,
        body: JSON.stringify(params)
      })
      if (res.status === 'success') {
        yield put({
          type: 'changeState',
          payload: {
            schemaList: res.schemaList
          }
        })
      } else {
        message.error('获取schemaList失败!')
      }
    },
    *createAndUseDB({ payload = {}, callback }, { call, put }) {
      const { projectId, values: data } = payload
      const params = getCreateDbParamsByDataType(data)
      let url = '/app/task-schedule-v3/dataBase?action=createDataBase'

      const formdata = new FormData()
      Object.keys(params).map(item => formdata.append(item, params[item]))

      let { data: dataBaseInfo, status, connectFlag } = yield call(Fetch.post, url, null, { headers: {}, body: formdata })

      if (status !== 'success' && !connectFlag) {
        message.error('数据库连接失败，数据源别名已存在')
        return
      }

      if (status !== 'success') {
        message.error('操作失败')
        return
      }

      const dbId = dataBaseInfo.id
      const cUrl = '/app/task-v3/createAndUseDB'
      const { status: status2, msg: msg2 } = yield call(Fetch.post, cUrl, { projectId, dbId })

      if (status2 === 'failed') {
        return message.error(msg2)
      }

      callback && callback()
      yield put({
        type: 'changeState',
        payload: { isShowDBConnectModal: false, search: '' }
      })
      yield put({
        type: 'getUsedDB',
        payload: { projectId }
      })
      message.success('创建数据库连接成功！')
    },
    *getTaskProps({ payload }, { select, call, put }) {
      let url = '/app/task-v3/get-task-props'
      let res = yield call(Fetch.get, url)
      if (res.success) {
        yield put({
          type: 'changeState',
          payload: { globalProps: res.result, showPropsSetting: false }
        })
      } else {
        message.error('获取全局属性失败!')
      }
    },
    *saveTaskProps({ payload }, { select, call, put }) {
      let url = '/app/task-v3/save-task-props'
      let res = yield call(Fetch.post, url, payload)
      if (res.success) {
        yield put({ type: 'getTaskProps' })
      } else {
        message.error('保存失败!')
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'query', payload: {} })
      dispatch({ type: 'getTaskProps', payload: {} })
    }
  }
})

const getCreateDbParamsByDataType = data => {
  const { dbType, redisServers, password, redisModel, bootstrapServers, version, coreSite = '', hdfsSite = '', warehouse = '' } = data
  let params = {
    ...data,
    projectTypeId: 1,
    dbType: data.dbType.toLowerCase()
  }
  switch (dbType) {
    case 'redis':
      params = {
        ...params,
        extraContent: JSON.stringify({ redisServers, password, redisModel })
      }
      break
    case 'kafka':
      params = {
        ...params,
        extraContent: JSON.stringify({ bootstrapServers, version })
      }
      break
    case 'hdfs':
      params = {
        ...params,
        extraContent: JSON.stringify({ coreSite, hdfsSite })
      }
      break
    case 'hive':
      params = {
        ...params,
        extraContent: JSON.stringify({ coreSite, hdfsSite, warehouse })
      }
      break
  }
  if (data.id) {
    return {
      ...params,
      valid: true,
      version: 0,
      id: data.id
    }
  }
  return params
}
