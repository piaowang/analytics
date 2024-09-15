import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import { message } from 'antd'
import { toQueryParams, tryJsonParse } from '../../../../common/sugo-utils'
import { TASK_TREE_TYPE, getTypeKeysByKey, makeTreeNode, getAllParent } from '../constants'
import { sendURLEncoded, sendJSON, recvJSON } from '../../../common/fetch-utils'

export const namespace = 'taskScheduleTree'

export default props => ({
  namespace: `${namespace}_${props.taskTreeType}`,
  state: {
    treeData: [],//任务树数据
    editingOrder: false,//选中任务类型节点
    expandedKeys: [],
    showEditType: false,
    selectTypeKey: '',
    taskTreeInfo: {},
    listData: [],
    selectedKeys: [],
    isDataCollect: true,
    loading: false,
    scheduleInfos: {},
    taskActionType: 1 //任务类型
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
    *editTypeName({ payload }, { call, select, put }) {
      let url = '/app/new-task-schedule/type'
      const { id, name, parentId } = payload
      const params = id ? toQueryParams({
        id,
        action: 'edit',
        name,
        parentId,
        level: 0,
        description: ''
      })
        : toQueryParams({
          action: 'add',
          name,
          parentId,
          level: 0,
          description: ''
        })
      const res = yield call(Fetch.post, url + '?' + params, null)
      // const res = yield call(Fetch.post, url, null, { ...sendURLEncoded, body: params})
      if (res && res.status && res.status === 'success') {
        yield put({ type: 'getTaskTreeData', payload: {} })
        yield put({ type: 'changeState', payload: { loading: false, showEditType: false } })
      } else {
        message.error((id ? '修改失败！' : '添加失败！') + res.error)
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    },
    *deleteType({ payload }, { call, select, put }) {
      let url = '/app/new-task-schedule/manager'
      const { id } = payload
      let { taskTreeInfo } = yield select(state => state[`${namespace}_${props.taskTreeType}`])
      const keys = getTypeKeysByKey([id], taskTreeInfo.types)
      if (taskTreeInfo.tasks && _.some(taskTreeInfo.tasks, p => keys.includes(p.typeId.toString()))) {
        message.error('请先删除分类下的任务或分类!')
        return
      }
      const params = toQueryParams({ typeId: id, treeOperation: 'deleteType' })
      const res = yield call(Fetch.post, url + '?' + params, null)
      // const res = yield call(Fetch.post, url, null, { ...sendURLEncoded, body: params})
      if (res && res.status && res.status === 'success') {
        message.success('删除成功')
        yield put({ type: 'getTaskTreeData', payload: {} })
        yield put({ type: 'changeState', payload: { loading: false, selectTypeKey: '' } })
      } else {
        message.error('删除失败')
        yield put({ type: 'changeState', payload: { loading: false, selectTypeKey: '' } })
      }
    },
    /**
    * @description 获取任务树
    * @param {any} { payload }
    * @param {any} { call, select }
    */
    *getTaskTreeData({ payload }, { call, select, put }) {
      let { taskTreeType, selectKey = '', selectId } = payload
      let url = '/app/new-task-schedule/manager'
      // if (taskTreeType === TASK_TREE_TYPE.executionHandle.name) {
      //   url = '/app/new-task-schedule/executor?getRunningFlows=false'
      // } 
      // else 
      if (taskTreeType === TASK_TREE_TYPE.scheduleHandle.name) {
        url = '/app/new-task-schedule/schedule'
      }
      const res = yield call(Fetch.get, url, null)
      let { selectedKeys } = yield select(state => state[`${namespace}_${props.taskTreeType}`])
      if (res && res.status && res.status === 'success') {
        let { projectTypes: types, projects: tasks, projectTypeSort: order, scheduleInfo = {} } = res
        // if (taskTreeType === TASK_TREE_TYPE.executionHandle.name) {
        //   tasks = res.executions
        // } else 
        if (taskTreeType === TASK_TREE_TYPE.scheduleHandle.name) {
          tasks = res.schedules.map(s => ({ ...s, id: _.get(s, 'schedule.scheduleId', '') }))
          types = types.map(p => {
            if (p.parentId === 0) {
              return { ...p, name: p.name + '任务' }
            }
            return p
          })
        }
        tasks = tasks.map(p => ({ ...p, cronInfo: tryJsonParse(p.cronInfo) }))
        const treeInfo = { types, tasks, order }
        let treeData = makeTreeNode(treeInfo)
        let listData = []
        let expandedKeys = []
        // 执行管理地址栏传入任务id 定位节点 并展开选中节点
        if (selectId) {
          selectKey = selectId
          expandedKeys = getAllParent({ types, tasks, selectId })
        } else if (!selectKey) {
          // 刷新选中上次节点 没有则选中采集节点
          selectKey = selectedKeys.length ? selectedKeys[0] : `type-${(types.find(t => t.name === '数据采集') || {}).id}`
        }
        if (selectKey && _.startsWith(selectKey, 'type-')) {
          const key = selectKey.substr(5)
          let keys = getTypeKeysByKey([key], treeInfo.types)
          listData = treeInfo.tasks.filter(p => keys.includes(p.typeId.toString()))
        } else if (selectKey) {
          listData = treeInfo.tasks.filter(t => t.id.toString() === selectKey)
        }
        let payload = { taskTreeInfo: treeInfo, treeData, selectedKeys: [selectKey], listData, scheduleInfos: scheduleInfo }
        if (expandedKeys.length) {
          payload.expandedKeys = expandedKeys
        }
        yield put({
          type: 'changeState',
          payload
        })
      } else {
        message.error('获取数据失败')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    },
    *saveOrder({ payload }, { call, select, put }) {
      let { sortInfo } = payload
      yield call(Fetch.post, '/app/new-task-schedule/manager?treeOperation=update', null, {
        ...recvJSON,
        body: JSON.stringify({ content: sortInfo  })
      })
      yield put({
        type: 'changeState',
        payload: { editingOrder: false }
      })
      message.success('保存排序成功')
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getTaskTreeData', payload: { taskTreeType: props.taskTreeType, selectId: props.selectId } })
      return () => { }
    }
  }
})

