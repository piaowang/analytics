import Fetch from '../../../common/fetch-final'
import {remoteUrl} from '../../../constants/interface'
import _ from 'lodash'
import {guessDruidTypeByDbDataType} from '../../../../common/offline-calc-model-helper'
import {OfflineCalcDataSourceTypeEnum, EXAMINE_TYPE} from '../../../../common/constants'
import {browserHistory} from 'react-router'
import { create } from '~/src/client/services/examine'

const namespace = 'livescreen_workbench'

const roleIds = _.map(window.sugo.user.SugoRoles, r => r.id)

/**
 * 基于命名空间的action types
 */
export const ActionTypes = {
  setLoading: `${namespace}_set_loading`,
  changeScale: `${namespace}_changeScale`,
  changeLeftWidth: `${namespace}_changeLeftWidth`,
  changeRightWidth: `${namespace}_changeRightWidth`,
  syncClientSize: `${namespace}_syncClientSize`,
  reCalcCenterSize: `${namespace}_reCalcCenterSize`,
  changeScreenWidth: `${namespace}_changeScreenWidth`,
  changeScreenHeight: `${namespace}_changeScreenHeight`,
  addComponent: `${namespace}_addComponent`,
  copyComponent: `${namespace}_copyComponent`,
  removeComponent: `${namespace}_removeComponent`,
  activeComponent: `${namespace}_activeComponent`,
  hoverComponent: `${namespace}_hoverComponent`,
  modifyComponent: `${namespace}_modifyComponent`,
  initState: `${namespace}_initState`,
  getProjectList: `${namespace}_getProjectList`,
  getOfflineCalcDsAndTables: `${namespace}_getOfflineCalcDsAndTables`,
  getDimensionList: `${namespace}_getDimensionList`,
  getMeasureList: `${namespace}_getMeasureList`,
  saveLiveScreen: `${namespace}_saveLiveScreen`,
  getSliceDetail: `${namespace}_getSliceDetail`,
  changeBackgroundImage: `${namespace}_changeBackgroundImage`,
  changeCoverImage: `${namespace}_changeCoverImage`,
  changeRuntimeState: `${namespace}_changeRuntimeState`,
  changeCoverMode: `${namespace}_changeCoverMode`,
  destroyState: `${namespace}_destroyState`,
  changeComponentDataConfig: `${namespace}_changeComponentDataConfig`,
  changeExamineStatus: `${namespace}_changeExamineStatus`
}


const showLoading = (dispatch) => dispatch({ type: ActionTypes.setLoading, loading: true })
const hideLoading = (dispatch) => dispatch({ type: ActionTypes.setLoading, loading: false })

/**
 * 改变缩放比例的action
 *
 * @export
 * @param {any} scale
 * @returns
 */
export function doChangeScale(scale){
  const { changeScale, reCalcCenterSize } = ActionTypes
  return dispatch => {
    dispatch({
      type: changeScale,
      scale
    })
    // 然后触发重新计算中间区域
    dispatch({
      type: reCalcCenterSize
    })
  }
}

/**
 * 改变左侧面板占用宽度的action
 *
 * @export
 * @param {any} width
 * @returns
 */
export function doChangeLeftWidth(width){
  const { changeLeftWidth, reCalcCenterSize } = ActionTypes
  return dispatch => {
    // 改变左侧宽度
    dispatch({
      type: changeLeftWidth,
      width
    })
    // 然后触发重新计算中间区域
    dispatch({
      type: reCalcCenterSize
    })
  }
}

/**
 * 改变右侧面板占用宽度的action
 * 
 * @export
 * @param {any} width 
 * @returns 
 */
export function doChangeRightWidth(width){
  const { changeRightWidth, reCalcCenterSize } = ActionTypes
  return dispatch => {
    // 改变右侧宽度
    dispatch({
      type: changeRightWidth,
      width
    })
    // 然后触发重新计算中间区域
    dispatch({
      type: reCalcCenterSize
    })
  }
}


/**
 * 同步浏览器内容区尺寸
 * 
 * @export
 * @param {number} clientHeight
 * @param {number} clientWidth
 * @returns 
 */
export function doSyncClientSize(clientHeight, clientWidth){
  const { syncClientSize, reCalcCenterSize } = ActionTypes
  return dispatch => {
    dispatch({
      type: syncClientSize,
      clientHeight,
      clientWidth
    })
    // 然后触发重新计算中间区域
    dispatch({
      type: reCalcCenterSize
    })
  }
}


/**
 * 修改大屏背景图
 *
 * @export
 * @param {any} backgroundImageId
 */
export function doChangeBackgroundImage(backgroundImageId){
  const { changeBackgroundImage } = ActionTypes
  return dispatch => dispatch({
    type: changeBackgroundImage,
    backgroundImageId
  })
}

/**
 * 修改封面图
 * 
 * @export
 * @param {any} coverImageId
 * @returns 
 */
