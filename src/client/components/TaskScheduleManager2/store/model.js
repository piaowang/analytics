import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import { message } from 'antd'
import shortid from 'shortid'
import moment from 'moment'
import { sendFormData, recvJSON  } from '../../../common/fetch-utils'
import { TASK_TREE_TYPE, TASK_ACTION_TYPE, TASK_OPERTION_FORM_TYPE, DEFAULT_CRONINFO } from '../constants'
import C2Q from 'cron-to-quartz'
import { toQueryParams } from '../../../../common/sugo-utils'

export const namespace = 'taskSchedule'
export const taskTreeNamespance = `taskScheduleTree_${TASK_TREE_TYPE.dataDevelop.name}`

const {
  dataDevHiveScriptProxyUser = 'root'
} = window.sugo

export default () => ({
  namespace,
  state: {
    showEidtTaskInfo: false,//新增添加任务
    taskInfo: {},
    jobInfo: {},
    graph: {},
    fileContent: [],
    collectType: {}, // 采集方式
    addStep: TASK_OPERTION_FORM_TYPE.addBaseInfo, // 新增步骤
    dataDbs: [], //数据库连接信息
    dataTables: [], //数据库表信息
    executors: [],
    executorIds: '',
    scheduleId: '',
    cronInfo: DEFAULT_CRONINFO,
    visibleCopy: false,
    copyProject: '',
    showAlarmSet: false,
    saving: false,
    showInportTask: false
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
    /**
     * 删除任务
     * @param {*} param0 
     * @param {*} param1 
     */
    *deleteTask({ payload }, { call, select, put }) {
      const { id } = payload
      let url = `/app/new-task-schedule/manager?treeOperation=deleteProject&projectId=${id}`
      const res = yield call(Fetch.post, url, null)
      if (res && res.status && res.status === 'success') {
        message.success('删除成功')
        yield put({ type: `${taskTreeNamespance}/getTaskTreeData`, payload: {} })
        // yield put({ type: 'taskScheduleTree/changeState', payload: { loading: false } })
      } else {
        message.error('删除失败')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    },

    /**
   * @description 添加基本信息任务
   * @param {any} { payload }
   * @param {any} { call, select }
   */
    *addTaskBaseInfo({ payload, callback }, { call, select, put }) {
      let url = '/app/new-task-schedule/manager'
      const { showName = '', businessDepartment = '', businessName = '', description = '', typeId = '', actionType } = payload
      const name = shortid()
      const params = toQueryParams({
        action: 'create',
        actionType,
        name,
        showName,
        businessDepartment,
        businessName,
        description,
        typeId
      })
      let res = yield call(Fetch.post, url + '?' + params, null)
      res = JSON.parse(res)
      if (res && res.status && res.status === 'success') {
        yield put({ type: `${taskTreeNamespance}/getTaskTreeData`, payload: {} })
        yield put({
          type: 'changeState',
          payload: {
            taskInfo: {
              actionType,
              name,
              showName,
              businessDepartment,
              businessName,
              description,
              typeId,
              id: _.get(res, 'newProject.id', '')
            },
            addStep: actionType === TASK_ACTION_TYPE.dataCollection
              ? TASK_OPERTION_FORM_TYPE.addCollectConfig
              : actionType === TASK_ACTION_TYPE.dataModeling
                ? TASK_OPERTION_FORM_TYPE.editModelInfo
                : TASK_OPERTION_FORM_TYPE.addFlow
          }
        })
        if (_.isFunction(callback)) {
          callback(res)
        }
      } else {
        message.error('创建失败' + res.message)
        yield put({ type: 'changeState', payload: { loading: false } })
        if (_.isFunction(callback)) {
          callback(null)
        }
      }
    },
    /**
       * @description 添加采集任务配置信息
       * @param {any} { payload }
       * @param {any} { call, select }
       */
    *saveTaskConfigInfo({ payload, callback }, { call, select, put }) {
      let {
        name: project = '',
        jobName = '',
        showName,
        description,
        businessDepartment,
        businessName,
        dataCollectionInof = []
      } = payload
      yield put({ type: 'changeState', payload: { saving: true } })
      let { addStep, fileContent, graph, jobInfo, dataDbs } = yield select(state => state[namespace])
      const escape = v => {
        return v && v.replace(/(\\*);/g, '\\;')
      }
      const scriptContent = dataCollectionInof.map(p => {
        let { dbId, columnInfo, datasource, toDataSource, column = '', filterSql = '', dbInfo = {} } = p
        dbInfo = _.isEmpty(dbInfo) ? dataDbs.find(d => d.id === dbId) : dbInfo
        return {
          toDataSource,
          reader: {
            filterSql,
            dbId: _.get(dbInfo, 'id', ''),
            database: _.get(dbInfo, 'dbName', ''),
            datasource,
            dbType: _.get(dbInfo, 'dbType', ''),
            offsetSpec: {
              column,
              format: '',
              type: 'date'
            },
            password: _.get(dbInfo, 'dbPassword', ''),
            port: _.get(dbInfo, 'dbPort', ''),
            server: _.get(dbInfo, 'dbIp', ''),
            sql: ` select ${columnInfo.map(p => p.sourceCol).join(',')} from ${datasource}`,
            type: 'offset_db',
            user: _.get(dbInfo, 'dbUser', '')
          },
          cleaner: {
            assembler: {
              columns: columnInfo.map(p => p.sourceCol),
              separator: '\u0001',
              type: 'csv'
            },
            converterList: columnInfo.map(p => ({ ..._.omit(p, ['status']), finalComment: escape(p.finalComment), sourceComment: escape(p.sourceComment), type: 'dummy' }))
          },
          type: 'collect'
        }
      })

      jobName = jobName ? jobName : moment() + 0
      const jobOverride = fileContent.toDataSource
        ? jobInfo.overrideParams
        : {
          'dataCollect.script': `scripts/${jobName}.sh`,
          top: '60',
          left: '278',
          showName: '采集测试',
          width: '104',
          'user.to.proxy': 'root',
          type: 'dataCollect',
          height: '26'
        }
      let params = {
        showName,
        description,
        businessDepartment,
        businessName,
        scriptContent
      }
      _.keys(jobOverride).forEach(p => {
        _.set(params, [`jobOverride[${p}]`], jobOverride[p])
      })
      if (fileContent.toDataSource) {
        params.data = {
          title: project,
          nodes: graph.gnode,
          lines: graph.gline,
          areas: {},
          initNum: 1
        }
      } else {
        const endJobName = moment() + 10
        const flowId = shortid()
        params.data = {
          title: flowId,
          nodes: {
            [`${flowId}_node_${jobName}`]: {
              top: 87,
              left: 354,
              name: '数据采集',
              width: 104,
              type: 'dataCollect',
              height: 26
            },
            [`${flowId}_node_${endJobName}`]: {
              top: 225,
              left: 396,
              name: '结束',
              width: 26,
              type: 'end',
              height: 26
            }
          },
          lines: {
            [`${flowId}_line_${jobName}__${endJobName}`]: {
              type: 'sl',
              from: `${flowId}_node_${jobName}`,
              to: `${flowId}_node_${endJobName}`
            }
          },
          areas: {},
          initNum: 1
        }
      }
      let url = `/app/new-task-schedule/manager?ajax=ajaxSaveProject&actionType=1&project=${project}&jobName=${jobName}`
      const res = yield call(Fetch.post, url, null, { ...recvJSON, body: JSON.stringify(params) })
      if (res && res.status && res.status === 'success') {
        yield put({ type: `${taskTreeNamespance}/getTaskTreeData`, payload: {} })
        yield put({ type: 'changeState', payload: { showEidtTaskInfo: false, saving: false } })
        if (_.isFunction(callback)) {
          callback(res)
        }
        if (_.isFunction(callback)) {
          callback(res)
        }
      } else {
        message.error(`创建失败!${res.msg}`)
        yield put({ type: 'changeState', payload: { saving: false } })
        if (_.isFunction(callback)) {
          callback(null)
        }
      }
    },
    /**
       * @description 添加采集任务配置信息
       * @param {any} { payload }
       * @param {any} { call, select }
       */
    *saveTaskFlowInfo({ payload, callback }, { call, select, put }) {
      let { addStep } = yield select(state => state[namespace])
      const {
        name: project = '',
        data,
        showName,
        description,
        actionType
      } = payload
      let url = `/app/new-task-schedule/manager?ajax=ajaxSaveProject&actionType=${actionType}&project=${project}&jobName=${showName}&showName=${showName}`
      const params = {
        data: JSON.stringify(data),
        showName,
        description
      }
      const res = yield call(Fetch.post, url, null, { ...recvJSON, body: JSON.stringify(params) })
      if (res && res.status && res.status === 'success') {
        yield put({ type: `${taskTreeNamespance}/getTaskTreeData`, payload: {} })
        yield put({ type: 'changeState', payload: { showEidtTaskInfo: false } })
        if (_.isFunction(callback)) {
          callback(res)
        }
        if (_.isFunction(callback)) {
          callback(res)
        }
      } else {
        message.error(res.error || '创建失败')
        yield put({ type: 'changeState', payload: { loading: false } })
        if (_.isFunction(callback)) {
          callback(null)
        }
      }
    },
    /**
     * 获取数据库连接信息
     * @param {*} param0 
     * @param {*} param1 
     */
    *getDataDb({ payload, callback, force = false }, { call, select, put }) {
      let { dataDbs = [] } = yield select(state => state[namespace])
      if (dataDbs.length && !force) {
        if (_.isFunction(callback)) {
          callback(dataDbs)
        }
        return
      }
      let url = '/app/new-task-schedule/dataBase?dataType=dataBaseInfo'
      let res = yield call(Fetch.get, url, null)
      if (res && res.status && res.status === 'success') {
        yield put({
          type: 'changeState',
          payload: {
            dataDbs: res.dataBaseInfo
          }
        })
        if (_.isFunction(callback)) {
          callback(res.dataBaseInfo)
        }
      } else {
        message.error('获取数据库连接信息失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
        if (_.isFunction(callback)) {
          callback(null)
        }
      }
    },

    /**
     * 获取表信息
     * TODO 此方法已移到另外的文件，但是为了解决冲突方便，暂时保留
     * @param {*} param0
     * @param {*} param1
     */
    *getDataTables({ payload }, { call, select, put }) {
      const { dbId } = payload
      let url = `/app/new-task-schedule/dataBase?dataType=tableInfo&dbId=${dbId}&update=true`
      let res = yield call(Fetch.get, url, null)
      if (res && res.status && res.status === 'success') {
        yield put({
          type: 'changeState',
          payload: {
            dataTables: res.tableList
          }
        })
      } else {
        message.error('获取数据库表信息失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    },
    
    /**
     * 获取字段信息
     * @param {*} param0
     * @param {*} param1
     */
    *getDataFields({ payload, callback }, { call, select, put }) {
      const { dbId, tableName } = payload
      let { fileContent } = yield select(state => state[namespace])
      const columnInfo = _.get(fileContent, 'cleaner.converterList', [])
      let url = `/app/new-task-schedule/dataBase?dataType=columnInfo&tableName=${tableName}&dbId=${dbId}&update=true`
      let res = yield call(Fetch.get, url, null)
      if (res && res.status && res.status === 'success') {
        let columnList = res.columnList.map(p => ({
          finalCol: p.name,
          finalType: 'string',
          finalComment: p.comment,
          sourceCol: p.name,
          sourceType: p.type,
          sourceComment: p.comment
        }))
        const oldNames = columnInfo.map(p => p.finalCol)
        const newNames = columnList.map(p => p.finalCol)
        let dataFields = []
        _.forEach(_.concat(columnInfo, columnList).map(p => {
          const index = dataFields.findIndex(d => d.finalCol === p.finalCol)
          if (index < 0) {
            const status = _.includes(oldNames, p.finalCol) && _.includes(newNames, p.finalCol)
              ? 0 : (_.includes(oldNames, p.finalCol) ? -1 : 1)
            dataFields.push({ ...p, status })
          }
        }))
        yield put({
          type: 'changeState',
          payload: {
            dataFields
          }
        })
        if (_.isFunction(callback)) {
          callback(dataFields)
        }
      } else {
        message.error('获取数据库表信息失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
        if (_.isFunction(callback)) {
          callback(null)
        }
      }
    },

    *startTask({ payload, callback }, { call, select, put }) {
      const { project, projectId } = payload
      let url = `/app/new-task-schedule/manager?ajax=fetchprojectflows&project=${project}`
      let res = yield call(Fetch.get, url, null)
      if (_.isEmpty(res.flows)) {
        message.warn('没有配置任务流程，请编辑。')
        if (_.isFunction(callback)) {
          callback(null)
        }
        return { status: 'fail' }
      }
      let executorParam = {
        project: project,
        projectId: projectId,
        flow: _.get(res, 'flows[0].flowId')
      }
      url = '/app/new-task-schedule/executor?ajax=executeFlow'
      const formData = new FormData()
      for (let x in executorParam) {
        formData.append(x, executorParam[x])
      }
      res = yield call(Fetch.post, url, null, { ...sendFormData, body: formData })
      if (res.status === 'error') {
        let errmsg = res.error
        if (res.error.match(/running/)) {
          errmsg = '任务正在执行中，请勿重复执行'
        }
        message.warn('执行任务失败,' + errmsg)
        if (_.isFunction(callback)) {
          callback(null)
        }
        return
      }
      message.success('执行成功')
      if (_.isFunction(callback)) {
        callback(res)
      }
    },
    /**
     * 修改保存Corn表达式和执行器
     * @param {*} param0
     * @param {*} param1
     */
    *saveScheduleCron({ payload, callback }, { call, select, put }) {
      const {
        name,
        id,
        // 下面三个变量主要是指标管理系统在用
        executorIdsOverwrite,
        cronInfoOverwrite,
        scheduleIdOverwrite
      } = payload
      let { executorIds, cronInfo, scheduleId } = yield select(state => state[namespace])
      executorIds = _.isNil(executorIdsOverwrite) ? executorIds : executorIdsOverwrite
      cronInfo = _.isNil(cronInfoOverwrite) ? cronInfo : cronInfoOverwrite
      scheduleId = _.isNil(scheduleIdOverwrite) ? scheduleId : scheduleIdOverwrite
      let params = {
        projectName: name,
        projectId: id,
        flow: name,
        cronExpression: C2Q.getQuartz(cronInfo.cronExpression)[0].join(' '),
        scheduleTime: moment(cronInfo.taskStartTime).locale('en').format('hh,mm,A,Z'),
        scheduleDate: moment(cronInfo.taskStartTime).format('MM/DD/YYYY'),
        info: JSON.stringify(cronInfo),
        idealExecutors: executorIds,
        scheduleId
      }
      params = _.pickBy(params, _.identity)
      let url = '/app/new-task-schedule/schedule?ajax=scheduleCronFlow'
      const formData = new FormData()
      for (let x in params) {
        formData.append(x, params[x])
      }
      let res = yield call(Fetch.post, url, null, { ...sendFormData, body: formData })
      if (res && res.status && res.status === 'success') {
        yield put({ type: `${taskTreeNamespance}/getTaskTreeData`, payload: { taskTreeType: TASK_TREE_TYPE.dataDevelop.name } })
        yield put({ type: 'changeState', payload: { showEidtTaskInfo: false } })
        if (_.isFunction(callback)) {
          callback(res)
        }
      } else if (res.message.indexOf('cannot be found in project') > 0) {
        message.error('缺少流程设置, 请编辑')
        yield put({ type: 'changeState', payload: { loading: false } })
        if (_.isFunction(callback)) {
          callback(null)
        }
      }
    },
    /**
     * 获取执行器信息
     * @param {*} param0
     * @param {*} param1
     */
    *getScheduleExecutors({ payload }, { call, select, put }) {
      let url = '/app/task-schedule/executors?action=getActiveExecutors'
      let res = yield call(Fetch.get, url, null)
      if (res && res.activeExecutors) {
        yield put({
          type: 'changeState',
          payload: {
            executors: res.activeExecutors
          }
        })
      } else {
        message.error('获取执行器信息失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    },
    *getTaskInfo({ payload }, { call, select, put }) {
      const { name } = payload
      let url = `/app/new-task-schedule/manager?action=fetchSingleProject&project=${name}`
      let res = yield call(Fetch.get, url, null)
      if (res && res.status === 'success') {
        let fileContent = res.fileContent && JSON.parse(res.fileContent) || [{ id: 0 }]
        if (!_.isArray(fileContent)) {
          fileContent = [{ ...fileContent, id: 0 }]
        } else {
          fileContent = fileContent.map((p, i) => ({ ...p, id: i }))
        }
        yield put({
          type: 'changeState',
          payload: {
            taskInfo: res.project,
            jobInfo: res.jobInfo,
            graph: {
              flowid: res.graph.flowid,
              gline: JSON.parse(res.graph.gline || '{}'),
              gnode: JSON.parse(res.graph.gnode || '{}')
            },
            fileContent,
            showEidtTaskInfo: true,
            addStep: TASK_OPERTION_FORM_TYPE.editTaskInfo
          }
        })
      } else {
        message.error('获取执行器信息失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    },
    *copyTask({ payload }, { call, select, put }) {
      const { name, newProjectShowName } = payload
      const newProjectName = shortid()
      let url = `/app/new-task-schedule/manager?ajax=copyProject&project=${name}&newProjectName=${newProjectName}&newProjectShowName=${newProjectShowName}`
      let res = yield call(Fetch.get, url, null)
      if (res && res.status === 'success') {
        yield put({ type: `${taskTreeNamespance}/getTaskTreeData`, payload: {} })
        yield put({ type: 'changeState', payload: { visibleCopy: false } })
      } else {
        message.error('复制失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getDataDb', payload: {} })
      dispatch({ type: 'getScheduleExecutors', payload: {} })
    }
  }
})
