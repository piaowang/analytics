import React, {Component} from 'react'
import { CloseOutlined, DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons';
import {
  Button,
  Collapse,
  Dropdown,
  Input,
  InputNumber,
  Menu,
  notification,
  message,
  Select,
  Tooltip,
  Modal,
  Row,
  Col,
  Popconfirm,
} from 'antd';
import EditorPanelDataPopover from './editor-panel-data-popover'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import * as actions from './actions/workbench'
import FixWidthHelper from '../Common/fix-width-helper-no-hidden'
import {DruidColumnTypeInverted, DruidNativeType, isTimeDimension} from '../../../common/druid-column-type'
import DateRangePicker from '../Common/time-picker'
import DimensionSettingPopover from '../Analytic/dimension-setting-popover'
import FilterSettingPopover from '../Analytic/filter-setting-popover'
import MetricFormatSettingModal from '../Analytic/metric-format-setting-modal'
import {
  aggregationTypeForNumberDimension,
  aggregationTypeForStringDimension,
  aggregationTypeNameDict,
  dbMetricAdapter,
  numberFormulaGenerator,
  singleDbMetricAdapter,
  stringFormulaGenerator
} from '../../../common/temp-metric'
import {convertDateType, isRelative} from '../../../common/param-transform'
import SlicePicker from './slice-picker'
import _ from 'lodash'
import moment from 'moment'
import EditorGroup from './editor-group'
import {generate} from 'shortid'
import Fetch from '../../common/fetch-final'
import PubSub from 'pubsub-js'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import {LiveScreenSliceDataAccessTypeEnum, warnIndextype, warnOpType} from './constants'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {immutateUpdate, immutateUpdates, isDiffByPath, isDiffBySomePath} from '../../../common/sugo-utils'
import FiltersEditModal from './filters-edit-modal'
import FiltersDisplayPanel from './filters-display-panel'
import JsCodeEditor from './js-code-editor/jsCodeEditor'
import ColorPicker from '../Common/color-picker'
import ViewModal from './view-modal'
import CodeEditor from './panel-utils/code-editor'

const MenuDivider = Menu.Divider
const MenuItem = Menu.Item
const SubMenu = Menu.SubMenu
const Option = Select.Option
const Panel = Collapse.Panel

const {
  demoVideoSource = ''
} = window.sugo

function genEmptySlice() {
  return {
    druid_datasource_id: null,
    offline_calc_table_id: null,
    params: {
      timezone: 'Asia/Shanghai',
      tempMetricDict: {},
      vizType: 'number',
      filters: [],
      dimensions: [],
      metrics: [],
      dimensionExtraSettingDict: {}
    }
  }
}

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 16 }
}

//Leon 20170412
@withContextConsumer(ContextNameEnum.ProjectInfo)
@connect(
  (state, ownProps) => {
    let {activedId, screenComponents, dimensionList, measureList} = state.livescreen_workbench
    return {
      ...state.livescreen_workbench,
      currScreenComp: _.find(screenComponents, sc => sc.id === activedId),
      dimNameDict: _.keyBy(dimensionList, 'name'),
      measureNameDict: _.keyBy(measureList, 'name')
    }
  },
  dispatch => bindActionCreators(actions, dispatch)
)
export default class EditorPanelData extends Component {
  state = {
    visiblePopoverKey: '',
    offlineCalcDataSourceId: null,
    initLoad: true,
    timeUnit: 'second',
    interval: 10,
    sliceInfo: {},
    isViewModal: false
  }

  componentDidMount() {
    this.loadDataSourceList()
    this.onDefaultStateFromRedux()
  }

  loadDataSourceList = () => {
    //获取所有的项目列表
    let {accessDataType, getProjectList, getOfflineCalcDsAndTables} = this.props
    if (accessDataType === LiveScreenSliceDataAccessTypeEnum.project) {
      getProjectList()
    } else if (accessDataType === LiveScreenSliceDataAccessTypeEnum.external) {
      getOfflineCalcDsAndTables()
    }
  }

  componentDidUpdate(prevProps, prevState) {
    //主要切换图表
    if (this.props.activedId !== prevProps.activedId) {
      this.onDefaultStateFromRedux()
    }
    if (isDiffBySomePath(this.state.sliceInfo, prevState.sliceInfo, 'druid_datasource_id', 'offline_calc_table_id')) {
      let {druid_datasource_id, offline_calc_table_id} = this.state.sliceInfo
      //根据最新的dataSourceId发请求获取measureList跟dimensionList
      this.props.getMeasureList({
        dataSourceId: druid_datasource_id,
        offlineCalcTableId: offline_calc_table_id
      })
      this.props.getDimensionList({
        dataSourceId: druid_datasource_id,
        offlineCalcTableId: offline_calc_table_id
      })
    }
    if (isDiffByPath(this.props, prevProps, 'accessDataType')) {
      this.loadDataSourceList()
    }
  }

  //根据当前的选中的图表，把数据从redux传到state中
  //主要原因是保存到数据库的字段只是Druid需要的请求结构,可是在这页面上的渲染Dimension,Filter跟Measure/Matrix的Popover需要其他字段
  onDefaultStateFromRedux = async () => {
    let {offlineCalcTables, currScreenComp} = this.props
    if (!currScreenComp
      || (!_.get(currScreenComp, 'params.druid_datasource_id') && !_.get(currScreenComp, 'params.offline_calc_table_id'))) {
      //主要是demo数据的话或者新建的图表，就没必要fetch Request请求
      let sliceInfo = _.cloneDeep(currScreenComp) || {}
      if(!_.isEmpty(sliceInfo)) {
        _.set(sliceInfo, 'params.vizType', sliceInfo.type)
      }
      this.setState({sliceInfo})
      return false
    }
    const {
      customMetrics = [],
      druid_datasource_id = null,
      offline_calc_table_id = null,
      tempMetricDict = {}
    } = currScreenComp.params || {}

    // TODO 将 screen component 转换成 slice

    // 兼容旧数据，重建 tempMetricDict
    let tempMetricDictRebuild = !_.isEmpty(tempMetricDict) ? tempMetricDict : _.reduce(customMetrics.filter(m => _.startsWith(m, '_tempMetric_')),
      (acc, curr) => {
        const dimensionName = curr.substring(12, curr.length - 10)//curr.name.replace(/_tempMetric_/g, '').split('_')[0]
        // const dimensionDetail = dimensionList.find(d => d.name === dimensionName)
        acc[curr.name] = {
          dimension: dimensionName,
          title: dimensionName,
          // dimType: dimensionDetail ? dimensionDetail.type : null, TODO dimType 延迟确定
          aggregationType: 'count',
          format: null,
          excludeNull: false
        }
        return acc
      }, {})

    const nextState = {
      offlineCalcDataSourceId: offline_calc_table_id && _(offlineCalcTables)
        .chain()
        .find(t => t.id === offline_calc_table_id)
        .get('data_source_id')
        .value(),
      initLoad: false,
      sliceInfo: {
        ...currScreenComp,
        druid_datasource_id,
        offline_calc_table_id,
        params: {
          ...currScreenComp.params,
          vizType: currScreenComp.type,
          tempMetricDict: tempMetricDictRebuild
        }
      }
    }
    this.setState(nextState)
  }

