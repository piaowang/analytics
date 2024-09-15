import React from 'react'
import echarts from 'echarts'
import {
  DownloadOutlined,
  FilePdfOutlined,
  QrcodeOutlined,
  MenuFoldOutlined,
  ExpandOutlined,
  DeleteOutlined,
  DesktopOutlined,
  FileExcelOutlined,
  StarFilled,
  StarOutlined,
  ShareAltOutlined,
  EyeOutlined,
  SettingOutlined,
  FilterOutlined,
  DiffOutlined,
  EditOutlined,
  BookOutlined
} from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Checkbox, Input, message, Modal, Popconfirm, Popover, Select, Spin, Tooltip, Tabs, Dropdown, Menu } from 'antd'
import _ from 'lodash'
import { browserHistory, Link } from 'react-router'
import { Auth } from '../../common/permission-control'
import * as actions from '../../actions'
import ReactGridLayout from 'react-grid-layout'
import SliceChartFacade from '../Slice/slice-chart-facade'
import SliceCard from '../Slices/slice-thumb'
import DashboardList from './dashboard-list'
import DashboardSliceList from './slice-list'
import buildTree from '../../common/build-tree'
import { checkPermission } from '../../common/permission-control'
import { withCommonFilter } from '../Common/common-filter'
import smartSearch from '../../../common/smart-search'
import DashboardShare from './dashboard-share'
import withAutoFocus from '../Common/auto-focus'
import dragula from 'sugo-dragula'
import cls from '../../common/class'
import { listPath } from './dashboard-common'
import { diff } from '../../common/diff'
import moment from 'moment'
import { hasSubscribeLink } from '../Home/menu-data'
import Icon from '../Common/sugo-icon'
import { withDebouncedOnChange } from '../Common/with-debounce-on-change'
import { delayPromised, immutateUpdate, immutateUpdates, isDiffByPath, mapAwaitAll, decompressUrlQuery } from '../../../common/sugo-utils'
import setStatePromise from '../../common/set-state-promise'
import PubSub from 'pubsub-js'
import { getOpenSliceUrl } from '../Slice/slice-helper'
import { DefaultDruidQueryCacheOptsForDashboard } from '../../common/fetch-utils'
import PublishSettingsModal from '../Publish/publish-settings-modal'
import { SharingTypeEnum, AUTHORIZATION_PERMISSIONS_TYPE } from '../../../common/constants'
import QrCode from '../Common/qr-code'
import { analyticVizTypeChartComponentMap, vizTypeChartComponentMap } from '../../constants/viz-component-map'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'
import CommonDruidFilterPanelForSlice from '../Common/common-druid-filter-panel-for-slice'
import CommonDruidFieldPanel from '../Common/common-druid-field-panel'
import CommonDruidFieldPanelForSliceSetting from '../Common/common-druid-field-panel-for-slice-setting'
import classNames from 'classnames'
import { renderPageTitle } from '../Common/bread'
import SizeProvider from '../Common/size-provider'
import { GetCellCount } from '../Charts/CustomHeaderTable/custom-header-modal'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as ls from '../../common/localstorage'
import html2canvas from 'html2canvas'
import jspdf from 'jspdf'
import CryptoJS from 'crypto-js'
import flatMenusType from '../../../common/flatMenus.js'
import filterBtnUrl from '../../images/filter.svg'
import darkTheme from '../../images/night.svg'
import delBtnUrl from '../../images/delete.js'

import './theme/dark-theme.less'
import './theme/light-theme.less'
import './theme/layout.less'
import SugoIcon from '../Common/sugo-icon'

const { TabPane } = Tabs
const FormItem = Form.Item
const Search = Input.Search
const submitProps = ['dashboard_title', 'position_json', 'description', 'params', 'category_id']

const InputWithDebouncedOnChange = withDebouncedOnChange(Input, ev => ev.target.value, 1000)
const InputWithAutoFocus = withAutoFocus(InputWithDebouncedOnChange, null, true)

const canShare = checkPermission('/app/dashboards/share')
const canPublish = checkPermission('post:/app/sharing')
const canEdit = checkPermission('/app/dashboards/update')
const canDelete = checkPermission('/app/dashboards/delete')

/** 根据表头内容文字填充列宽度 */
const fitToColumn = (headers = []) => {
  return headers.map(h => ({ wch: h.length + 10 }))
}

const getMaxCellIndex = cols => {
  const data = _.map(cols, p => _.last(p)).filter(_.identity)
  return (_.maxBy(data, p => _.get(p, 'merge.e.c')) || { merge: { e: { c: -1 } } }).merge.e.c
}

/** 自定义表头转导出转换 */
const getMergeCell = (headers = {}) => {
  const { rowCount } = GetCellCount(headers)
  let col = []
  // let merge = []
  const eachHeader = (column, rIdx = 0) => {
    const children = _.get(column, 'children', [])
    if (children.length) {
      const maxCellIndex = _.last(_.get(col, `${rIdx}`, [{ merge: { e: { c: -1 } } }])).merge.e.c
      const data = _.map(children, p => eachHeader(p, rIdx + 1))
      const mergeCount = _.sum(data)
      col = immutateUpdate(col, rIdx, (prev = []) => {
        _.set(prev, maxCellIndex + 1, { v: column.title, t: 's', merge: { s: { c: maxCellIndex + 1, r: rIdx }, e: { c: maxCellIndex + 1 + mergeCount - 1, r: rIdx } } })
        return prev
      })
      return mergeCount
    } else {
      const maxCellIndex = getMaxCellIndex(col)
      col = immutateUpdate(col, rIdx, (prev = []) => {
        _.set(prev, maxCellIndex + 1, { v: column.title, t: 's', merge: { s: { c: maxCellIndex + 1, r: rIdx }, e: { c: maxCellIndex + 1, r: rowCount - 1 } } })
        return prev
      })
      return 1
    }
  }
  _.forEach(headers, p => eachHeader(p))

  return {
    col: col.map(p => p.map(c => c.v)),
    merge: _.flatten(col.map(p => p.map(c => c.merge))).filter(_.identity)
  }
}

const hasPublishManagerEntryInMenu = window.sugo.enableNewMenu
  ? _.includes(flatMenusType(window.sugo.menus), '/console/publish-manager')
  : _.some(window.sugo.menus, menu => {
      return _.some(menu.children, subMenu => subMenu.path === '/console/publish-manager')
    })

const defaultDashb = datasource_id => {
  let dashboard_title = '新建数据看板' + moment().format('YYYY-MM-DD') + '-' + (Math.random() + '').slice(2, 8)
  return {
    dashboard_title,
    datasource_id,
    position_json: [],
    slices: [],
    sliceTree: {},
    category_id: '',
    params: { allowAddSlicesCrossProjects: true }
  }
}

@connect(
  state => {
    return {
      roles: _.get(state, 'common.roles'),
      institutions: _.get(state, 'common.institutionsList'),
      institutionsTree: _.get(state, 'common.institutionsTree')
    }
  },
  dispatch => bindActionCreators(actions, dispatch)
)
@withCommonFilter
@setStatePromise
export default class DashboardView extends React.Component {
  constructor(props) {
    super(props)
    let filtersStrInUrl = _.get(props, 'location.query.filters')
    let rawFiltersStrInUrl = _.get(props, 'location.query.rawFilters')
    // 需要加密的传 filters，不需要加密的传 rawFilters
    let filtersInUrl = [
      ...((filtersStrInUrl && eval(filtersStrInUrl)) || []).map(flt => ({ ...flt, valueEncrypted: true })),
      ...((rawFiltersStrInUrl && eval(rawFiltersStrInUrl)) || [])
    ]
    this.positionJson = null
    this.state = {
      showModal: false,
      slice: {},
      saveAsvisible: false,
      globalPickervisible: false,
      mode: 'show', //or edit
      keyword: '',
      currentDashboard: defaultDashb(),
      globalFilters: filtersInUrl,
      globalFile: [],
      slicesFilters: {},
      slicesSettings: {},
      visiblePopoverKey: null,
      visiblePopoverKeyForSlice: null,
      visiblePopoverKeyForSliceSetting: null,
      activeKey: '',
      panes: [],
      pileState: false,
      jumpValue: {},
      jumpShow: true,
      sliceData: {},
      showForm: 'slice',
      isValid: false,

      themeGrop: [
        { label: '浅色', value: 'light' },
        { label: '深色', value: 'dark' }
      ],
      targetTheme: 'light',
      localThemeGrop: {},
      sliceBoxSize: 'middle',
      showBtnMenu: false,
      inputValue: '',
      gridLayoutKey: moment().valueOf()
    }

    this.slicesBody = React.createRef()
    this.changeSizeChangeCls = this.changeSizeChangeCls.bind(this)
    this.boxSizeTimeOut = null
  }

  changeTheme = value => {
    // 切换主题时把主题注入缓存
    let { activeKey, localThemeGrop } = this.state
    localThemeGrop[activeKey] = value
    this.setState(() => {
      return {
        ...this.state,
        targetTheme: value,
        localThemeGrop
      }
    })
  }

  handleThemeChange = value => {
    this.setState(() => {
      return {
        ...this.state,
        targetTheme: value
      }
    })
  }

  changeSizeChangeCls() {
    let width = _.get(this.slicesBody, 'current.clientWidth')
    if (this.boxSizeTimeOut) clearTimeout(this.boxSizeTimeOut)

    this.boxSizeTimeOut = setTimeout(() => {
      this.setState(() => {
        return {
          ...this.state,
          sliceBoxSize: width >= 1450 ? 'middle' : 'small'
        }
      })
    }, 300)
  }

  componentDidMount() {
    this.initDnd()
    this.props.getRoles()
    this.props.getInstitutions()

    let { location } = this.props

    window.addEventListener('resize', () => {
      this.setState({
        visiblePopoverKeyForSlice: '',
        visiblePopoverKeyForSliceSetting: '',
        visiblePopoverKey: ''
      })
      this.changeSizeChangeCls()
    })

    if (location.query.theme) {
      this.setState(() => {
        return {
          ...this.state,
          targetTheme: location.query.theme
        }
      })
    }
  }