export function doChangeCoverImage(coverImageId){
  const { changeCoverImage } = ActionTypes
  return dispatch => dispatch({
    type: changeCoverImage,
    coverImageId
  })
}

/**
 * 修改大屏风格
 * @param nextRuntimeState
 * @returns {function(...[*]=)}
 */
export function doChangeRuntimeState(nextRuntimeState) {
  return dispatch => {
    dispatch({
      type: ActionTypes.changeRuntimeState,
      runtimeState: nextRuntimeState
    })
  }
}

/**
 * 修改封面图获取方式
 * 
 * @export
 * @param {any} coverMode
 * @returns 
 */
export function doChangeCoverMode(coverMode){
  const { changeCoverMode } = ActionTypes
  return dispatch => dispatch({
    type: changeCoverMode,
    coverMode
  })
}

/**
 * 重新计算中间区域的size
 * 
 * @export
 * @returns
 */
export function doReCalcCenterSize(){
  const { reCalcCenterSize } = ActionTypes
  return dispatch => dispatch({
    type: reCalcCenterSize
  })
}

/**
 * 改变最终展示的屏幕宽度
 *
 * @export
 * @param {number} screenWidth
 * @returns
 */
export function doChangeScreenWidth(screenWidth){
  const { changeScreenWidth, reCalcCenterSize } = ActionTypes
  return dispatch => {
    dispatch({
      type: changeScreenWidth,
      screenWidth
    })
    // 然后触发重新计算中间区域
    dispatch({
      type: reCalcCenterSize
    })
  }
}

/**
 * 改变最终展示的屏幕高度
 *
 * @export
 * @param {number} screenHeight
 * @returns 
 */
export function doChangeScreenHeight(screenHeight){
  const { changeScreenHeight, reCalcCenterSize } = ActionTypes
  return dispatch => {
    dispatch({
      type: changeScreenHeight,
      screenHeight
    })
    // 然后触发重新计算中间区域
    dispatch({
      type: reCalcCenterSize
    })
  }
}

/**
 *增加一个组件到工作台
 *
 * @export
 * @param {string} componentType
 * @param {string} typeName
 */
export function doAddComponent(componentType, typeName){
  const { addComponent } = ActionTypes
  return dispatch => dispatch({
    type: addComponent,
    componentType,
    typeName
  })
}

/**
 * 复制一个组件到工作台
 * 
 * @export
 * @param {any} id 
 * @returns 
 */
export function doCopyComponent(id){
  const { copyComponent } = ActionTypes
  return dispatch => dispatch({
    type: copyComponent,
    id
  })
}

/**
 * 移除一个组件，通过id来找到
 * 
 * @export
 * @param {number} id
 * @returns 
 */
export function doRemoveComponent(id){
  const { removeComponent } = ActionTypes
  return dispatch => dispatch({
    type: removeComponent,
    id
  })
}

/**
 *激活一个组件, 如果传入null就取消已激活组件。
 *！每次只能激活一个组件
 *
 * @export
 * @param {string} id
 * @returns
 */
export function doActiveComponent(id){
  const { activeComponent } = ActionTypes
  return dispatch => dispatch({
    type: activeComponent,
    id
  })
}


/**
 * 高亮显示组件列表hover的组件
 *！每次只能激活一个组件
 *
 * @export
 * @param {string} hoverId
 * @returns
 */
export function doHoverComponent(hoverId){
  const { hoverComponent } = ActionTypes
  return dispatch => dispatch({
    type: hoverComponent,
    hoverId
  })
}

/**
 * 修改组件属性，这里没有拆开多个函数为了开发时间
 * (json拆开成多个有名字的属性，通过专用方法修改能增加代码可读性)
 *
 * @export
 * @param {object} keyValues
 * @returns
 */
export function doModifyComponent(keyValues){
  const { modifyComponent } = ActionTypes
  return dispatch => dispatch({
    type: modifyComponent,
    keyValues
  })
}

/**
 * 初始化工作台
 *
 * @export
 * @param {any} id 实时大屏id
 * @param title
 */
export function init(id, title = null) {
  const { syncClientSize, reCalcCenterSize, initState } = ActionTypes
  return async dispatch => {
    showLoading(dispatch)
    let { result } = await Fetch.get(remoteUrl.GET_LIVESCREENS, _.pickBy({ id, title }, _.identity))
    if (result) {
      // 初始化话为初始属性
      if (title) {
        browserHistory.replace(`/console/livescreen/${result.id}`)
      }
      dispatch({
        type: initState,
        livescreen: result
      })
    }
    // 这里重新计算一下可视区域尺寸，防止anime动画导致计算错误
    dispatch({
      type: syncClientSize,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight
    })
    // 初始化中间区尺寸
    dispatch({
      type: reCalcCenterSize
    })
    hideLoading(dispatch)
    /*setTimeout(() => {
    }, 100)*/
  }
}

