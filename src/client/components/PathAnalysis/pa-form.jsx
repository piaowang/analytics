import React from 'react'
import moment from 'moment'
import * as ls from '../../common/localstorage'
import { CloseOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Button, Popconfirm, Popover,
  Spin, Tabs, Select, Radio, Input,
  message, Row, Col
} from 'antd'
import {browserHistory} from 'react-router'
import Link from '../Common/link-nojam'
import withAutoFocus from '../Common/auto-focus'
import _ from 'lodash'
import deepCopy from '../../../common/deep-copy'
import MaxTimeFetcher from '../Fetcher/max-time-fetcher'
import {convertDateType} from '../../../common/param-transform'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import Chart from './chart'
import MultiSelect from '../Common/multi-select'
import Fetch from '../../common/fetch-final'
import {getDimensions} from '../../databus/datasource'
import {diff} from '../../common/diff'
import {canEdit, canCreate, canDel, tabMap} from './constants'
import {Auth} from '../../common/permission-control'
import PageSelect from './page-select'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'
import toSliceFilter from 'common/project-filter2slice-filter'
import {immutateUpdate, isDiffByPath} from '../../../common/sugo-utils'
import UserGroupSelector, {getUsergroupByBuiltinId, isBuiltinUsergroupId} from '../Common/usergroup-selector'
import {BuiltinUserGroup} from '../../../common/constants'
import {renderPageTitle} from '../Common/bread'
import {createPathAnalysisQuery} from './pa-helper'
import {DefaultDruidQueryCacheOpts, withExtraQuery} from '../../common/fetch-utils'

const {enableSaveSliceEnhance = false} = window.sugo

const commonUsergroupLsId = 'current_common_usergroup_id'
export const pALSId = 'path_analysis_change_project'
const RadioButton = Radio.Button
const RadioGroup = Radio.Group

const tabMapTitle = {
  all: '全部页面',
  custom: '自定义'
}
const InputWithAutoFocus = withAutoFocus(Input)
const {TabPane} = Tabs
const defaultTimeFormat = 'YYYY-MM-DD HH:mm:ss'
const {Option} = Select
const listPath = '/console/path-analysis'
const dsSettingPath = '/console/project/datasource-settings'
const directionPool = [
  {
    value: 'normal',
    title: '开始'
  }, {
    value: 'reverse',
    title: '结束'
  }
]

const lsKey = 'pathAnalysis_inst'
const maxDic = {
  title: 50
}
const propsToSubmit = [
  'params',
  'name',
  'title',
  'datasource_id'
]

export const defaultParams = (datasource) => {
  let groupby = _.get(datasource, 'params.commonMetric[0]') || ''
  return {
    filters: [],
    page: '',
    pages: [],
    relativeTime: '-30 days',
    pageTab: tabMap.all(),
    direction: 'normal',
    groupby
  }
}

const createPathAnalysis = (datasource = {id: ''}) => {
  return {
    title: '',
    datasource_id: datasource.id,
    params: defaultParams(datasource)
  }
}

function equals(v1, v2) {
  if (typeof v1 === 'undefined' && typeof v2 === 'undefined') return false
  else if (!v1 && !v2) return true
  return v1 === v2
}

function buildNewPageRange(pages, oldPages) {
  return oldPages.length
    ? oldPages.filter(p => pages.includes(p))
    : pages.slice(0, 100)
}

function loadLSInst(inst) {
  let lsInst = ls.get(lsKey)
  if (inst.datasource_id === _.get(lsInst, 'datasource_id')
    && (inst.id === _.get(lsInst, 'id') || (!inst.id && !_.get(lsInst, 'id')))) {
    Object.assign(inst, lsInst)
  }
  // 新建模板时，添加默认条件
  if (_.isEmpty(_.get(inst, 'params.filters'))) {
    _.set(inst, 'params.filters', [{ 'col': 'event_name', 'op': 'in', 'eq': ['浏览', '页面浏览'], 'type': 'string', 'containsNull': false }])
  }
  return inst
}

const getPopupContainer = () => document.querySelector('.scroll-content')

export default class PathAnalysisForm extends React.Component {