  componentWillReceiveProps(nextProps) {
    let { currentDashboard = {} } = nextProps
    if (nextProps.selectDashboard && currentDashboard.id && nextProps.selectDashboard !== currentDashboard.id) {
      this.setState({ globalFilters: [] })
    }
    let jumpValue = window.location.search.split('value=')
    jumpValue = jumpValue.length === 2 ? JSON.parse(decompressUrlQuery(jumpValue[1])) : {}
    if (!_.isEqual(jumpValue, this.state.jumpValue)) {
      this.setState({
        jumpValue,
        jumpShow: _.isEmpty(jumpValue) ? false : true
      })
      if (_.isEmpty(jumpValue)) {
        this.setState({
          globalFilters: []
        })
      }
    }
    if (_.isEmpty(jumpValue)) {
      this.setState({
        jumpShow: false
      })
    }
    let nid = nextProps.datasourceCurrent.id
    let {
      dashboards,
      location: { pathname }
    } = nextProps
    let isNewPage = /\/new$/.test(pathname)
    if (nid !== this.props.datasourceCurrent.id && isNewPage) {
      let currentDashboard = _.cloneDeep(this.state.currentDashboard)
      currentDashboard.sliceTree = {}
      currentDashboard.position_json = []
      currentDashboard.slices = []
      currentDashboard.datasource_id = nid
      this.setState({
        currentDashboard,
        globalFile: (currentDashboard && currentDashboard.params && currentDashboard.params.globalFile) || []
      })
    }
    let prevId = this.props.params.dashboardId
    let nowId = nextProps.params.dashboardId
    let stateId = _.get(this.state.currentDashboard, 'id')
    if (nowId && stateId !== nowId && dashboards.length) {
      let currentDashboard = _.find(dashboards, { id: nowId })
      currentDashboard = _.cloneDeep(currentDashboard)
      if (currentDashboard) {
        let { panes, activeKey } = this.state
        if (_.isEmpty(panes)) {
          panes = [{ title: currentDashboard.dashboard_title, id: nowId }]
          activeKey = panes[0].id
        } else {
          let index = _.findIndex(panes, { id: nowId })
          if (index < 0) {
            panes.push({ title: currentDashboard.dashboard_title, id: nowId })
            activeKey = nowId
          } else {
            activeKey = panes[index].id
          }
        }
        // 切换时判断有没有本地缓存,有就用本地缓存中的主题.没有则用location的,并存如缓存中
        let localThemeGrop = this.state.localThemeGrop
        let targetTheme
        if (localThemeGrop[currentDashboard.id]) {
          targetTheme = localThemeGrop[currentDashboard.id]
        } else {
          localThemeGrop[currentDashboard.id] = currentDashboard.params.theme || 'light'
          targetTheme = currentDashboard.params.theme || 'light'
        }
        this.setState({
          currentDashboard,
          targetTheme,
          globalFile: (currentDashboard && currentDashboard.params && currentDashboard.params.globalFile) || [],
          localThemeGrop,
          panes,
          activeKey
        })
      }
    }

    if (isNewPage && prevId) {
      let currentDashboard = defaultDashb(nid)
      this.setState({
        currentDashboard,
        globalFile: (currentDashboard && currentDashboard.params && currentDashboard.params.globalFile) || [],
        mode: 'edit'
      })
    }
    if (isDiffByPath(this.props, nextProps, 'datasourceCurrent') && this.state.mode === 'edit') {
      this.quitEdit()
    }

    const newCurrentDashboard = _.cloneDeep(this.state.currentDashboard) || {}
    const { params = {} } = newCurrentDashboard
    if (params.istemplate) {
      this.setState({
        currentDashboard: newCurrentDashboard
      })
    }
    if (params.globalFile) {
      this.setState({
        globalFile: params.globalFile
      })
    }
  }

  componentDidUpdate(props, prevProps) {
    const { currentDashboard = {} } = prevProps
    if (props.selectDashboard && currentDashboard.id && props.selectDashboard !== currentDashboard.id) {
      // this.setState({globalFilters: []})
    }
    let prevId = this.props.params.dashboardId
    let { currentDashboard: { id: stateId, slices, dashboard_title } = {}, mode } = this.state
    let { dashboards } = this.props
    if ((stateId && _.isEmpty(slices) && mode === 'show') || (!stateId && prevId)) {
      let currentDashboard = _.find(dashboards, { id: prevId })
      currentDashboard = _.cloneDeep(currentDashboard)
      if (!_.isEqual(currentDashboard, this.state.currentDashboard)) {
        this.setState({
          currentDashboard,
          globalFile: (currentDashboard && currentDashboard.params && currentDashboard.params.globalFile) || []
        })
      }
    }
    this.initDnd()

    // 查看分享时改变 top 窗口标题
    let hideDashboardList = _.get(this.props, 'location.query.hideDashboardList', '')
    if (hideDashboardList) {
      const { siteName } = window.sugo
      try {
        window.parent.document.title = `${dashboard_title}-看板分享-${siteName}`
      } catch (e) {}
    }
  }

  componentWillUnmount() {
    //  FIXME  onWindowResizeRef定义在哪里
    window.removeEventListener('resize', this.onWindowResizeRef)
    window.removeEventListener('resize', this.changeSizeChangeCls)
    if (this.boxSizeTimeOut) {
      clearTimeout(this.boxSizeTimeOut)
    }
    this.positionJson = null
  }

  initDnd = () => {
    let { sliceTree } = this.props
    let from = document.querySelector('.pool-body')
    let to = document.getElementById('layout')
    let opts = {
      accepts: function (el, target) {
        //允许放置
        return cls.hasClass(target, 'form-box')
      },
      invalid: function (el) {
        //禁止拖拽
        return cls.hasClass(el.parentNode, 'form-box')
      },
      direction: 'vertical',
      // Y axis is considered when determining where an element would be dropped
      copy: true,
      // elements are moved by default, not copied
      copySortSource: false,
      // elements in copy-source containers can be reordered
      revertOnSpill: true,
      // spilling will put the element back where it was dragged from, if this is true
      removeOnSpill: false,
      // spilling will `.remove` the element, if this is true
      mirrorContainer: document.body,
      // set the element that gets mirror elements appended
      ignoreInputTextSelection: true
      // allows users to select input text, see details below
    }
    let drake = dragula([from, to], opts)
    //let dragStatX = 0
    drake
      .on('drop', el => {
        let id = el.getAttribute('data-id')
        let slice = sliceTree[id]
        if (slice) this.addSliceToDashboard(slice)
        el.remove()
      })
      .on('drag', el => {
        cls.addClass(el, 'on-slice-drag')
        cls.addClass(to, 'on-slice-drag')
      })
      .on('cancel', el => {
        cls.removeClass(el, 'on-slice-drag')
      })
      .on('shadow', el => {
        cls.addClass(el, 'on-slice-drag hide')
      })
      .on('dragend', () => {
        cls.removeClass(to, 'on-slice-drag')
      })
  }

  changeGlobalFilters = globalFilters => {
    this.setState({
      globalFilters: globalFilters,
      _globalFilters: ''
    })
  }

  closeModal = () => {
    this.setState({
      showModal: false,
      slice: {},
      showForm: 'slice'
    })
  }

  showSlice = (slice, showForm) => {
    this.setState({
      showModal: true,
      slice,
      showForm
    })
  }

  handleDownLoad = async slice => {
    let vizType = _.get(slice, 'params.vizType', undefined)
    let outerBox, echartInstance
    let echartHelper = echarts
    let echartsOption = {}
    switch (vizType) {
      case 'IframeBox':
        return
      case 'table':
      case 'table_flat':
      case 'number':
        PubSub.publish('dashBoardForm.slice-chart-facade-export', { sliceId: slice.id })
        return
      case 'liquidFill':
        echartHelper = require('echarts/lib/echarts')
        require('echarts-liquidfill')
        outerBox = document.querySelector(`._${slice.id}`)
        echartInstance = echartHelper.getInstanceByDom(outerBox)
        echartsOption = echartInstance.getOption()
        this.prepareDownLoadSlice(echartsOption, echartHelper, vizType)
        break
      case 'wordCloud':
        echartHelper = require('echarts/lib/echarts')
        require('echarts-wordcloud')
        outerBox = document.querySelector(`._${slice.id}`)
        echartInstance = echartHelper.getInstanceByDom(outerBox)
        echartsOption = echartInstance.getOption()
        this.prepareDownLoadSlice(echartsOption, echartHelper, vizType)
        break
      default:
        outerBox = document.querySelector(`._${slice.id}`)
        echartInstance = echarts.getInstanceByDom(outerBox)
        echartsOption = echartInstance.getOption()
        if (vizType === 'chord') echartsOption.series[0].label.normal.show = true
        this.prepareDownLoadSlice(echartsOption, echartHelper, vizType)
        break
    }
  }

  prepareDownLoadSlice(echartsOption, echartHelper, vizType) {
    let chartDom = document.createElement('div')
    chartDom.style.height = '1000px'
    chartDom.style.width = '1000px'
    chartDom.style.display = 'none'
    document.body.appendChild(chartDom)
    const mychart = echartHelper.init(chartDom)
    //动画不能为false finished就是在监听动画
    echartsOption.animation = false
    mychart.setOption(echartsOption)

    let hasFinishedEvent = false

    const renderedVizType = ['liquidFill']
    //不监听完成事件的 统一等待2秒后自动下载 hasFinishedEvent 用于防止有些图没finished事件
    const withoutListener = ['wordCloud']
    const event = renderedVizType.includes(vizType) ? 'rendered' : 'finished'
    const handler = () => {
      mychart.off(event, handler)

      if (!withoutListener.includes(vizType)) {
        hasFinishedEvent = true
        this.downLoadSlice(mychart, chartDom)
      }
    }
    mychart.on(event, handler)
    setTimeout(() => {
      if (!hasFinishedEvent) this.downLoadSlice(mychart, chartDom)
    }, 2000)
  }