  //选择项目时触发
  onProjectSelect = async (dsId) => {
    //应该不需要了，不会出现这情况，就放着这notifcation.error吧，以防万一,开始创建的图表都是从２开始递增
    if (!this.props.activedId) {
      notification.error({
        message: '选择单图',
        description: '请选择单图,单图不能为空'
      })
      return false
    }
    //同步dataSourceId到redux里头去
    await this.onSetScreenComponentByActiveIndex('druid_datasource_id', dsId)
  }

  onExternalTableSelect = async offlineCalcTableId => {
    await this.onSetScreenComponentByActiveIndex('offline_calc_table_id', offlineCalcTableId)
  }

  //点击［维度］的 "+" Icon 时触发
  toggleDimensionModal = async (visible) => {
    let {druid_datasource_id, offline_calc_table_id} = this.state.sliceInfo
    if (!(druid_datasource_id || offline_calc_table_id)) {
      notification.error({
        message: '选择项目',
        description: '请选择项目'
      })
      return
    }
    this.onDimensionPopoverVisibleChange(visible)
  }

  //点击［指标］的 "+" Icon 时触发
  toggleMeasureModal = async (visible) => {
    let {druid_datasource_id, offline_calc_table_id} = this.state.sliceInfo
    if (!(druid_datasource_id || offline_calc_table_id)) {
      notification.error({
        message: '选择项目',
        description: '请选择项目'
      })
      return
    }
    this.onMeasurePopoverVisibleChange(visible)
  }

  //点击［筛选条件］的 "+" Icon 时触发
  toggleFilterModal = async (visible) => {
    let {druid_datasource_id, offline_calc_table_id} = this.state.sliceInfo
    if (!(druid_datasource_id || offline_calc_table_id)) {
      notification.error({
        message: '选择项目',
        description: '请选择项目'
      })
      return
    }
    this.onFilterPopoverVisibleChange(visible)
  }

  onDimensionPopoverVisibleChange = (visible) => {
    this.setState({
      visiblePopoverKey: visible ? 'dimensionPopover' : ''
    })
  }

  onMeasurePopoverVisibleChange = (visible) => {
    this.setState({
      visiblePopoverKey: visible ? 'measurePopover' : ''
    })
  }

  onFilterPopoverVisibleChange = (visible) => {
    this.setState({
      visiblePopoverKey: visible ? 'filterPopover' : ''
    })
  }

  /**
   * ['City','Extras']
  */
  //用户在勾选完了[维度]后触发的函数
  onDimensionOk = async (selectedIdList) => {
    let [dimensions] = selectedIdList
    await this.onSetScreenComponentByActiveIndex('dimensions', dimensions)
  }

  //用户在勾选完了[指标]后触发的函数
  onMeasureOk = async ([nextMetrics, addCustomMetricsDimName]) => {
    let {dimNameDict} = this.props
    let {sliceInfo} = this.state
    let tempMetricDict = _.get(sliceInfo, 'params.tempMetricDict') || {}
    let preCreateTempMetricModels = _.map(addCustomMetricsDimName, dimName => {
      let dim = dimNameDict[dimName] || {name: dimName}
      return {
        dimension: dim.name,
        title: dim.title || dim.name,
        format: null,
        excludeNull: false,
        aggregationType: 'count',
        dimType: dim.type
      }
    })
    let preCreateCustomMetrics = _.map(addCustomMetricsDimName, dimName => {
      return {
        //去掉下划线因为之后的处理要拿name,逻辑是跟着split("_")需要是没有下划线的
        name: `_tempMetric_${dimName}_${generate()}`,//.replace(/_/g, '-')
        formula: '$main.count()'
      }
    })
    let nextTempMetricDict = {
      ...tempMetricDict,
      ..._.zipObject(preCreateCustomMetrics.map(m => m.name), preCreateTempMetricModels)
    }

    nextMetrics = nextMetrics.concat(preCreateCustomMetrics.map(tmm => tmm.name))
    await this.onSetScreenComponentByActiveIndex('metrics', nextMetrics)
    await this.onSetScreenComponentByActiveIndex('tempMetricDict', _.pick(nextTempMetricDict, nextMetrics))
  }

  //用户在勾选完了[筛选]后触发的函数
  onFilterOk = ([selectedDimNames]) => {
    let {dimNameDict} = this.props
    const { sliceInfo } = this.state
    const accumulatedFilters = _.get(sliceInfo, 'params.filters', [])

    const newAccumulatedFilters = selectedDimNames.map((dimName) => {
      let dbDim = dimNameDict[dimName]
      let existingFilter = accumulatedFilters.find(af => af.col === dimName)
      //如果已经有数据了，就不覆盖，没有的话，就else创建新的筛选数据格式
      return existingFilter || {
        col: dimName,
        op: 'in',
        eq: isTimeDimension(dbDim) ? '-1 days' : [],
        type: DruidColumnTypeInverted[dbDim.type] || 'string'
      }
    })

    this.onSetScreenComponentByActiveIndex('filters', newAccumulatedFilters)
  }

