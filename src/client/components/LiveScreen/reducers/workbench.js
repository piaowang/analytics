import Component from '../models/component'
import _ from 'lodash'
import deepCopy from '../../../../common/deep-copy'
import { immutateUpdate } from '../../../../common/sugo-utils'
// import * as Immutable from 'immutable'
import {generate} from 'shortid'
import { ChartFieldsAndDefaultData } from '../constants'

const namespace = 'livescreen_workbench'

const livescreenState = {
  loading: false,                     // 整体是否加载中
  screenId: null,                     // 大屏id
  title: null,                        // 大屏名称
  screenWidth: window.screen.width,   // 屏幕宽度
  screenHeight: window.screen.height, // 屏幕高度
  backgroundImageId: null,            // 背景图id
  coverImageId: null,                 // 封面图id
  coverMode: 1,            // 背景图的获取方式，2是手动上传，1是跟随大屏实时截取微缩图
  leftWidth: 185,   // 左侧占用宽度
  rightWidth: 300,  // 右侧占用宽度
  scale: 10,        // 默认缩放值是10，后续缩放都以此为基准计算
  ratio: window.screen.width / window.screen.height,   // 默认屏幕比例
  clientWidth: document.documentElement.clientWidth,   // 当前浏览器可视区域宽度
  clientHeight: document.documentElement.clientHeight, // 当前浏览器可视区域高度
  centerWidth: 1405,          // 中间容器的宽度
  centerHeight: 862,          // 中间容器的高度
  previewContainerPaddingLeft: 48,     // 预览容器默认左侧padding值
  previewContainerPaddingTop: 71,      // 预览容器默认顶部padding值
  previewContainerWidth: 1280,         // 预览容器减去2倍padding宽度
  previewContainerHeight: 720,         // 预览容器依照width和ratio计算出
  previewTransformScale: 1,            // 预览区域的缩放比(previewContainerWidth / screenWidth)
  screenComponents: [],                // 放入的所有组件集合 @{./models/component}
  originScreenComponents: [],       //  保存未修改的原始组件数组
  activedId: '',                     // 当前选中的组件序号
  forAddComps: [],                     // 增加的组件
  forUpdateComps: [],                  // 更新的组件
  forDeleteComps: [],                  // 删除的组件
  projectList: [],                     // 项目列表
  offlineCalcDataSources: [],          // 外部数据源
  offlineCalcTables: [],               // 外部数据源的维表
  dimensionList: [],                   // 维度列表
  measureList: [],                      // 指标列表
  hoverId: '',
  componentDataConfig: {},              //所有非静态数据图标的数据（用于模板和快照）
  isTemplate: false,
  runtimeState: {},                      // 运行时状态，主要用于记录当前大屏风格颜色值，还有数据筛选联动控制组件状态
  examineStatus: 0,                     // 审核状态
  authorizationType: 0,                 // 授权类型
  uploadStyle: 1 // 视频上传方式：1 路径， 2 手动
}

// 全局唯一的组件序号，同时作为层级z-index。只增不减
// let uniqIndex = 1

// 数据库对象转为本地对象
const componentMap = {
  id: 'id',
  viz_type: 'type',
  style_config: 'style_config',
  data_source_config: 'params',
  width: 'width',
  height: 'height',
  left: 'left',
  top: 'top',
  z_index: 'zIndex',
  offset: 'offset'
}

const vizTypeSizeProfile = {
  'line_text': [400, 100],
  'number': [400, 110]
}

