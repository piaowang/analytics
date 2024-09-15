import Fetch from '../../../common/fetch-final'
import { remoteUrl } from '../../../constants/interface'
import Category from '../../PioProjects/form-render/category'
const namespace = 'livescreen'

/**
 * 基于命名空间的action types
 */
const ActionTypes = {
  setLoading: `${namespace}_set_loading`,
  getLiveScreens: `${namespace}_getLiveScreens`,
  addLiveScreen: `${namespace}_addLiveScreen`,
  _addLiveScreenTheme: `${namespace}_addLiveScreenTheme`,
  updateLiveScreen: `${namespace}_updateLiveScreen`,
  deleteLiveScreen: `${namespace}_deleteLiveScreen`,
  // copyLiveScreen: `${namespace}_copyLiveScreen`,
  getGroupInfo: `${namespace}_getGroupInfo`,
  moveGroup: `${namespace}_moveGroup`
}

const showLoading = (dispatch) => dispatch({ type: ActionTypes.setLoading, loading: true })
const hideLoading = (dispatch) => dispatch({ type: ActionTypes.setLoading, loading: false })

/**
 * 获取我的大屏列表
 *
 * @export
 * @returns
 */
export function doGetLiveScreens(){
  const { getLiveScreens } = ActionTypes
  return async dispatch => {
    showLoading(dispatch)
    const { result : list = [] } = await Fetch.get(remoteUrl.GET_LIVESCREENS)
    hideLoading(dispatch)
    dispatch({
      type: getLiveScreens,
      list
    })
  }
}

/**
 * 添加一个主题
 *
 * @export
 */
export function doAddLiveScreenTheme(values, cb){
  const { addLiveScreen } = ActionTypes
  return async dispatch => {
    showLoading(dispatch)
    const res = await Fetch.post(remoteUrl.ADD_LIVESCREENTHEME, values)
    hideLoading(dispatch)
    if (res) {
      const { result: data } = res
      dispatch({
        type: addLiveScreen,
        data
      })
    }
    if (typeof cb === 'function') cb(res)
  }
}

/**
 * 添加一个大屏
 *
 * @export
 */
export function doAddLiveScreen(values, cb){
  const { addLiveScreen } = ActionTypes
  return async dispatch => {
    showLoading(dispatch)
    const res = await Fetch.post(remoteUrl.ADD_LIVESCREEN, values)
    hideLoading(dispatch)
    if (res) {
      const { result: data } = res
      dispatch({
        type: addLiveScreen,
        data
      })
    }
    if (typeof cb === 'function') cb(res)
  }
}

/**
 * 更新一个大屏
 * 
 * @export
 * @param {any} values 
 * @param {any} cb 
 * @returns 
 */
export function doUpdateLiveScreen(id, values, cb){
  const { updateLiveScreen } = ActionTypes
  return async dispatch => {
    if (!id) return
    const livescreen = { id, ...values }
    showLoading(dispatch)
    const res = await Fetch.post(remoteUrl.UPDATE_LIVESCREEN, { livescreen })
    hideLoading(dispatch)
    if (res) {
      dispatch({
        type: updateLiveScreen,
        livescreen
      })
    }
    if (typeof cb === 'function') cb(livescreen)
  }
}

/**
 * 把大屏移入回收站
 *
 * @export
 * @param {any} id
 */
export function recycleLiveScreen(id, cb) {
  const { updateLiveScreen } = ActionTypes
  return async dispatch => {
    showLoading(dispatch)
    const res = await Fetch.delete(`${remoteUrl.RECYCLE_LIVESCREEN}/${id}`)
    hideLoading(dispatch)
    if (res) {
      const livescreen = { id, status: 0 }
      dispatch({
        type: updateLiveScreen,
        livescreen
      })
      if (typeof cb === 'function') cb()
    }
  }
}

/**
 * 把大屏从回收站还原
 *
 * @export
 * @param {any} id
 */
export function reductionLiveScreen(id, cb) {
  const { updateLiveScreen } = ActionTypes
  return async dispatch => {
    showLoading(dispatch)
    const res = await Fetch.put(`${remoteUrl.REDUCTION_LIVESCREEN}/${id}`)
    hideLoading(dispatch)
    if (res) {
      const livescreen = { id, status: 1 }
      dispatch({
        type: updateLiveScreen,
        livescreen
      })
      if (typeof cb === 'function') cb()
    }
  }
}

/**
 * 删除一个大屏
 *
 * @export
 * @param {any} id
 */
export function doRemoveLiveScreen(id, cb) {
  const { deleteLiveScreen } = ActionTypes
  return async dispatch => {
    showLoading(dispatch)
    const res = await Fetch.delete(`${remoteUrl.DELETE_LIVESCREEN}/${id}`)
    hideLoading(dispatch)
    if (res) {
      dispatch({
        type: deleteLiveScreen,id
      })
      if (typeof cb === 'function') cb()
    }
  }
}

/**
 * 复制一个大屏
 * 
 * @export
 * @param {any} id 
 * @param {any} cb 
 */
export function doCopyLiveScreen(id) {
  const { addLiveScreen } = ActionTypes
  return async dispatch => {
    showLoading(dispatch)
    const { result: data } = await Fetch.post(`${remoteUrl.COPY_LIVESCREEN}/${id}`)
    hideLoading(dispatch)
    if (data) {
      dispatch({
        type: addLiveScreen,
        data
      })
    }
  }
}

/**
 * 获取大屏分组信息
 *
 * @export
 * @param {any} id
 */
export function doGetGroupInfo(id, cb) {
  const { getGroupInfo } = ActionTypes
  return async dispatch => {
    showLoading(dispatch)
    const { result } = await Fetch.get(`${remoteUrl.GET_GROUP_INFO}/${id}`)
    hideLoading(dispatch)
    if (result) {
      dispatch({
        type: getGroupInfo, result
      })
      if (typeof cb === 'function') cb()
    }
  }
}

/**
 * 获取大屏分组信息
 *
 * @export
 * @param {any} params
 */
export function doMoveGroup(params, cb) {
  const { moveGroup } = ActionTypes
  const {id, category_id } = params
  return async dispatch => {
    showLoading(dispatch)
    const { result } = await Fetch.post(`${remoteUrl.MOVE_GROUP}`, {id, category_id})
    hideLoading(dispatch)
    if (result) {
      dispatch({
        type: moveGroup, id, category_id
      })
      if (typeof cb === 'function') cb()
    }
  }
}