  //渲染[维度]的DimensionSettingPopover,点击后就跟自助分析的一样
  renderDimensionArea() {
    let {dimNameDict, measureNameDict, currScreenComp} = this.props
    let { sliceInfo } = this.state
    let { dimensionExtraSettingDict, metrics, dimensions, tempMetricDict } = sliceInfo.params || {}

    if (_.isEmpty(dimensions)) {
      return <div className="pd2x pd3y">未添加维度</div>
    }

    let dbMeasures = _.map(_.filter(metrics, m => !/^_(temp|local)Metric_/.test(m)), mName => measureNameDict[mName])
    return dimensions.map(dName => {
      const sdd = dimNameDict[dName]
      const {title: dTitle} = sdd || {}
      return (
        <DimensionSettingPopover
          key={dName}
          visible={this.state.visiblePopoverKey === `dimensionBlockPopover:${dName}`}
          onVisibleChange={visible => {
            this.setState({
              visiblePopoverKey: visible ? `dimensionBlockPopover:${dName}` : ''
            })
          }}
          value={dimensionExtraSettingDict && dimensionExtraSettingDict[dName] || {
            limit: 10,
            sortDirect: 'desc',
            sortCol: _.first(metrics) || dName
          }}
          sortOptions={sdd ? [sdd, ...dbMeasures, ...dbMetricAdapter(tempMetricDict)] : []}
          onChange={newSetting => {
            let next = _.pickBy(dimensionExtraSettingDict || {}, (dimExtraSetting, dimName) => {
              return dimExtraSetting.sortCol !== dName && !isFinite(+dimName) /* 旧数据的 key 有数值，排除掉*/
            })
            this.onSetScreenComponentByActiveIndex('dimensionExtraSettingDict', {
              ...next,
              [dName]: newSetting
            })
          }}
          maxLimit={50}
        >
          <FixWidthHelper
            toFix="last"
            toFixWidth="20px"
            className="tile"
            //draggable
            //onDragStart={ev => {
            //  ev.dataTransfer.setData('text', `维度:${d.name}`)
            //}}
          >
            <div style={{marginLeft: 10}}>{dTitle || dName}</div>
            <CloseOutlined
              className="pointer"
              onClick={async (ev) => {
                ev.stopPropagation()
                const nextDimensions = dimensions.filter(n => n !== dName)
                await this.onSetScreenComponentByActiveIndex('dimensions', nextDimensions)

                let nextDimensionExtraSettingDict = _.pickBy(dimensionExtraSettingDict, desd => desd.sortCol !== dName)
                await this.onSetScreenComponentByActiveIndex('dimensionExtraSettingDict', nextDimensionExtraSettingDict)
              }} />
          </FixWidthHelper>
        </DimensionSettingPopover>
      );
    });
  }


  //渲染[指标]
  renderMetrics() {
    let { params: { metrics } } = this.props.currScreenComp

    if (_.isEmpty(metrics)) {
      return (
        <div className="pd2x pd3y">未添加指标</div>
      )
    }
    return [
      this.renderMeasureArea(),
      this.renderCustomMeasureArea()
    ]
  }

  //渲染[预设指标]的块
  renderMeasureArea() {
    let {measureList} = this.props
    let { sliceInfo } = this.state
    let { metrics } = sliceInfo.params || {}

    let measureNameDict = _.keyBy(measureList, 'name')
    return _.map(metrics, metricName => {
      let smd = measureNameDict[metricName]
      if (!smd) {
        return null
      }
      return this.measureTitleGen(smd, async () => {
        const nextMetrics = metrics.filter(md => md !== metricName)
        await this.onSetScreenComponentByActiveIndex('metrics', nextMetrics)
        await this.onSetScreenComponentByActiveIndex('tempMetricDict', _.pick(nextMetrics, nextMetrics))
      })
    })
  }

  measureTitleGen(m, onClickFunc) {
    return (
      <FixWidthHelper
        key={m.name}
        toFix="last"
        toFixWidth="20px"
        className="tile"
        draggable
      //onDragStart={ev => {
      //ev.dataTransfer.setData('text', `指标:${m.name}`)
      //}}
      >
        <div style={{ marginLeft: 10 }}>{m.title || m.name}</div>
        <CloseOutlined
          className="pointer"
          onClick={ev => {
            ev.stopPropagation()
            onClickFunc()
          }} />
      </FixWidthHelper>
    );
  }

  setMetricSortDirect(metricName, sortDirect) {
    let nextSortDirect = sortDirect === 'asc' || sortDirect === 'desc' ? sortDirect : null

    let sliceInfo = this.state.sliceInfo
    let {dimensions, dimensionExtraSettingDict} = sliceInfo.params
    let next = (dimensions || []).reduce((acc, curr) => {
      acc[curr] = acc[curr] || {limit: 10}
      return acc
    }, {...dimensionExtraSettingDict})

    next = _.mapValues(next, val => {
      return {...val, sortCol: metricName, sortDirect: nextSortDirect}
    })
    this.onSetScreenComponentByActiveIndex('dimensionExtraSettingDict', next)
  }

  getMetricSortDirect(metricName) {
    // 取得排序，如果所有的维度都是按这个指标排序，并且方向相同，则能够取得排序；否则为默认排序
    let { sliceInfo } = this.state
    let { dimensionExtraSettingDict, dimensions } = sliceInfo.params || {}

    if (_.every(dimensions, xAxisName => _.get(dimensionExtraSettingDict, `${xAxisName}.sortCol`) === metricName)) {
      let sortDirs = _.uniq(dimensions.map(dimName => _.get(dimensionExtraSettingDict, `${dimName}.sortDirect`)))
        .filter(_.identity)
      if (sortDirs.length === 1) {
        return sortDirs[0]
      }
    }
    return 'default'
  }

  renderStringMetricDropDownMenu(metricName, tempMetricModel) {
    //static
    let sortDir = this.getMetricSortDirect(metricName)
    let { sliceInfo } = this.state
    let { tempMetricDict } = sliceInfo.params || {}

    let onMenuItemClick = menuEv => {
      tempMetricDict = {...tempMetricDict}

      if (menuEv.key === 'excludeNull') {
        tempMetricDict[metricName].excludeNull = !tempMetricDict[metricName].excludeNull
      } else if (menuEv.key === 'formatSettings') {
        // 设置数值显示格式
        this.setState({
          visiblePopoverKey: `customMetricFormatModal:${metricName}`
        })
        return false
      } else if (menuEv.keyPath.length === 2) {
        //排序-默认，升序，降序
        this.setMetricSortDirect(metricName, menuEv.key)
        this.setState({
          visiblePopoverKey: ''
        })
        //就不会触发下面以下的state
        return false

      } else {
        let formulaGenerator = stringFormulaGenerator(tempMetricModel.excludeNull)
        if (menuEv.key in formulaGenerator) {
          // 切换公式，如果维度不是数字类型，无法使用 求和、平均值、最大和最小值
          tempMetricDict[metricName].aggregationType = menuEv.key
        }
      }

      this.setState({
        visiblePopoverKey: ''
      })
      this.onSetScreenComponentByActiveIndex('tempMetricDict', tempMetricDict)
    }

    return (
      <Menu
        selectedKeys={[sortDir, tempMetricModel.aggregationType]}
        onClick={onMenuItemClick}
      >
        {aggregationTypeForStringDimension.map(aggTypeName => {
          return (
            <MenuItem key={aggTypeName}>{aggregationTypeNameDict[aggTypeName]}</MenuItem>
          )
        })}
        {/* <MenuDivider /> */}
        {/* <MenuItem key="excludeNull">{`排除空值（${tempMetricModel.excludeNull ? '开启' : '关闭'}）`}</MenuItem> */}
        {/* <MenuDivider /> */}
        <SubMenu key="sortDirect" title="排序">
          <MenuItem key="default">默认</MenuItem>
          <MenuItem key="asc">升序</MenuItem>
          <MenuItem key="desc">降序</MenuItem>
        </SubMenu>
        {/* <MenuItem key="formatSettings">指标显示格式</MenuItem> */}
      </Menu>
    )

  }