const reducers = {

  set_loading: (state, { loading }) => {
    return {
      ...state,
      loading
    }
  },

  /**
   * 修改缩放比例数值
   *
   * @param {any} state
   * @param {any} { scale }
   * @returns
   */
  changeScale(state, { scale }){
    if (scale < 0) {
      scale = 0
    }
    if (scale > 100) {
      scale = 100
    }

    return {
      ...state,
      scale
    }
  },
  /**
   * 修改左侧面板占用宽度
   *
   * @param {any} state
   * @param {any} { width }
   * @returns
   */
  changeLeftWidth(state, { width }){
    return {
      ...state,
      leftWidth: width
    }
  },
  /**
   * 修改右侧面板占用宽度
   *
   * @param {any} state
   * @param {any} { width }
   * @returns
   */
  changeRightWidth(state, { width }){
    return {
      ...state,
      rightWidth: width
    }
  },
  /**
   * 同步浏览器内容区的尺寸
   *
   * @param {any} state
   * @param {any} { clientHeight, clientWidth }
   * @returns
   */
  syncClientSize(state, { clientHeight, clientWidth }){
    return {
      ...state,
      clientHeight,
      clientWidth
    }
  },

  /**
   * 修改背景图ID
   *
   * @param {any} state
   * @param {any} { backgroundImageId }
   * @returns
   */
  changeBackgroundImage(state, { backgroundImageId }){
    return {
      ...state,
      backgroundImageId
    }
  },

  /**
   * 修改封面图ID
   *
   * @param {any} state
   * @param {any} { coverImageId }
   * @returns
   */
  changeCoverImage(state, { coverImageId }){
    return {
      ...state,
      coverImageId
    }
  },
  
  /**
   * 修改大屏运行时状态
   * @param state
   * @param runtimeState
   * @returns {{runtimeState: *}}
   */
  changeRuntimeState(state, {runtimeState}) {
    return {...state, runtimeState}
  },

  /**
   * 修改封面图获取方式
   *
   * @param {any} state
   * @param {any} { coverImageId }
   * @returns
   */
  changeCoverMode(state, { coverMode }){
    return {
      ...state,
      coverMode
    }
  },

  /**
   * 当左右侧面板收起展开、浏览器缩放时
   * 统一计算中间面板的尺寸, 规则如下：
   * <先算出中间空白区域的宽高，再算预览区的宽度，根据ratio算出预览区高度>
   * 中间区域的宽度 centerWidth = clientWidth - leftWidth - rightWidth
   * 中间区域的高度 centerHeight = clientHeight - 100 {这里的100是头部区域的总高度}
   * 预览区域的宽度 = centerWidth - 2*previewContainerPaddingLeft
   * @param {any} state
   */
  reCalcCenterSize(state){
    const {
      leftWidth,
      rightWidth,
      scale,
      ratio,
      clientWidth,
      clientHeight,
      screenWidth
    } = state
    let { previewContainerWidth, previewContainerHeight, previewContainerPaddingLeft, previewContainerPaddingTop } = state
    const centerWidth = clientWidth - leftWidth - (rightWidth ? (rightWidth + 29) : 0) 
    const centerHeight = clientHeight - 100
    const centerRatio = centerWidth / centerHeight

    /**
     * 计算预览区域的尺寸
     */
    if (centerRatio <= ratio) {
      // 如果中间区域宽高比小于目标宽高比，就先算宽度
      // 预览区域宽度 = 中间宽度 - 2倍的paddingLeft
      previewContainerPaddingLeft = 48
      previewContainerWidth = centerWidth - 2 * previewContainerPaddingLeft
      previewContainerHeight = previewContainerWidth / ratio
      // previewContainerPaddingTop = (centerHeight - previewContainerHeight) / 2
    } else {
      // 否则先算高度
      previewContainerPaddingTop = 27
      previewContainerHeight = centerHeight - 2 * previewContainerPaddingTop
      previewContainerWidth = previewContainerHeight * ratio
      // previewContainerPaddingLeft = (centerWidth - previewContainerWidth) / 2
    }

    // 计算缩放后的预览区域的缩放值
    const scaleCoefficient = scale === 0 ? 0.5 : scale / 10
    // 预览容器尺寸直接乘以缩放比例
    previewContainerWidth *= scaleCoefficient
    previewContainerHeight *= scaleCoefficient
    // 考虑预览容器超出中间区域时 (这里以横向为主，纵向超出不理会)
    if ((previewContainerWidth + 96) > centerWidth) {
      previewContainerPaddingTop = previewContainerPaddingLeft = 50
    } else {
      // 不超出时的计算方式
      previewContainerPaddingTop = (centerHeight - previewContainerHeight) / 2
      previewContainerPaddingLeft = (centerWidth - previewContainerWidth) / 2
    }

    // 预览区域的缩放比例 transform scale
    const previewTransformScale = previewContainerWidth / screenWidth

    return {
      ...state,
      centerWidth,
      centerHeight,
      previewContainerWidth,
      previewContainerHeight,
      previewContainerPaddingLeft,
      previewContainerPaddingTop,
      previewTransformScale
    }

  },

  changeScreenWidth(state, { screenWidth }){
    const ratio = screenWidth / state.screenHeight
    return {
      ...state,
      ratio,
      screenWidth
    }
  },

  changeScreenHeight(state, { screenHeight }){
    const ratio = state.screenWidth / screenHeight
    return {
      ...state,
      ratio,
      screenHeight
    }
  },

  addComponent(state, { componentType, typeName }){
    const { screenWidth, screenHeight, screenComponents, forAddComps } = state
    const [width, height] = vizTypeSizeProfile[componentType] || [500, 300]
    const maxIndex = _.max(_.map(screenComponents, 'zIndex')) || 1
    const { fields = [], csv: accessData = '' } = ChartFieldsAndDefaultData[componentType] || {}
    const dimensions = fields.filter(p => p.indexOf('x') === 0)
    const metrics = fields.filter(p => p.indexOf('y') === 0)
    let params = {
      metrics,
      dimensions,
      accessDataType: 'csv',
      accessData,
      translationDict: {},
      autoReloadInterval: 0,
      dataPath: ''
    }
    const component = new Component({
      id: generate(),
      type: componentType,
      typeName,
      width,
      height,
      left: (screenWidth - 400) / 2,
      top: (screenHeight - 200) / 2,
      zIndex: maxIndex + 1,
      params,
      isAdd: true
    })
    if (_.findIndex(forAddComps, c => c.zIndex === component.zIndex) === -1) {
      forAddComps.push(component)
    } else {
      console.warn(component.zIndex, '重复了!有bug需要fix')
    }
    return {
      ...state,
      screenComponents: _.concat(screenComponents, component),
      activedId: component.id
    }
  },

  copyComponent(state, { id }){
    const { screenComponents, forAddComps } = state
    const component = _.find(screenComponents, component => component.id === id)
    if (component) {
      // 复制组件，去掉id、改变index、偏移20 * 20位置
      const targetComponent = _.omit(component, 'id')
      const maxIndex = _.max(_.map(screenComponents, 'zIndex'))
      Object.assign(targetComponent, {
        left: component.left + 20,
        top: component.top + 20,
        zIndex: maxIndex + 1,
        id: generate()
      })
      forAddComps.push(targetComponent)
      return {
        ...state,
        screenComponents: _.concat(screenComponents, targetComponent),
        activedId: targetComponent.id
      }
    }
    return state
  },

  removeComponent(state, { id }){
    const { screenComponents, forAddComps, forUpdateComps, forDeleteComps } = state
    const component = _.find(screenComponents, component => component.id === id)
    let afterRemoved = _.cloneDeep(screenComponents)
    if (component) {
      const ai = _.findIndex(forAddComps, c => c.id === component.id)
      if (ai > -1) {
        forAddComps.splice(ai, 1)
      }
      if (component.id) {
        const ui = _.findIndex(forUpdateComps, c => c.id === component.id)
        if (ui > -1) {
          forUpdateComps.splice(ui, 1)
        }
        forDeleteComps.push(component)
      }
      afterRemoved = _.filter(afterRemoved, component => component.id !== id)
      afterRemoved = afterRemoved.map(p => {
        if (p.zIndex > component.zIndex) {
          return { ...p, zIndex: p.zIndex - 1 }
        }
        return p
      })
    }

    
    return {
      ...state,
      screenComponents: afterRemoved,
      activedId: ''
    }
  },

  activeComponent(state, { id }){
    return {
      ...state,
      activedId: id
    }
  },

  
  hoverComponent(state, { hoverId }){
    return {
      ...state,
      hoverId
    }
  },

  /**
   * 修改组件属性，keyValues
   * 如果不传递zIndex就改当前的
   *
   * @param {any} state
   * @param {any} { keyValues }
   */
  modifyComponent(state, { keyValues }) {
    const { id, offset, componentName } = keyValues
    let { screenComponents, forAddComps, forUpdateComps } = state
    if (id && offset) {
      const col = _.find(screenComponents, c => c.id === id)
      const isUp = col.zIndex > offset
      const newScreenComponents = screenComponents.map(p => {
        let item = {}
        if (p.zIndex === col.zIndex) {
          item = { ...p, zIndex: offset, offset: 0 }
        } else if (isUp && p.zIndex >= offset && p.zIndex < col.zIndex) {
          item = { ...p, zIndex: p.zIndex + 1 }
        } else if (!isUp && p.zIndex > col.zIndex && p.zIndex <= offset) {
          item = { ...p, zIndex: p.zIndex - 1 }
        }
        if (_.isEmpty(item)) {
          return p
        }
        if (p.isAdd) {
          const ai = _.findIndex(forAddComps, c => c.id === item.id)
          ai > -1 ? forAddComps.splice(ai, 1, item) : forAddComps.push(item)
        } else {
          const ui = _.findIndex(forUpdateComps, c => c.id === item.id)
          ui > -1 ? forUpdateComps.splice(ui, 1, item) : forUpdateComps.push(item)
        }
        return item
      })
      return {
        ...state,
        screenComponents: newScreenComponents
      }
    }
    if (id && componentName) {
      const col = _.find(screenComponents, c => c.id === id)
      const newScreenComponents = screenComponents.map(p => {
        let item = {}
        if (p.id === col.id && p.style_config.componentName !== componentName) {
          item = { ...p, style_config: {...p.style_config, componentName} }
        } 
        if (_.isEmpty(item)) {
          return p
        }
        if (p.isAdd) {
          const ai = _.findIndex(forAddComps, c => c.id === item.id)
          ai > -1 ? forAddComps.splice(ai, 1, item) : forAddComps.push(item)
        } else {
          const ui = _.findIndex(forUpdateComps, c => c.id === item.id)
          ui > -1 ? forUpdateComps.splice(ui, 1, item) : forUpdateComps.push(item)
        }
        return item
      })
      return {
        ...state,
        screenComponents: newScreenComponents
      }
    }
    const index = _.findIndex(screenComponents, c => c.id === id)

    if (index > -1) {
      screenComponents = immutateUpdate(screenComponents, index, component => {
        component = deepCopy(component)
        Object.assign(component, _.omit(keyValues, 'id'))
        // console.log(`修改中: ${id}, ${component.top},${component.left}`)
        if (component.isAdd) {
          // 未保存的组件放到添加区，重复就覆盖
          const ai = _.findIndex(forAddComps, c => c.id === component.id)
          ai > -1 ? forAddComps.splice(ai, 1, component) : forAddComps.push(component)
        } else {
          // 已保存的组件就放到更新区, 重复就覆盖
          const ui = _.findIndex(forUpdateComps, c => c.id === component.id)
          ui > -1 ? forUpdateComps.splice(ui, 1, component) : forUpdateComps.push(component)
        }
        return component
      })
      return {
        ...state,
        screenComponents
      }
    } else {
      console.warn(`${namespace}_modifyComponent, 修改控件失败`)
      return state
    }
  },

  saveLiveScreen(state, { result = {} }) {
    const { screenComponents } = state
    const { added = [] } = result
    let addedIdDict = _.keyBy(added, c => c.z_index)
    // 保存完毕后清空待存区域
    const nextComponents = _.map(screenComponents, sc => {
      return sc.zIndex in addedIdDict
        ? {
          ..._.omit(sc, 'isAdd'),
          id: addedIdDict[sc.zIndex].id
        } : sc
    })
    return Object.assign({}, state, {
      screenComponents: nextComponents,
      originScreenComponents: nextComponents,
      forAddComps: [],
      forDeleteComps: [],
      forUpdateComps: []
    })
  },

  initState(state, { livescreen }){
    // 加载所有组件
    const { 
      id, title, screen_width, screen_height, background_image_id, cover_image_id, 
      components = [], is_template, created_by, examine, authorize_to, cover_mode,
      examineStatus, authorizationType
     } = livescreen
    // uniqIndex = _.max(_.map(components, 'z_index')) || 1 // 因为容器占用了index = 1
  
    const screenComponents = components.map(component => {
      return _(component)
        .pick(_.keys(componentMap))
        .mapKeys((v, k) => componentMap[k])
        .value()
    })
  
    return Object.assign({}, livescreenState, _.pickBy({
      screenId: id,
      title,
      examine,
      authorizeTo: authorize_to,
      cover_mode,
      created_by,
      isTemplate: is_template,
      screenWidth: screen_width,
      screenHeight: screen_height,
      backgroundImageId: background_image_id,
      coverImageId: cover_image_id,
      screenComponents,
      originScreenComponents: screenComponents,
      forAddComps: [],
      forUpdateComps: [],
      forDeleteComps: [],
      authorizationType,
      examineStatus
    }, _.identity))
  },

  destroyState(){
    return livescreenState
  },

  getProjectList(state, { projectList }) {
    return {
      ...state,
      projectList
    }
  },
  
  getOfflineCalcDsAndTables(state, { offlineCalcDataSources, offlineCalcTables }) {
    return {
      ...state,
      offlineCalcDataSources,
      offlineCalcTables
    }
  },

  getDimensionList(state, { dimensionList }) {
    return {
      ...state,
      dimensionList
    }
  },

  getMeasureList(state, { measureList }) {
    return {
      ...state,
      measureList
    }
  },

  getSliceDetail(state, { sliceDetail }) {
    return {
      ...state,
      sliceDetail
    }
  },
  changeComponentDataConfig(state, { dataConfig }) {
    let componentDataConfig = _.get(state, 'componentDataConfig', {})
    componentDataConfig = _.cloneDeep(componentDataConfig)
    _.set(componentDataConfig, dataConfig.id, _.omit(dataConfig, ['id']))
    return {
      ...state,
      componentDataConfig
    }
  },
  changeExamineStatus(state, { examineStatus }) {
    return {
      ...state,
      examineStatus
    }
  }

}

export default (state = _.clone(livescreenState), action) => {
  const { type, ...rest } = action
  if (!_.includes(type, namespace)) {
    return state
  }
  const shortType = type.replace(`${namespace}_`, '')
  const reduceFn = reducers[shortType]
  if (typeof reduceFn === 'function') {
    return reduceFn(state, rest)
  } else {
    if (type.substr(0, namespace.length) === namespace) {
      console.warn(`不存在对应的reducer: ${type}`)
    }
  }
  return state
}