  constructor(props) {
    super(props)
    let pathAnalysisId = props.location.query.id
    let {datasourceCurrent, pathAnalysis} = props

    let inst = createPathAnalysis(datasourceCurrent)
    if (pathAnalysisId && pathAnalysis.length) {
      inst = _.find(pathAnalysis, {id: pathAnalysisId})
    } else if (
      !pathAnalysisId
    ) {
      inst = createPathAnalysis(datasourceCurrent)
    }
    this.state = {
      inst: loadLSInst(inst),
      loadingData: false,
      chartData: 'init',
      dimensions: [],
      shouldChange: 0,
      datasourceSettingsNeeded: [],
      saveAsTitle: '',
      pages: [],
      onSearch: false,
      height: 500
    }
  }

  componentDidMount() {
    this.getDatas()
    this.getData()
  }

  componentWillReceiveProps(nextProps) {
    let {
      id: pathAnalysisId
    } = nextProps.location.query

    let {
      pathAnalysis,
      datasourceCurrent
    } = nextProps
    let nextDsId = datasourceCurrent.id
    let currDsId = this.props.datasourceCurrent.id

    //切换项目
    if (currDsId && nextDsId !== currDsId) {
      return this.pickDatasource(nextProps)
    }
    let oldPathAnalysis = this.state.inst
    
    // 数据源加载完成
    if (!currDsId && nextDsId) {
      if (!_.get(oldPathAnalysis, 'params.groupby')) {
        let groupby = _.get(datasourceCurrent, 'params.commonMetric[0]') || ''
        this.setState({
          inst: immutateUpdate(oldPathAnalysis, 'params.groupby', () => groupby)
        })
      }
    }
  
    //切换报告
    if (
      //pathAnalysisId &&
      pathAnalysis.length &&
      !equals(oldPathAnalysis.id, pathAnalysisId) &&
      datasourceCurrent.id
    ) {
      return this.initPathAnalysisData(pathAnalysis, pathAnalysisId, datasourceCurrent)
    }

    //进入默认报告
    if (
      !pathAnalysisId &&
      datasourceCurrent.id &&
      !equals(oldPathAnalysis.id, pathAnalysisId)
    ) {
      return this.initPathAnalysisEmptyData(
        datasourceCurrent
      )
    }

    //数据获取
    if (!this.state.dimensions.length && datasourceCurrent.id) {
      this.getDatas(datasourceCurrent)
    }

    // 因为 统计字段需要直接使用分群的统计字段，所以分群变更后，需要设置统计字段
    // 没有选择分群时，能够选择 统计字段，否则不能选择
    if (isDiffByPath(this.props, nextProps, 'location.query.usergroup_id')) {
      this.resetGroupByField(nextProps)
    }
  }

  resetGroupByField(nextProps) {
    let commonMetric = _.get(nextProps.datasourceCurrent, 'params.commonMetric')
    if (_.isEmpty(commonMetric)) {
      return
    }
    let nextUgId = _.get(nextProps, 'location.query.usergroup_id')
    let nextUg = isBuiltinUsergroupId(nextUgId)
      ? getUsergroupByBuiltinId(nextUgId, nextProps.datasourceCurrent)
      : _.find(nextProps.usergroups, ug => ug.id === nextUgId)
    if (nextUg) {
      this.onChangeGroupby(nextUg.params.groupby)
    } else {
      this.onChangeGroupby(commonMetric[0])
    }
  }

  setStateLS = (data, ...args) => {
    if (data.inst) {
      ls.set(lsKey, data.inst)
    }
    this.setState(data, ...args)
  }

  getData = async () => {
    let {getPathAnalysis, customUpdate} = this.props
    let pathAnalysis = await getPathAnalysis(false)
    let update = {
      pathAnalysis:  pathAnalysis ? pathAnalysis.result : []
    }
    customUpdate(update)
  }

  initPathAnalysisData = (pathAnalysis, pathAnalysisId, datasourceCurrent) => {
    let inst = _.find(pathAnalysis, {id: pathAnalysisId}) || createPathAnalysis(datasourceCurrent)
    this.setStateLS({
      inst: loadLSInst(inst)
    }, () => this.getDatas(datasourceCurrent))
  }

  initPathAnalysisEmptyData = (
    datasourceCurrent = this.props.datasourceCurrent,
    shouldReturn
  ) => {
    let inst = createPathAnalysis(datasourceCurrent)
    if (shouldReturn) {
      return inst
    }
    this.setStateLS({
      inst: loadLSInst(inst)
    }, () => this.getDatas(datasourceCurrent))
  }

