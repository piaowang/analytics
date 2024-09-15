
import Fetch from 'client/common/fetch-final'
import { message } from 'antd'
import { DISPLAY_TASK_MODEL, makeTreeNode } from '../constants'
export const namespace = 'taskV3CategoryTree'
export default (props) => ({
  namespace,
  state: {
    categoryData: [], // 工作流分类数据
    groupCategoryData: [],  // 工作流组分类数据
    expandedKeys: [],
    groupExpandedKeys: [],
    selectCategory: '',
    treeInfo: [],
    groupTreeInfo: []
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
    // 获取分类信息及排序
    *getCategory({ payload = {}, callback }, { call, put }) {
      const { offLineTaskList, taskProjectId, projectType } = payload
      const urlc = '/app/task-v3/getCategory'
      let { success, result: { types, order } } = yield call(Fetch.get, urlc, { projectId: taskProjectId, projectType })
      if (!success) {
        message.error('获取分类数据失败')
        callback && callback()
        return
      }
      let val = {}
      let isOfflien = projectType === DISPLAY_TASK_MODEL.offLineTask
      types = types.filter(e => e.parent_id !== (isOfflien ? '1' : '0'))
      // 离线的最高一级的只会是空白或者是0
      const treeInfo = { types, tasks: offLineTaskList, order }
      let treeData = makeTreeNode(treeInfo).filter(e => {
        if (!isOfflien) {
          return e.parent_id === '1' || e.parentKey === 'type-0'
        }
        return e.parent_id !== '1' || (!e.parent_id)
      })
      val = {
        taskListIsLoading: true,
        categoryData: treeData,
        treeInfo
      }
      // 更新数据
      yield put({ type: 'changeState', payload: val })
      callback && callback()
    },

    *getGroupCategory({ payload = {}, callback }, { call, put }) {
      const { offLineTaskGroupList, taskProjectId } = payload
      const urlc = '/app/task-v3/getGroupCategory'
      const { success, result: { types, order } } = yield call(Fetch.get, urlc, { projectId: taskProjectId })
      if (!success) {
        message.error('获取分类数据失败')
        return
      }
      const groupTreeInfo = { types, tasks: offLineTaskGroupList, order }
      let treeData = makeTreeNode(groupTreeInfo)
      let val = { groupCategoryData: treeData, taskListIsLoading: true, groupTreeInfo }
      yield put({
        type: 'changeState',
        payload: { ...val }
      })
      callback && callback()
    }
  }
})
