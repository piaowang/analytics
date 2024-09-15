import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import moment from 'moment'
import { recvJSON } from '../../../common/fetch-utils'
import { message, Modal } from 'antd'

export const namespace = 'cloneManagerModel'

function makeCategoryTree({ types, order }) {
  let typeNodes = types.map(k => ({
    title: k.title,
    id: k.id + '',
    key: `type-${k.id}`,
    parentKey: k.parent_id ? `type-${k.parent_id}` : null,
    children: []
  }))
  let typeNodeKeyDict = _.keyBy(typeNodes, 'key')
  let treeRoot = []

  let treeUnsorted = typeNodes.reduce((arr, k) => {
    if (k.parentKey) {
      let parent = typeNodeKeyDict[k.parentKey]
      if (!parent) {
        return [...arr, k]
      }
      parent.children.unshift(k)
      return arr
    }
    return [...arr, k]
  }, treeRoot)

  return sortTree(treeUnsorted, order)
}

export function sortTree(tree, sortInfoDict) {
  function recurSort(tree, parentKey) {
    let sortDict = (sortInfoDict[parentKey] || []).reduce((acc, curr, idx) => {
      acc[curr] = idx
      return acc
    }, {})
    return _.orderBy(tree, n => sortDict[n.key]).map(n => {
      return n.children ? { ...n, children: recurSort(n.children, n.key) } : n
    })
  }
  return recurSort(tree, 'type-0')
}

export default props => ({
  namespace,
  state: {
    taskList: [],
    packageList: [],
    projectList: [],
    categoryList: []
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
    *getAllTasks({ payload }, { put, call, select }) {
      const url = '/app/task-v3/get-all-tasks'
      const { success, result } = yield call(Fetch.get, url)
      if (success) {
        return yield put({
          type: 'changeState',
          payload: { taskList: result }
        })
      }
      return message.error('获取工作流列表失败')
    },
    *getTasksByProjectId({ payload = {} }, { call, put }) {
      const url = '/app/task-v3/get-project-task'
      const { success, result } = yield call(Fetch.get, url, { task_project_id: 'ZsFJlkuk' })
      if (success) {
        return yield put({
          type: 'changeState',
          payload: { taskList: result }
        })
      }
    },
    *createClonePackage({ payload = {}, callback }, { call, put }) {
      const url = '/app/task-v3/create-clone-package'
      const { success, result } = yield call(Fetch.post, url, payload)
      if (success) {
        callback && callback()
        return message.success('克隆成功')
      }
      return message.error('克隆失败')
    },
    *getClonePackages({ payload = {} }, { call, put }) {
      const url = '/app/task-v3/get-clone-packages'
      const { success, result } = yield call(Fetch.get, url, payload)
      const list = result.map(o => ({
        ..._.omit(o, 'SugoTaskProject'),
        projectId: _.get(o, 'SugoTaskProject.id', ''),
        projectName: _.get(o, 'SugoTaskProject.name', '')
      }))
      if (success) {
        return yield put({
          type: 'changeState',
          payload: { packageList: list }
        })
      }
      return message.error('获取克隆包列表失败')
    },
    *deleteClonePackage({ payload = {} }, { call, put }) {
      const { type } = payload
      const url = '/app/task-v3/delete-clone-packages'
      const { success, result } = yield call(Fetch.get, url, payload)
      if (success) {
        yield put({
          type: 'getClonePackages',
          payload: { type }
        })
        return message.success('删除成功')
      }
      return message.error('删除失败')
    },
    *getProjects({ payload = {} }, { call, put }) {
      const url = '/app/task-schedule-v3/get-project'
      const { success, result } = yield call(Fetch.get, url)
      if (success) {
        return yield put({
          type: 'changeState',
          payload: { projectList: result }
        })
      }
      return message.error('获取项目列表失败')
    },
    // *getCategory({payload = {}}, {call, put }) {
    //   const url = '/app/task-v3/getCategory'
    //   const {success, result: {types, order} } = yield call(Fetch.get, url, payload )
    //   if(success) {
    //     const treeInfo = { types, order }
    //     const treeData = makeCategoryTree(treeInfo)
    //     const withRoot = [{
    //       id: '0',
    //       title: '项目根目录',
    //       key: 'tree-root',
    //       children: treeData
    //     }]
    //     return  yield put({
    //       type: 'changeState',
    //       payload: {categoryList: withRoot}
    //     })
    //   }
    //   return message.error('获取目录列表失败')
    // },
    *importClonePackage({ payload = {}, callback }, { call, put }) {
      const { tasks } = payload
      const url = '/app/task-v3/import-clone-package'
      const res = yield call(Fetch.post, url, payload)
      if (res?.success) {
        yield put({
          type: 'getClonePackages',
          payload: { type: 2 }
        })
        callback && callback()
        return Modal.success({
          content: <div className='font14'>{`已成功导入工作流 ${res?.result.join(', ')}`}</div>
        })
      }
      return message.error(`导入失败 ${res?.message}`)
    },
    onDownload({ payload = {} }, { call, put }) {
      const { ids, name } = payload
      return (location.href = `/app/task-v3/download-clone-package?ids=${ids}`)
    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname } = history.getCurrentLocation()
      if (pathname === '/console/new-task-schedule/clone-manager') {
        dispatch({ type: 'getAllTasks', payload: {} })
      }
    }
  }
})