  on404 = () => {
    browserHistory.push(listPath)
    return message.error('路径分析不存在')
  }

  modifier = (...args) => {
    this.setStateLS(...args)
  }

  updateInst = up => {
    let inst = deepCopy(this.state.inst)
    Object.assign(inst, up)
    this.setStateLS({inst})
  }

  onChangeDirection = direction => {
    let inst = deepCopy(this.state.inst)
    inst.params.direction = direction
    this.setStateLS({inst})
  }

  getDatas = async (datasourceCurrent = this.props.datasourceCurrent) => {
    let {id: datasource_id} = datasourceCurrent
    if(!datasource_id) return
    this.setStateLS({
      loadingData: true
    })
    let dims = await getDimensions(datasource_id, {})
    let pages = await this.getPages(datasourceCurrent)
    let inst = deepCopy(this.state.inst)
    if (!inst.params.page) {
      inst.params.page = pages[0] || ''
    }
    let update = {
      loadingData: false,
      pages,
      inst
    }
    if (dims) {
      update.dimensions = dims.data
    }
    this.setStateLS(
      update,
      inst.id ? this.queryChart : _.noop
    )
  }

  reloadPages = async (keyword) => {
    this.setStateLS({
      onSearch: true
    })
    let pages = await this.getPages(undefined, keyword)
    let inst = deepCopy(this.state.inst)
    if (typeof keyword === 'undefined') {
      inst.params.pages = buildNewPageRange(pages, inst.params.pages)
      if (!inst.params.pages.includes(inst.params.page)) {
        inst.params.page = ''
      }
    }
    let update = {
      onSearch: false,
      pages,
      inst
    }
    this.setStateLS(update)
  }

  getPages = async (
    datasourceCurrent = this.props.datasourceCurrent,
    keyword
  ) => {
    let {
      params: {
        since,
        until,
        relativeTime
      }
    } = this.state.inst
    let datasource = datasourceCurrent
    let pageDimensionName = _.get(datasource, 'params.titleDimension')
    let cond = {
      col: '__time',
      op: 'in',
      eq: relativeTime === 'custom' ? [since, until] : relativeTime
    }
    let q = {
      druid_datasource_id: datasource.id,
      dimensions: [pageDimensionName],
      granularity: 'P1D',
      filters: [cond],
      dimensionExtraSettings: [
        {
          sortCol: 'rowCount',
          sortDirect: 'desc',
          limit: 100
        }
      ],
      customMetrics: [
        {
          name: 'rowCount',
          formula: '$main.count()'
        }
      ],
      groupByAlgorithm: 'topN'
    }
    if (keyword) {
      q.filters.push({
        col: pageDimensionName,
        op: 'startsWith',
        eq: [keyword]
      })
    }

    let res = await Fetch.get(withExtraQuery('/app/slices/query-druid', DefaultDruidQueryCacheOpts), q)
    let pages = _.get(res, '[0].resultSet') || []
    pages = pages.map(s => s[pageDimensionName])
    return pages
  }

  pickDatasource = (props) => {
    let {
      datasourceCurrent,
      //pathAnalysis,
      changeUrl
    } = props
    let inst = createPathAnalysis(datasourceCurrent)

    this.setStateLS({
      chartData: 'init',
      inst
    })
    return changeUrl({
      id: ''
    })
  }

  onPickGroupby = (dimensionName) => {
    let inst  = _.cloneDeep(this.state.inst)
    _.assign(inst.params, {
      groupby: dimensionName
    })
    this.setStateLS({
      inst
    })
  }

  onChangeDate = ({dateType, dateRange: [since, until]}) => {
    let inst  = _.cloneDeep(this.state.inst)
    let isCustom = dateType === 'custom'
    _.assign(inst.params, {
      since: isCustom ? since : undefined,
      until: isCustom ? until : undefined,
      relativeTime: dateType
    })
    this.setStateLS({
      inst
    }, this.reloadPages)
  }

  addPathAnalysis = async (formData) => {
    let inst = {
      ...this.state.inst,
      ...formData
    }
    let res = await this.props.addPathAnalysis(inst)
    if (!res) return
    message.success('保存成功')
    this.porps.changeUrl({
      id: res.result.id
    })
  }

