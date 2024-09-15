import _ from 'lodash'
import { message } from 'antd'
import {
  fetchTaskNode,
  saveProject,
  fetchFlinkProject,
  saveProjectCleanFile,
  saveProjectQualityScript,
  downloadFlinkScript,
  saveSourceProperties,
  fetchAllDbListById,
  setFlinkProjectProps,
  fetchFlinkProjectProps,
  cancelExecution,
  fetchAllSourceList,
  fetchQualityScript,
  fetchCleanProps,
  getScriptTemplate,
  execution
} from '../services'
import { ScriptContentToJointData, JointDataToScriptContent } from '../../constants'
import moment from 'moment'

export const namespace = 'immediateTaskEditModel'

export default props => ({
  namespace: `${namespace}_${props.id}`,
  state: {
    selectJob: {},
    taskInfo: {},
    taskNodeList: [],
    paramsMap: {},
    nodeData: {},
    graphInfo: {},
    typeData: {}, //  所有数据源类型集合
    dataSourceList: [], // 某一类型的可供选择的数据源列表
    editNodeScript: '',
    editNodeParams: '',
    showScriptEdit: false,
    showUploadModal: false,
    taskId: '',
    showAttrModal: false,
    taskProps: {},
    dataSourceAllList: [], //  所有数据源类型列表
    cleanParams: {},
    scriptInfo: {},
    lineData: {},
    classMap: {},
    scriptTemplateList: [],
    templateInfo: '1234567',
    longExecutionModalVisible: false,
    currentType: '',
    runningInfo: {},
    runningStatus: false, // 点击常驻执行和停止执行 更改runningStatus
    stoping: false,
    newExecid: '' // 新的执行id
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
    *fetchTaskNode({ payload }, { call, put }) {
      let { result: res } = yield call(fetchTaskNode, payload)
      res = _.isString(res) ? JSON.parse(res) : res
      if (res) {
        let paramsMap = {}
        let classMap = {}
        let taskNodeList = []
        let typeData = []
        _.forEach(res.connectors, p => {
          if (p.source) {
            taskNodeList.push({ name: p.source.title, nodeType: p.source.type })
            _.set(paramsMap, p.source.type, p.source.items)
            _.set(classMap, p.source.type, p.source.class)
          }
          if (p.sink) {
            taskNodeList.push({ name: p.sink.title, nodeType: p.sink.type })
            _.set(paramsMap, p.sink.type, p.sink.items)
            _.set(classMap, p.sink.type, p.sink.class)
          }
          typeData.push({ type: p.type, common: p.common })
        })
        const cleaners = _.get(res, 'cleaners', [])
        _.forEach(cleaners, p => {
          taskNodeList.push({ name: p.title, nodeType: p.type })
          _.set(paramsMap, p.type, p)
        })
        yield put({
          type: 'changeState',
          payload: {
            paramsMap,
            taskNodeList,
            typeData,
            classMap
          }
        })
      } else {
        message.error('获取节点信息失败')
      }
    },

    *saveProject({ payload }, { call, select }) {
      // todo数据转换
      const { taskInfo, nodeData, graphInfo, lineData } = yield select(p => p[`${namespace}_${props.id}`])
      const res = yield call(saveProject, {
        ..._.omit(taskInfo, ['graph']),
        scriptContent: JointDataToScriptContent(graphInfo.graph, nodeData, lineData)
      })
      if (res && res.status && res.status === 'success') {
        message.success('保存成功')
      } else {
        message.error('保存失败')
      }
    },
    *fetchProject({ payload }, { call, put }) {
      const { taskId } = payload
      let res = yield call(fetchFlinkProject, taskId)
      res = _.isString(res) ? JSON.parse(res) : res

      if (res && res.status === 'success') {
        const { showName, name, id, description } = res.project
        const failureEmails = _.get(res.project, ['metadata', 'lastExecInfo', 'failureEmails', '0'], '')
        const successEmails = _.get(res.project, ['metadata', 'lastExecInfo', 'successEmails', '0'], '')

        const { graph, nodeData, lineData } = ScriptContentToJointData(res.scriptContent || '')
        const idx = moment().format('x')
        const flIdx = idx + 100
        const data = res.graph.flowid
          ? {
              title: name,
              nodes: JSON.parse(_.get(res, 'graph.gnode', '{}')),
              lines: JSON.parse(_.get(res, 'graph.gline', '{}')),
              areas: {},
              initNum: 1
            }
          : {
              title: name,
              nodes: {
                [`${name}_node_${idx}`]: {
                  top: 403,
                  left: 110,
                  name: '结束',
                  width: 26,
                  type: 'end',
                  height: 26
                },
                [`${name}_node_${flIdx}`]: {
                  top: 149,
                  left: 136,
                  name: 'flink节点',
                  width: 104,
                  type: 'flink',
                  height: 26
                }
              },
              lines: {
                [`${name}_line_${idx}_${flIdx}`]: {
                  type: 'sl',
                  from: `${name}_node_${flIdx}`,
                  to: `${name}_node_${idx}`
                }
              },
              areas: {},
              initNum: 1
            }
        // props.changePathMap && props.changePathMap(showName)
        yield put({
          type: 'changeState',
          payload: {
            graphInfo: { graph },
            taskInfo: {
              projectId: id,
              showName,
              jobName: _.get(res, 'jobInfo.jobName', flIdx),
              description,
              data,
              'jobOverride[height]': '26',
              'jobOverride[left]': '278',
              'jobOverride[showName]': showName,
              'jobOverride[top]': '60',
              'jobOverride[type]': 'flink',
              'jobOverride[user.to.proxy]': 'root',
              'jobOverride[width]': '105'
            },
            nodeData,
            lineData,
            failureEmails,
            successEmails,
            runningInfo: res.runningInfo,
            runningStatus: false
          }
        })
      } else {
        message.error('获取数据失败')
      }
    },
    *saveProjectCleanFile({ payload }, { call, put }) {
      // todo数据转换
      // const { projectId, parentJobName, jobName, groovyMapFileContent } = payload
      const res = yield call(saveProjectCleanFile, payload)
      if (res) {
        yield put({
          type: 'changeState',
          payload: { showScriptEdit: false }
        })
        message.success('保存成功')
      } else {
        message.error('保存失败')
      }
    },
    *saveProjectQualityScript({ payload }, { call }) {
      // todo数据转换
      // const { projectId, parentJobName, jobName, groovyMapFileContent } = payload
      const res = yield call(saveProjectQualityScript, payload)
      if (res) {
        message.success('保存成功')
      } else {
        message.error('保存失败')
      }
    },
    *downloadFlinkScript({ payload }, { call, put }) {
      // todo数据转换
      const { isEditScript, selectJob, currentType, ...rest } = payload
      const res = yield call(downloadFlinkScript, rest)
      let data = {}
      if (isEditScript) {
        data.editNodeScript = res || ''
      } else {
        data.editNodeParams = res ? JSON.parse(res) : {}
      }
      if (selectJob) {
        data.selectJob = selectJob
      }
      if (currentType) {
        data.currentType = currentType
      }
      yield put({
        type: 'changeState',
        payload: data
      })
    },
    *saveSourceProperties({ payload }, { call, put }) {
      // todo数据转换
      // const { projectId, parentJobName, jobName, groovyMapFileContent } = payload
      const { status } = yield call(saveSourceProperties, payload)
      if (status === 'success') {
        message.success('保存成功')

        let {
          projectId,
          jobName,
          parentJobName,
          data: { type }
        } = payload

        if (_.endsWith(type, 'Source') || _.endsWith(type, 'Sink')) {
          let fileName = `${type}_${jobName}.json`
          const res = yield call(downloadFlinkScript, { fileName, parentJobName, projectId })
          let data = {}
          data.editNodeParams = res ? JSON.parse(res) : {}
          yield put({
            type: 'changeState',
            payload: data
          })
        }
      } else {
        message.error('保存失败')
      }
    },

    *fetchAllDbListById({ payload = {} }, { call, put }) {
      const res = yield call(fetchAllDbListById, { projectId: payload.projectId })
      if (res.success === true) {
        yield put({
          type: 'changeState',
          payload: { dataSourceList: res.result.useDbList }
        })
      }
    },
    *setFlinkProjectProps({ payload }, { call }) {
      const { status } = yield call(setFlinkProjectProps, payload)
      if (status === 'success') {
        return message.success('保存成功')
      }
      message.error('保存失败')
    },

    *fetchFlinkProjectProps({ payload = {} }, { call, put }) {
      const res = yield call(fetchFlinkProjectProps, payload)
      const paramsObj = res.param ? res.param : {}
      const { projectSourceProperties: source, projectCommonProperties: common } = paramsObj
      if (res) {
        yield put({
          type: 'changeState',
          payload: {
            taskProps: {
              common,
              source
            },
            showAttrModal: true
          }
        })
      } else {
        message.error('获取失败')
      }
    },
    *fetchAllSourceList({ payload = {} }, { call, put }) {
      const res = yield call(fetchAllSourceList, payload)
      yield put({
        type: 'changeState',
        payload: { dataSourceAllList: res.dataSourceInfos }
      })
    },
    *fetchCleanProps({ payload = {} }, { call, put }) {
      let res = yield call(fetchCleanProps, payload)
      if (!res) {
        return message.error('请求出错')
      }
      const beforeFileName = _.get(res, ['param', 'clean.before.path'], '')
      const afterFileName = _.get(res, ['param', 'clean.after.path'], '')
      const beforeType = _.get(res, ['param', 'clean.before.type'], 'default')
      const afterType = _.get(res, ['param', 'clean.after.type'], 'default')
      let resContent = ''
      if (beforeFileName || afterFileName) {
        resContent = yield call(fetchQualityScript, { ...payload, cleanBeforePath: beforeFileName, cleanAfterPath: afterFileName })
        resContent = JSON.parse(resContent)
      }
      yield put({
        type: 'changeState',
        payload: {
          scriptInfo: {
            ...res,
            ['before.content']: beforeType === 'default' ? JSON.parse(_.get(resContent, ['before.content'], '[]')) : _.get(resContent, ['before.content'], ''),
            ['after.content']: afterType === 'default' ? JSON.parse(_.get(resContent, ['after.content'], '[]')) : _.get(resContent, ['after.content'], '')
          },
          selectJob: payload.data,
          currentType: payload.type
        }
      })
    },
    *getScriptTemplate({ payload = {} }, { call, put }) {
      const { result, status } = yield call(getScriptTemplate, payload)
      if (status === 'success') {
        return yield put({
          type: 'changeState',
          payload: { scriptTemplateList: result }
        })
      }
      return message.error('获取脚本模板列表失败')
    },
    *execution({ payload }, { call, put }) {
      const response = yield call(execution, payload)
      const { error, execid } = response
      if (!error) {
        yield put({
          type: 'changeState',
          payload: { runningStatus: true, newExecid: execid[0] }
        })
        message.success('创建常驻执行成功')
        return
      }
      message.error('创建常驻执行失败')
    },
    *cancelExecution({ payload }, { call, put, select }) {
      yield put({
        type: 'changeState',
        payload: { stoping: true }
      })
      const { newExecid } = yield select(state => state[`${namespace}_${props.id}`])
      const response = yield call(cancelExecution, {
        ...payload,
        execid: newExecid ? newExecid : payload.execid
      })
      const { status } = response
      if (status === 'success') {
        yield put({
          type: 'changeState',
          payload: { stoping: false }
        })
        message.success('取消常驻执行成功')
        yield put({
          type: 'changeState',
          payload: { runningStatus: false }
        })
        return
      }
      yield put({
        type: 'changeState',
        payload: { stoping: false }
      })
      message.error('取消常驻执行失败')
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'fetchAllDbListById', payload: { projectId: props.taskProjectId } })
      dispatch({ type: 'fetchProject', payload: { taskId: props.id } })
      dispatch({ type: 'getScriptTemplate', payload: {} })
      dispatch({ type: 'fetchTaskNode', payload: {} })
      dispatch({ type: 'fetchAllSourceList', payload: {} })
    }
  }
})
