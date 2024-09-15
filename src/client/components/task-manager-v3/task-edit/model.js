import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import { message } from 'antd'
import moment from 'moment'
import { recvJSON } from 'client/common/fetch-utils'
import { immutateUpdate, immutateUpdates } from 'common/sugo-utils'
import { azkabanFLowDataToJointData, DISPLAY_TASK_MODEL, jointDataToAzkabanFLowData, makeTreeNode, TASK_EDIT_TABS_TYPE, TASK_SCRIPT_TYPE } from '../constants'
import { Object } from 'core-js'

export const namespace = 'taskV3EditModel'

export function getTasksGroupByType(state) {
  const { taskList, offLineTaskGroupList, realTimeTaskList, realTimeCollectList, realTimeCalcTaskList } = state
  return {
    [DISPLAY_TASK_MODEL.offLineTask]: taskList,
    [DISPLAY_TASK_MODEL.offLineTaskGroup]: offLineTaskGroupList,
    [DISPLAY_TASK_MODEL.realTimeTask]: realTimeTaskList,
    [DISPLAY_TASK_MODEL.realTimeCalc]: realTimeCalcTaskList,
    [DISPLAY_TASK_MODEL.realtimeCollect]: realTimeCollectList
  }
}

export function getDataGroupByType(state) {
  const { categoryData, groupCategoryData, realTimeData, realTimeCalcCategoryData, realTimeCollectData } = state
  return {
    [DISPLAY_TASK_MODEL.offLineTask]: categoryData,
    [DISPLAY_TASK_MODEL.offLineTaskGroup]: groupCategoryData,
    [DISPLAY_TASK_MODEL.realTimeTask]: realTimeData,
    [DISPLAY_TASK_MODEL.realTimeCalc]: realTimeCalcCategoryData,
    [DISPLAY_TASK_MODEL.realtimeCollect]: realTimeCollectData
  }
}