  updatePathAnalysis = async (formData) => {
    let {id} = this.state.inst
    let update = diff(this.state, formData, propsToSubmit)
    let res = await this.props.updatePathAnalysis(id, update)
    if (!res) return
    this.props.refreshDatasources()
    message.success('修改成功')
  }

  checkQuery = () => {
    let {page} = this.state.inst.params
    let res = true
    if (!page) {
      message.warn('请选择分析页面', 8)
      res = false
    }
    return res
  }

  queryChart = async () => {
    if (this.noQuery) {
      return this.noQuery = false
    }

    if (this.noQuery || !this.checkQuery()) {
      return
    }

    let query = createPathAnalysisQuery(this.state.inst, this.props)
    // if (_.isEqual(this.prevQuery, query)) {
    //   return
    // } else {
    //   this.prevQuery = query
    // }
    this.setStateLS({
      loadingData: true
    })
    let res = await this.props.queryPathAnalysis(...query)
    this.setStateLS({
      loadingData: false
    })
    if (!res) {
      return
    }
    let chartData = res.result
    this.setStateLS({
      chartData,
      shouldChange: Date.now()
    })
  }

  checkCanSave = (inst = this.state.inst) => {
    if (!inst.title) {
      message.warn('请输入标题', 8)
      return false
    }
    return this.checkQuery()
  }

  saveAs = async () => {
    let inst = deepCopy(this.state.inst)
    inst.title = this.state.saveAsTitle
    inst.datasource_id = this.props.datasourceCurrent.id
    if (!this.checkCanSave(inst)) return
    let res = await this.props.addPathAnalysis(inst)
    if (!res) return
    if (this.state.chartData !== 'init') {
      this.noQuery = true
    }
    message.success('保存成功')
    this.setStateLS({
      saveAsTitle: ''
    })
    this.props.changeUrl({
      id: res.result.id
    })
    return res.result.id
  }

  // save = async () => {
  //   let inst = deepCopy(this.state.inst)
  //   if (!this.checkCanSave(inst)) return
  //   let res = await this.props.addPathAnalysis(inst)
  //   if (!res) return
  //   message.success('保存成功')
  //   this.props.changeUrl({
  //     id: res.result.id
  //   })
  // }

  update = async () => {
    if (!this.checkCanSave()) return
    let inst = deepCopy(this.state.inst)
    //if (!inst.id) return this.save()
    let old = _.find(this.props.pathAnalysis, {id: inst.id})
    let up = diff(inst, old, propsToSubmit)
    up.datasource_id = inst.datasource_id
    let res = await this.props.updatePathAnalysis(inst.id, up)
    if (!res) return
    message.success('更新成功')
  }

  del = async () => {
    let {inst} = this.state
    let res = await this.props.delPathAnalysis(inst)
    if (!res) return
    message.success('删除成功')
    let {pathAnalysis} = this.props
    let next = _.find(pathAnalysis, d => {
      return d.id !== inst.id && d.datasource_id === inst.datasource_id
    })
    let path = {
      id: next ? next.id : '',
      datasource_id: inst.datasource_id
    }
    this.props.changeUrl(path)
  }

  renderDelBtn = () => {
    let {inst} = this.state
    return !canDel || !inst.id
      ? null
      : (
        <Popconfirm
          title={`确定删除路径分析 "${inst.title}" 么？`}
          placement="topLeft"
          onConfirm={this.del}
        >
          <Button type="ghost" icon={<CloseOutlined />} className="mg1l">删除</Button>
        </Popconfirm>
      );
  }

  onChangePageTab = e => {
    let pageTab = e.target.value
    let inst = deepCopy(this.state.inst)
    inst.params.pageTab = pageTab
    this.setStateLS({inst})
  }

  onChangeTitle = e => {
    let title = e.target.value.slice(0, maxDic.title)
    this.updateInst({title})
  }

  onChangeSaveAsTitle = e => {
    let saveAsTitle = e.target.value.slice(0, maxDic.title)
    this.setStateLS({
      saveAsTitle
    })
  }

  renderPopoverContent = () => {
    let {id} = this.state.inst
    if (id) return this.renderUpdatePanel()
    return this.renderSavePanel()
  }