  renderNumberMetricDropDownMenu(metricName, tempMetricModel) {
    //static
    let sortDir = this.getMetricSortDirect(metricName)
    let { sliceInfo } = this.state
    let { tempMetricDict } = sliceInfo.params || {}

    let onMenuItemClick = menuEv => {
      tempMetricDict = {...tempMetricDict}
      if (menuEv.key === 'excludeNull') {
        tempMetricDict[metricName].excludeNull = !tempMetricDict[metricName].excludeNull
      } else if (menuEv.key === 'formatSettings') {
        // 设置数值显示格式
        this.setState({
          visiblePopoverKey: `customMetricFormatModal:${metricName}`
        })
        return false
      } else if (menuEv.keyPath.length === 2) {
        //排序-默认，升序，降序
        this.setMetricSortDirect(metricName, menuEv.key)
        this.setState({
          visiblePopoverKey: ''
        })
        //就不会触发下面以下的state
        return false

      } else {
        let formulaGenerator = numberFormulaGenerator(tempMetricModel.excludeNull)
        if (menuEv.key in formulaGenerator) {
          // 切换公式，如果维度不是数字类型，无法使用 求和、平均值、最大和最小值
          tempMetricDict[metricName].aggregationType = menuEv.key
        }
      }

      this.setState({
        visiblePopoverKey: ''
      })
      this.onSetScreenComponentByActiveIndex('tempMetricDict', tempMetricDict)
    }

    return (
      <Menu
        selectedKeys={[sortDir, tempMetricModel.aggregationType]}
        onClick={onMenuItemClick}
      >
        {aggregationTypeForNumberDimension.filter(p => p !== 'last').map(aggTypeName => {
          return (
            <MenuItem key={aggTypeName}>{aggregationTypeNameDict[aggTypeName]}</MenuItem>
          )
        })}
        {/* <MenuDivider /> */}
        {/* <MenuItem key="excludeNull">{`排除空值（${tempMetricModel.excludeNull ? '开启' : '关闭'}）`}</MenuItem> */}
        {/* <MenuDivider /> */}
        <SubMenu key="sortDirect" title="排序">
          <MenuItem key="default">默认</MenuItem>
          <MenuItem key="asc">升序</MenuItem>
          <MenuItem key="desc">降序</MenuItem>
        </SubMenu>
        {/* <MenuItem key="formatSettings">指标显示格式</MenuItem> */}
      </Menu>
    )

  }

  //渲染[自定义指标]的块
  renderCustomMeasureArea() {
    /* tempMetricModel: {
      dimension: '',
      title: '',
      format: '',
      excludeNull: false
      aggregationType: 'count',
      dimType: 0,
      customMetrics: {
        name: 'Network'
        formula: $main.count()
      }
    } */
    let { sliceInfo, visiblePopoverKey } = this.state
    let { metrics, tempMetricDict } = sliceInfo.params || {}

    return (metrics || []).filter(m => _.startsWith(m, '_tempMetric_')).map((metricName, index) => {
      let tmm = tempMetricDict[metricName]
      if (!tmm) {
        return null
      }
      let { formula, title } = singleDbMetricAdapter(metricName, tmm)
      const menu = (
        DruidColumnTypeInverted[tmm.dimType] === 'number'
          ? this.renderNumberMetricDropDownMenu(metricName, tmm, index)
          : this.renderStringMetricDropDownMenu(metricName, tmm, index)
      )
      const visible = visiblePopoverKey === `customMetricFormatModal:${metricName}`
      return (
        <div key={metricName}>
          <MetricFormatSettingModal
            visible={visible}
            onVisibleChange={visible => {
              if (!visible) {
                this.setState({
                  visiblePopoverKey: ''
                })
              }
            }}
            value={visible && _.get(tempMetricDict, `${metricName}.format`) || ',.2f'}
            onChange={newFormat => {
              let next = immutateUpdate(tempMetricDict, [metricName, 'format'], () => newFormat)
              this.onSetScreenComponentByActiveIndex('tempMetricDict', next)
            }}
          />
          <Dropdown
            overlay={menu}
            trigger={['click']}
            visible={this.state.visiblePopoverKey === `measureBlockPopover:${metricName}`}
            onVisibleChange={visible => {
              this.setState({
                visiblePopoverKey: visible ? `measureBlockPopover:${metricName}` : ''
              })
            }}
            getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
          >
            <Tooltip
              key={metricName}
              title={formula}
              mouseEnterDelay={1.5}
            >
              {this.measureTitleGen({ name: metricName, title: title }, () => {
                let updater = this.genRemoveMetricUpdater(metricName)
                this.setState(prevState => immutateUpdate(prevState, 'sliceInfo', updater))
              })}
            </Tooltip>
          </Dropdown>
        </div>
      )
    })
  }

  genRemoveMetricUpdater = (preDelMetricName) => {
    return slice => {
      // 如果删除的指标带有本地指标，则需要移除本地指标
      let preDelLocalMetricDict = _.pickBy(slice.params.localMetricDict, lo => _.includes(lo.fromMetrics, preDelMetricName))

      let preDelMetricNames = [preDelMetricName, ...Object.keys(preDelLocalMetricDict)]
      let preDelMetricNameSet = new Set(preDelMetricNames)

      let nextState = immutateUpdate(slice, 'params.metrics', prev => prev.filter(name => !preDelMetricNameSet.has(name)))
      nextState = immutateUpdate(nextState, 'params.tempMetricDict', dict => _.omit(dict, preDelMetricName))
      nextState = immutateUpdates(nextState, 'params.localMetricDict', prevDict => _.omit(prevDict, preDelMetricNames))

      // 移除指标时，如果发现有维度使用其进行排序，则重置其排序设置
      return immutateUpdate(nextState, 'params.dimensionExtraSettingDict', dict => {
        if (!_.some(_.values(dict), dimSetting => preDelMetricNameSet.has(dimSetting.sortCol))) {
          return dict
        }
        let defaultSortCol = _.first(nextState.metrics)
        return _.mapValues(dict, setting => preDelMetricNameSet.has(setting.sortCol) ? {...setting, sortCol: defaultSortCol} : setting)
      })
    }
  }


