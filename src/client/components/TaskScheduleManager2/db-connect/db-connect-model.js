import { message } from 'antd'
import Fetch from 'client/common/fetch-final'
import { withExtraQuery, recvJSON } from 'client/common/fetch-utils'
import _ from 'lodash'
import { DATASOURCE_TYPE } from './db-connect-manager'

export const namespace = 'dbConnect'

export const pageSize = 12
export default {
  namespace,
  state: {
    editPopWindowVisible: false,
    isShowAuthorizeModal: false,
    offset: 0,
    limit: 10,
    data: {
      dbType: 'mysql'
    },
    dataSource: [],
    sum: 0,
    search: '',
    deletePopWindowVisible: false,
    schemaList: [],
    authorizeInfo: [], // 选中的授权项目
    authorizeList: [], // 授权项目列表
    dbId: '',
    curForm: 'mysql'
  },
  reducers: {
    changeState(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    },
    changeDbType(state, { dbType }) {
      return {
        ...state,
        data: { ...state.data, dbType }
      }
    }
  },
  sagas: {
    *delete({ payload: id }, { select, call, put }) {
      let { offset, limit } = yield select(state => state[namespace])

      let url = `/app/task-v3/getAuthorize?dbId=${id}`
      const {
        result: { checkList },
        success
      } = yield call(Fetch.get, url, null, {})
      if (!success) {
        message.error('操作失败')
        return
      }

      if (checkList?.length) {
        message.error('有项目授权,删除失败!')
        return
      }

      url = `/app/new-task-schedule/dataBase?action=deleteDataBase&id=${id}`
      let res = yield call(Fetch.post, url, null)
      if (res.status === 'success') {
        message.success('删除数据库连接成功')
        yield put({
          type: 'changeState',
          payload: {
            deletePopWindowVisible: false
          }
        })
        yield put({
          type: 'getDataTables',
          payload: {
            search: '',
            limit,
            offset: 0
          }
        })
      } else {
        message.error('删除数据库连接失败,' + res.msg)
      }
    },
    /**
     * 获取表信息
     * @param {*} param0
     * @param {*} param1
     */
    *getDataTables({ payload, callback }, { call, select, put }) {
      let info = []
      // let {dataSource} = yield select(state => state[namespace])
      let url = '/app/new-task-schedule/dataBase?dataType=dataBaseInfo'
      let res = yield call(Fetch.get, url, null)
      if (res && res.status && res.status === 'success') {
        info = res.dataBaseInfo
      } else {
        message.error('获取数据库表信息失败!')
        yield put({
          type: 'changeState',
          payload: {
            dataSource: [],
            sum: 0
          }
        })
      }
      let count = info.length
      yield put({
        type: 'changeState',
        payload: {
          dataSource: info.map(item => {
            return {
              ...item,
              ...item.extraContent
            }
          }),
          sum: count
        }
      })
      if (_.isFunction(callback)) {
        callback(info)
      }
    },

    *save({ payload: data, callback }, { select, call, put }) {
      let { limit } = yield select(state => state[namespace])
      let url
      const {
        dbAlais,
        dbType,
        redisServers,
        password,
        redisModel,
        bootstrapServers,
        version,
        coreSite = '',
        hdfsSite = '',
        warehouse = '',
        zookeeper,
        namespace: nspace,
        masterAddr
      } = data
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

        case 'kudu':
          params = {
            ...params,
            extraContent: JSON.stringify({ masterAddr })
          }
          break

        case 'hbase':
          params = {
            ...params,
            extraContent: JSON.stringify({ zookeeper, namespace: nspace })
          }
          break
      }
      if (data.id) {
        // 编辑
        url = '/app/task-schedule-v3/dataBase?action=updateDataBase'
        params.valid = true
        params.version = 0
        params.id = data.id
      } else {
        // 新增
        url = '/app/task-schedule-v3/dataBase?action=createDataBase'
      }

      const formdata = new FormData()
      Object.keys(params).map(item => formdata.append(item, params[item]))

      let res = yield call(Fetch.post, url, null, {
        headers: {},
        body: formdata
      })
      if (res.status === 'success') {
        message.success('操作成功')
        yield put({
          type: 'getDataTables',
          payload: {
            search: '',
            limit,
            offset: 0
          }
        })
        yield put({
          type: 'changeState',
          payload: { editPopWindowVisible: false }
        })
        if (_.isFunction(callback)) {
          callback(res)
        }
      } else {
        if (!res.connectFlag) {
          message.error('数据库连接失败，数据源别名已存在')
        } else {
          message.error('操作失败')
        }
      }
      if (_.isFunction(callback)) {
        callback(null)
      }
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
    *fetAuthorizeList({ payload = {} }, { select, call, put }) {
      const { dbId } = payload
      const url = `/app/task-v3/getAuthorize?dbId=${dbId}`
      const {
        result: { projectList, checkList },
        success
      } = yield call(Fetch.get, url, null, {})
      if (!success) return
      const authorizeList = projectList.map(item => {
        return {
          label: item.projectName,
          value: item.projectId,
          key: `${dbId}-${item.projectId}`
        }
      })
      yield put({
        type: 'changeState',
        payload: { authorizeList, authorizeInfo: checkList }
      })
    },
    *updateAuthorize({ payload = {} }, { select, call, put }) {
      const url = '/app/task-v3/updateAuthorize'
      const { success } = yield call(Fetch.post, url, payload, {})
      if (!success) return
      message.success('授权成功！')
    },
    /**
     * 测试数据库连接
     * @param {*} param0
     * @param {*} param1
     */
    *testConnect({ payload = {} }, { call }) {
      const { dbType, dbUser, dbPassword, connectUrl, masterAddr } = payload
      const params = {
        connectUrl,
        dbType,
        dbUser,
        dbPassword
      }
      if (dbType === DATASOURCE_TYPE.kudu) {
        params.extraContent = {
          masterAddr
        }
      }
      const url = '/app/task-schedule-v3/meta?action=testDataSourceConnect'
      const { status, msg } = yield call(Fetch.post, url, null, {
        ...recvJSON,
        body: JSON.stringify(params)
      })
      if (status === 'success') {
        message.success('测试连接成功！')
        return
      }
      message.error(`连接失败,${msg}`)
    },
    /**
     * 实时同步权限检测
     * @param {*} param0
     * @param {*} param1
     */
    *testSyncPermission({ payload = {} }, { call }) {
      const { dbType, dbUser, dbPassword, connectUrl } = payload
      let url = '/app/task-schedule-v3/dataBase?action=testRealtimeSyncPermission'
      let params = {
        connectUrl: connectUrl,
        dbType: dbType,
        dbUser: dbUser,
        dbPassword: dbPassword
      }
      const { status, msg } = yield call(Fetch.post, url, null, {
        ...recvJSON,
        body: JSON.stringify(params)
      })
      if (status === 'success') {
        message.success('该数据源有实时同步权限！')
        return
      }
      message.error(`该数据源没有实时同步权限,${msg}`)
    }
  }
}