  renderUpdatePanel = () => {
    let {title, id} = this.state.inst
    let {saveAsTitle} = this.state
    let {loading} = this.props
    let tabs = canCreate ? [
      <TabPane
        tab="另存为路径"
        key="save-as"
      >
        <span className="block mg1b">路径名称:</span>
        <InputWithAutoFocus
          value={saveAsTitle}
          placement="未输入名称"
          className="block width-100"
          onChange={this.onChangeSaveAsTitle}
        />
        <Button
          type="primary"
          onClick={this.saveAs}
          icon={<SaveOutlined />}
          disabled={loading}
          loading={loading}
          className="width-100 mg2t"
        >保存</Button>
      </TabPane>
    ] : []

    if (canEdit && id) {
      tabs.unshift(
        <TabPane
          tab="更新当前路径"
          key="update"
        >
          <span className="block mg1b">路径名称:</span>
          <InputWithAutoFocus
            value={title}
            placement="未输入名称"
            className="block width-100"
            onChange={this.onChangeTitle}
          />
          <Button
            type="primary"
            onClick={this.update}
            icon={<SaveOutlined />}
            disabled={loading}
            loading={loading}
            className="width-100 mg2t"
          >更新</Button>
        </TabPane>
      )
    }
    return (
      <div className="width300">
        <Tabs defaultActiveKey={canEdit && id ? 'update' : 'save-as'}>
          {tabs}
        </Tabs>
      </div>
    )
  }
  
  renderSaveSliceButton = () => {
    let {datasourceCurrent} = this.props
    const { saveAsTitle: tempName, inst: tempPathAnalysis } = this.state
    const tempSliceName = !tempName ? `路径分析 ${tempPathAnalysis.title || '未命名路径分析'} 的关联单图` : tempName
    return (
      <Popover
        content={(
          <Tabs className="width300" >
            <TabPane tab="另存为新单图" key="saveAs">
              <Row>
                <Col className="pd1" span={24}>单图名称</Col>
                <Col className="pd1" span={24}>
                  <Input
                    value={tempSliceName}
                    className="width-100"
                    onChange={ev => this.setState({saveAsTitle: ev.target.value})}
                    placeholder="未输入名称"
                  />
                </Col>
                <Col className="pd1 alignright" span={24}>
                  <Button
                    icon={<SaveOutlined />}
                    type="primary"
                    className="width-100"
                    onClick={async () => {
                      let { id: paId } = tempPathAnalysis
                      let isCreating = !paId
                      if (isCreating) {
                        // 根据单图名称解析出路径分析名
                        let retentionName = _.trim(tempSliceName.replace(/^路径分析|的关联单图$/g, '')) || '未命名路径分析'
                        await new Promise(resolve => this.setState({saveAsTitle: retentionName}, resolve))
                      }
                      paId = isCreating ? await this.saveAs() : paId
                      if (!paId) {
                        return
                      }
                      let createSliceRes = await Fetch.post('/app/slices/create/slices', {
                        druid_datasource_id: datasourceCurrent.id,
                        slice_name: tempSliceName,
                        params: {
                          vizType: 'sugo_path_analysis',
                          openWith: 'SugoPathAnalysis',
                          chartExtraSettings: { relatedPathAnalysisId: paId }
                        }
                      })
                      if (createSliceRes) {
                        message.success('保存单图成功')
                      }
                    }}
                  >保存</Button>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        )}
        placement="bottomRight"
      >
        <Button
          type="success"
          className="itblock mg1r"
          icon={<SaveOutlined />}
        >保存为单图</Button>
      </Popover>
    );
  }

  renderSaveButton = () => {
    let {id} = this.state.inst
    if (!(canEdit && id) && !canCreate) {
      return null
    }
    let text = id ? '保存' : '保存为常用路径'
    return (
      <Popover
        key={text}
        content={this.renderUpdatePanel()}
        placement="bottomRight"
      >
        <span>
          <Button
            type="success"
            icon={<SaveOutlined />}
          >{text}</Button>
        </span>
      </Popover>
    );
  }

  renderMultiText = titles => {
    let len = titles.length
    if (len > 10) {
      return `(${titles.length})` + titles.slice(0, 10).join(', ') + ' 等'
    }
    return `(${titles.length})` + titles.slice(0, 10).join(', ')
  }