  renderDatePicker(m) {
    const { sliceInfo } = this.state
    const accumulatedFilters = _.get(sliceInfo, 'params.filters', [])
    const flt = accumulatedFilters.find(a => a.col === m.name)
    let { eq: fltEq = '-1 days', col } = flt
    let relativeTime = isRelative(fltEq) ? fltEq : 'custom'
    let [since, until] = relativeTime === 'custom' ? fltEq : convertDateType(relativeTime)

    return (
      <div
        style={{ width: 192, height: 28, lineHeight: '24px', margin: '4px 36px 4px 0' }}
        className="itblock relative hover-display-trigger"
        key={m.id}
      >
        <div
          style={{
            position: 'absolute',
            zIndex: 4,
            top: '50%',
            transform: 'translate(-50%,-50%)',
            right: 0
          }}
          className="hover-display-iblock"
        >
          <CloseOutlined
            className="pointer bg-white"
            data-filter-col={m.id}
            onClick={() => {
              let newAccumulatedFilters = accumulatedFilters.filter(af => af.col !== m.name)
              this.onSetScreenComponentByActiveIndex('filters', newAccumulatedFilters)
            }} />
        </div>
        <DateRangePicker
          className="height-100"
          prefix={col === '__time' ? '' : `${m && m.title || col}: `}
          alwaysShowRange
          hideCustomSelection
          style={{ width: '100%' }}
          dateType={relativeTime}
          dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
          onChange={({
            dateType: relativeTime,
            dateRange: [since, until]
          }) => {
            //relativeTime, custom
            //dateRange [since, until], save into format
            let flt = {
              col: m.name,
              op: 'in',
              eq: relativeTime === 'custom' ? [since, until] : relativeTime,
              type: 'datestring'
            }

            let newAccumulatedFilters = accumulatedFilters.map(a => a.col === flt.col ? flt : a)

            this.onSetScreenComponentByActiveIndex('filters', newAccumulatedFilters)
          }}
        />
      </div>
    );
  }

  //渲染［筛选］的块
  renderFilterArea() {
    let {dimNameDict, dimensionList, accessDataType} = this.props
    const { sliceInfo } = this.state
    let {filters} = sliceInfo.params || {}

    if (_.isEmpty(filters)) {
      return <div className="pd2x pd3y">未添加筛选条件</div>
    }

    if (accessDataType === LiveScreenSliceDataAccessTypeEnum.external) {
      return (
        <FiltersDisplayPanel
          dimensionList={dimensionList}
          dimNameDict={dimNameDict}
          value={filters}
          onChange={nextFilters => this.onSetScreenComponentByActiveIndex('filters', nextFilters)}
        />
      )
    }

    return _.map(filters, (flt) => {
      let dbDim = dimNameDict[flt.col]
      if (!dbDim) {
        return null
      }
      const {name, title} = dbDim

      if (isTimeDimension(dbDim)) {
        return this.renderDatePicker(dbDim)
      }

      return (
        <FilterSettingPopover
          key={name}
          mainTimeDimName={this.props.mainTimeDimName}
          visible={this.state.visiblePopoverKey === `filterBlockPopover:${name}`}
          onVisibleChange={visible => {
            this.setState({
              visiblePopoverKey: visible ? `filterBlockPopover:${name}` : ''
            })
          }}
          dbDimension={dbDim}
          dataSourceId={sliceInfo.druid_datasource_id}
          onChange={(newFilter) => {
            let indexInFilters = _.findIndex(filters, af => af.col === newFilter.col)
            let nextFilters = immutateUpdate(filters, [indexInFilters], () => newFilter)
            this.onSetScreenComponentByActiveIndex('filters', nextFilters)
          }}
          value={flt}
          topNFilters={filters.filter(flt0 => flt0 !== flt)}
        >
          <FixWidthHelper
            key={name}
            toFix="last"
            toFixWidth="20px"
            className="tile"
            //draggable
            //onDragStart={ev => {
            //  ev.dataTransfer.setData('text', `筛选:${name}`)
            //}}
          >
            <div style={{marginLeft: 10}}>{title || name}</div>
            <CloseOutlined
              className="pointer"
              onClick={ev => {
                ev.stopPropagation()
                const newFilters = filters.filter(f => f !== flt)
                this.onSetScreenComponentByActiveIndex('filters', newFilters)
              }} />
          </FixWidthHelper>
        </FilterSettingPopover>
      );
    });
  }

  //根据当前的activeIndex去Redux 的screenComponents里头保存相对应的图表
  onSetScreenComponentByActiveIndex(objKey, value) {
    const { sliceInfo } = this.state
    if (objKey === 'druid_datasource_id' || objKey === 'offline_calc_table_id') {
      const emptySliceInfo = genEmptySlice()
      return new Promise(resolve => {
        this.setState({
          sliceInfo: {
            ..._.omit(emptySliceInfo, ['params']),
            params: {
              ...emptySliceInfo.params,
              requestProtocolParams: _.get(sliceInfo, 'params.requestProtocolParams'),
              vizType: _.get(sliceInfo, 'params.vizType', '')
            },
            [objKey]: value
          }
        }, resolve)
      })
    }
    return new Promise(resolve => {
      this.setState({
        sliceInfo: {
          ...sliceInfo,
          params: {
            ...sliceInfo.params,
            [objKey]: value
          }
        }
      }, resolve)
    })
  }

  handleChangeLineText = (text) => {
    this.props.doModifyComponent({
      id: this.props.activedId,
      params: { text }
    })
  }

  renderFilterSettingSubPanel = () => {
    let {accessDataType, dimensionList, dimNameDict } = this.props
    let {offlineCalcDataSourceId, sliceInfo} = this.state
    let { metrics, dimensions, filters } = sliceInfo.params || {}

    return (
      <EditorGroup
        key="4"
        title="筛选条件"
        extra={
          <div
            className="pd2x pointer font18"
            onClick={(e) => {
              e.stopPropagation()
              this.toggleFilterModal(true)
            }}
          >
            <PlusCircleOutlined style={{ color: '#bcc9d4' }} />
          </div>}
      >
        {this.state.visiblePopoverKey !== 'filterPopover'
          ? null
          : accessDataType === LiveScreenSliceDataAccessTypeEnum.project
            ? (
              <EditorPanelDataPopover
                popoverVisible={this.state.visiblePopoverKey === 'filterPopover'}
                onPopoverVisibleChange={this.onFilterPopoverVisibleChange}
                title="筛选条件"
                onOk={this.onFilterOk}
                sourceLayer={[{
                  options: dimensionList,
                  selectedValue: (filters || []).map(flt => dimNameDict[flt.col]).filter(_.identity)
                }]}
              />
            )
            : (
              <FiltersEditModal
                dimensionList={dimensionList}
                visible={this.state.visiblePopoverKey === 'filterPopover'}
                hideModal={() => this.setState({ visiblePopoverKey: '' })}
                value={filters}
                onChange={newFilters => {
                  this.onSetScreenComponentByActiveIndex('filters', newFilters)
                  this.setState({ visiblePopoverKey: '' })
                }}
              />
            )}
        <div className="analytic-popover">
          {this.renderFilterArea()}
        </div>
      </EditorGroup>
    );
  }