  downLoadSlice(mychart, chartDom) {
    let base64, link
    base64 = mychart.getConnectedDataURL({
      type: 'png',
      backgroundColor: '#ffffff'
    })
    link = document.createElement('a')
    if (link.download !== undefined) {
      // feature detection
      // Browsers that support HTML5 download attribute
      link.href = base64
      link.setAttribute('download', `看板_单图_时间${moment().format('YYYYMMDDHHmmss')}`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    //destory whether download
    document.body.removeChild(chartDom)
  }

  afterShare = currentDashboard => {
    this.setState({
      currentDashboard,
      globalFile: (currentDashboard && currentDashboard.params && currentDashboard.params.globalFile) || []
    })
    this.props.setProp('update_dashboards', currentDashboard)
  }

  quitEdit = () => {
    this.changeMode('show')
    let { currentDashboard } = this.state
    let { dashboards } = this.props
    let inst = _.find(dashboards, { id: currentDashboard.id })
    if (inst) {
      this.setState({
        currentDashboard: _.cloneDeep(inst),
        gridLayoutKey: moment().valueOf()
      })
    }
  }

  enterEdit = () => {
    this.changeMode('edit')
    this.setState({ sliceData: {} })
  }

  validate = () => {
    let { dashboard_title, slices } = this.state.currentDashboard
    if (!_.trim(dashboard_title)) {
      message.error('请填写标题')
      return false
    }
    if (!slices.length) {
      message.error('请至少选择一个单图')
      return false
    }
    return true
  }

  diff = () => {
    let keys = ['dashboard_title', 'position_json', 'description', 'slices', 'category_id', 'params']
    let { currentDashboard } = this.state
    let inst = _.find(this.props.dashboards, { id: currentDashboard.id })
    let { keyword } = this.props
    if (this.positionJson) {
      currentDashboard = immutateUpdate(this.state.currentDashboard, '', pre => {
        if (keyword) return pre
        pre.position_json = this.positionJson
        return pre
      })
    }
    return diff(currentDashboard, inst, keys)
  }

  doUpdate = async () => {
    const updateAll = this.diff()
    if (!Object.keys(updateAll).length) {
      return this.changeMode('show')
    }
    let { globalFile, panes, targetTheme: theme } = this.state
    let { keyword } = this.props

    let currentDashboard = immutateUpdate(this.state.currentDashboard, '', pre => {
      if (keyword) return pre
      pre.position_json = this.positionJson || pre.position_json
      return pre
    })

    currentDashboard = immutateUpdate(this.state.currentDashboard, ['params'], pre => {
      if (keyword) return pre
      pre.theme = theme || 'light'
      return pre
    })

    const slices = updateAll.slices || []
    let update = _.pick(updateAll, submitProps)
    update.datasource_id = currentDashboard.datasource_id

    if (currentDashboard) {
      update.params = {
        ...currentDashboard.params,

        globalFile,
        theme
      }
      if (!_.isEmpty(slices)) {
        let keys = Object.keys(currentDashboard.params.jumpConfiguration || {}).filter(item => {
          return _.find(slices, { id: item })
        })
        let object = {}
        keys.map(key => {
          object[key] = currentDashboard.params.jumpConfiguration[key]
        })
        update.params.jumpConfiguration = object
      }

      currentDashboard.params = {
        ...currentDashboard.params,
        globalFile
      }
    }

    let res = await this.props.updateDashboard(currentDashboard.id, update, slices, currentDashboard, globalFile, theme)
    this.props.getDashboardsCategory()
    if (res) {
      let newPanes = panes.map(item => {
        return item.id === currentDashboard.id ? { ...item, title: update.dashboard_title || item.title } : item
      })
      this.setState({ panes: newPanes })
      this.changeMode('show')
      message.success('修改成功', 2)
      this.setState({
        globalFile: []
      })
    }
  }

  doUpdateForJumpConfiguration = async (data = {}) => {
    let { currentDashboard } = this.state
    let res = await this.props.updateDashboard(
      currentDashboard.id,
      {
        params: {
          ...currentDashboard.params,
          jumpConfiguration: { ...(currentDashboard.params.jumpConfiguration || {}), ...data }
        }
      },
      [],
      currentDashboard
    )
    if (res) {
      message.success('修改成功', 2)
    }
  }

  doSave = async () => {
    const { globalFile, targetTheme: theme } = this.state
    let { keyword } = this.props
    let currentDashboard = immutateUpdate(this.state.currentDashboard, '', pre => {
      if (keyword) return pre
      pre.position_json = this.positionJson || pre.position_json
      return pre
    })
    currentDashboard.params = {
      ...currentDashboard.params,
      globalFile,
      theme
    }
    let res = await this.props.addDashboard(
      _.cloneDeep({
        ...currentDashboard,
        datasource_id: this.props.datasourceCurrent.id
      })
    )
    if (res) {
      this.props.getDashboardsCategory()
      browserHistory.push(`${listPath}/${res.result.id}`)
      message.success('添加成功', 2)
      this.setState({
        globalFile: []
      })
    }
  }

  onSave = () => {
    setTimeout(() => {
      if (!this.validate()) return
      let { id } = this.state.currentDashboard
      if (id) return this.doUpdate()
      else this.doSave()
    }, 1000)
  }

  onDel = async () => {
    let { dashboards, delDashboard, datasourceCurrent } = this.props
    let { currentDashboard } = this.state
    let res = await delDashboard(currentDashboard)
    if (!res) return
    message.success('删除成功', 2)

    let next = _.find(dashboards, ds => {
      return ds.id !== currentDashboard.id && _.get(ds, 'slices[0].druid_datasource_id') === datasourceCurrent.id
    })
    let panes = this.state.panes.filter(pane => pane.id !== currentDashboard.id)
    let activeKey = _.isEmpty(panes) ? '' : panes[0].id
    this.setState({
      panes,
      activeKey
    })
    let url = next ? `${listPath}/${next.id}` : listPath
    url = _.isEmpty(panes) ? url : `${listPath}/${panes[0].id}`
    if (next || !_.isEmpty(panes)) {
      this.props.changeState({ selectDashboard: _.isEmpty(panes) ? next.id : panes[0].id })
    }
    browserHistory.replace(url)

    // let url = next
    //   ? `${listPath}/${next.id}`
    //   : listPath
    // browserHistory.replace(url)
  }

  changeMode = mode => {
    //  FIXME  onWindowResizeRef定义在哪里
    this.setState({ mode }, this.onWindowResizeRef)
  }

  onTitleChange = v => {
    if (!_.trim(v)) message.error('不能为空', 8)
    let currentDashboard = _.cloneDeep(this.state.currentDashboard)
    currentDashboard.dashboard_title = v.slice(0, 254)
    this.setState({
      currentDashboard
    })
  }

  onLayoutChange = position_json => {
    let { keyword } = this.props
    if (keyword) this.positionJson = this.state.currentDashboard.position_json
    this.positionJson = position_json
  }

  updateCurrentDashboard = async (currentDashboard, slices, slice, index) => {
    currentDashboard.sliceTree = buildTree(slices)
    currentDashboard.position_json = currentDashboard.position_json || []
    if (typeof index !== 'undefined') {
      currentDashboard.position_json.push({
        i: '' + slice.id,
        x: 4 * (index % 3),
        y: 10 * Math.floor(index / 3),
        w: 4,
        h: 10,
        minW: 3,
        minH: 3
      })
    } else {
      _.remove(currentDashboard.position_json, p => p.i === slice.id)
    }
    await this.setStatePromise({
      currentDashboard
    })
  }

  removeSliceFromDashboard = async slice => {
    let currentDashboard = _.cloneDeep(this.state.currentDashboard)
    let id = slice.id
    if (currentDashboard.sliceTree['id' + id]) {
      _.remove(currentDashboard.slices, s => s.id === slice.id)
      await this.updateCurrentDashboard(currentDashboard, currentDashboard.slices, slice)
    }
  }

  addSliceIntoContainer = async (slice, addId) => {
    let currentDashboard = _.cloneDeep(this.state.currentDashboard)
    let id = slice.id
    let preAddIds = [addId]

    if (currentDashboard.sliceTree['id' + id]) {
      currentDashboard.slices = currentDashboard.slices.map(i => {
        if (i.id !== slice.id) return i
        if (!currentDashboard.params) currentDashboard.params = {}
        if (!currentDashboard.params.container) currentDashboard.params.container = {}
        if (!currentDashboard.params.container[slice.id]) currentDashboard.params.container[slice.id] = []

        //容器堆叠到容器上
        if (currentDashboard.params.container[addId]) {
          preAddIds = _.concat(preAddIds, currentDashboard.params.container[addId])
          delete currentDashboard.params.container[addId]
        }

        currentDashboard.params.container[slice.id] = _.concat(currentDashboard.params.container[slice.id], preAddIds)
        return i
      })
      await this.setStatePromise({
        currentDashboard
      })
    }
  }

  removeSliceFromContainer = async (slice, removeId, target) => {
    let currentDashboard = _.cloneDeep(this.state.currentDashboard)
    let id = slice.id

    if (currentDashboard.sliceTree['id' + id]) {
      currentDashboard.slices = currentDashboard.slices.map(i => {
        if (i.id !== slice.id) return i
        if (!currentDashboard.params) return i
        if (!currentDashboard.params.container) return i
        if (!currentDashboard.params.container[slice.id]) return i

        currentDashboard.params.container[slice.id] = currentDashboard.params.container[slice.id].filter(i => i !== removeId)
        return i
      })
      await this.setStatePromise({
        currentDashboard
      })
      this.addSliceToDashboard(target)
    }
  }

  subscribe = () => {
    actions.updateSubscribe.bind(this, this.state.currentDashboard)()
  }

  exportPDF = (title = '') => {
    //html2canvas不支持transform,这里替换成left、top
    let html = document.getElementsByClassName('react-grid-layout')[0]
    let layout = document.getElementById('layout')
    let domArr = html.children
    let cssArr = []
    for (let i = 0; i < domArr.length; i++) {
      cssArr[i] = domArr[i].style.transform
    }
    for (let i = 0; i < domArr.length; i++) {
      domArr[i].style.transform = ''
      domArr[i].style.left = cssArr[i].replace(/[()]/g, ',').split(',')[1]
      domArr[i].style.top = cssArr[i].replace(/[()]/g, ',').split(',')[2]
    }
    let height = layout.offsetHeight
    let setHeight
    if (841.89 >= (592.28 / layout.offsetWidth) * height) {
      setHeight = Math.floor((841.89 * layout.offsetWidth) / 592.28)
    } else {
      let ratio = ((592.28 / layout.offsetWidth) * layout.offsetHeight) / 841.89
      setHeight = Math.floor((841.89 * Math.ceil(ratio) * layout.offsetWidth) / 592.28)
    }
    layout.style.height = setHeight + 'px'
    html2canvas(layout, {
      dpi: window.devicePixelRatio,
      useCORS: true,
      scale: '2',
      color: 'red'
    }).then(canvas => {
      //需要重新添加transform，不然页面伸缩会影响
      for (let i = 0; i < domArr.length; i++) {
        domArr[i].style.transform = cssArr[i]
        domArr[i].style.left = 0
        domArr[i].style.top = 0
      }
      layout.style.height = null

      var contentWidth = canvas.width
      var contentHeight = canvas.height

      //一页pdf显示html页面生成的canvas高度;
      var pageHeight = (contentWidth / 592.28) * 841.89
      //未生成pdf的html页面高度
      var leftHeight = contentHeight
      //页面偏移
      var position = 0

      var imgWidth = 595.28
      var imgHeight = (592.28 / contentWidth) * contentHeight

      var pageData = canvas.toDataURL('image/jpeg', 1.0)

      var pdf = new jspdf('', 'pt', 'a4')

      //有两个高度需要区分，一个是html页面的实际高度，和生成pdf的页面高度(841.89)
      //当内容未超过pdf一页显示的范围，无需分页
      if (leftHeight < pageHeight) {
        pdf.addImage(pageData, 'JPEG', 0, 0, imgWidth, imgHeight)
      } else {
        while (leftHeight > 0) {
          pdf.addImage(pageData, 'JPEG', 0, position, imgWidth, imgHeight)
          leftHeight -= pageHeight
          position -= 841.89
          //避免添加空白页
          if (leftHeight > 0) {
            pdf.addPage()
          }
        }
      }
      pdf.save('看板-' + title + '.pdf')
    })
  }

  saveCopyAs = (dashboardId, type) => {
    const { saveCopyAs, getDashboards, getDashboardsCategory } = this.props
    saveCopyAs({ dashboardId, type }, response => {
      if (response.sucess) {
        message.info('操作成功')
        typeof getDashboards === 'function' && getDashboards()
        typeof getDashboardsCategory === 'function' && getDashboardsCategory()
      } else {
        message.error('操作失败')
      }
      this.setState({ saveAsvisible: false })
    })
  }

  addSliceToDashboard = async slice => {
    let currentDashboard = _.cloneDeep(this.state.currentDashboard)
    let id = slice.id
    let { dashboardSliceLimit } = window.sugo
    if (currentDashboard.slices.length >= dashboardSliceLimit) {
      return message.info(`每个看板最多只能有${dashboardSliceLimit}个单图`)
    }
    if (!currentDashboard.sliceTree['id' + id]) {
      currentDashboard.slices.push(slice)

      let { allowAddSlicesCrossProjects } = _.get(currentDashboard, 'params') || {}
      if (!allowAddSlicesCrossProjects && 1 < _.uniq(currentDashboard.slices.map(s => s.druid_datasource_id)).length) {
        message.error('同一个看板不能包含多个项目的单图', 10)
        return
      }
      await this.updateCurrentDashboard(currentDashboard, currentDashboard.slices, slice, currentDashboard.slices.length - 1)
    } else {
      message.success('已经加入数据看板了', 2)
    }
  }

  closeContainerTab = ({ containerId, sliceId, target }) => {
    let { currentDashboard = {} } = this.state
    let sliceTree = currentDashboard.sliceTree || {}
    this.removeSliceFromContainer(sliceTree['id' + containerId], sliceId, target)
  }

  //查看数据功能
  renderModal = () => {
    let { changeState } = this.props
    let { slice, showModal, showForm } = this.state
    let tip = (
      <Tooltip title={`点击查看 ${this.state.slice.slice_name} 的详情`}>
        <Link to={getOpenSliceUrl(slice)}>{this.state.slice.slice_name}</Link>
      </Tooltip>
    )
    let container = document.querySelector('.dashboard-layout')
    let newSlice = _.cloneDeep(slice)
    let vizType = _.get(slice, 'params.vizType')
    if (newSlice.params) {
      newSlice.params.vizType = showForm === 'table' ? 'table_flat' : vizType
    }

    return (
      <Modal
        // wrapClassName="slice-modal-wrapper"
        wrapClassName={`slice-modal-wrapper slice-modal-wrapper-theme-${this.state.targetTheme}`}
        style={{ zIndex: 990 }}
        visible={showModal}
        title={tip}
        onCancel={this.closeModal}
        footer={null}
        width={window.innerWidth - 60}
        getContainer={container}
      >
        <div className='charts-box dashboard-show-data'>
          {newSlice.params ? (
            <SliceChartFacade
              wrapperStyle={{
                maxHeight: '380px',
                // backgroundColor: '#fff',
                padding: '10px',
                borderRadius: '3px'
                // borderTop: '10px solid white',
                // borderBottom: '10px solid white '
              }}
              style={{
                minHeight: 340,
                minWidth: 340
              }}
              changeDashBoardState={changeState}
              slice={newSlice}
              theme={this.state.targetTheme}
            />
          ) : null}
        </div>
      </Modal>
    )
  }

  renderEmpty = () => {
    let { mode } = this.state
    let isDraggable = mode === 'edit' || /\/new$/.test(location.pathname)
    return (
      <div
        className='no-slices-bg'
        style={{
          height: window.innerHeight - 56 - 48 - 46
        }}
      >
        {isDraggable ? <p>拖拽单图到这里添加</p> : <p>单图被删除或项目被隐藏</p>}
      </div>
    )
  }

  showSliceData = data => {
    this.setState({ sliceData: { ...this.state.sliceData, ...data } })
  }

  renderLayout = layout => {
    let {
      datasourceList: datasources,
      slices: roleSlices,
      location: { pathname },
      dashboards
    } = this.props
    let isNewPage = /\/new$/.test(pathname)
    let { currentDashboard = {}, mode, pileState, slicesSettings, sliceData } = this.state
    let isDraggable = mode === 'edit' || /\/new$/.test(location.pathname)
    const { params = {} } = currentDashboard
    let userId = window.sugo.user.id
    let owned = userId === currentDashboard.created_by

    let sliceTree = currentDashboard.sliceTree || {}
    let { i } = layout

    const container = _.get(currentDashboard, `params.container[${i}]`, [])

    let slice = sliceTree['id' + layout.i]
    if (params.istemplate && params.templateSlices) {
      slice = _.find(params.templateSlices, o => {
        return o.id === i
      })
    }
    let vizType = _.get(slice, 'params.vizType', undefined)
    let isShow = owned ? !!_.find(roleSlices, p => p.id === slice.id) : true

    let shouldRenderChart = true
    let style = {}
    let downLoadType = vizType === 'table' || vizType === 'table_flat' || vizType === 'number' ? 'csvOnly' : 'csvOrImage'

    let hideDashboardList = _.get(this.props, 'location.query.hideDashboardList', '')
    slice = this.addGlobalFilters2Slice(slice)
    slice = this.addFilters2Slice(slice)
    let buttons = (
      <span
        className='fright'
        style={{
          display: 'flex',
          flexWrap: 'no-wrap',
          justifyContent: 'flex-end',
          alignItems: 'center',
          zIndex: 9
        }}
      >
        <Tooltip title='查看数据'>
          <EyeOutlined className='color-grey iblock hover-color-main font16' type='sugo-visible' onClick={() => this.showSlice(slice, 'table')} />
        </Tooltip>
        {hideDashboardList ? null : (
          <React.Fragment>
            <Tooltip title='配置'>{this.renderSliceSettings(this.state.mode, _.get(sliceData, `${slice.id}`, slice))}</Tooltip>
            <Tooltip title='设置筛选条件'>{this.renderSliceFilterPicker(this.state.mode, _.get(sliceData, `${slice.id}`, slice))}</Tooltip>
          </React.Fragment>
        )}
        {vizType && vizType !== 'IframeBox' ? (
          downLoadType === 'csvOrImage' ? (
            <Auth auth='app/dashboards/download'>
              <Tooltip title='下载'>
                <Popover placement='bottom' content={this.renderLayoutPopoverContent(_.get(sliceData, `${slice.id}`, slice))} trigger='click'>
                  <DownloadOutlined className='color-grey iblock hover-color-main font18 mg1x' type='download' />
                </Popover>
              </Tooltip>
            </Auth>
          ) : (
            <Auth auth='app/dashboards/download'>
              <Tooltip title='下载'>
                <DownloadOutlined
                  className='color-grey iblock hover-color-main font18 mg1x'
                  type='download'
                  onClick={() => this.handleDownLoad(_.get(sliceData, `${slice.id}`, slice))}
                />
              </Tooltip>
            </Auth>
          )
        ) : null}
        <Tooltip title='展开'>
          <ExpandOutlined className='color-grey iblock hover-color-main font16 mg1x' onClick={() => this.showSlice(_.get(sliceData, `${slice.id}`, slice))} />
        </Tooltip>
        {mode === 'show' && !isNewPage ? null : (
          <Tooltip title='从看板移除'>
            <DeleteOutlined className='color-grey iblock hover-color-main font18 mg1x' onClick={() => this.removeSliceFromDashboard(slice)} />
          </Tooltip>
        )}
      </span>
    )

    const roleSlicesMap = {}
    roleSlices.map(i => {
      if (!roleSlicesMap[i.id]) roleSlicesMap[i.id] = i
    })
    let { allowAddSlicesCrossProjects } = _.get(currentDashboard, 'params') || {}
    let props = {
      slice,
      shouldRenderChart,
      style,
      buttons,
      onClick: _.noop,
      className: '',
      headerClassName: 'width-80',
      shouldRenderFooter: !!allowAddSlicesCrossProjects,
      wrapperStyle: {
        height: '100%'
      },
      // delay: index * 500,
      wrapperClass: 'height-100',
      datasources,
      isShow,
      downLoadEchartsPicture: vizType !== 'IframeBox' && vizType !== 'number' ? slice.id : false,
      shouldTitleLink: !isDraggable,
      container: container.map(i => roleSlicesMap[i]).filter(_.identity),
      closeContainerTab: this.closeContainerTab,
      showSliceData: this.showSliceData,
      ...DefaultDruidQueryCacheOptsForDashboard
    }

    const that = this

    //碰撞检测
    function collisionDetection(t, c) {
      const { x, y } = t
      const { x: x1, y: y1, width: w2, height: h2 } = c
      const x2 = x1 + w2
      const y2 = y1 + h2
      if (x < x1 || x > x2) return false
      if (y < y1 || y > y2) return false
      return true
    }

    return (
      <div
        id={i}
        key={i}
        onMouseDown={() => {
          if (!pileState) return
          const el = document.getElementById(i)
          el.draggable = true

          let container = document.getElementsByClassName('react-grid-layout')[0]
          container.ondragover = function (e) {
            e.preventDefault()
          }
          container.ondrop = function (e) {
            e.preventDefault()
            el.draggable = false
            that.positionJson.map(item => {
              if (item.i === i) return
              const contrast = document.getElementById(item.i).getBoundingClientRect()

              // 碰撞检测 鼠标释放点在哪个元素内部 TODO 把被拖动的元素删掉 落点形成容器
              if (collisionDetection(e, contrast)) {
                that.removeSliceFromDashboard(sliceTree['id' + i])

                that.addSliceIntoContainer(sliceTree['id' + item.i], i)
              }
            })
          }
        }}
      >
        <SliceCard
          {...props}
          changeDashBoardState={this.props.changeState}
          dashBoardSlicesSettings={slicesSettings}
          activeKey={this.state.activeKey}
          jumpConfiguration={_.get(currentDashboard, 'params.jumpConfiguration', {})}
          dashboards={dashboards}
          theme={this.state.targetTheme}
          mode={mode}
        />
      </div>
    )
  }

  /**单图设置全局过滤参数，如果存在 */
  addGlobalFilters2Slice = slice => {
    const { globalFilters } = this.state
    if (_.isEmpty(globalFilters) || _.isEmpty(slice)) {
      return slice
    }
    return immutateUpdates(
      slice,
      'params.filters',
      flts => _.uniqBy([...globalFilters, ...(flts || [])], f => f.col),
      '',
      sl => {
        const vizType = _.get(sl, 'params.vizType')
        if (vizType in vizTypeChartComponentMap && !(vizType in analyticVizTypeChartComponentMap)) {
          // 对于特殊的单图，全局筛选放到 params.chartExtraSettings 内
          return immutateUpdate(sl, 'params.chartExtraSettings', s => ({ ...(s || {}), globalFilters }))
        }
        return sl
      }
    )
  }

  /**单图设置过滤参数，如果存在 */
  addFilters2Slice = slice => {
    const { slicesFilters, activeKey } = this.state
    let sliceFilters = _.get(slicesFilters, `${activeKey}${slice.id}`) || []
    if (_.isEmpty(slicesFilters) || _.isEmpty(slice)) {
      return slice
    }
    return immutateUpdates(
      slice,
      'params.filters',
      flts => _.uniqBy([...sliceFilters, ...(flts || [])], f => f.col),
      '',
      sl => {
        const vizType = _.get(sl, 'params.vizType')
        if (vizType in vizTypeChartComponentMap && !(vizType in analyticVizTypeChartComponentMap)) {
          // 对于特殊的单图，全局筛选放到 params.chartExtraSettings 内
          immutateUpdate(sl, 'params.chartExtraSettings', s => ({ ...(s || {}), sliceFilters }))
        }
        return sl
      }
    )
  }

  renderLayoutPopoverContent = slice => {
    return (
      <div>
        <div>
          <Button onClick={() => this.handleDownLoad(slice)}>下载单图</Button>
        </div>
        <div>
          <Button className='mg1t' onClick={() => PubSub.publish('dashBoardForm.slice-chart-facade-export', { sliceId: slice.id })}>
            下载表格
          </Button>
        </div>
      </div>
    )
  }

  renderList = () => {
    let {
      currentDashboard: { position_json, sliceTree, params = {} },
      mode,
      pileState,
      gridLayoutKey
    } = this.state
    let { keyword, slices, location } = this.props
    let layouts = _.cloneDeep(position_json || [])
    let tree = sliceTree || {}
    let filter = keyword
      ? layout => {
          let slice = tree['id' + layout.i]
          return slice && smartSearch(keyword, slice.slice_name)
        }
      : layout => {
          return tree['id' + layout.i]
        }
    if (!slices.length) return null
    if (!params.istemplate) {
      layouts = layouts.filter(filter)
    }
    let isDraggable = mode === 'edit' || /\/new$/.test(location.pathname)
    return (
      <SizeProvider>
        {({ spWidth }) => {
          return (
            <ReactGridLayout
              key={gridLayoutKey}
              onLayoutChange={this.onLayoutChange}
              cols={18}
              isDraggable={isDraggable && !pileState}
              isResizable={isDraggable && !pileState}
              layout={layouts}
              rowHeight={30}
              width={spWidth || 1200}
              style={{
                minHeight: window.innerHeight - 48 - 44
              }}
            >
              {layouts.map(this.renderLayout)}
            </ReactGridLayout>
          )
        }}
      </SizeProvider>
    )
  }

  renderCenterDom = () => {
    let dslices = _.get(this.state, 'currentDashboard.slices') || []
    const istemplate = _.get(this.state, 'currentDashboard.params.istemplate')
    if (dslices.length || istemplate) {
      return this.renderList()
    } else {
      return this.renderEmpty()
    }
  }

  renderTitle = (mode, currentDashboard) => {
    let { dashboardsCategory, dashboards } = this.props
    let { sliceBoxSize } = this.state
    let { dashboard_title, subscribed, id, created_by, params, datasource_id, slices } = currentDashboard || {}
    let userId = window.sugo.user.id
    let owned = userId === created_by
    const category = dashboardsCategory.find(p => p.dashboards.includes(id)) || {}
    let allowAddSlicesCrossProjects = _.get(params, 'allowAddSlicesCrossProjects')
    return (
      <div className='fleft'>
        {
          mode === 'edit' ? (
            <React.Fragment>
              <span className='elli iblock mg1r font12 color-grey'>看板名称:</span>
              <Tooltip title={dashboard_title}>
                <InputWithAutoFocus
                  className={classNames('iblock', 'dashb-title', { width260: sliceBoxSize === 'middle', width120: sliceBoxSize === 'small' })}
                  // className="iblock dashb-title width260"
                  type='text'
                  onChange={this.onTitleChange}
                  value={dashboard_title}
                  title={dashboard_title}
                />
              </Tooltip>
              {!window.sugo.enableDataChecking ? (
                <Checkbox
                  className='mg2l elli'
                  style={{ marginLeft: '5px' }}
                  // disabled={!!(id && _.get(originalDashboard, 'params.allowAddSlicesCrossProjects'))}
                  checked={allowAddSlicesCrossProjects}
                  onChange={ev => {
                    let { currentDashboard } = this.state
                    let checked = ev.target.checked
                    this.setState(
                      {
                        currentDashboard: immutateUpdate(currentDashboard, 'params.allowAddSlicesCrossProjects', () => checked)
                      },
                      async () => {
                        if (!checked) {
                          // 移除所有非此项目的单图
                          const preRemoveSlices = (slices || []).filter(s => s.druid_datasource_id !== datasource_id)
                          for (let sl of preRemoveSlices) {
                            await this.removeSliceFromDashboard(sl)
                          }
                        }
                      }
                    )
                  }}
                >
                  {id ? '跨项目看板' : '创建为跨项目看板'}
                </Checkbox>
              ) : null}
              <Select
                placeholder='请选择'
                style={{ marginRight: '5px' }}
                className={classNames('mg2l', 'iblock', { width200: sliceBoxSize === 'middle', width120: sliceBoxSize === 'small' })}
                defaultValue={category.id}
                onChange={v => {
                  this.setState({
                    currentDashboard: immutateUpdate(currentDashboard, 'category_id', () => v)
                  })
                }}
              >
                {dashboardsCategory.map(p => {
                  return (
                    <Select.Option key={p.id} value={p.id}>
                      {p.title}
                    </Select.Option>
                  )
                })}
              </Select>
            </React.Fragment>
          ) : null
          // <Tooltip title={dashboard_title}>
          //   <span
          //     className="iblock elli mw200 mg1r"
          //     title={dashboard_title}
          //   >{dashboard_title}</span>
          // </Tooltip>
        }

        {renderPageTitle(dashboard_title)}
        {mode === 'edit' && sliceBoxSize === 'small' && id ? null : this.renderShareBtn(currentDashboard)}
        {mode === 'edit' && sliceBoxSize === 'small' && id ? null : this.renderPublishBtn(currentDashboard)}
        {mode === 'edit' && sliceBoxSize === 'small' && id ? null : this.renderExport(currentDashboard, dashboard_title)}
        {mode === 'edit' && sliceBoxSize === 'small' && id ? null : this.renderSaveCopyAsButton(currentDashboard)}
        {mode === 'edit' && sliceBoxSize === 'small' && id ? null : this.renderSubscribeButton(id, owned, subscribed)}
        {mode === 'edit' && sliceBoxSize === 'small' && id ? this.renderBtnMeau(currentDashboard, id, owned, subscribed) : null}

        {this.state.targetTheme === 'light' ? (
          <Button
            type='ghost'
            className='mg1l iblock border-none-btn'
            // icon={<DesktopOutlined />}
            title='浅色'
            onClick={() => {
              this.changeTheme('dark')
            }}
          >
            <SugoIcon className='font20' type='sugo-light' />
          </Button>
        ) : (
          <Button
            type='ghost'
            className='mg1l iblock border-none-btn'
            // icon={<DesktopOutlined />}
            title='深色'
            onClick={() => {
              this.changeTheme('light')
            }}
          >
            <img src={darkTheme} style={{ height: '20px', width: '20px' }} />
          </Button>
        )}
      </div>
    )
  }

  renderModeBtn = mode => {
    if (mode !== 'edit') return null
    const { pileState } = this.state
    return (
      <Button style={{ marginLeft: '5px', fontSize: '12px', height: '30px' }} className='mg1l edit-btn' onClick={() => this.setState({ pileState: !pileState })}>
        {pileState ? '排序模式' : this.state.mode === 'edit' && this.state.sliceBoxSize === 'small' ? '堆叠' : '堆叠模式'}
      </Button>
    )
  }

  renderEditBtn = (currentDashboard, mode, owned) => {
    let { id, authorization_permissions_type = 0 } = currentDashboard || {}
    if (!id || !owned || !canEdit || authorization_permissions_type === AUTHORIZATION_PERMISSIONS_TYPE.read) return null
    return mode === 'show' ? (
      <Button type='primary' onClick={this.enterEdit} className={classNames({ 'edit-btn': true, hide: canEdit ? false : true })}>
        <EditOutlined className='font14' />
        编辑看板
      </Button>
    ) : (
      <Button
        type='ghost'
        style={{ width: this.state.mode === 'edit' && this.state.sliceBoxSize === 'small' ? '80px' : '100px' }}
        className='mg1l edit-btn'
        onClick={this.quitEdit}
      >
        <Icon type='sugo-back' />
        {/* 退出编辑 */}
        {this.state.mode === 'edit' && this.state.sliceBoxSize === 'small' ? '退出' : '退出编辑'}
      </Button>
    )
  }

  openShare = dashboardToshare => {
    this.dashboardShare.setState({
      dashboardToshare,
      openShare: true,
      shareToRoles: dashboardToshare.shareRoles || []
    })
  }

  isFlitersEqual = (origin, target) => {
    return _.keys(origin)?.length === _.keys(target)?.length && _.every(_.values(origin), (filter, index) => _.isEqual(filter, _.values(target)[index]))
  }

  renderShareBtn = currentDashboard => {
    let { id, created_by } = currentDashboard || {}
    let userId = window.sugo.user.id
    let isShare = new RegExp('isSharePage=true').test(window.location.href)
    //暂时注释，别人创建的可以分享
    // if (!id || !owned || !canShare) return null
    if (!id || !canShare || isShare) return null
    return (
      <Auth auth='app/dashboards/share'>
        <ShareAltOutlined className='font20 mg1r' title='授权给用户组' onClick={() => this.openShare(currentDashboard)} />
      </Auth>
    )
  }

  renderPublishBtn = currentDashboard => {
    let { id, created_by } = currentDashboard || {}
    let userId = window.sugo.user.id
    // let owned = userId === created_by
    // if (!id || !owned || !hasPublishManagerEntryInMenu) {
    //   return null
    // }
    //不是自己创建的可以发布
    if (!id || !hasPublishManagerEntryInMenu) {
      return null
    }
    // 如果正在查看发布的页面，则显示扫码分享对话框
    let hideDashboardList = _.get(this.props, 'location.query.hideDashboardList', '')
    if (hideDashboardList) {
      return (
        <Auth auth='app/dashboards/code'>
          <Button
            type='ghost'
            className='mg1l iblock'
            icon={<QrcodeOutlined />}
            title='扫码查看'
            onClick={() => {
              try {
                let url = window.location.href !== window.parent.location.href ? window.parent.location.href : document.location.href
                Modal.info({
                  title: '您可以用手机扫码查看',
                  content: <QrCode style={{ maxWidth: '300px' }} url={url} />,
                  onOk() {}
                })
              } catch (e) {}
            }}
          />
        </Auth>
      )
    }
    if (!canPublish) {
      return null
    }
    return (
      <PublishSettingsModal
        shareType={SharingTypeEnum.Dashboard}
        shareContentId={id}
        extraInfo={{
          shareContentName: _.get(currentDashboard, 'dashboard_title')
        }}
        key={id || '0'}
        showQRCode
        theme={this.state.targetTheme}
      >
        <Button type='ghost' className='mg1l iblock border-none-btn' title='发布'>
          <DesktopOutlined className='font20' />
        </Button>
      </PublishSettingsModal>
    )
  }

  renderExport = (currentDashboard, title) => {
    return (
      <Popover
        placement='bottom'
        content={
          <React.Fragment>
            {this.renderExportXlsxBtn(currentDashboard)}
            {this.renderExportPDF(title)}
          </React.Fragment>
        }
        trigger='hover'
      >
        <Button className='mg1x iblock font20 border-none-btn' type='ghost' icon={<DownloadOutlined className='font20' />} title='看板下载' />
      </Popover>
    )
  }

  renderExportXlsxBtn = currentDashboard => {
    if (!window.sugo.allowDashboardExportXlsx) {
      return
    }
    if (_.isEmpty(currentDashboard)) {
      return null
    }
    return (
      <Auth auth='app/dashboards/export-excel'>
        <FileExcelOutlined
          type='ghost'
          className='mg1x font18'
          // icon={<FileExcelOutlined />}
          title='导出 excel 文件'
          onClick={async () => {
            let exportableVizTypesSet = new Set(Object.keys(analyticVizTypeChartComponentMap))
            let [exportableSlices, skippedSlices] = _.partition(_.get(currentDashboard, 'slices', []), s => exportableVizTypesSet.has(_.get(s, 'params.vizType')))
            if (!_.isEmpty(skippedSlices)) {
              message.warn(
                <span>
                  以下单图暂不支持导出: <br /> {skippedSlices.map(s => s.slice_name).join('，')}
                </span>
              )
            }
            exportableSlices = _.orderBy(exportableSlices, s => {
              const { x = 0, y = 0 } = _.find(currentDashboard.position_json, p => p.i === s.id) || {}
              return y * 12 + x
            })
            // 读取所有单图的数据
            let slicesAndData = await mapAwaitAll(exportableSlices, s => {
              const p = new Promise(resolve => {
                PubSub.publish('dashBoardForm.slice-chart-facade-export', {
                  sliceId: s.id,
                  callBack: data => {
                    resolve({
                      slice: s,
                      data
                    })
                  }
                })
              })
              // 避免缺少维度时卡住
              return Promise.race([p, delayPromised(3 * 1000).then(() => ({ slice: s, data: undefined }))])
            })
            let [validSlicesAndData, noData] = _.partition(slicesAndData, o => o.data)
            if (!_.isEmpty(noData)) {
              message.warn(
                <span>
                  以下单图无数据或未完成查询，跳过导出: <br /> {noData.map(o => o.slice.slice_name).join('，')}
                </span>
              )
            }
            if (_.isEmpty(validSlicesAndData)) {
              message.warn('没有合适单图可以导出')
              return
            }
            let XLSX = await import('xlsx')
            await delayPromised(2000)
            let wb = XLSX.utils.book_new()
            validSlicesAndData.forEach(({ slice, data }) => {
              let ws
              // 自适应列导出excel列宽度
              const customColumns = _.get(slice, 'params.chartExtraSettings.customColumns', [])
              if (customColumns.length) {
                const { merge, col } = getMergeCell(customColumns)
                ws = XLSX.utils.aoa_to_sheet([...col, ..._.slice(data, 1)])
                ws['!cols'] = fitToColumn(data[0])
                ws['!merges'] = merge
              } else {
                ws = XLSX.utils.aoa_to_sheet(data)
                ws['!cols'] = fitToColumn(data[0])
              }
              XLSX.utils.book_append_sheet(wb, ws, slice.slice_name.replace(/[\\\/\?\*\[\]]/g, ' '))
            })
            XLSX.writeFile(wb, `${currentDashboard.dashboard_title || '未命名看板'}.xlsx`)
          }}
        />
      </Auth>
    )
  }

  renderSaveCopyAsButton = currentDashboard => {
    let { id } = currentDashboard || {}
    const { saveAsvisible } = this.state
    return (
      <Auth auth='app/dashboards/save-copy-as'>
        <Popover
          content={
            <div>
              <Button className='mg1x' onClick={() => this.saveCopyAs(id, 'follow')}>
                单图跟随模板
              </Button>
              <Button onClick={() => this.saveCopyAs(id, 'independence')}>单图独立于模板</Button>
            </div>
          }
          title={[
            <span key='title' className='font16 mg2r'>
              看板另存为
            </span>,
            <Icon
              key='close'
              type='close-circle-o'
              className='fright fpointer font18 color-red'
              onClick={() => {
                this.setState({
                  saveAsvisible: false
                })
              }}
            />
          ]}
          trigger='click'
          visible={saveAsvisible}
          // onVisibleChange={this.handleVisibleChange}
          getPopupContainer={() => document.querySelector('.nav-bar')}
        >
          <Button
            type='ghost'
            className='mg1x iblock border-none-btn save-copy-btn'
            // icon={<CopyOutlined />}
            title='看板另存为'
            onClick={() => this.setState({ saveAsvisible: true })}
          >
            <SugoIcon className='font20' type='sugo-save-as' />
          </Button>
        </Popover>
      </Auth>
    )
  }

  renderDelBtn = (currentDashboard, owned) => {
    let { id, dashboard_title, shareRoles, slices = [] } = currentDashboard || {}
    let { dashboards } = this.props
    if (!id || !owned || !canDelete) {
      return null
    }
    let filterDashboards = dashboards.filter(item => {
      let { slicesSettings, activeKey } = this.state
      let jumpConfiguration = _.get(item, 'params.jumpConfiguration', {})
      if (_.isEmpty(jumpConfiguration) && _.isEmpty(slicesSettings)) return false
      let newSlices = _.cloneDeep(item.slices).map(s => {
        return slicesSettings[`${item.id}${s.id}`] || jumpConfiguration[s.id] || []
      })
      let slicesId = newSlices.filter(n => {
        return _.get(n, '[0].id', '') === id
      })
      return !_.isEmpty(slicesId)
    })
    let title = (
      <div>
        {`确定删除 ${dashboard_title} 么？`}
        {shareRoles && shareRoles.length ? <div className='color-red'>删除之后被分享该看板的用户将无法继续查看它</div> : null}
        {!_.isEmpty(filterDashboards) ? (
          <div>
            <div>该看板被如下看板引用：</div>
            {filterDashboards.map((d, i) => {
              return (
                <div key={i} className='mg2l'>
                  {d.dashboard_title}
                </div>
              )
            })}
            <div className='color-red'>删除之后将无法实现跳转</div>
          </div>
        ) : null}
      </div>
    )
    return (
      <Popconfirm title={title} placement='topLeft' onConfirm={this.onDel}>
        <Button type='ghost' className='mg1l del-btn' style={{ width: this.state.mode === 'edit' && this.state.sliceBoxSize === 'small' ? '80px' : '100px' }}>
          {/* <Icon type="sugo-trash" className="font12" /> */}
          <span className='del-btn-icon' dangerouslySetInnerHTML={{ __html: delBtnUrl }} />
          {this.state.mode === 'edit' && this.state.sliceBoxSize === 'small' ? '删除' : '删除看板'}
        </Button>
      </Popconfirm>
    )
  }

  renderSubscribeButton = (id, owned, subscribed) => {
    let isShare = new RegExp('isSharePage=true').test(window.location.href)
    if (!id || !hasSubscribeLink || !owned || isShare) return null

    return (
      <Auth auth='app/dashboards/subscribe'>
        <Tooltip title={subscribed ? '点击取消订阅' : '点击订阅'}>
          <Button
            type='ghost'
            onClick={this.subscribe}
            className='mg1x iblock border-none-btn sub-btn'
            // icon={<LegacyIcon type={subscribed ? 'star' : 'star-o'} />}
          >
            {subscribed ? <StarFilled className='font20' /> : <StarOutlined className='font20' />}
          </Button>
        </Tooltip>
      </Auth>
    )
  }

  renderExportPDF = title => {
    return (
      <Tooltip title='导出为PDF'>
        <FilePdfOutlined
          type='ghost'
          onClick={() => {
            this.exportPDF(title)
          }}
          className='mg1r font18'
        />
      </Tooltip>
    )
  }

  renderBtnMeau = (currentDashboard, id, owned, subscribed) => {
    const menu = (
      <Menu>
        <Menu.Item>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {this.renderShareBtn(currentDashboard)}
            {this.renderPublishBtn(currentDashboard)}
            {this.renderExportXlsxBtn(currentDashboard)}
            {this.renderSaveCopyAsButton(currentDashboard)}
            {this.renderSubscribeButton(id, owned, subscribed)}
          </div>
        </Menu.Item>
      </Menu>
    )
    return (
      // <div className=''
      //   onMouseEnter={()=>{
      //     this.setState({
      //       ...this.state,
      //       showBtnMenu:true
      //   })}}

      //   onMouseLeave={()=>{
      //     this.setState({
      //       ...this.state,
      //       showBtnMenu:false
      //   })}}

      //   style={{position:'relative',marginRight:'5px',}}>
      //   <Button icon={<MenuFoldOutlined  placement="bottomLeft" />  }></Button>

      // </div>
      <Dropdown overlay={menu} placement='bottomCenter' trigger={['click', 'hover']}>
        <Button style={{ marginRight: '5px' }} icon={<MenuFoldOutlined />} />
      </Dropdown>
    )
  }

  renderSaveButton = (mode, id) => {
    if (mode !== 'edit') return null
    return (
      <Button style={{ fontSize: '12px', height: '30px' }} onClick={this.onSave} className='mg1l edit-btn'>
        <BookOutlined className='font13' />
        {id ? (this.state.sliceBoxSize === 'small' ? '更新' : '更新看板') : this.state.sliceBoxSize === 'small' ? '保存' : '保存看板'}
      </Button>
    )
  }

  renderSliceSearch = () => {
    let { keywordInput: KeywordInput } = this.props
    let { currentDashboard: { slices } = {}, mode } = this.state
    if (_.size(slices) < 4 || mode === 'edit') return null
    return <KeywordInput placeholder='搜索看板单图' className='width150 inline flex-center' />
  }
  // saveSlice = async (newSlice) => {
  //   let errStatus = null
  //   let res = await FetchFinal.post(
  //     newSlice.id ? '/app/slices/update/slices' : '/app/slices/create/slices',
  //     newSlice,
  //     {handleErr: async resp => {
  //       handleErr(resp)
  //       errStatus = resp.status
  //     }}
  //   )
  //   return errStatus ? {...(res || {}), status: errStatus} : res
  // }

  renderSliceSettings = (mode, slice) => {
    let { location } = this.props
    if (mode !== 'show' || location.pathname === '/console/dashboards/new') return null
    let { slicesSettings, currentSliceSettings, visiblePopoverKeyForSliceSetting, currentDashboard, activeKey } = this.state
    let { datasourceCurrent, searching, dashboards } = this.props
    let dsId = datasourceCurrent.id
    let dashboardFilterPredicate = _.overEvery(
      _.compact([
        searching && (d => smartSearch(searching, d.dashboard_title)),
        d => {
          return d.datasource_id === dsId || _.get(d, 'params.allowAddSlicesCrossProjects') || _.some(d.slices, s => s.druid_datasource_id === dsId)
        }
      ])
    )
    let dashboards0 = _.orderBy(dashboards, d => (_.get(d.params, 'allowAddSlicesCrossProjects') ? 0 : 1)).filter(dashboardFilterPredicate)
    return (
      <Auth auth='/app/dashboards/global-filter'>
        <Popover
          title={[
            <span key='title' className='font16 mg2r'>
              设置配置信息，关闭对话框后生效
            </span>,
            <Icon
              key='close'
              type='close-circle-o'
              className='fright fpointer font18 color-red'
              onClick={() => {
                if (this.isFlitersEqual(currentSliceSettings, slicesSettings)) {
                  return this.setState({ visiblePopoverKeyForSliceSetting: '' })
                }
                this.setState(
                  {
                    visiblePopoverKeyForSliceSetting: '',
                    slicesSettings: {
                      ...slicesSettings,
                      [`${activeKey}${slice.id}`]:
                        _.get(currentSliceSettings, `${activeKey}${slice.id}`) ||
                        _.get(slicesSettings, `${activeKey}${slice.id}`) ||
                        _.get(currentDashboard, `params.jumpConfiguration.${slice.id}`) ||
                        []
                    }
                  },
                  function () {
                    let { slicesSettings } = this.state
                    let currentSettings = _.get(slicesSettings, `${activeKey}${slice.id}` || [])
                    this.doUpdateForJumpConfiguration({ [slice.id]: currentSettings })
                  }
                )
              }}
            />
          ]}
          placement='bottom'
          arrowPointAtCenter
          autoAdjustOverflow
          getPopupContainer={() => document.querySelector('#layout')}
          trigger='click'
          visible={visiblePopoverKeyForSliceSetting === slice.id}
          onVisibleChange={_.noop}
          content={
            <CommonDruidFieldPanelForSliceSetting
              className='mw460 global-filters-setting-panel'
              uniqFilter
              slice={slice}
              dashboards={dashboards0}
              projectId={slice && slice.druid_datasource_id}
              getPopupContainer={() => document.querySelector('#layout')}
              mainTimeDimFilterDeletable
              timePickerProps={{}}
              dataSourceId={slice.druid_datasource_id}
              headerDomMapper={_.noop}
              settings={
                _.get(currentSliceSettings, `${activeKey}${slice.id}`) ||
                _.get(slicesSettings, `${activeKey}${slice.id}`) ||
                _.get(currentDashboard, `params.jumpConfiguration.${slice.id}`, [])
              }
              dimensionOptionFilter={dbDim => !_.get(dbDim, 'params.type')}
              onSettingsChange={nextSliceSettings => {
                this.setState({
                  currentSliceSettings: { [`${activeKey}${slice.id}`]: nextSliceSettings }
                })
              }}
            />
          }
        >
          <SettingOutlined
            title='设置配置信息'
            type='setting'
            className='color-grey iblock hover-color-main font16 mg1x'
            onClick={() => {
              let { visiblePopoverKeyForSlice } = this.state
              if (visiblePopoverKeyForSlice) return message.warning('请先关闭设置筛选条件浮窗')
              this.setState({
                visiblePopoverKeyForSliceSetting: slice.id
              })
            }}
          />
        </Popover>
      </Auth>
    )
  }

  renderSliceFilterPicker = (mode, slice) => {
    if (mode !== 'show') return null
    let { slicesFilters, currentSliceFilter, visiblePopoverKeyForSlice, localThemeGrop, currentDashboard, activeKey } = this.state
    let localTheme = _.get(localThemeGrop, `${activeKey}`, '')
    let currentTheme = localTheme ? localTheme : _.get(currentDashboard, 'params.theme')
    return (
      <Auth auth='/app/dashboards/global-filter'>
        <Popover
          overlayStyle={{ zIndex: 1 }}
          title={[
            <span key='title' className='font16 mg2r'>
              设置筛选条件，关闭对话框后生效
            </span>,
            <Icon
              key='close'
              type='close-circle-o'
              className='fright fpointer font18 color-red'
              onClick={() => {
                if (this.isFlitersEqual(currentSliceFilter, slicesFilters)) {
                  return this.setState({ visiblePopoverKeyForSlice: '' })
                }
                this.setState(
                  {
                    visiblePopoverKeyForSlice: '',
                    slicesFilters: {
                      ...slicesFilters,
                      [`${activeKey}${slice.id}`]: _.get(currentSliceFilter, `${activeKey}${slice.id}`) || _.get(slicesFilters, `${activeKey}${slice.id}`)
                    }
                  },
                  () => {
                    message.info('设置成功')
                  }
                )
              }}
            />
          ]}
          placement='bottom'
          arrowPointAtCenter
          getPopupContainer={() => document.getElementById('layout')}
          trigger='click'
          visible={visiblePopoverKeyForSlice === slice.id}
          onVisibleChange={_.noop}
          content={
            <CommonDruidFilterPanelForSlice
              key='filters'
              className='mw460 global-filters-setting-panel'
              uniqFilter
              projectId={slice && slice.druid_datasource_id}
              getPopupContainer={() => document.getElementById('layout')}
              mainTimeDimFilterDeletable
              timePickerProps={{}}
              dataSourceId={slice.druid_datasource_id}
              headerDomMapper={_.noop}
              filters={_.get(currentSliceFilter, `${activeKey}${slice.id}`) || _.get(slicesFilters, `${activeKey}${slice.id}`) || []}
              globalFile={[]}
              dimensionOptionFilter={dbDim => !_.get(dbDim, 'params.type')}
              onFiltersChange={nextFilters => {
                this.setState({
                  currentSliceFilter: { [`${activeKey}${slice.id}`]: nextFilters }
                })
              }}
              dropdownClassName={currentTheme === 'light' ? '' : 'dashboard-theme-dark'}
            />
          }
        >
          <Icon
            title='设置筛选条件'
            type='filter'
            className='color-grey iblock hover-color-main font16 mg1x'
            onClick={() => {
              let { visiblePopoverKeyForSliceSetting } = this.state
              if (visiblePopoverKeyForSliceSetting) return message.warning('请先关闭设置配置信息浮窗')
              this.setState({
                visiblePopoverKeyForSlice: slice.id
              })
            }}
          />
        </Popover>
      </Auth>
    )
  }

  renderGlobalFilterPicker = (mode, show) => {
    if (mode !== 'show') return null
    if (!show) return null
    let { projectCurrent } = this.props
    let { id: userId } = window.sugo.user
    let { globalFilters, _globalFilters, visiblePopoverKey, globalFile, jumpValue, jumpShow, localThemeGrop, currentDashboard, activeKey } = this.state
    let localTheme = _.get(localThemeGrop, `${activeKey}`, '')
    let currentTheme = localTheme ? localTheme : _.get(currentDashboard, 'params.theme')
    return (
      <Auth auth='/app/dashboards/global-filter'>
        <Popover
          title={[
            <span key='title' className='font16 mg2r'>
              设置全局筛选，关闭对话框后生效
            </span>,
            <Icon
              key='close'
              type='close-circle-o'
              className='fright fpointer font18 color-red'
              onClick={() => {
                this.setState({
                  visiblePopoverKey: '',
                  jumpShow: false,
                  globalFilters: _globalFilters || globalFilters,
                  _globalFilters: ''
                })
              }}
            />
          ]}
          placement='bottomRight'
          arrowPointAtCenter
          getPopupContainer={() => document.querySelector('.nav-bar')}
          trigger='click'
          visible={visiblePopoverKey === 'settingGlobalFilters' || jumpShow}
          onVisibleChange={_.noop}
          content={
            <CommonDruidFilterPanel
              activeKey={activeKey}
              jumpValue={jumpValue}
              changeGlobalFilters={this.changeGlobalFilters}
              key='filters'
              className='mw460 global-filters-setting-panel'
              uniqFilter
              projectId={ls.gets(`sugo_current_proj_id@${userId}`) || (projectCurrent && projectCurrent.id)}
              getPopupContainer={() => document.querySelector('.global-filters-setting-panel')}
              mainTimeDimFilterDeletable
              timePickerProps={{}}
              dataSourceId={(jumpValue && jumpValue.projectId) || projectCurrent.datasource_id}
              headerDomMapper={_.noop}
              filters={_globalFilters || globalFilters || []}
              globalFile={globalFile || []}
              dimensionOptionFilter={dbDim => !_.get(dbDim, 'params.type')}
              onFiltersChange={nextFilters => {
                this.setState({
                  _globalFilters: nextFilters
                })
              }}
              dropdownClassName={currentTheme === 'light' ? '' : 'dashboard-theme-dark'}
            />
          }
        >
          <Button
            title='全局筛选覆盖'
            style={{
              fontSize: '18px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              border: 'none',
              padding: '0px'
            }}
            className={classNames('inline mg1r filter-btn border-none-btn', {
              'color-blue bold': !_.isEmpty(globalFilters),
              'color-gray bold': _.isEmpty(globalFilters)
            })}
            onClick={() => {
              this.setState({
                visiblePopoverKey: 'settingGlobalFilters'
              })
            }}
          >
            {<FilterOutlined />}
          </Button>
        </Popover>
      </Auth>
    )
  }

  renderGlobalPicker = mode => {
    if (mode === 'show') return null

    let { projectCurrent } = this.props
    let { globalFile, globalPickervisible } = this.state
    let hideDashboardList = _.get(this.props, 'location.query.hideDashboardList', '')
    let searchParams = window.location.search.split('value=')
    searchParams = searchParams.length === 2 ? JSON.parse(decompressUrlQuery(searchParams[1])) : {}
    if (hideDashboardList) {
      return
    }
    return (
      <Popover
        title={[
          <span key='title' className='font16 mg2r'>
            设置全局筛选字段
          </span>,
          <Icon
            key='close'
            type='close-circle-o'
            className='fright fpointer font18 color-red'
            onClick={() => {
              this.setState({
                globalPickervisible: false
              })
            }}
          />
        ]}
        placement='bottomRight'
        arrowPointAtCenter
        getPopupContainer={() => document.querySelector('.nav-bar')}
        trigger='click'
        visible={globalPickervisible}
        onVisibleChange={_.noop}
        content={
          <CommonDruidFieldPanel
            className='mw460 global-filters-setting-panel'
            uniqFilter
            projectId={projectCurrent && projectCurrent.id}
            getPopupContainer={() => document.querySelector('.global-filters-setting-panel')}
            mainTimeDimFilterDeletable
            timePickerProps={{}}
            dataSourceId={projectCurrent.datasource_id}
            headerDomMapper={_.noop}
            filters={globalFile || []}
            dimensionOptionFilter={dbDim => !_.get(dbDim, 'params.type')}
            onFiltersChange={nextFilters => {
              this.setState({
                globalFile: nextFilters
              })
            }}
          />
        }
      >
        <Button
          title='全局筛选覆盖'
          // icon={<FilterOutlined />}
          className='inline mg1r bor border-none-btn'
          style={{ padding: '0px' }}
          onClick={() => {
            this.setState({
              globalPickervisible: true
            })
          }}
        >
          <img src={filterBtnUrl} style={{ width: '20px', height: '20px' }} />
        </Button>
      </Popover>
    )
  }

  renderButtons = (mode, currentDashboard) => {
    let { id, created_by, authorization_permissions_type } = currentDashboard || {}
    // 如果是分享的话，会有iframe，会带有一个名字叫做isSharePage为true的字段
    let isShare = new RegExp('isSharePage=true').test(window.location.href)
    // 因为此处会自动登录，所以修改为如果是分享的，则不允许修改
    let userId = window.sugo.user.id
    let owned = (userId === created_by && !isShare) || (authorization_permissions_type === AUTHORIZATION_PERMISSIONS_TYPE.write && !isShare)

    return (
      <div>
        <div className='alignright'>
          {this.renderGlobalFilterPicker(mode, owned)}
          {/*this.renderGlobalPicker(mode)*/}
          {/* {this.renderSliceSearch()} */}
          {this.renderSaveButton(mode, id)}
          {this.renderModeBtn(mode)}
          {this.renderEditBtn(currentDashboard, mode, owned)}
          {this.renderDelBtn(currentDashboard, owned)}
        </div>
      </div>
    )
  }

  renderLeftMenu = (mode, slices, currentDashboard) => {
    let {
      dashboards,
      datasourceCurrent,
      dashboardsCategory,
      projectCurrent,
      params = {},
      setCategoryVisable,
      selectCategory,
      selectDashboard,
      changeState,
      isClickCategory,
      projectList
    } = this.props
    if (mode !== 'edit') {
      // 查看发布的看板时，隐藏左侧看板列表
      let hideDashboardList = _.get(this.props, 'location.query.hideDashboardList', '')
      if (hideDashboardList) {
        return null
      }
      return (
        <DashboardList
          setCategoryVisable={setCategoryVisable}
          selectCategory={selectCategory}
          selectDashboard={selectDashboard}
          isClickCategory={isClickCategory}
          changeState={changeState}
          dashboards={dashboards}
          dashboardsCategory={dashboardsCategory}
          datasourceCurrent={datasourceCurrent}
          projectCurrent={projectCurrent}
          currentDashboard={currentDashboard}
          reoloadDashBoardCategory={this.props.getDashboardsCategory}
          dashboardId={params.dashboardId}
          projectList={projectList}
        />
      )
    }
    return (
      <DashboardSliceList
        {...{
          mode,
          slices,
          datasourceCurrent,
          addSliceToDashboard: this.addSliceToDashboard,
          removeSliceFromDashboard: this.removeSliceFromDashboard,
          currentDashboard
        }}
      />
    )
  }

  //新增tabs功能
  removeTab = targetKey => {
    let { activeKey } = this.state
    let lastIndex
    this.state.panes.forEach((pane, i) => {
      if (pane.id === targetKey) {
        lastIndex = i - 1
      }
    })
    const panes = this.state.panes.filter(pane => pane.id !== targetKey)
    if (panes.length && activeKey === targetKey) {
      if (lastIndex >= 0) {
        activeKey = panes[lastIndex].id
      } else {
        activeKey = panes[0].id
      }
    }
    this.props.changeState({ selectDashboard: activeKey })
    browserHistory.replace(`${listPath}/${activeKey}`)
    this.setState({ panes, activeKey })
  }

  checkPassWord = v => {
    const md5val = CryptoJS.MD5(v).toString()
    if (md5val === window.sugo.password) {
      this.setState({ isValid: true })
    } else {
      message.error('密码错误')
    }
  }

  renderPasswordValidPanel = () => {
    const { cdn, siteName, loginLogoName } = window.sugo
    let logoPath = loginLogoName.includes('/') ? `${cdn}${loginLogoName}` : `${cdn}/static/images/${loginLogoName}`
    if (_.startsWith(loginLogoName, 'http')) {
      logoPath = loginLogoName
    }
    return (
      <div id='universe-wrapper'>
        <div id='check-content'>
          <div
            style={{
              width: '500px',
              margin: 'auto',
              marginTop: 'calc(50vh - 199px)'
            }}
          >
            <h1 className='aligncenter mg3b'>
              <img className='iblock mw200' src={logoPath} alt={siteName} />
            </h1>
            <div className='check-panel'>
              <div className='check-panel-body pd3x pd3y'>
                <FormItem>
                  <Input.Group compact>
                    <Input.Password
                      placeholder='输入查看密码'
                      style={{ width: 'calc(100% - 60px)' }}
                      onChange={e => {
                        this.setState({ inputValue: e.target.value })
                      }}
                      onPressEnter={e => {
                        this.checkPassWord(e.target.value)
                      }}
                    />
                    <Button
                      type='primary'
                      style={{ width: '60px' }}
                      onClick={() => {
                        this.checkPassWord(this.state.inputValue)
                      }}
                    >
                      确定
                    </Button>
                  </Input.Group>
                </FormItem>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  render() {
    let { loading, slices, roles, institutions, institutionsTree, location } = this.props
    let shouldHideProjectSelectorAndService = _.get(location, ['query', 'isSharePage'])
    let { mode, currentDashboard, isValid, panes, targetTheme } = this.state
    if (this.props.location.pathname.indexOf('new') > -1) mode = 'edit'

    // 查看发布的看板时，隐藏左侧看板列表
    let hideDashboardList = _.get(this.props, 'location.query.hideDashboardList', '')
    let hideTopNavigator = _.get(this.props, 'location.query.hideTopNavigator', '')

    //  发布看板加密
    if (hideDashboardList && window.sugo.password && !isValid) {
      return <div>{this.renderPasswordValidPanel()}</div>
    }
    // always-display-scrollbar
    return (
      <div className={classNames('dashboard-wrap dashboard-layout height-100 mode-' + mode, { 'viewing-shared-dashboard': hideDashboardList })}>
        <DashboardShare
          ref={ref => (this.dashboardShare = ref)}
          afterShare={this.afterShare}
          theme={this.state.targetTheme}
          roles={roles}
          institutions={institutions}
          institutionsTree={institutionsTree}
        />
        {this.renderModal()}
        <div className='height-100'>
          <Spin spinning={loading} wrapperClassName='height-100'>
            <div className='relative form-wrapper height-100' style={{ minHeight: window.innerHeight - 48 }}>
              {this.renderLeftMenu(mode, slices, currentDashboard)}
              <div
                ref={this.slicesBody}
                className={`slices-body dashboard-theme-${targetTheme} height-100 always-display-scrollbar`}
                style={hideDashboardList && mode !== 'edit' ? { marginLeft: 0, overflowY: 'auto' } : { overflowY: 'auto' }}
              >
                {
                  <div className='navs-and-buttons-wrapper' style={{ width: 'calc(100%-600px)' }}>
                    {mode === 'edit' || panes.length === 1 ? (
                      <Tooltip title={_.get(currentDashboard, 'dashboard_title') || _.get(panes[0], 'title') || ''}>
                        <div
                          className='curboard_label iblock elli mw220 '
                          // style={{display:this.state.sliceBoxSize==='small'?'none':undefined}}
                        >
                          {_.get(currentDashboard, 'dashboard_title') || _.get(panes[0], 'title') || ''}
                        </div>
                      </Tooltip>
                    ) : (
                      <Tabs
                        hideAdd
                        onChange={activeKey => {
                          this.props.changeState({ selectDashboard: activeKey })
                          browserHistory.replace(`${listPath}/${activeKey}`)
                          this.setState({ activeKey })
                        }}
                        activeKey={this.state.activeKey}
                        type='editable-card'
                        onEdit={this.removeTab}
                        style={{ minWidth: mode === 'edit' ? '310px' : undefined, width: mode === 'edit' ? '310px' : undefined }}
                        className='dashboard-tabs'
                      >
                        {panes.map(pane => {
                          if (panes.length === 1) {
                            return <TabPane tab={<span className='text-span'>{pane.title}</span>} key={pane.id} closable={false} />
                          } else {
                            return <TabPane tab={<span className='text-span'>{pane.title}</span>} key={pane.id} />
                          }
                        })}
                      </Tabs>
                    )}
                    {hideTopNavigator ? (
                      <div className='nav-bar'>
                        <div className='fix line-height42'>
                          {this.renderTitle(mode, currentDashboard)}
                          <div className='btns-spliter' />
                          {this.renderButtons(mode, currentDashboard)}
                          {_.isEmpty(window.parent.location.search) || shouldHideProjectSelectorAndService ? null : (
                            <div className=''>
                              <div className='alignright'>
                                <Button
                                  onClick={() => {
                                    window.history.go(-1)
                                  }}
                                >
                                  返回上一级
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className='nav-bar'>
                        <div className='fix line-height42'>
                          {this.renderTitle(mode, currentDashboard)}
                          <div className='btns-spliter' />
                          {this.renderButtons(mode, currentDashboard)}
                          {hideDashboardList && !_.isEmpty(window.parent.location.search) && !shouldHideProjectSelectorAndService ? (
                            <div className=''>
                              <div className='alignright'>
                                <Button
                                  onClick={() => {
                                    window.history.go(-1)
                                  }}
                                >
                                  返回上一级
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                }
                <div id='layout' className='form-box'>
                  {this.renderCenterDom()}
                </div>
              </div>
            </div>
          </Spin>
        </div>
      </div>
    )
  }
}