  onChangePageRange = (pages) => {
    let inst = deepCopy(this.state.inst)
    let page = _.get(inst, 'params.page')
    inst.params.pages = pages
    if (pages.length && !pages.includes(page)) {
      inst.params.page = ''
    }
    if (!pages.length) {
      inst.params.pageTab = tabMap.all()
    }
    this.setStateLS({inst})
  }

  onChangePage = page => {
    let inst = deepCopy(this.state.inst)
    inst.params.page = page
    this.setStateLS({inst})
  }

  onSearchPage = _.throttle((keyword) => {
    this.reloadPages(keyword)
  }, 100)

  renderPageRange = () => {
    let {pages, onSearch} = this.state
    let value = _.get(this.state, 'inst.params.pages')
    let pageTab = _.get(this.state, 'inst.params.pageTab')
    if (!pageTab) {
      setTimeout(() => {
        this.onChangePageTab({
          target: {
            value: value.length
              ? tabMap.custom()
              : tabMap.all()
          }
        })
      }, 50)
      return null
    }
    return (
      <div className="inline">
        <span className="iblock mg1r">参与分析的页面:</span>
        <RadioGroup
          value={pageTab}
          className="iblock mg1r"
          onChange={this.onChangePageTab}
        >
          {
            Object.keys(tabMap).map(k => {
              return (
                <RadioButton
                  key={k}
                  value={k}
                >
                  {tabMapTitle[k]}
                </RadioButton>
              )
            })
          }
        </RadioGroup>
        {
          pageTab === tabMap.all()
            ? null
            : (
              <MultiSelect
                getPopupContainer={getPopupContainer}
                options={pages}
                value={value}
                showSelectAllBtn
                className="width200 iblock"
                onChange={this.onChangePageRange}
                renderText={this.renderMultiText}
                renderTitle={this.renderMultiText}
                isLoading={onSearch}
                onSearch={this.onSearchPage}
              />
            )
        }
      </div>
    )
  }

  renderPageSelect = () => {
    let value = _.get(this.state.inst, 'params.page') || ''
    let pages = _.get(this.state.inst, 'params.pages') || []
    let {direction} = this.state.inst.params
    return (
      <div className="inline">
        <span className="iblock mg1r">设定路径:</span>
        <Select
          getPopupContainer={getPopupContainer}
          className="iblock width140"
          {...enableSelectSearch}
          value={direction}
          onChange={this.onChangeDirection}
        >
          {
            directionPool.map(pa => {
              let {title, value} = pa
              return (
                <Option value={value} key={value}>{title}</Option>
              )
            })
          }
        </Select>
        <span className="iblock mg1x">的页面:</span>
        {this.renderPageSelectUnit(value, pages)}
      </div>
    )
  }

  renderPageSelectUnit = (value, pages) => {
    let {pageTab} = this.state.inst.params
    if (pageTab === tabMap.all()) {
      let {datasourceCurrent} = this.props
      let datasource_id = datasourceCurrent.id
      let pageDimensionName = _.get(datasourceCurrent, 'params.titleDimension')
      let dbDim = _.find(this.state.dimensions, {name: pageDimensionName}) || {}
      let {relativeTime, since, until} = this.state.inst.params
      let props = {
        since,
        until,
        datasource_id,
        relativeTime,
        dbDim,
        value,
        onChange: this.onChangePage
      }
      return (
        <PageSelect
          getPopupContainer={getPopupContainer}
          {...props}
        />
      )
    }
    return (
      <Select
        getPopupContainer={getPopupContainer}
        {...enableSelectSearch}
        className="iblock width120"
        value={value}
        onChange={this.onChangePage}
        dropdownMatchSelectWidth={false}
      >
        <Option value="" key="page-select-empty">请选择页面</Option>
        {
          pages.map(page => {
            return (
              <Option value={page} key={`page-sel${page}`}>{page}</Option>
            )
          })
        }
      </Select>
    )
  }

  onChangeGroupby = groupby => {
    let inst = deepCopy(this.state.inst)
    inst.params.groupby = groupby
    this.setStateLS({inst})
  }