export default props => ({
  namespace,
  state: {
    paramsMap: {},
    classMap: {},
    selectJob: {},
    taskNodeList: [],
    typeData: [],
    taskList: [], //离线工作流集合
    // taskGraphs: [], // 当前编辑的任务和节点信息集合
    realTimeTaskList: [], //实时工作流的集合
    realTimeCalcTaskList: [], //实时计算
    realTimeCollectList: [], //实时采集工作流的集合
    dbInfoList: [], //数据源信息,
    realTimeNodeList: [], //实时节点
    realTimeNodeInfo: [], //实时节点的数据
    showImportModal: false, //显示导入窗口
    activeTabsKey: TASK_EDIT_TABS_TYPE.guide, //
    tabObjs: [], //右侧所有面板的信息
    showEidtTaskInfo: false, //新增添加任务
    pgTaskInfoMap: {},
    taskProjectInfo: {},
    taskListIsLoading: false,
    selectedKeys: [], //树状结构中选中的节点(单纯为了设置高亮)
    editingOrder: {
      taskGroup: false,
      task: false,
      realTime: false
    }, //是否处于排序状态
    isShowCategoryEditModal: false, //是否打开编辑分类名的模态窗
    isshowTaskEditModal: false, //是否打开新增分类名的模态窗
    editCategoryId: '', //编辑的分类id
    editCategoryTitle: '', //编辑的分类标题
    editCategoryParentId: '',
    editTaskId: '', //编辑的工作流id
    editTaskTitle: '', //编辑的工作流名称
    editTaskCategoryId: '',
    categoryData: [], // 工作流分类数据
    groupCategoryData: [], // 工作流组分类数据
    realTimeData: [], //实时数据
    realTimeCalcCategoryData: [], //实时计算
    realTimeCollectData: [], //实时采集
    expandedKeys: [],
    selectCategory: '',
    firstEnter: true, // 第一次进入
    displayModel: DISPLAY_TASK_MODEL.offLineTask, // 显示模式 工作流、工作流组切换
    offLineTaskGroupList: [], //工作流组集合信息
    treeInfo: [],
    groupTreeInfo: [],
    jobParams: [], // 工作流全局参数
    cacheJobParams: [], // 工作流全局参数缓存
    versionList: [], // 版本列表
    userTaskRole: 0,
    editNodeScript: '',
    saving: false, // 创建项目保存中
    activeModeType: 'offLine' // 离线、实时选中
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
    //刷新左侧的面板
    *refreshData({ payload, callback }, { put }) {
      const { id, type = '', taskId } = payload
      switch (type) {
        // 离线-工作流
        case DISPLAY_TASK_MODEL.offLineTask:
          yield put({ type: 'getOffLineTaskByProjectId', payload: { id }, callback })
          break
        // 离线-工作流组
        case DISPLAY_TASK_MODEL.offLineTaskGroup:
          yield put({ type: 'getTaskGroupByProjectId', payload: { id }, callback })
          break
        // 实时-工作流
        case DISPLAY_TASK_MODEL.realTimeTask:
          yield put({ type: 'getRealTimeTaskByProjectId', payload: { id }, callback })
          break
        // 实时-采集
        case DISPLAY_TASK_MODEL.realtimeCollect:
          yield put({ type: 'getRealTimeCollectByProjectId', payload: { id }, callback })
          break
        // 实时-计算
        case DISPLAY_TASK_MODEL.realTimeCalc:
          yield put({ type: 'getRealTimeCalcByProjectId', payload: { id }, callback })
          break
        // 默认刷新全部
        default:
          yield put({ type: 'getOffLineTaskByProjectId', payload: { id } })
          yield put({ type: 'getRealTimeTaskByProjectId', payload: { id } })
          yield put({ type: 'getRealTimeCollectByProjectId', payload: { id } })
          yield put({ type: 'getRealTimeCalcByProjectId', payload: { id }, callback })
          yield put({ type: 'getTaskGroupByProjectId', payload: { id }, callback })

          yield put({ type: 'getMappingUser', payload: { id }, callback })
          if (taskId) {
            yield put({ type: 'getTaskProps', payload: { taskId } })
          }
          break
      }
    },
    // 根据projectid去获取所有的离线-工作流
    *getOffLineTaskByProjectId({ payload, callback }, { call, put }) {
      const { id } = payload
      const url = '/app/task-v3/get-project-task'
      const res = yield call(Fetch.get, url, { task_project_id: id, projectType: DISPLAY_TASK_MODEL.offLineTask })
      if (res && res.success) {
        // 添加上属性
        res.result
          ? res.result.forEach(e => {
            e.typeName = DISPLAY_TASK_MODEL.offLineTask
          })
          : null
        yield put({
          type: 'getCategory',
          payload: { id: props.params.id, taskList: res.result, projectType: DISPLAY_TASK_MODEL.offLineTask },
          callback
        })
      } else {
        message.error('获取离线工作流列表失败')
      }
    },
    // 根据项目id去获取所有的实时-工作流的数据
    *getRealTimeTaskByProjectId({ payload, callback }, { call, put }) {
      const { id } = payload
      const url = '/app/task-v3/get-project-task'
      const res = yield call(Fetch.get, url, { task_project_id: id, projectType: DISPLAY_TASK_MODEL.realTimeTask })
      if (res && res.success) {
        // 添加上属性
        res.result
          ? res.result.forEach(e => {
            e.typeName = DISPLAY_TASK_MODEL.realTimeTask
          })
          : null
        yield put({
          type: 'getCategory',
          payload: { id: props.params.id, taskList: res.result, projectType: DISPLAY_TASK_MODEL.realTimeTask },
          callback
        })
        return
      }
      message.error('获取实时工作流列表失败: ' + res.message || res.error)
    },

    // 根据项目id去获取所有的实时-工作流的数据
    *getRealTimeCollectByProjectId({ payload, callback }, { call, put }) {
      const { id } = payload
      const url = '/app/task-v3/get-project-task'
      const res = yield call(Fetch.get, url, { task_project_id: id, projectType: DISPLAY_TASK_MODEL.realtimeCollect })
      if (res && res.success) {
        // 添加上属性
        res.result
          ? res.result.forEach(e => {
            e.typeName = DISPLAY_TASK_MODEL.realtimeCollect
          })
          : null

        let idList = _.map(res.result, item => item.id)
        const rcsUrl = '/app/task-schedule-v3/executor?action=getExecutionFlowStatusByProjectIds'
        const rcsRes = yield call(Fetch.post, rcsUrl, null, {
          ...recvJSON,
          body: JSON.stringify({ projectIds: idList })
        })
        let taskResMap = {}
        _.forEach(res.result, item => {
          taskResMap[item.id] = item
        })
        let recResMap = {}
        _.forEach(rcsRes.result, item => {
          recResMap[item.projectId] = item
        })
        let resMap = []
        for (let i in taskResMap) {
          // UNEXECUTED：未执行
          taskResMap[i]['status_exc'] = recResMap[i] ? recResMap[i].status : 'UNEXECUTED'
          resMap.push(taskResMap[i])
        }
        res.result = resMap

        yield put({
          type: 'getCategory',
          payload: { id: props.params.id, taskList: res.result, projectType: DISPLAY_TASK_MODEL.realtimeCollect },
          callback
        })
      } else {
        message.error('获取实时工作流列表失败')
      }
    },

    // 根据项目id去获取所有的实时计算-工作流的数据
    *getRealTimeCalcByProjectId({ payload, callback }, { call, put }) {
      const { id } = payload
      const url = '/app/task-v3/get-project-task'
      const res = yield call(Fetch.get, url, { task_project_id: id, projectType: DISPLAY_TASK_MODEL.realTimeCalc })
      if (res && res.success) {
        // 添加上属性
        res.result
          ? res.result.forEach(e => {
            e.typeName = DISPLAY_TASK_MODEL.realTimeCalc
          })
          : null
        yield put({
          type: 'getCategory',
          payload: { id: props.params.id, taskList: res.result, projectType: DISPLAY_TASK_MODEL.realTimeCalc },
          callback
        })
        return
      }
      message.error('获取实时工作流列表失败: ' + res.message || res.error)
    },

    // 获取任务列表
    *getTaskByProjectId({ payload, callback }, { call, put }) {
      const { id } = payload
      const url = '/app/task-v3/get-project-task'
      const res = yield call(Fetch.get, url, { task_project_id: id, projectType: DISPLAY_TASK_MODEL.realTimeTask })
      if (res && res.success) {
        // 添加上属性
        res.result
          ? res.result.forEach(e => {
            e.typeName = DISPLAY_TASK_MODEL.realTimeTask
          })
          : null
        yield put({
          type: 'getCategory',
          payload: { id: props.params.id, taskList: res.result, projectType: DISPLAY_TASK_MODEL.realTimeTask },
          callback
        })
      } else {
        message.error('获取实时工作流列表失败')
      }
    },
    // 获取流程图信息
    *getTaskGraph({ payload, callback }, { call, put, select }) {
      const { id } = payload
      const url = `/app/task-schedule-v3/manager?action=graph&projectId=${id}&userId=${window.sugo.user.id}`
      const res = yield call(Fetch.get, url)
      let paramUrl = `/app/task-schedule-v3/manager?action=fetchProjectProps&projectId=${id}&userId=${window.sugo.user.id}`
      let paramRes = yield call(Fetch.get, paramUrl)
      if (res) {
        const nodeType = paramRes.param && paramRes.param.nodeType ? JSON.parse(paramRes.param.nodeType) : {}
        const params = paramRes.param || {}
        const jobParams = _.map(params, (v, k) => ({ name: k, value: v }))
        const cacheJobParams = _.cloneDeep(jobParams)
        const { taskList } = yield select(p => p[namespace])
        yield put({
          type: 'changeState',
          payload: { jobParams, cacheJobParams }
        })
        let data = azkabanFLowDataToJointData(res, nodeType, taskList)
        callback && callback({ ...data, nodeType })
        return
      }
      message.error('获取流程图失败')
    },

    /**
     * 删除任务
     * @param {*} param0
     * @param {*} param1
     */
    *deleteTask({ payload, callback }, { call, put, select }) {
      const { taskId, taskProjectId, deleteType = 0, type } = payload
      const { tabObjs, selectCategory, activeTabsKey } = yield select(p => p[namespace])
      let isTaskGroup
      switch (deleteType) {
        //用户在树状结构列表中删除
        case 1:
        case '1':
          isTaskGroup = type === DISPLAY_TASK_MODEL.offLineTaskGroup ? true : false
          break
        //用户在打开的面板中删除
        default:
          isTaskGroup = (tabObjs.find(p => p.key === activeTabsKey) || {}).model === DISPLAY_TASK_MODEL.offLineTaskGroup
          break
      }
      let url = isTaskGroup ? '/app/task-v3/del-project-task-group' : '/app/task-v3/del-project-task'
      const res = yield call(Fetch.post, url, { taskProjectId, taskId: taskId.toString(), isTaskGroup, categoryId: selectCategory })
      if (res && res.success) {
        message.success('删除成功')
        callback && callback()
        yield put({ type: `${namespace}/refreshData`, payload: { id: taskProjectId } })
      } else {
        message.error('删除失败' + res.message)
      }
    },

    /**
     * 工作流提审
     * @param {*} param0
     * @param {*} param1
     */
    *submitAudit({ payload, callback }, { call, put, select }) {
      const { taskId, taskProjectId } = payload
      let url = '/app/task-v3/audit-project-task'
      const res = yield call(Fetch.post, url, { taskProjectId, taskId })
      if (res && res.success) {
        const { tabObjs } = yield select(p => p[namespace])
        yield put({ type: `${namespace}/getOffLineTaskByProjectId`, payload: { id: taskProjectId } })
        const index = _.findIndex(tabObjs, p => p.id === taskId)
        _.set(tabObjs, [index, 'canEdit'], false)
        yield put({ type: 'changeState', payload: { tabObjs } })
        message.success('提审成功')
        callback && callback()
      } else {
        message.error('提审失败')
      }
    },

    /**
     * 取消工作流提审
     * @param {*} param0
     * @param {*} param1
     */
    *cancelAudit({ payload, callback }, { call, put, select }) {
      const { taskId, taskProjectId, isTaskGroup } = payload
      let url = isTaskGroup ? '/app/task-v3/cancel-group-audit' : '/app/task-v3/cancel-project-task'
      const res = yield call(Fetch.post, url, { taskProjectId, taskId })
      if (res && res.success) {
        const { tabObjs } = yield select(p => p[namespace])
        yield put({ type: `${namespace}/refreshData`, payload: { id: taskProjectId } })
        const index = _.findIndex(tabObjs, p => p.id === taskId)
        _.set(tabObjs, [index, 'canEdit'], true)
        yield put({ type: 'changeState', payload: { tabObjs } })
        message.success('撤销成功')
        callback && callback()
      } else {
        message.error('撤销失败')
      }
    },
    /**
     * 立即执行
     * @param {} param0
     * @param {*} param1
     */
    *executeTask({ payload, callback }, { call }) {
      const { projectId, isTaskGroup, graphInfo, showName, name, alertConfig } = payload
      const getFlowsUrl = `/app/task-schedule-v3/manager?action=graph&projectId=${projectId}&userId=${window.sugo.user.id}`
      const { flowid } = yield call(Fetch.get, getFlowsUrl)
      if (flowid === '') {
        message.warn('没有配置任务流程，请编辑。')
        if (_.isFunction(callback)) {
          callback(null)
        }
        return { status: 'fail' }
      }
      // 保存任务
      let newGraphInfo = immutateUpdate(graphInfo, 'graph', obj => jointDataToAzkabanFLowData(obj, _.get(graphInfo, 'transform', []), _.get(graphInfo, 'defaultTansform', [])))
      if (!_.isEmpty(_.get(newGraphInfo, 'graph.nodes', {}))) {
        const taskProps = _.get(newGraphInfo, 'nodeType', {})
        if (!_.isEmpty(taskProps) && !isTaskGroup) {
          // 保存工作流公共属性
          const res = yield call(Fetch.post, '/app/task-schedule-v3/manager?action=setProjectProps', null, {
            ...recvJSON,
            body: JSON.stringify({ projectId, param: { nodeType: JSON.stringify(taskProps) } })
          })
          if (res && res.status !== 'success') {
            message.error('保存工作流失败')
            return
          }
        }
        const saveUrl = `/app/task-schedule-v3/manager?action=${isTaskGroup ? 'saveProjectGroup' : 'saveProject'}`
        const resSave = yield call(Fetch.post, saveUrl, null, {
          ...recvJSON,
          body: JSON.stringify({ projectId, data: { ...newGraphInfo.graph, title: name, areas: {}, initNum: 1 }, showName })
        })
        if (resSave && resSave.status !== 'success') {
          message.error('保存工作流失败')
          return
        }
      }

      const url = '/app/task-v3/handleExecutor'
      const { result } = yield call(Fetch.post, url, { projectId, flowId: flowid, isTaskGroup, alertConfig })
      if (result.error) {
        let errmsg = result.error
        if (result.error.match(/running/)) {
          errmsg = '任务正在执行中，请勿重复执行'
        }
        message.warn('执行任务失败, ' + errmsg)
        return
      }
      message.success('执行成功')
      if (_.isFunction(callback)) {
        callback(result)
      }
    },
    /**
     * 获取数据库连接信息
     * @param {*} param0
     * @param {*} param1
     */
    *getPermitDB({ payload, callback }, { call, put }) {
      const url = '/app/task-v3/getPermitDB'
      const { success, result } = yield call(Fetch.get, url, payload)
      if (success) {
        callback && callback(result)
      } else {
        message.error('获取数据库连接信息失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    },
    //简单保存工作流的信息，只保存名字&类型
    //创建成功后刷新左侧对应的工作流，然后再打开新面板
    *saveTaskSimple({ payload, callback }, { call, put, select }) {
      yield put({ type: 'changeState', payload: { saving: true } })
      const modelState = yield select(p => p[namespace])
      const { projectType, showName, id } = payload
      const currTabTasks = getTasksGroupByType(modelState)[modelState.displayModel]
      if (currTabTasks.find(p => p.showName === showName && id !== p.id)) {
        message.error('工作流名称已存在')
        yield put({ type: 'changeState', payload: { saving: false } })
        return
      }
      let url = '/app/task-v3/save-project-task'
      let res = yield call(Fetch.post, url, { ...payload, projectType: projectType === 'task' ? undefined : projectType })
      if (!res.success) {
        yield put({ type: 'changeState', payload: { saving: false } })
        message.error(res.message)
        return
      }
      if (payload.id) {
        message.success('修改成功')
        // 更新 tabObjs 里的名称
        const openedTabIdx = _.findIndex(modelState.tabObjs, o => o.id === id && o.name !== showName)
        if (openedTabIdx !== -1) {
          yield put({
            type: 'changeState',
            payload: {
              tabObjs: immutateUpdate(modelState.tabObjs, [openedTabIdx, 'name'], () => showName)
            }
          })
        }
      } else {
        message.success('创建成功')
      }
      yield put({
        type: 'refreshData',
        payload: {
          taskId: res.result,
          type: payload.projectType,
          id: payload.task_project_id
        },
        callback: () => callback && callback(res.result)
      })
      yield put({
        type: 'changeState',
        payload: { editTaskTitle: '', isShowTaskEditModal: false, editTaskId: '', saving: false }
      })
    },
    //简单保存工作流组的信息，只保存名字&类型
    //创建成功后刷新左侧对应的工作流，然后再打开新面板
    *saveGroupSimple({ payload, callback }, { call, put, select }) {
      let url = '/app/task-v3/save-task-group-simple'
      let res = yield call(Fetch.post, url, payload)
      if (!res.success) {
        message.error(res.message)
        return
      }
      if (payload.id) {
        message.success('修改成功')
      } else {
        message.success('创建成功')
        yield put({
          type: 'changeState',
          payload: { editTaskTitle: '', isShowTaskEditModal: false, editTaskId: '' }
        })
      }
      yield put({
        type: 'getTaskGroupByProjectId',
        payload: {
          id: payload.task_project_id
        },
        callback: () => callback && callback(res.result)
      })
    },

    *saveTaskInfo({ payload, callback }, { call, put, select }) {
      //一定要结构payload传过去 否则字符类型的属性变成了两个双引号的
      // if (!_.get(payload, 'graphInfo.graph.length')) return message.error('需要有节点')
      const { displayModel } = yield select(p => p[namespace])
      const content = _.get(payload, 'graphInfo.graph', [])
      const name = _.get(payload, 'name', [])
      const task_project_id = _.get(payload, 'task_project_id', [])
      const task_id = _.get(payload, 'task_id', '')
      const endNode = content.find(p => p.type === 'end')
      const { tabObjs, selectCategory, activeTabsKey } = yield select(p => p[namespace])
      const isTaskGroup = (tabObjs.find(p => p.key === activeTabsKey) || {}).model === DISPLAY_TASK_MODEL.offLineTaskGroup
      let url = isTaskGroup ? '/app/task-v3/save-task-group' : '/app/task-v3/save-task-params'
      // 对category_id做判定
      if (!content.length) {
        message.error(`${isTaskGroup ? '工作流组' : '工作流'}节点信息不能为空`)
        return
      }
      // 实时数据的没有结束节点
      if (content.length && _.isEmpty(endNode) && payload.typeName !== DISPLAY_TASK_MODEL.realTimeTask) {
        message.error('流程图必须包含结束节点')
        return
      }
      let data = immutateUpdates(
        payload,
        'graphInfo.graph',
        obj => jointDataToAzkabanFLowData(obj, _.get(payload, 'graphInfo.transform', []), _.get(payload, 'graphInfo.defaultTansform', [])),
        'category_id',
        () => (selectCategory === '0' || !selectCategory ? null : selectCategory)
      )
      // 检测是否有其他节点为流程结束
      let nodes = _.get(data, 'graphInfo.graph.nodes', {})
      let lineFroms = _.values(_.get(data, 'graphInfo.graph.lines', {})).map(p => p.from)
      let jobNodes = _.pickBy(nodes, p => p.type !== 'end')
      const formDifNodes = _.difference(_.keys(jobNodes), lineFroms)
      if (formDifNodes.length && payload.typeName !== DISPLAY_TASK_MODEL.realTimeTask) {
        message.error(`节点[${formDifNodes.map(p => _.get(nodes, [p, 'name'], '')).join('、')}]未连接输出节点`)
        return
      }
      // 如果是实时的，多传一个projectType：realTimeTask,再加上一些实时的参数
      if (payload.typeName === DISPLAY_TASK_MODEL.realTimeTask) {
        const idx = moment().format('x')
        const flIdx = idx + 100
        data.projectType = 'realTime'
        // 修改下nodes里面的type
        const { nodes } = data.graphInfo.graph
        Object.keys(nodes).forEach(e => {
          // 如果是结束节点，不做处理
          if (nodes[e].type !== 'end') {
            const [n1, n2, type1, type2] = nodes[e].type.split('-')
            nodes[e].type = `${type2}`
          }
        })
        // 实时的需要将整个封装成为一个节点，做法是封装虚拟节点，将真实节点放在scriptContent中
        // 封装真实的图形
        const flinkurl = `/app/task-schedule-v3/manager?action=fetchFlinkProject&projectId=${task_id}`
        let flinkres = yield call(Fetch.get, flinkurl)
        flinkres = _.isString(flinkres) ? JSON.parse(flinkres) : flinkres
        // const scriptContent = JointDataToScriptContent(data.graphInfo.graph, data.graphInfo.graph.nodes, data.graphInfo.graph.lines)
        const scriptContent = ''
        // JointDataToScriptContent(obj, _.get(payload, 'graphInfo.transform', []), _.get(payload, 'graphInfo.defaultTansform', []))
        // {"clean":[],"sink":[{"top":420,"left":60,"name":"kafka输出配置","id":"1592223000819","type":"kafkaSink","title":"kafka输出配置","params":{},"outputs":[],"path":"kafkaSink_1592223000819.json"},{"top":70,"left":0,"name":"oracle输出配置","id":"1592223084955","type":"oracleSink","title":"oracle输出配置","params":{},"outputs":[{"point":"1592223000819"}],"path":"oracleSink_1592223084955.json"}]}
        // 获取实时的情况，并且封装
        if (flinkres.graph.flowid) {
          data.graphInfo.graph = {
            title: name,
            nodes: JSON.parse(_.get(flinkres.graph, 'gnode', '{}')),
            lines: JSON.parse(_.get(flinkres.graph, 'gline', '{}'))
          }
        } else {
          data.graphInfo.graph = {
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
            }
          }
        }

        data = {
          ...data,
          scriptContent,
          projectId: task_project_id,
          jobName: _.get(payload, 'jobInfo.jobName', flIdx)
        }
      }
      // 对categoryid做处理，避免传过去出错
      // const {category_id}=data
      // if(category_id==='1'||category_id==='0'||(!category_id)){
      //   data.category_id=undefined
      // }
      // 需要把重跑的参数放在每一个节点里面,工作流组的不允许出现
      try {
        if (!isTaskGroup) {
          const { backoff, retries } = data.params.executeParamsObj
          const { nodes } = data.graphInfo.graph
          Object.keys(nodes).forEach(ele => {
            nodes[ele]['retry.backoff'] = backoff * 1000
            nodes[ele]['retries'] = retries
          })
        }
      } catch (error) {
        console.log(error)
      }
      let res = yield call(Fetch.post, url, data)

      if (!res.success) {
        message.error(res.message)
        return
      }
      message.success('修改成功')
      yield put({
        type: 'refreshData',
        payload: {
          id: props.params.id,
          taskId: payload.task_id
        },
        callback: () => callback(res.result)
      })
      yield put({
        type: 'fetchTaskById',
        payload: {
          id: payload.task_id,
          isTaskGroup
        }
      })
    },
    // 获取节点信息
    *getTaskNodeBaseInfo({ payload, callback }, { call }) {
      // debugger
      const { taskId, jobName } = payload
      let url = `/app/task-schedule-v3/manager?action=fetchJobInfo3&jobName=${jobName}&projectId=${taskId}`
      let res = yield call(Fetch.get, url)
      const type = _.get(res, ['overrideParams', 'type'])
      if (res) {
        callback && callback(res)
      }
    },
    // 获取节点信息
    *getTaskNodeInfo({ payload, callback }, { call }) {
      // debugger
      const { taskId, jobName } = payload
      let url = `/app/task-schedule-v3/manager?action=fetchJobInfo3&jobName=${jobName}&projectId=${taskId}`
      let res = yield call(Fetch.get, url)
      if (!res) {
        message.error(`获取节点信息失败  ${res ? res.error : ''}`)
        return
      }

      if (res && res.newjob === 'true') {
        callback({ ...res })
        return
      }

      const type = _.get(res, ['overrideParams', 'type'])
      let fileName = TASK_SCRIPT_TYPE[type]
      if (!fileName) {
        callback({ ...res })
        return
      }
      fileName = _.get(res, ['overrideParams', `${fileName}`])
      fileName = /(\d+\.[a-z]+$)/.exec(fileName) ? /(\d+\.[a-z]+$)/.exec(fileName)[1] : ''

      if (!fileName) {
        callback({ ...res })
        return
      }
      url = `/app/task-schedule-v3/manager?projectId=${taskId}&action=downloadScript&fileName=${fileName}`
      let scriptRes = yield call(Fetch.get, url)
      callback({ ...res, scriptContent: scriptRes })
    },

    // 保存节点脚本信息
    *saveTaskNodeInfo({ payload, callback }, { call }) {
      let url = '/app/task-schedule-v3/manager?action=setJobOverrideProperty2'
      let res = yield call(Fetch.post, url, null, {
        ...recvJSON,
        body: JSON.stringify(payload)
      })
      if (res && res.status === 'success') {
        callback && callback()
        message.success('保存成功')
      } else if (res && res.expired) {
        message.error('页面已过期,请刷新重试')
      } else {
        message.error('保存失败' + res.message)
      }
    },
    // 获取流程扩展属性
    *getTaskProps({ payload }, { call, put }) {
      const { taskId } = payload
      let url = `/app/task-schedule-v3/manager?action=fetchProjectProps&projectId=${taskId}&userId=${window.sugo.user.id}`
      let res = yield call(Fetch.get, url)
      if (res) {
        const param = res.param || {}
        const jobParams = _.map(param, (v, k) => ({ name: k, value: v }))
        const cacheJobParams = _.cloneDeep(jobParams)
        yield put({
          type: 'changeState',
          payload: { jobParams, cacheJobParams }
        })
      } else {
        message.error('获取失败')
      }
    },

    *fetchTaskProjectById({ payload: { id } }, { call, put }) {
      let url = '/app/task-v3/fetchTaskProjectById'
      let res = yield call(Fetch.get, url, { id })
      if (res.success) {
        yield put({
          type: 'changeState',
          payload: {
            taskProjectInfo: res.result
          }
        })
      } else {
        message.error('获取项目信息失败')
      }
    },

    *fetchTaskById({ payload: { id, isTaskGroup } }, { call, put, select }) {
      const { pgTaskInfoMap } = yield select(p => p[namespace])
      let url = isTaskGroup ? '/app/task-v3/fetch-task-group-by-id' : '/app/task-v3/fetchTaskById'
      let res = yield call(Fetch.get, url, { id })
      if (res.success) {
        yield put({
          type: 'changeState',
          payload: {
            pgTaskInfoMap: { ...pgTaskInfoMap, [id]: res.result }
          }
        })
      } else {
        message.error('获取任务信息失败')
      }
    },

    // *initFlowConsole({ payload: { project_id, task_id } }, { put }) {
    //   yield put({
    //     type: 'fetchTaskById',
    //     payload: {
    //       id: task_id
    //     }
    //   })
    //   yield put({
    //     type: 'fetchTaskProjectById',
    //     payload: {
    //       id: project_id
    //     }
    //   })
    // },
    // 获取hive数据源
    *getHiveDataSource({ callback }, { call }) {
      let url = '/app/hive/databases'
      let res = yield call(Fetch.get, url)
      if (res.result) {
        callback(res.result.databases)
      } else {
        message.error('获取hive信息失败')
      }
    },
    // 复制任务
    *copyProject({ payload, callback }, { call, put }) {
      const { taskProjectId, projectId, newProjectName, newProjectShowName, newProjectId } = payload
      let url = '/app/task-v3/copy-task'
      let res = yield call(Fetch.post, url, {
        taskProjectId,
        taskId: projectId,
        newTaskName: newProjectName,
        newTaskShowName: newProjectShowName,
        newTaskId: newProjectId
      })
      if (res.success) {
        message.success('复制成功')
        yield put({ type: `${namespace}/refreshData`, payload: { id: taskProjectId } })
        callback && callback()
      } else {
        message.success('复制失败')
      }
    },
    *setSchedule({ payload, callback }, { call, put, select }) {
      const { id, taskId, taskProjectId, isTaskGroup } = payload
      const state = yield select(p => p[namespace])
      const { taskList, tabObjs, offLineTaskGroupList } = state
      let taskMap = _.reduce(
        _.concat(taskList, offLineTaskGroupList),
        (r, v) => {
          r[v.id] = _.get(v, 'flows.0.id', '')
          return r
        },
        {}
      )

      if (!taskMap[id]) return message.error('没有工作流程ID')
      let url = isTaskGroup ? '/app/task-v3/set-task-group-schedule' : '/app/task-v3/set-schedule'
      let res = yield call(Fetch.post, url, { id, flowId: taskMap[id] })
      if (!res.success) return message.error(res.message || '设置失败')
      yield put({ type: `${namespace}/refreshData`, payload: { id: taskProjectId } })
      const index = _.findIndex(tabObjs, p => p.id === taskId)
      _.set(tabObjs, [index, 'canEdit'], false)
      yield put({ type: 'changeState', payload: { tabObjs } })
      message.success('设置成功')
    },
    // 编辑工作流分类
    *handleCategory({ payload = {} }, { call, put, select }) {
      const modelState = yield select(p => p[namespace])
      const { title, id, projectType } = payload
      const currTabTypes = _.filter(getDataGroupByType(modelState)[modelState.displayModel], d => _.startsWith(d.key, 'type-'))
      if (currTabTypes.find(p => p.title === title && id !== p.id)) {
        message.error('分类名称已存在')
        return
      }

      yield put({ type: 'changeState', payload: { saving: true } })
      const isTaskGroup = projectType === DISPLAY_TASK_MODEL.offLineTaskGroup
      const url = isTaskGroup ? '/app/task-v3/handleGroupCategory' : '/app/task-v3/handleCategory'
      const { success } = (yield call(Fetch.get, url, { projectId: props.params.id, ...payload })) || {}
      if (success) {
        if (projectType === DISPLAY_TASK_MODEL.offLineTaskGroup) {
          yield put({ type: 'getTaskGroupByProjectId', payload: { id: props.params.id } })
        } else if (projectType === DISPLAY_TASK_MODEL.offLineTask) {
          yield put({ type: 'getOffLineTaskByProjectId', payload: { id: props.params.id } })
        } else if (projectType === DISPLAY_TASK_MODEL.realTimeTask) {
          yield put({ type: 'getRealTimeTaskByProjectId', payload: { id: props.params.id } })
        } else if (projectType === DISPLAY_TASK_MODEL.realtimeCollect) {
          yield put({ type: 'getRealTimeCollectByProjectId', payload: { id: props.params.id } })
        } else if (projectType === DISPLAY_TASK_MODEL.realTimeCalc) {
          yield put({ type: 'getRealTimeCalcByProjectId', payload: { id: props.params.id } })
        }

        yield put({ type: 'changeState', payload: { isShowCategoryEditModal: false, saving: false } })

        return message.success(payload.id === '' ? '添加成功' : '编辑成功')
      }
      yield put({ type: 'changeState', payload: { saving: false } })
      return message.error(payload.id === '' ? '添加失败' : '编辑失败')
    },
    // 排序，传一个序号数组
    *orderCategory({ payload = {} }, { call, put, select }) {
      const { displayModel } = yield select(p => p[namespace])
      const isTaskGroup = displayModel === DISPLAY_TASK_MODEL.offLineTaskGroup
      const url = isTaskGroup ? '/app/task-v3/orderGroupCategory' : '/app/task-v3/orderCategory'
      const { success } = yield call(Fetch.post, url, { ...payload, projectId: props.params.id })
      if (success) {
        yield put({ type: 'getOffLineTaskByProjectId', payload: { id: props.params.id } })
        yield put({ type: 'getTaskGroupByProjectId', payload: { id: props.params.id } })
        return message.success('保存排序成功')
      }
      return message.error('保存排序失败')
    },
    //删除一个类型
    *deleteCategory({ payload = {} }, { call, put, select }) {
      // 获取删除的类型
      const { type } = payload
      const isTaskGroup = type === DISPLAY_TASK_MODEL.offLineTaskGroup
      const url = isTaskGroup ? '/app/task-v3/deleteGroupCategory' : '/app/task-v3/deleteCategory'
      const { success } = yield call(Fetch.get, url, payload)
      if (success) {
        yield put({ type: 'getOffLineTaskByProjectId', payload: { id: props.params.id } })
        yield put({ type: 'getTaskGroupByProjectId', payload: { id: props.params.id } })
        yield put({ type: 'getRealTimeTaskByProjectId', payload: { id: props.params.id } })
        yield put({ type: 'getRealTimeCollectByProjectId', payload: { id: props.params.id } })
        yield put({ type: 'getRealTimeCalcByProjectId', payload: { id: props.params.id } })
        return message.success('删除成功')
      }
      return message.error('删除失败')
    },
    // 获取任务组
    *getTaskGroupByProjectId({ payload, callback }, { call, put }) {
      const { id } = payload
      const url = '/app/task-v3/get-project-task-group'
      const res = yield call(Fetch.get, url, { task_project_id: id })
      if (res && res.success) {
        res.result
          ? res.result.forEach(e => {
            e.typeName = DISPLAY_TASK_MODEL.offLineTaskGroup
          })
          : null
        yield put({
          type: 'getGroupCategory',
          payload: { id: props.params.id, offLineTaskGroupList: res.result },
          callback
        })
      } else {
        message.error('获取工作流列表失败')
      }
    },
    // 获取分类信息及排序
    *getCategory({ payload = {}, callback }, { call, put }) {
      const { taskList, id, projectType } = payload
      const urlc = '/app/task-v3/getCategory'
      let {
        success,
        result: { types, order }
      } = yield call(Fetch.get, urlc, { projectId: id, projectType })
      if (success) {
        // 先转化为树状再删除
        let val = {}
        // 筛选离线数据流分类,离线数据的祖先节点为0或者是空
        if (projectType === DISPLAY_TASK_MODEL.offLineTask) {
          types = types.filter(e => e.parent_id != '1' && e.type !== DISPLAY_TASK_MODEL.realtimeCollect && e.type !== DISPLAY_TASK_MODEL.realTimeCalc)
          // 离线的最高一级的只会是空白或者是0
          const treeInfo = { types, tasks: taskList, order }
          let treeData = makeTreeNode(treeInfo).filter(e => {
            return e.parent_id === '0' || !e.parent_id
          })
          val = { taskListIsLoading: true }
          val = Object.assign(val, { categoryData: treeData, taskList, treeInfo })
        }
        // 筛选实时数据流分类，实时的祖先节点的id=1
        else if (projectType === DISPLAY_TASK_MODEL.realTimeTask) {
          types = types.filter(e => e.parent_id !== '0' && e.parent_id && e.type !== DISPLAY_TASK_MODEL.realtimeCollect && e.type !== DISPLAY_TASK_MODEL.realTimeCalc)
          const treeInfo = { types, tasks: taskList, order }
          // 离线的最高一级的只会是空白或者是1
          let treeData = makeTreeNode(treeInfo).filter(e => {
            // 不是分类的直接数据都会有parentkEY为type-0
            return e.parent_id === '1' || e.parentKey === 'type-0'
          })
          val = { taskListIsLoading: true }
          val = Object.assign(val, { realTimeData: treeData, realTimeTaskList: taskList })
        } else if (projectType === DISPLAY_TASK_MODEL.realtimeCollect) {
          types = types.filter(e => e.type === DISPLAY_TASK_MODEL.realtimeCollect)
          const treeInfo = { types, tasks: taskList, order }
          // 离线的最高一级的只会是空白或者是1
          let treeData = makeTreeNode(treeInfo)
          val = { taskListIsLoading: true }
          val = Object.assign(val, { realTimeCollectData: treeData, realTimeCollectList: taskList })
        } else if (projectType === DISPLAY_TASK_MODEL.realTimeCalc) {
          const treeInfo = {
            types: types.filter(e => e.type === DISPLAY_TASK_MODEL.realTimeCalc),
            tasks: taskList,
            order
          }
          val = {
            taskListIsLoading: true,
            realTimeCalcCategoryData: makeTreeNode(treeInfo),
            realTimeCalcTaskList: taskList
          }
        }
        // 更新数据
        yield put({
          type: 'changeState',
          payload: { ...val }
        })
        callback && callback()
      } else {
        message.error('获取分类数据失败哦')
        return {}
      }
    },
    //获取离线数据及排序
    //     /task-schedule-v3/manager/manager?action=getProjects
    *getOfflineCategory({ payload = {}, callback }, { call, put }) {
      const { taskList, id } = payload
      const urlc = '/task-schedule-v3/manager/manager?action=getProjects'
      const {
        success,
        result: { types, order }
      } = yield call(Fetch.get, urlc)
      if (success) {
        const treeInfo = { types, tasks: taskList, order }
        let treeData = makeTreeNode(treeInfo)
        let val = { categoryData: treeData, taskListIsLoading: true, taskList, treeInfo }
        callback && callback()
        yield put({
          type: 'changeState',
          payload: { ...val }
        })
      } else {
        message.error('获取分类数据失败哦')
        return {}
      }
    },

    *getGroupCategory({ payload = {}, callback }, { call, put }) {
      const { offLineTaskGroupList, id } = payload
      const urlc = '/app/task-v3/getGroupCategory'
      const {
        success,
        result: { types, order }
      } = yield call(Fetch.get, urlc, { projectId: id })
      if (success) {
        const groupTreeInfo = { types, tasks: offLineTaskGroupList, order }
        let treeData = makeTreeNode(groupTreeInfo)
        let val = { groupCategoryData: treeData, taskListIsLoading: true, offLineTaskGroupList, groupTreeInfo }
        yield put({
          type: 'changeState',
          payload: { ...val }
        })
        callback && callback()
      } else {
        message.error('获取分类数据失败')
        return {}
      }
    },
    *getVersionList({ payload = {} }, { call, put, select }) {
      const { projectId } = payload
      const { users } = yield select(props => ({ ...props['common'] }))
      const keyByUsers = _.keyBy(users, 'id')
      const url = `/app/task-schedule-v3/manager?action=fetchVersionsControl&projectId=${projectId}`
      const { status, versionsControl } = yield call(Fetch.get, url)
      versionsControl.forEach(o => (o.author = _.get(keyByUsers, `${o.createUser}.first_name`)), '')
      versionsControl.sort((a, b) => b.createTimestamp - a.createTimestamp)
      if (status === 'success') {
        return yield put({
          type: 'changeState',
          payload: { versionList: versionsControl }
        })
      }
      return message.error('获取版本列表失败')
    },
    *addVersion({ payload = {} }, { call, put }) {
      const { projectId } = payload
      const url = '/app/task-schedule-v3/manager?action=createVersionsControl'
      const { status } = yield call(Fetch.post, url, null, {
        ...recvJSON,
        body: JSON.stringify(payload)
      })
      if (status === 'success') {
        message.success('添加新版本成功')
        return yield put({
          type: 'getVersionList',
          payload: { projectId }
        })
      }
      return message.error('添加新版本失败')
    },
    *applyVersion({ payload = {}, callback }, { call, put, select }) {
      const { projectId, isTaskGroup, controlId } = payload
      const { taskList } = yield select(state => state[namespace])
      // TODO 如果是工作流组 需要判断节点是够存在 是否被其他工作流组引用
      if (isTaskGroup) {
        // 获取要使用的版本的工作流节点id
        const url = `/app/task-schedule-v3/manager?action=fetchHistoryVersionNodeProps&projectId=${projectId}&controlId=${controlId}`
        const res = yield call(Fetch.get, url)
        if (res.status !== 'success') {
          return message.error('获取历史版本节点信息失败')
        }
        let nodeProjectMap = _.values(res.nodes)
          .filter(p => _.get(p, 'flattened.type') === 'project')
          .map(p => p.flattened)
        nodeProjectMap = _.keyBy(nodeProjectMap, p => p['proxy.job.id'])
        const nodeProjectIds = _.keys(nodeProjectMap)
        const tasks = taskList.filter(p => _.includes(nodeProjectIds, p.id) && (!p.task_group_id || p.task_group_id === projectId)).map(p => p.id)
        if (tasks.length !== nodeProjectIds.length) {
          message.error(
            `应用版本失败，工作流[${_.difference(nodeProjectIds, tasks)
              .map(p => _.get(nodeProjectMap, [p, 'showName']))
              .join('、')}已被其他工作流组使用或工作流已被删除`
          )
          return
        }
      }
      const url = `/app/task-schedule-v3/manager?action=revert&userId=${window.sugo.user.id}`
      const { status } = yield call(Fetch.post, url, null, {
        ...recvJSON,
        body: JSON.stringify({ projectId, controlId })
      })
      if (status === 'success') {
        message.success('应用成功')
        return callback && callback()
        //  yield put({
        //   type: 'getVersionList',
        //   payload: {projectId }
        // })
      }
      return message.error('应用版本失败')
    },
    *delVersion({ payload = {} }, { call, put }) {
      const { projectId, controlId } = payload
      const url = `/app/task-schedule-v3/manager?action=cleanVersionControlById&controlId=${controlId}`
      const { status } = yield call(Fetch.get, url)
      if (status === 'success') {
        message.success('删除成功')
        return yield put({
          type: 'getVersionList',
          payload: { projectId }
        })
      }
      return message.error('删除版本失败')
    },
    *getMappingUser({ payload }, { call, put }) {
      let url = '/app/task-v3/get-task-mapping'
      const { id } = payload || {}
      if (_.get(window, 'sugo.user.SugoRoles', []).filter(r => r.type === 'built-in').length) {
        yield put({
          type: 'changeState',
          payload: {
            userTaskRole: 2
          }
        })
        return
      }
      const response = yield call(Fetch.get, url, { id, singleUser: true })
      const { result = [], success } = response
      if (success) {
        yield put({
          type: 'changeState',
          payload: {
            userTaskRole: _.get(result, '0.role_type', 0)
          }
        })
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'refreshData', payload: { id: props.params.id } })
    }
  }
})
