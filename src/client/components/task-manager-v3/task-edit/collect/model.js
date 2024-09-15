import _ from 'lodash'
import { message } from 'antd'
import shortid from 'shortid'
import { getDatasourceList, getDataFieldsList, getDataTableList, saveRealTimeCollect } from '../services'
import { DATASOURCE_TYPE } from '../../../TaskScheduleManager2/db-connect/db-connect-manager'
import Fetch from 'client/common/fetch-final'
import { validateFieldsAndScrollByForm } from 'client/common/decorators'
import { immutateUpdate, toQueryParams, tryJsonParse } from 'common/sugo-utils'
import { recvJSON } from 'client/common/fetch-utils'

export const namespace = 'taskV3RealTimeCollectModel'

const alarmCondition = {
  execution: { type: 'execution', alertOn: 'on_failed' },
  ddl: { type: 'ddl' },
  operatorError: { type: 'operatorError' },
  connectError: { type: 'connectError' },
  unexpected: { type: 'unexpected' },
  tableRemoveException: { type: 'tableRemoveException' }
}

const columnMappingTypes = ['timeMapping', 'uuidMapping', 'datetimeMapping']

export default props => ({
  namespace: `${namespace}_${props.id}`,
  state: {
    dataDss: [], //数据源集合信息
    dataFields: {},
    inputDsType: '',
    inputDsId: '',
    inputDbName: '',
    inputTables: [],
    outputConfig: [], //数据保存的输入配置 进入编辑需要赋值
    inputConfig: {}, // 输入配置
    apiAlertInfos: [], //告警配置信息
    validForm: {}, // 告警设置保存form表单
    loadding: true,
    tableList: {},
    collectId: '',
    globalBreakPoint: {},
    outputEdit: {
      // 应用到输出配置弹框
      opId: '',
      tableName: '',
      type: '', // edit、add、del
      show: false
    },
    curOutPutConfig: {},
    runningList: [] // 初始全局拿一次执行记录
  },
  reducers: {
    changeState(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    *getDatasourceList({ payload }, { call, put }) {
      let { status, message: msg, dataBaseInfo } = yield call(getDatasourceList, payload)
      if (status !== 'success') {
        message.error('获取数据源失败，' + msg)
        return
      }
      yield put({
        type: 'changeState',
        payload: {
          dataDss: dataBaseInfo
        }
      })
    },
    *getDataTableList({ payload }, { call, put, select }) {
      const { id } = payload
      const { tableList } = yield select(state => state[`${namespace}_${props.id}`])
      if (_.get(tableList, id, []).length) {
        return
      }
      let { status, message: msg, result } = yield call(getDataTableList, id)
      if (status !== 'success') {
        message.error('获取数据表失败，' + msg)
        return
      }
      yield put({
        type: 'changeState',
        payload: {
          tableList: {
            ...tableList,
            [id]: result.table
          }
        }
      })
    },

    *getDataFieldsList({ payload }, { call, put, select }) {
      const { dbInfoId, namespace: database, table } = payload
      const { dataFields } = yield select(state => state[`${namespace}_${props.id}`])
      if (_.get(dataFields, `${dbInfoId}_${database}_${table}`, false)) {
        return
      }
      let { status, message: msg, data } = yield call(getDataFieldsList, payload)
      if (status !== 'success') {
        message.error('获取数据表失败，' + msg)
        return
      }
      yield put({
        type: 'changeState',
        payload: {
          dataFields: {
            ...dataFields,
            [`${dbInfoId}_${database}_${table}`]: data?.columns || data?.columnFamily || []
          }
        }
      })
    },
    *handleExecutor({ payload }, { call, put, select }) {
      // 先调用保存功能
      yield put.resolve({
        type: `${namespace}_${props.id}/saveRealtimeCollect`,
        payload: {}
      })
      const { flowId } = payload
      const url = '/app/task-v3/handleExecutor'
      const { validForm } = yield select(state => state[`${namespace}_${props.id}`])
      const alarmConfig = yield getAlarmConfig(validForm)
      if (!alarmConfig) return
      yield new Promise(resolve => setTimeout(resolve, 3000))
      const { result } = yield call(Fetch.post, url, {
        projectId: props.id,
        flowId,
        isTaskGroup: false,
        alertConfig: alarmConfig
      })
      // 刷新执行记录列表
      yield put.resolve({
        type: 'realtime-collect-execute-record/queryExecRecord'
      })
      // 刷新实时采集左侧树对应数据列表
      yield put({
        type: 'taskV3EditModel/getRealTimeCollectByProjectId',
        payload: {
          id: props.taskProjectId
        }
      })
      if (result.error) {
        let errmsg = result.error
        if (result.error.match(/running/)) {
          errmsg = '任务正在执行中，请勿重复执行'
        }
        message.warn('执行任务失败, ' + errmsg)
        return
      }
      message.success('执行成功')
    },
    *referenceFieldsList({ payload }, { call, put, select }) {
      const { inputDsType, inputDsId, inputDbName, dataFields, outputConfig, curOutPutConfig } = yield select(state => state[`${namespace}_${props.id}`])
      const { outputDsId, outputDbName, writerTable, readerTable, id, outputDsType } = payload
      let outputField = _.get(dataFields, `${outputDsId}_${outputDbName}_${writerTable}`, {})
      let inputField = _.get(dataFields, `${inputDsId}_${inputDbName}_${readerTable}`, {})
      let newDataFields = { ...dataFields }
      if (_.isEmpty(inputField)) {
        let { status, message: msg, data } = yield call(getDataFieldsList, {
          dbInfoId: inputDsId,
          type: inputDsType,
          schema: inputDbName,
          database: inputDbName,
          namespace: inputDbName,
          table: readerTable
        })
        if (status !== 'success') {
          message.error('获取数据表失败，' + msg)
          return
        }
        inputField = data?.columns || data?.columnFamily || []
        newDataFields = { ...newDataFields, [`${inputDsId}_${inputDbName}_${readerTable}`]: inputField }
      }
      // if (_.isEmpty(outputField)) {
      if (true) {
        let { status, message: msg, data } = yield call(getDataFieldsList, {
          dbInfoId: outputDsId,
          type: outputDsType,
          schema: outputDbName,
          database: outputDbName,
          namespace: outputDbName,
          table: writerTable
        })
        if (status !== 'success') {
          msg = _.isNil(msg) || _.isNull(msg) || msg == 'null' ? '目标数据源、目标数据表不能为空' : msg
          message.error('获取数据表失败，' + msg)
          return
        }
        outputField = data?.columns || data?.columnFamily || []
        newDataFields = { ...newDataFields, [`${outputDsId}_${outputDbName}_${writerTable}`]: outputField }
      }

      let index = _.findIndex(outputConfig, opc => opc.id === id)
      let newOutConfig = []
      let newCurOutPutConfig = {}
      if (index >= 0) {
        newOutConfig = immutateUpdate(outputConfig, [index, 'columnMappings'], val => {
          val.forEach(p => {
            if (!_.find(outputField, q => _.upperCase(q.name) === _.upperCase(p.name))) {
              p.targetName = ''
              p.targetType = ''
            }
          })
          const config = _.keyBy(
            val.filter(p => p.name),
            p => p.name
          )
          const fieldMap = _.keyBy(inputField, p => p.name)
          return _.concat(
            _.values({ ...fieldMap, ...config }),
            val.filter(p => !p.name)
          )
        })
        newCurOutPutConfig = outputConfig[index]
      } else {
        newOutConfig = outputConfig
        newCurOutPutConfig = curOutPutConfig

        newCurOutPutConfig.columnMappings = _.map(_.cloneDeep(inputField), item => {
          let opf = _.find(outputField, o => _.lowerCase(o.name) === _.lowerCase(item.name)) || {}
          item.targetType = opf.type
          item.targetName = opf.name
          // 同步日期时间输出格式
          if (opf.dateFormat) {
            item.dateFormat = opf.dateFormat
          }
          return item
        })
      }

      yield put({
        type: 'changeState',
        payload: {
          dataFields: newDataFields,
          outputConfig: newOutConfig,
          curOutPutConfig: newCurOutPutConfig
        }
      })
    },
    *saveRealtimeCollect({ payload }, { call, put, select }) {
      const { isBreakPoint } = payload
      const { id, taskProjectId, editTaskInfo = {} } = props
      const { name, showName } = editTaskInfo
      const { outputConfig = [], inputDsType, inputDsId, inputDbName, inputTables, validForm, globalBreakPoint, collectId } = yield select(
        state => state[`${namespace}_${props.id}`]
      )
      // 输入配置已选择的表名
      const inputTableNames = inputTables.map(inp => inp.tableName)
      // 保存时过滤掉未设置columnMappings参数的脏数据（不合法）记录
      const outputData = _.filter(outputConfig, o => o.columnMappings.length)
        // 验证outputConfig中的readerTable与inputTables输入一致
        .filter(o => inputTableNames.includes(o.readerTable))
        .map(p => {
          let pmarr = p.columnMappings || []
          const columnMappings = pmarr
            .filter(p => p.targetName || p.targetFamily)
            .map(item => {
              if (columnMappingTypes.includes(item.type)) {
                // 同步日期时间输出格式
                if (item.type === 'timeMapping') {
                  return {
                    writerColumn: item?.targetName,
                    type: item.type,
                    writerColumnType: item?.targetType,
                    dateFormat: item?.dateFormat
                  }
                }
                return {
                  writerColumn: item?.targetName,
                  type: item.type,
                  writerColumnType: item?.targetType
                }
              }
              if (p.type === DATASOURCE_TYPE.hbase) {
                const isRowKey = item?.targetFamily === 'rowKey'
                let data = {
                  readerColumn: item?.name,
                  readerColumnType: item?.type,
                  writerColumn: isRowKey ? 'rowKey.rowKey' : `${item?.targetFamily}.${item?.targetName}`,
                  type: isRowKey ? 'rowKeyMapping' : 'oneToOneMapping'
                }
                if (isRowKey) {
                  data.listDelimiter = p?.listDelimiter
                }
                return data
              }
              return {
                readerColumn: item?.name,
                writerColumn: item?.targetName,
                readerColumnType: item?.type,
                writerColumnType: item?.targetType,
                type: 'oneToOneMapping'
              }
            })
          return {
            ...p,
            columnMappings
          }
        })
      const alarmConfig = yield getAlarmConfig(validForm)
      if (!alarmConfig) return
      const params = {
        task_id: id,
        name,
        showName,
        task_project_id: taskProjectId,
        params: alarmConfig,
        inputConfig: {
          type: inputDsType,
          projectId: props.id,
          dbInfoId: inputDsId,
          schema: inputDbName,
          database: inputDbName,
          namespace: inputDbName,
          globalBreakPoint: _.isEmpty(globalBreakPoint) ? { type: 'persistence' } : globalBreakPoint.breakPoint,
          tables: inputTables
        },
        outputConfig: outputData,
        isBreakPoint,
        collectId
      }
      if (params?.outputConfig.length) {
        params.outputConfig.map(val => {
          if (val.columnMappings.length) {
            const columnMappings = val.columnMappings.filter(item => item?.type === 'oneToOneMapping')
            if (!columnMappings.length) {
              message.warn('输出配置字段映射校验失败 源数据表配置: ' + val?.readerTable)
              return
            }
          }
        })
      }
      let { success, message: msg, data } = yield call(saveRealTimeCollect, params)
      if (!success) {
        message.error('保存失败！' + msg)
        return
      }
      message.success('保存成功！')
      yield put({ type: 'getAlarmConfigInfo', payload: {} })
    },
    *getTaskInfo({ payload }, { call, put, select }) {
      yield put({ type: 'changeState', payload: { loadding: true } })
      // 获取流程图信息
      let url = `/app/task-schedule-v3/manager?action=graph&projectId=${props.id}`
      let res = yield call(Fetch.get, url)
      if (!res || !res.gnode) {
        message.error('获取流程图失败')
        yield put({ type: 'changeState', payload: { loadding: false } })
        return
      }
      // 查找采集节点信息
      let jobName = ''
      try {
        const lines = JSON.parse(res.gline)
        jobName = _(lines).values().get('0.from')
        jobName = jobName.substr(jobName.lastIndexOf('_') + 1)
      } catch (error) {
        yield put({ type: 'changeState', payload: { loadding: false } })
        return
      }
      // 获取节点信息
      url = `/app/task-schedule-v3/manager?action=fetchJobInfo3&jobName=${jobName}&projectId=${props.id}`
      res = yield call(Fetch.get, url)
      if (!res) {
        message.error(`获取节点信息失败  ${res ? res.error : ''}`)
        yield put({ type: 'changeState', payload: { loadding: false } })
        return
      }

      let fileName = _.get(res, ['overrideParams', 'realtimeCollect.script'])
      fileName = /(\d+\.[a-z]+$)/.exec(fileName) ? /(\d+\.[a-z]+$)/.exec(fileName)[1] : ''
      if (!fileName) {
        message.error(`获取文件名称错误`)
        yield put({ type: 'changeState', payload: { loadding: false } })
        return
      }
      url = `/app/task-schedule-v3/manager?projectId=${props.id}&action=downloadScript&fileName=${fileName}`
      let scriptRes = yield call(Fetch.get, url)
      try {
        const content = JSON.parse(scriptRes)
        let inputParams = {
          inputDsType: content?.readerParamDTO?.type,
          inputDsId: content?.readerParamDTO?.dbInfoId,
          inputDbName: content?.readerParamDTO?.schema || content?.readerParamDTO?.namespace || content?.readerParamDTO?.database,
          inputTables: content?.readerParamDTO?.tables,
          globalBreakPoint: { breakPoint: content?.readerParamDTO?.globalBreakPoint }
        }

        // 修改初始展示值
        inputParams.globalBreakPoint = { breakPoint: { type: 'persistence' } }
        inputParams.inputTables = _.map(inputParams.inputTables, item => {
          // item.breakPoint = { type: 'null' }
          item.breakPoint = null

          return item
        })

        let outputDsIds = [{ id: content?.readerParamDTO?.dbInfoId, type: content?.readerParamDTO?.type }]
        // props.dispatch({ type: `${namespace}_${props.id}/getDataFieldsList`, payload: params })
        const outputConfig = content?.writerParamDTOList.map((p, index) => {
          outputDsIds.push({ id: p?.dbInfoId, type: p?.type })
          return {
            ...p,
            id: index + 1,
            listDelimiter: _.find(p?.columnMappings, item => item.listDelimiter)?.listDelimiter || '',
            columnMappings: p?.columnMappings.map(item => {
              if (p.type === DATASOURCE_TYPE.hbase) {
                const [targetFamily, targetName] = item?.writerColumn?.split('.')
                return {
                  type: item?.readerColumnType || item?.type,
                  name: item?.readerColumn,
                  dateFormat: item?.dateFormat,
                  targetName: item?.readerColumn ? targetName : item?.writerColumn,
                  targetFamily
                }
              }
              return {
                type: item?.readerColumnType || item?.type,
                name: item?.readerColumn,
                dateFormat: item?.dateFormat,
                targetName: item?.writerColumn,
                targetType: item?.writerColumnType
              }
            })
          }
        })
        outputDsIds = _(outputDsIds)
          .filter(p => p.id)
          .uniqBy(p => p.id)
          .value()
        let tableList = {}
        for (let index = 0; index < outputDsIds.length; index++) {
          const { id } = outputDsIds[index]
          let { status, result } = yield call(getDataTableList, id)
          if (status === 'success') {
            tableList = {
              ...tableList,
              [id]: result.table
            }
          }
        }
        yield put({
          type: 'changeState',
          payload: {
            inputConfig: content?.readerParamDTO,
            outputConfig: outputConfig,
            ...inputParams,
            loadding: false,
            tableList,
            collectId: jobName
          }
        })
      } catch (error) {
        yield put({ type: 'changeState', payload: { loadding: false } })
        return message.error('节点信息错误')
      }
    },
    /**
     * 请求基本信息接口，缓存告警信息
     * @param {*} param0
     * @param {*} param1
     */
    *getAlarmConfigInfo({}, { call, put }) {
      const url = '/app/task-v3/fetchTaskById'
      const { success, result, message: msg } = yield call(Fetch.get, url, { id: props.id })
      const apiAlertInfos = _.get(result, 'params') ? _.get(result, 'params').map(p => ({ ...p, id: shortid() })) : []

      if (!success) return message.error(msg)
      yield put({
        type: 'changeState',
        payload: {
          apiAlertInfos,
          validForm: {}
        }
      })
    },
    /**
     * 获取执行记录列表
     * @param {*} param0
     * @param {*} param1
     */
    *queryRunningFlows({ payload }, { call, put }) {
      const { type = 'project', projectId } = payload
      let params = {
        type,
        projectId: projectId || props.id
      }
      params = _.pickBy(params, _.identity)
      params = toQueryParams(params)
      // 正在执行
      const runningUrl = `/app/task-schedule-v3/history?action=getRunningFlows&${params}`
      const res2 = yield call(Fetch.get, runningUrl, null)
      if (_.get(res2, 'status', '') !== 'success') {
        return message.error('获取失败!')
      }
      const runningFlows = _.get(res2, 'runningFlows', [])
      const rList2 = _.map(runningFlows, item => {
        const { first = {}, second = {} } = item
        return { ...first, ...second }
      }).filter(_.identity)
      yield put({
        type: 'changeState',
        payload: {
          runningList: [...rList2]
        }
      })
    },
    /**
     * 执行失败 重新获取数据
     * @param {*} param0
     * @param {*} param1
     */
    *refreshExec({ payload }, { call, put }) {
      props.dispatch({ type: `realtime-collect-execute-record/queryExecRecord` })
      props.dispatch({
        type: 'taskV3EditModel/getRealTimeCollectByProjectId',
        payload: {
          id: props.taskProjectId
        }
      })
    },
    /**
     * 停止执行
     * @param {*} param0
     * @param {*} param1
     */
    *cancelExec({ payload }, { call, put }) {
      //每次取最新执行中列表中的first的执行id
      const { type = 'project', projectId } = payload
      let params = {
        type,
        projectId: projectId || props.id
      }
      params = _.pickBy(params, _.identity)
      params = toQueryParams(params)
      // 正在执行
      const runningUrl = `/app/task-schedule-v3/history?action=getRunningFlows&${params}`
      const res2 = yield call(Fetch.get, runningUrl, null)
      if (_.get(res2, 'status', '') !== 'success') {
        return message.error('获取执行中列表失败!')
      }

      const executionId = _.get(res2, 'runningFlows.[0].first.executionId')
      if (!executionId) {
        return message.error('没有执行中任务ID!')
      }
      const url = `/app/task-schedule-v3/executor?action=cancelFlow`
      message.warning('停止中...')
      const res = yield call(Fetch.post, url, null, {
        ...recvJSON,
        body: JSON.stringify({ execid: executionId })
      })
      if (res.status !== 'success') {
        return message.error(res.message || res.error)
      }

      yield put.resolve({
        type: 'realtime-collect-execute-record/queryExecRecord'
      })

      //刷新实时采集左侧树对应数据列表
      yield put.resolve({
        type: 'taskV3EditModel/getRealTimeCollectByProjectId',
        payload: {
          id: props.taskProjectId
        }
      })
      message.success('停止成功!')
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getDatasourceList', payload: {} })
      dispatch({ type: 'getTaskInfo', payload: {} })
      dispatch({ type: 'getAlarmConfigInfo', payload: {} })
      dispatch({ type: 'queryRunningFlows', payload: {} })
    }
  }
})

/**
 * 告警配置组装接口所需数据结构
 * @param {*} validForm 告警配置form表单
 */
async function getAlarmConfig(validForm) {
  let resArr = []
  for (let i in validForm) {
    const item = validForm[i]
    const val = await validateFieldsAndScrollByForm(item)
    if (!val) return false
    // 如果关键类型为空，告警参数为空数组
    if (_.isEmpty(val.alarmType)) {
      continue
    }
    /*
      val = {
        alarmType: ["execution", "ddl"]
        alarmWay: ["api"]
        content_ddl: "执行记录id: ${execId}↵数据源别名: ${dbAlias}↵连接地址: ${url}↵数据源类型: ${dbType}↵表结构的变化信息: ${msg}↵"
        content_execution: ""${name}" has ${status} on ${azkabanName}↵任务开始时间：${startTime}↵任务结束时间：${endTime}↵任务耗时:${duration}↵"
        method: "get"
        templateType: "standard"
        url: "d"
      }
    */
    // 输出结构参考：http://192.168.0.212:3000/project/21/interface/api/966
    const { alarmType: types = [], alarmWay } = val
    const res = types.map(alarmType => {
      const type = alarmType !== 'execution' ? 'realtime_collect' : alarmType
      const condition = alarmCondition[alarmType]
      // 告警模板内容
      const content = val[`content_${alarmType}`]
      const senders = alarmWay.map(v => {
        if (v === 'mail') {
          return {
            type: v,
            template: content,
            toAddresses: _.get(val, 'emails', '').split(',')
          }
        }
        if (v === 'api') {
          return {
            type: v,
            url: val.url,
            method: val.method,
            paramMap: { msgtype: 'text', text: { content } }
          }
        }
      })
      return {
        type,
        condition,
        senders
      }
    })
    resArr = resArr.concat(res)
  }
  return resArr
}

const getDbNamesAndTables = (result, type) => {
  let data = {
    dataDbs: [], // 数据库集合信息
    dataTableMap: {} // 数据表集合信息
  }
  if (type === DATASOURCE_TYPE.oracle || type === DATASOURCE_TYPE.hana) {
    data.dataDbs = _.keys(result?.schema)
    data.dataTableMap = result?.schema
  } else if (type === DATASOURCE_TYPE.mysql || type === DATASOURCE_TYPE.postgresql) {
    data.dataDbs = _.keys(result?.database)
    data.dataTableMap = result?.database
  } else if (type === DATASOURCE_TYPE.hbase) {
    data.dataDbs = _.keys(result?.namespace)
    data.dataTableMap = {
      default: _(result?.namespace).values().flatten().value()
    }
  } else if (type === DATASOURCE_TYPE.kudu) {
    data.dataTableMap = { default: result?.table }
  }
  return data
}