  renderUserIdSelect = () => {
    let {
      params: {
        groupby
      }
    } = this.state.inst
    let {datasourceCurrent} = this.props
    let {dimensions} = this.state
    let commonMetric = _.get(datasourceCurrent, 'params.commonMetric') || []
    if (_.size(commonMetric) <= 1){
      return null
    }
    let currUserGroupId = _.get(this.props, 'location.query.usergroup_id')
    if (currUserGroupId && currUserGroupId !== 'all' && currUserGroupId !== BuiltinUserGroup.newVisitUsers) {
      // 没有选择分群时，才能够选择 统计字段，否则不能选择
      return
    }
    if (!groupby) {
      setTimeout(() => {
        this.onChangeGroupby(commonMetric[0])
      }, 100)
    }
    return (
      <span>
        <span className="iblock mg1x">用户ID:</span>
        <Select
          getPopupContainer={getPopupContainer}
          {...enableSelectSearch}
          className="iblock width120 mg1r"
          value={groupby}
          onChange={this.onChangeGroupby}
          dropdownMatchSelectWidth={false}
        >
          {
            commonMetric.map(name => {
              let dim = _.find(dimensions, {name}) || {name}
              return (
                <Option value={name} key={name}>{dim.title || dim.name}</Option>
              )
            })
          }
        </Select>
      </span>
    )
  }

  onChangePA = id => {
    this.props.changeUrl({
      id
    })
  }

  renderPaSelect = () => {
    let {pathAnalysis, datasourceCurrent: {id}} = this.props
    let pathAnalysisId = this.props.location.query.id
    let arr = pathAnalysis.filter(d => d.datasource_id === id)
    arr.splice(0, 0, {
      id: '',
      title: '请选择'
    })
    return (
      <div className="inline">
        <span className="mg1r inline">常用路径: </span>
        <Select
          getPopupContainer={getPopupContainer}
          className="inline width200"
          {...enableSelectSearch}
          value={pathAnalysisId || ''}
          onChange={this.onChangePA}
          dropdownMatchSelectWidth={false}
        >
          {
            arr.map(pa => {
              let {title, id} = pa
              return (
                <Option value={id} key={id}>{title}</Option>
              )
            })
          }
        </Select>
      </div>
    )
  }

  renderQueryButton = () => {
    let {loadingData, datasourceSettingsNeeded} = this.state
    if (datasourceSettingsNeeded.length) return null
    return (
      <Button
        disabled={loadingData}
        type="primary"
        className="inline"
        loading={loadingData}
        icon={<SearchOutlined />}
        onClick={this.queryChart}
      >查询</Button>
    );
  }

  onMaxTimeLoaded = maxTime => {
    setTimeout(() => {
      let inst = _.cloneDeep(this.state.inst)
      if (inst.id) return
      if (moment(maxTime).isBefore(moment().add(-1, 'days').startOf('day'))) {
        let until = moment(maxTime).add(1, 'days').startOf('day').format(defaultTimeFormat)
        let since = moment(maxTime).add(-29, 'day').startOf('day').format(defaultTimeFormat)
        Object.assign(inst.params, {
          since,
          until,
          relativeTime: 'custom'
        })
        this.setStateLS({
          inst
        }, this.getDatas)
      }
      else this.getDatas()
    }, 250)
  }

  renderMaxTime = () => {
    let {
      datasource_id
    } = this.state.inst
    return (
      <MaxTimeFetcher
        dataSourceId={datasource_id || ''}
        doFetch={!!datasource_id}
        onMaxTimeLoaded={this.onMaxTimeLoaded}
      />
    )
  }

  renderSettingGuide = () => {
    let {datasourceSettingsNeeded} = this.state
    if (!datasourceSettingsNeeded.length) return null
    let {projectCurrent} = this.props
    return (
      <div className="pd2t">
        要使用这个项目的路径分析, 请到
        <Auth
          auth={dsSettingPath}
          alt={<b>场景数据设置</b>}
        >
          <Link
            className="pointer bold mg1x"
            to={`${dsSettingPath}?id=${projectCurrent.id}`}
          >场景数据设置</Link>
        </Auth>
        设定这个项目的
        {
          datasourceSettingsNeeded.map(d => {
            return <b className="color-red mg1x" key={d}>{d}</b>
          })
        }
      </div>
    )
  }

  onFiltersChange = filters => {
    let inst = deepCopy(this.state.inst)
    inst.params.filters = filters
    this.setStateLS({inst})
  }