  renderRefreshFrequen() {
    let socketCacheParams = _.get(this.state.sliceInfo, 'params.socketCacheParams', {})
    const { interval: intervalBak = 1, timeUnit: timeUnitBak = 'hour' } = socketCacheParams
    const that = this

    function calcIntervalTime(timeUnit, val) {
      let intervalTime = 0
      if (timeUnit === 'second'){
        intervalTime = val * 1
      } else if (timeUnit === 'min') {
        intervalTime = val * 60
      } else if (timeUnit === 'hour') {
        intervalTime = val * 60 * 60
      }
      return intervalTime
    }

    function checkoutIntervalTime(intervalTime) {
      if (intervalTime < 60) message.error('间隔时间不能小于1分钟')
      if (intervalTime > 172800) message.error('间隔时间超出最大值：48小时')
      if (intervalTime >= 60 && intervalTime <= 172800) return true
      return false
    }

    function changeTimeInterval(interval,timeUnit, that) {
      let intervalTime = calcIntervalTime(timeUnit, interval)
      let shouldPass = checkoutIntervalTime(intervalTime)
      if (!shouldPass) {
        that.onSetScreenComponentByActiveIndex('socketCacheParams', socketCacheParams)
        return
      }

      that.onSetScreenComponentByActiveIndex('socketCacheParams', { interval, timeUnit, intervalTime })
    }

    return (
      <React.Fragment>
        <div className="access-title">刷新间隔</div>
        <div className="pd2x pd1y">
          <InputNumber
            defaultValue={60}
            min={0}
            step={5}
            value={intervalBak}
            onChange={_.debounce(val => changeTimeInterval(val, timeUnitBak, that), 300)}
          />
          <Select
            defaultValue="second"
            className="mg1l width80 height-100"
            value={timeUnitBak}
            getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
            onChange={val => changeTimeInterval(intervalBak, val, that)}
          >
            <Select.Option key={1} value="second">秒</Select.Option>
            <Select.Option key={2} value="min">分钟</Select.Option>
            <Select.Option key={3} value="hour">小时</Select.Option>
          </Select>
        </div>
      </React.Fragment>
    )
  }

  renderAccessPanel = () => {
    const selectConfig = {
      ...enableSelectSearch,
      dropdownMatchSelectWidth: false,
      allowClear: true
    }
    const {
      projectList = [],
      offlineCalcDataSources = [],
      offlineCalcTables = [],
      dimensionList = [],
      measureList = [],
      activedId,
      accessDataType,
      dimNameDict,
      measureNameDict,
      currScreenComp,
    } = this.props
    let {offlineCalcDataSourceId, sliceInfo} = this.state
    let { metrics, dimensions, filters } = sliceInfo.params || {}

    // 自动适配 offlineCalcDataSourceId
    if (!offlineCalcDataSourceId && sliceInfo.offline_calc_table_id && !_.isEmpty(offlineCalcTables)) {
      offlineCalcDataSourceId = _(offlineCalcTables)
        .chain()
        .find(t => t.id === sliceInfo.offline_calc_table_id)
        .get('data_source_id')
        .value()
    }

    return (
      <div>
        <div className="pd2l">
          {
            (_.get(sliceInfo,'params.requestProtocolParams.mode') === 'autoRefresh' || !_.get(sliceInfo,'params.requestProtocolParams.mode'))
            ? this.renderRefreshFrequen()
            : null
          }
          <div className="access-title">数据请求协议</div>
          <div className="pd2x pd1y">
            <Select
              defaultValue="socket"
              className="mg1l width120 height-100"
              value={_.get(sliceInfo,'params.requestProtocolParams.mode', 'autoRefresh')}
              getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
              onChange={val => {
                let requestProtocolParams = {
                  mode: 'fetch'
                }
                if (val === 'autoRefresh') requestProtocolParams = {
                  mode: 'autoRefresh',
                  serviceName: 'sugo_livescreen_querydruid'
                }
                this.onSetScreenComponentByActiveIndex('requestProtocolParams', requestProtocolParams)
              }}
            >
              <Select.Option key='socket' value="autoRefresh">socket</Select.Option>
              <Select.Option key='http' value="fetch">http</Select.Option>
            </Select>
          </div>
        </div>
        <div className="bottom-line">
          <Collapse bordered={false} defaultActiveKey={['1', '2', '3', '4', '5']}>
            {accessDataType === LiveScreenSliceDataAccessTypeEnum.project
              ? (
                <EditorGroup key="1" title="选择项目" className="bottom-line">
                  <Select
                    className="width-100 pd2t"
                    placeholder="请选择项目"
                    onSelect={this.onProjectSelect}
                    value={sliceInfo.druid_datasource_id || undefined}
                    {...selectConfig}
                    getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
                  >
                    {projectList.map(r => <Option key={r.datasource_id} value={r.datasource_id} >{r.name}</Option>)}
                  </Select>
                </EditorGroup>
              )
              : (
                <EditorGroup key="1" title="选择外部数据库表" className="bottom-line">
                  <Select
                    className="width-100 pd2t"
                    placeholder="请选择外部数据库"
                    onChange={async offlineCalcDataSourceId => {
                      await this.onSetScreenComponentByActiveIndex('offline_calc_table_id', null)
                      this.setState(prevState => ({...prevState, offlineCalcDataSourceId}))
                    }}
                    getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
                    value={offlineCalcDataSourceId || undefined}
                    {...selectConfig}
                  >
                    {offlineCalcDataSources.map(r => <Option key={r.id} >{r.name}</Option>)}
                  </Select>

                  <Select
                    className="width-100 pd2t"
                    placeholder="请选择表"
                    onChange={this.onExternalTableSelect}
                    value={sliceInfo.offline_calc_table_id || undefined}
                    {...selectConfig}
                    getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
                  >
                    {offlineCalcTables.filter(ot => ot.data_source_id === offlineCalcDataSourceId).map(r => {
                      return (
                        <Option key={r.id} >{r.title || r.name}</Option>
                      )
                    })}
                  </Select>
                </EditorGroup>
              )}

            <EditorGroup key="2" title="维度" className="bottom-line" extra={
              <div
                className="pd2x pointer font18"
                onClick={(e) => {
                  e.stopPropagation()
                  this.toggleDimensionModal(true)
                }}
              >
                <PlusCircleOutlined style={{ color: '#bcc9d4' }} />
              </div>}
            >
              <EditorPanelDataPopover
                popoverVisible={this.state.visiblePopoverKey === 'dimensionPopover'}
                onPopoverVisibleChange={this.onDimensionPopoverVisibleChange}
                title="横轴坐标"
                onOk={this.onDimensionOk}
                sourceLayer={[{
                  options: dimensionList,
                  selectedValue: (dimensions || []).map(dimName => dimNameDict[dimName]).filter(_.identity)
                }]}
              />
              <div className="analytic-popover">
                {this.renderDimensionArea()}
              </div>
            </EditorGroup>
            <EditorGroup key="3" title="指标" className="bottom-line" extra={
              <div
                className="pd2x pointer font18"
                onClick={(e) => {
                  e.stopPropagation()
                  this.toggleMeasureModal(true)
                }}
              >
                <PlusCircleOutlined style={{ color: '#bcc9d4' }} />
              </div>}
            >
              <EditorPanelDataPopover
                popoverVisible={this.state.visiblePopoverKey === 'measurePopover'}
                onPopoverVisibleChange={this.onMeasurePopoverVisibleChange}
                title="纵轴坐标"
                onOk={this.onMeasureOk}
                sourceLayer={[
                  {
                    title: '预设指标',
                    options: measureList,
                    selectedValue: _.map((metrics || []).filter(mName => !_.startsWith(mName, '_tempMetric_')), mName => measureNameDict[mName])
                      .filter(_.identity)
                  }, {
                    title: '自定义指标',
                    options: dimensionList,
                    selectedValue: []
                  }
                ]}
              />
              <div className="analytic-popover">
                {this.renderMetrics()}
              </div>
            </EditorGroup>
            {this.renderFilterSettingSubPanel()}
            <EditorGroup key="5" title="数值监测预警" className="bottom-line" extra={
              <div
                className="pd2x pointer font18"
                onClick={(e) => {
                  e.stopPropagation()
                  this.toggleWarnModal(true)
                }}
              >
                <PlusCircleOutlined style={{ color: '#bcc9d4' }} />
              </div>}
            >
              {/* <div className="analytic-popover">
                {this.renderMetrics()}
              </div> */}
              {this.state.visiblePopoverKey === 'warnPopover' && (
                <Modal
                  title="设置监测预警"
                  visible={this.state.visiblePopoverKey === 'warnPopover'}
                  maskClosable
                  onOk={() => {
                    const { warnList } = this.state.sliceInfo.params
                    if(warnList.some(o => !o.indexId || !o.warnOp ||  (!o.warnValue && o.warnValue!== 0))) return message.warn('请先完善已有预警指标')
                    this.setState({ visiblePopoverKey: '' })
                  }}
                  onCancel={async () => {
                    const { warnListBak } = this.state.sliceInfo.params
                    const list = _.cloneDeep(warnListBak)
                    this.onSetScreenComponentByActiveIndex('warnList', list)
                    await this.setState({ visiblePopoverKey: '' })
                  }}
                >
                  {this.renderWarnModalContent()}
                </Modal>
              )}
            </EditorGroup>
            {
              currScreenComp.type === 'bubble'
                ?
                <EditorGroup key="5" title="附加选项">
                  <label className="width-30 mg1r">气泡大小: </label>
                  <Select
                    className="width-60"
                    placeholder="气泡大小使用指标"
                    onSelect={(value) => {
                      const _extra = { bubbleZAxis: value }
                      this.onSetScreenComponentByActiveIndex('_extra', _extra)
                    }}
                    value={_.get(this.state, 'sliceInfo.params._extra.bubbleZAxis', 0)}
                    getContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
                  >
                    {
                      _.map(metrics, mName => {
                        let m = measureNameDict[mName]
                        return m && <Option key={m.name}>{m.title}</Option>
                      })
                    }
                  </Select>
                </EditorGroup>
                : false
            }
            <CodeEditor
              title='查询条件修改器'
              sliceInfo={sliceInfo}
              changeFatherState={(v) => this.setState(v)}
            />
          </Collapse>
        </div>
        {
          this.renderFreshData()
        }
      </div>
    );
  }