// 销毁当前工作台
export function destroy(){
  const { destroyState } = ActionTypes
  return async dispatch => dispatch({ type: destroyState })
}

export function doSaveLiveScreen(livescreen, forAddComps, forUpdateComps, forDeleteComps, cb) {
  const { saveLiveScreen } = ActionTypes
  return async dispatch => {
    showLoading(dispatch)
    let { result } = await Fetch.post(remoteUrl.UPDATE_LIVESCREEN, { livescreen, forAddComps, forUpdateComps, forDeleteComps })
    hideLoading(dispatch)
    dispatch({
      type: saveLiveScreen,
      result
    })
    if(typeof cb === 'function') cb()
  }
}

export function submitExamine(id, isTemplate, cb) {
  const { changeExamineStatus } = ActionTypes
  return async dispatch => {
    showLoading(dispatch)
    let res = await create(isTemplate ? EXAMINE_TYPE.liveScreenTemplate :  EXAMINE_TYPE.liveScreen, id)
    hideLoading(dispatch)
    if (res && res.success) {
      cb && cb(true)
      dispatch({
        type: changeExamineStatus,
        examineStatus: 1
      })
    } else {
      cb && cb(false, res.message)
    }
  }
}

export function getProjectList(){
  const { getProjectList } = ActionTypes
  
  return async (dispatch = window.store.dispatch, getState = window.store.getState) => {
    let curr = _.get(getState(), 'livescreen_workbench.projectList')
    if (!_.isEmpty(curr)) {
      return
    }
    let projectList = await Fetch.get('/app/project/list')
    dispatch({
      type: getProjectList,
      projectList: projectList.result.model
    })
  }
}

export function getOfflineCalcDsAndTables() {
  return async dispatch => {
    let offlineCalcDs = await Fetch.get('/app/offline-calc/data-sources', {
      type: {$between: [OfflineCalcDataSourceTypeEnum.MySQL, OfflineCalcDataSourceTypeEnum.PostgreSQL]}, // 不支持查询 tindex, hive
      attributes: ['id', 'name', 'type', 'created_by']
    })
    let offlineCalcTables = await Fetch.get('/app/offline-calc/tables', {
      data_source_id: {$ne: null}, // 不支持手动上传的数据
      attributes: ['id', 'title', 'data_source_id', 'name', 'created_by']
    })
    dispatch({
      type: ActionTypes.getOfflineCalcDsAndTables,
      offlineCalcDataSources: _.get(offlineCalcDs, 'result', []),
      offlineCalcTables: _.get(offlineCalcTables, 'result', [])
    })
  }
}

export function getDimensionList({dataSourceId, offlineCalcTableId}) {
  const { getDimensionList } = ActionTypes
  return async dispatch => {
    let dimensionList = dataSourceId
      ? _.get(await Fetch.get(`/app/dimension/get/${dataSourceId}`), 'data', [])
      : _(await Fetch.get('/app/offline-calc/tables', {id: offlineCalcTableId})).chain()
        .get('result[0].params.fieldInfos', [])
        .map(fi => {
          let {field, type} = fi
          return {
            name: field,
            type: guessDruidTypeByDbDataType(type),
            role_ids: roleIds,
            _dimDeps: [{tableId: offlineCalcTableId, fieldName: field}]
          }
        })
        .value()
    dispatch({
      type: getDimensionList,
      dimensionList
    })
  }
}

export function getMeasureList({dataSourceId, offlineCalcTableId}) {
  const { getMeasureList } = ActionTypes

  return async dispatch => {
    let measureList = dataSourceId
      ? _.get(await Fetch.get(`/app/measure/get/${dataSourceId}`), 'data', [])
      : [{
        name: 'total',
        title: '总记录数',
        formula: '$main.count()',
        role_ids: roleIds,
        type: 1,
        params:{}
      }]
    dispatch({
      type: getMeasureList,
      measureList
    })
  }
}

export function getSliceDetail(sliceId){
  const { getSliceDetail } = ActionTypes

  return async dispatch => {
    let sliceDetail = await Fetch.get(`/app/slices/get/slices/${sliceId}`)
    dispatch({
      type: getSliceDetail,
      sliceDetail: sliceDetail
    })
  }
}

export function doChangeComponentDataConfig(dataConfig){
  const { changeComponentDataConfig } = ActionTypes
  return dispatch => {
    dispatch({
      type: changeComponentDataConfig,
      dataConfig
    })
  }
}

export function doSaveLiveScreenTemplate(livescreen, forAddComps, forUpdateComps, forDeleteComps, cb) {
  return async dispatch => {
    let { result } = await Fetch.post(remoteUrl.SAVE_LIVESCREENTEMPLATE, { livescreen, forAddComps, forUpdateComps, forDeleteComps })
    if(typeof cb === 'function') cb(result)
  }
}