  renderFilters = () => {
    let {
      id: projectId,
      datasource_id: dataSourceId
    } = this.props.projectCurrent
    if (!dataSourceId) return null
    let {
      inst: {
        params: {
          relativeTime,
          since,
          until,
          filters
        }
      }
    } = this.state
    let dateRange = relativeTime === 'custom'
      ? [since, until]
      : convertDateType(relativeTime)
    let props = {
      projectId,
      dataSourceId,
      timePickerProps: {
        className: 'iblock width260 mg2r',
        dateType: relativeTime,
        dateRange,
        onChange: this.onChangeDate
      },
      filters: toSliceFilter({filters}),
      onFiltersChange: this.onFiltersChange,
      getPopupContainer
    }
    return (
      <CommonDruidFilterPanel
        {...props}
      />
    )
  }

  renderContent () {
    let {
      loadingData,
      chartData,
      shouldChange,
      inst: { params: { direction, page } }
    } = this.state
    let {
      // loading: propLoading,
      // loadingProject,
      datasourceCurrent
    } = this.props
    // let loading = loadingData || loadingProject || propLoading

    return (
      <div className="pa-wrapper pd2t">
        <div className="pa-section pa-section1">
          <div className="fix">
            <div className="fleft">
              {this.renderPaSelect()}
            </div>
            <div className="fright">
              <Auth auth="post:/app/slices/create/slices">
                {enableSaveSliceEnhance ? this.renderSaveSliceButton() : null}
              </Auth>
              {this.renderSaveButton()}
              {this.renderDelBtn()}
            </div>
          </div>
          {this.renderSettingGuide()}
        </div>
        <div className="pa-section pa-section2">
          <div className="fix">
            <div className="fleft">
              {this.renderPageRange()}
            </div>
          </div>
        </div>
        <div className="pa-section pa-section1">
          <div className="fix">
            <div className="fleft">
              {this.renderPageSelect()}
            </div>
          </div>
        </div>
        <div className="pa-section pa-section3">
          <div className="fix">
            <div className="fleft">
              {this.renderFilters()}
              <div className="pd1b pd2t">
                {this.renderQueryButton()}
              </div>
            </div>
            <div className="fright">
              {this.renderUserIdSelect()}
            </div>
          </div>
        </div>
        <Spin spinning={loadingData}>
          <Chart
            data={chartData}
            page={page}
            shouldChange={shouldChange}
            inst={this.state.inst}
            direction={direction}
            datasourceCurrent={datasourceCurrent}
          />
        </Spin>
        {this.renderMaxTime()}
      </div>
    )
  }

  onChangeUsergroupId = usergroup_id => {
    this.props.changeUrl({
      usergroup_id
    })
  }

  renderUsergroupSelect = () => {
    let {
      usergroups,
      datasourceCurrent,
      location: {
        query: {usergroup_id}
      },
      changeUrl,
      projectList
    } = this.props

    let dsId = datasourceCurrent && datasourceCurrent.id || ''
    let lsUsergroupId = ls.gets(commonUsergroupLsId)

    let currUgId = usergroup_id || lsUsergroupId || 'all'
    let hasUg = currUgId === 'all'
      ? true
      : isBuiltinUsergroupId(currUgId)
        ? getUsergroupByBuiltinId(currUgId, datasourceCurrent)
        : _.find(usergroups, { id: currUgId, druid_datasource_id: dsId })

    if (!hasUg) {
      currUgId = 'all'
    }
    ls.set(commonUsergroupLsId, currUgId)
    if (!usergroup_id) {
      changeUrl({
        usergroup_id: currUgId
      })
    }

    return (
      <div className="itblock">
        <span className="font13">目标用户：</span>
        <UserGroupSelector
          className="width120"
          datasourceCurrent={datasourceCurrent}
          projectList={projectList}
          value={currUgId === 'all' ? '' : currUgId}
          onChange={nextUserGroup => this.onChangeUsergroupId(nextUserGroup ? nextUserGroup.id : 'all')}
        />
      </div>
    )
  }

  render () {
    return (
      <div className="height-100 bg-grey-f7">
        {renderPageTitle('路径分析')}
        <div className="nav-bar borderb">
          {this.renderUsergroupSelect()}
        </div>
        <div className="scroll-content always-display-scrollbar relative">
          {this.renderContent()}
        </div>
      </div>
    )
  }
}