  renderFreshData() {
    const { sliceInfo } = this.state
    const { accessDataType, activedId } = this.props
    return (
      <div>
        <div
          className="access-button pointer"
          onClick={() => {
            const next = {
              id: activedId,
              ...sliceInfo,
              type: _.get(sliceInfo, 'params.vizType', ''),
              params: {
                ..._.get(sliceInfo, 'params', {}),
                // druid_datasource_id, offline_calc_table_id 只能存在 screenComponent.params
                druid_datasource_id: sliceInfo.druid_datasource_id,
                offline_calc_table_id: sliceInfo.offline_calc_table_id,
                accessDataType,
                demo: false,
                socketCacheParams: {
                  interval: _.get(sliceInfo, 'params.socketCacheParams.interval') || 1,
                  timeUnit: _.get(sliceInfo, 'params.socketCacheParams.timeUnit') || 'hour',
                  intervalTime: _.get(sliceInfo, 'params.socketCacheParams.intervalTime') || 3600,
                },
                requestProtocolParams: {
                  mode: _.get(sliceInfo, 'params.requestProtocolParams.mode') || 'autoRefresh',
                  serviceName: 'sugo_livescreen_querydruid'
                }
              }
            }
            this.props.doModifyComponent(next)
          }}
        >
          刷新数据
        </div>
      </div>
    )
  }

  renderWarnModalContent = () => {
    const iniWarn = {
      indexId: '',
      warnColor: '#d0021b'
    }
    let {measureList, dimensionList, activedId, screenComponents, projectList} = this.props
    let {currScreenComp} = this.state
    let {params: {dimensions, metrics, tempMetricDict={}, warnList=[ ] }} = this.state.sliceInfo
    const selectedIndex = warnList.map(o => o.indexId)
    const lists = _.concat(measureList, dimensionList)
    let tempMetric = Object.values(tempMetricDict)
    let indexList = lists.filter(o => (!selectedIndex.includes(o.dimension || o.id))
    && (metrics.includes(o.name) || _.find(tempMetric, {dimension: o.name}))
    )
    indexList = indexList.map(item => {
      let key= _.findKey(tempMetricDict, function(o) { return o.dimension === item.name })
      return key ? {...item, name: key} : item
    })
    return (
      <React.Fragment>
        {warnList.map((o, i) => {
          return (
            <div style={{ border: '1px solid #ccc', padding: '14px', marginBottom: '14px' }} key={o.indexId} >
              <Row className="mg2b" align="middle">
                <Col span={6} style={{ lineHeight: '33px' }}>预警指标：</Col>
                <Col span={14}>
                  <Select
                    style={{ width: 250 }}
                    value={o.title}
                    onChange={async (value) => {
                      const name = indexList.find(o => o.id === value || o.dimension === value)['name']
                      const title = indexList.find(o => o.id === value || o.dimension === value)['title']
                      const { warnList = [] } = this.state.sliceInfo.params
                      const obj = {...warnList[i], indexId: value, indexTitle: name, title: title}
                      warnList[i] = obj
                      await this.onSetScreenComponentByActiveIndex('warnList', warnList)
                    }}>
                    {indexList.map(o => {
                      return (
                        <Option key={o.dimension || o.id} value={o.dimension || o.id}>{o.title}</Option>
                      )
                    })}
                  </Select>
                </Col>
                <Col span={4} style={{textAlign: 'right'}} className="font14 color-red" >
                  <Popconfirm
                    title="确定删除该预警项吗？"
                    onConfirm={
                      async (value) => {
                        let { warnList = [] } = this.state.sliceInfo.params
                        _.pullAt(warnList, i)
                        // if(!warnList.length) warnList = [iniWarn]
                      await this.onSetScreenComponentByActiveIndex('warnList', warnList)
                      }}
                  >
                    <DeleteOutlined />
                  </Popconfirm>
                </Col>
              </Row>
              <Row className="mg2b" align="middle">
                <Col span={6} style={{ lineHeight: '33px' }}>预警阀值设置：</Col>
                <Col span={16}>
                  指标
                <Select
                    value={o.warnOp}
                    onChange={async (value) => {
                      const { warnList = [] } = this.state.sliceInfo.params
                      const obj = { ...warnList[i], warnOp: value }
                      warnList[i] = obj
                      await this.onSetScreenComponentByActiveIndex('warnList', warnList)
                    }}
                    style={{ width: 80 }}
                    className="mg1l mg1r"
                    >
                    {warnOpType.map(o => {
                      return (
                        <Option key={o.id} value={o.id}>{o.name}</Option>
                      )
                    })}
                  </Select>
                  <InputNumber
                    style={{ width: 80 }}
                    className="mg1r"
                    value={o.warnValue}
                    onChange={async (value) => {
                      const { warnList = [] } = this.state.sliceInfo.params
                      const obj = { ...warnList[i], warnValue: value }
                      warnList[i] = obj
                      await this.onSetScreenComponentByActiveIndex('warnList', warnList)
                    }}
                  />
                  时报警
          </Col>
              </Row>
              <Row className="mg2b" align="middle">
                <Col style={{ lineHeight: '33px' }} span={6}>高亮颜色：</Col>
                <Col span={16}>
                  <div style={{ width: '200px' }} >
                    <ColorPicker
                      className="inline"
                      {...this.extractAppendProps()}
                      value={o.warnColor}
                      onChange={async (value) => {
                        const { warnList = [] } = this.state.sliceInfo.params
                        const obj = { ...warnList[i], warnColor: value }
                        warnList[i] = obj
                        await this.onSetScreenComponentByActiveIndex('warnList', warnList)
                      }}
                    />
                  </div>
                </Col>
              </Row>
            </div>
          );
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button type="primary" onClick={
            async () => {
              const { params: { warnList = [] } } = this.state.sliceInfo
              if (warnList.some(o => !o.indexId || !o.warnOp || (!o.warnValue && o.warnValue !== 0))) return message.warn('请先完善已有预警指标')
              const newWarnList = _.cloneDeep(warnList).concat(iniWarn)
              await this.onSetScreenComponentByActiveIndex('warnList', newWarnList)
            }
          } >新增预警指标</Button>
          {warnList.length>0 && <Button onClick={() => this.setState({isViewModal: true })} >预览效果查看</Button>}
        </div>
        {this.state.isViewModal && (
          <ViewModal
            visible={this.state.isViewModal}
            onOk={() => this.setState({ isViewModal: false })}
            warnList={this.state.sliceInfo.params.warnList}
            dimensionList={this.props.dimensionList}
            indexList={indexList}
            activedId={activedId}
            screenComponents={screenComponents}
            currScreenComp={currScreenComp}
          />
        )}
      </React.Fragment>
    );
  }


  extractAppendProps() {
    return _.omit(this, ['title', 'name', 'type', 'deletable', 'hidable', 'items', 'path', 'editers'])
  }

  onSaveWarn = () => {

  }

  toggleWarnModal = (visible) => {
    let {druid_datasource_id, offline_calc_table_id, params: {dimensions, metrics, warnList, tempMetricDict={} }} = this.state.sliceInfo
    const warnListBak = _.cloneDeep(warnList)
    this.onSetScreenComponentByActiveIndex('warnListBak', warnListBak)
    if (!(druid_datasource_id || offline_calc_table_id)) {
      notification.error({
        message: '选择项目',
        description: '请选择项目'
      })
      return
    }

    if(!metrics.length && !Object.values(tempMetricDict).length) {
      return notification.error({
        message: '选择指标',
        description: '请选择指标'
      })
    }
    this.onWarnModalVisibleChange(visible)
  }

  onWarnModalVisibleChange = (visible) => {
    this.setState({
      visiblePopoverKey: visible ? 'warnPopover' : ''
    })
  }


  renderAddSliceButton = () => {
    return (
      <div className="pd2x pd3y">
        <Button
          type="primary"
          onClick={() => {
            PubSub.publishSync('livescreen.component.sliceReadyToSet')
            return this.setState({
              visiblePopoverKey: 'addSliceModal'
            })
          }}
        >
          添加单图
        </Button>
        <SlicePicker
          visible={this.state.visiblePopoverKey === 'addSliceModal'}
          onSliceSelected={async (sliceId) => {
            let sliceDetail = await Fetch.get(`/app/slices/get/slices/${sliceId}`)
            let { params } = sliceDetail
            delete params.vizType
            const tempParams = {
              ...params,
              druid_datasource_id: sliceDetail.druid_datasource_id,
              dimensionExtraSettingDict: params.dimensionExtraSettingDict
            }
            this.setState({ sliceInfo: { type: params.vizType, params: tempParams } })
            this.onDefaultStateFromRedux()
          }}
          onVisibleChange={visible => this.setState({visiblePopoverKey: visible ? 'addSliceModal' : ''})}
        />
      </div>
    );
  }

  render() {
    const screenComponent = this.props.currScreenComp
    const { type, params = {} } = screenComponent
    if (type === 'frame' || type === 'video') {
      return <span className="mg2">无需设置数据源</span>
    }

    if (type === 'line_text') {
      return (
        <Input
          className="mg2"
          placeholder="添加一行文字"
          value={params.text}
          onChange={(e) => this.handleChangeLineText(e.target.value)}
        />
      )
    }

    if (type === 'blank') {
      return this.renderAddSliceButton()
    }

    return this.renderAccessPanel()
  }
}
