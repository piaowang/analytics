import React from 'react'
import {
  CloseCircleOutlined,
  EditOutlined,
  FilterOutlined,
  PlusCircleOutlined,
  PushpinOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { Button, message, Modal, Popconfirm, Popover, Spin, Tooltip } from 'antd';
import {browserHistory, Link} from 'react-router'
import _ from 'lodash'
import ReactGridLayout from 'react-grid-layout'
import Bread from '../Common/bread'
import {Auth, checkPermission} from '../../common/permission-control'
import * as ls from '../../common/localstorage'
import SliceCard from '../Slices/slice-thumb'
import SliceChartFacade from '../Slice/slice-chart-facade'
import SliceFilterEditor from './slice-filter-editor'
import {immutateUpdate, immutateUpdates} from '../../../common/sugo-utils'
import {withOverviews} from '../Fetcher/overview-fetcher'
import {withCommonFilter} from '../Common/common-filter'
import smartSearch from '../../../common/smart-search'
import classNames from 'classnames'
import {withSizeProvider} from '../Common/size-provider'
import {withSlices} from '../Fetcher/slices-fetcher.js'
import Fetch from '../../common/fetch-final'
import {getOpenSliceUrl} from '../Slice/slice-helper'
import {DefaultDruidQueryCacheOptsForDashboard} from '../../common/fetch-utils'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'
import {analyticVizTypeChartComponentMap, vizTypeChartComponentMap} from '../../constants/viz-component-map'

const {cdn} = window.sugo
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`
const canCreate = checkPermission('/app/overview/create')
let currUserId = window.sugo.user.id

class OverviewList extends React.Component {

  state = {
    showModal: false,
    loadingLayout: false,
    slice: {
      loading: <p>载入中...</p>
    },
    width: 1000,
    layout: [],
    layoutDataSourceId: null,
    globalFilters: null,
    visiblePopoverKey: null
  }

  componentDidMount() {
    this.hasUserActionAnalyticsPermission = checkPermission(/\/console\/user-action-analytics/)
    this.hasAnalyticPermission = checkPermission('/console/analytic')
    const { defaultDatasourceName } = window.sugo
    const { datasourceCurrent, projectList,  changeProject } = this.props
    this.renderCount = 0
    if (datasourceCurrent && defaultDatasourceName !== datasourceCurrent.name) {
      // 第一次加载页面时，如果设置了默认数据源，则显示默认数据源
      this.changeCurrentProject(changeProject, projectList, defaultDatasourceName)
    }
    this.getLayout()
  }

  componentWillReceiveProps(nextProps) {
    const { projectList } = nextProps
    if (nextProps.datasourceCurrent.id !== this.props.datasourceCurrent.id) {
      this.renderCount++
      const { defaultDatasourceName } = window.sugo
      if(this.renderCount === 1 && defaultDatasourceName && projectList) { //第一次加载页面时，如果设置了默认数据源，则显示默认数据源
        this.changeCurrentProject(this.props.changeProject, projectList, defaultDatasourceName)
      }
      this.getLayout(nextProps)
    }
  }

  /**
   * @description 概览如果配置了默认选中项目，优先配置选中项目
   * @memberOf OverviewList
   */
  changeCurrentProject = (changeProject, projectList, defaultDatasourceName) => {
    const proj = _.find(projectList, p => p.datasource_name === defaultDatasourceName)
    if (proj) {
      changeProject(proj.id)
    }
  }

  getLayout = async (props = this.props) => {
    let datasource_id = _.get(
      props,
      'datasourceCurrent.id'
    )
    if (!datasource_id) {
      return
    }
    this.setState({
      loadingLayout: true
    })
    let res = await Fetch.get(`/app/overview/get-layout/${datasource_id}`)
    let localLayout = ls.get(`overview_layout_${datasource_id}`)
    if (res && res.result.length) {
      this.setState({
        layout: res.result,
        loadingLayout: false,
        layoutDataSourceId: datasource_id
      })
    } else if ( localLayout ) {
      let update = {
        layout: localLayout
      }
      await Fetch.post(
        `/app/overview/update-layout/${datasource_id}`,
        update
      )
      this.setState({
        ...update,
        loadingLayout: false,
        layoutDataSourceId: datasource_id
      })
    } else {
      this.setState({
        loadingLayout: false,
        layoutDataSourceId: datasource_id
      })
    }
  }

  setLayoutByCurrFilter(props = this.props, nextLayouts) {
    let currentDataSourceId = props.datasourceCurrent.id
    let {layout, layoutDataSourceId} = this.state
    let trimedNewLayout = nextLayouts.map(o => _.omitBy(o, _.isUndefined))
    if (!layoutDataSourceId || layoutDataSourceId !== currentDataSourceId || _.isEqual(layout, trimedNewLayout)) {
      return
    }
    let update = {
      layout: trimedNewLayout
    }
    Fetch.post(
      `/app/overview/update-layout/${currentDataSourceId}`,
      update
    )
    this.setState(update)
  }

  closeModal = () => {
    this.setState({
      showModal: false,
      slice: {}
    })
  }

  showSlice = (slice0) => {
    let { chartExtraSettings = {}, vizType} = slice0.params
    if (vizType === 'IframeBox') {
      const { imageUrl } = chartExtraSettings || {}
      window.open(`/livescreen/${imageUrl}`)
      return 
    }
    if(vizType === 'heatMap') {
      
    }
    let slice = _.cloneDeep(slice0)
    slice.params.forceUpdate = true
    this.setState({
      showModal: true,
      slice
    })
  }

  onLayoutChange = newLayout => {
    this.setLayoutByCurrFilter(this.props, _.orderBy(newLayout || [], ['y', 'x']))
  }

  delOverview = async id => {
    let {removeFromOverview, reloadOverviews} = this.props
    let res = await removeFromOverview(id, 'slice')

    if (res) {
      message.success('删除成功')

      await reloadOverviews()
    }
  }

  renderFilterPart() {
    let { keywordInput: KeywordInput } = this.props
    return (
      <div className="mg1l pd2t pt1b pd3l line-height26">
        <KeywordInput
          className="mg1l itblock width200"
          placeholder={'搜索单图'}
        />
      </div>
    )
  }

  renderExpandSliceModel() {
    let { showModal, slice: sliceObj } = this.state
  
    let editSliceUrl = getOpenSliceUrl(sliceObj)
    let hasEditPermission = sliceObj.created_by === currUserId && editSliceUrl
    return (
      <Modal
        wrapClassName="slice-modal-wrapper"
        style={{ zIndex: 990 }}
        visible={showModal}
        title={
          <Tooltip title={hasEditPermission ? `点击查看 ${sliceObj.slice_name} 的详情` : '您没有权限编辑此单图'}>
            {hasEditPermission
              ? (<Link to={editSliceUrl} >{sliceObj.slice_name}</Link>)
              : sliceObj.slice_name}
          </Tooltip>
        }
        onOk={this.closeModal}
        onCancel={this.closeModal}
        footer={null}
        width={window.innerWidth - 60}
      >
        <SliceFilterEditor
          showModal={showModal}
          slice={sliceObj}
          sliceUpdater={(path, updater) => {
            this.setState(prevState => {
              return {
                slice: immutateUpdate(prevState.slice, path, updater)
              }
            })
          }}
        />
        <div className="charts-box">
          {
            sliceObj.params
              ?
              <SliceChartFacade
                wrapperStyle={{
                  maxHeight: '380px',
                  backgroundColor: '#fff',
                  borderRadius: '3px',
                  padding: '10px',
                  borderTop: '10px solid white',
                  borderBottom: '10px solid white',
                  overflowY: 'scroll'
                }}
                wrapperClassName="hide-scrollbar-y"
                className=""
                style={{
                  minHeight: '340px'
                }}
                slice={sliceObj}
                publicAccess
              />
              : null
          }
        </div>
      </Modal>
    )
  }

  renderSlices() {
    let {
      loadingProject,
      isFetchingOverviews,
      overviews,
      datasourceList: dataSources,
      mergedFilterCreator,
      spWidth,
      keyword,
      datasourceCurrent
    } = this.props
    let {loadingLayout, layout, layoutDataSourceId, globalFilters} = this.state
    let loading = loadingProject || isFetchingOverviews || loadingLayout

    let savedLayouts = layout
    let layoutIdDict = _.keyBy(savedLayouts, l => l.i)
    let activeDataSourceSet = new Set(dataSources.map(ds => ds.id))

    let slicesFromOverview = overviews.map(o => o.Slice)
      .filter(sl => sl && activeDataSourceSet.has(sl.druid_datasource_id))
      .map(sl => {
        if (_.isEmpty(globalFilters)) {
          return sl
        }
        return immutateUpdates(sl,
          'params.filters', flts => _.uniqBy([...globalFilters, ...(flts || [])], f => f.col),
          '', sl => {
            const vizType = _.get(sl, 'params.vizType')
            if ((vizType in vizTypeChartComponentMap) && !(vizType in analyticVizTypeChartComponentMap)) {
              // 对于特殊的单图，全局筛选放到 params.chartExtraSettings 内
              return immutateUpdate(sl, 'params.chartExtraSettings', s => ({...(s || {}), globalFilters}))
            }
            return sl
          })
      })

    let slicesToLayouts = slicesFromOverview.map((s, idx) => layoutIdDict[s.id] || {i: s.id, x: (idx % 3) * 4, y: Math.floor(idx / 3) * 10, w: 4, h: 10})

    let slicesIdDict = _.keyBy(slicesFromOverview, s => s.id)

    let mergedFilter = mergedFilterCreator(
      searching => slice => slice ? smartSearch(searching, slice.slice_name) : true,
      dataSourceId => slice => slice ? slice.druid_datasource_id === dataSourceId : true,
      datasourceCurrent && datasourceCurrent.id
    )

    let filteredLayouts = slicesToLayouts
      .filter(l => mergedFilter(slicesIdDict[l.i]))
      // 筛选过后，重新排序
      // .map((layout, idx) => {
      //   return {...layout, x: (idx % 3) * 4, y: Math.floor(idx / 3) * 10, w: 4, h: 10}
      // })
    if (!savedLayouts.length && !loading) {
      filteredLayouts = filteredLayouts
        .map((layout, idx) => {
          return {...layout, x: (idx % 3) * 4, y: Math.floor(idx / 3) * 10, w: 4, h: 10}
        })
    }
    filteredLayouts = _.orderBy(filteredLayouts, ['y', 'x'])

    if (!filteredLayouts.length) {
      if (loading) {
        return <p className="pd3 aligncenter">载入中...</p>
      }
      if (!keyword) {
        return this.renderEmptyHint()
      }

      //fix #2982,就算没符合搜索条件也应该要展示过滤条件的输入框
      return (
        <div>
          { this.renderFilterPart() }
          <div className="empty-overview pd3 aligncenter">
            <h2>没有符合条件的单图</h2>
          </div>
        </div>
      )
    }

    return (
      <div>
        { this.renderFilterPart() }
        <div
          id="layout"
          className={classNames('pd2t pd3b pd3x overviews form-wrapper')}
        >
          <ReactGridLayout
            cols={12}
            onLayoutChange={this.onLayoutChange}
            layout={filteredLayouts}
            rowHeight={30}
            width={spWidth - 64}
          >
            {
              filteredLayouts.map((layout, index) => {
                let {i} = layout
                let slice = slicesIdDict[i]
                if (!slice) {
                  return (
                    <div key={i}>加载中...</div>
                  )
                }
                let shouldRenderChart = true
                let style = {}
                const openSliceUrl = getOpenSliceUrl(slice)
                let hasEditPermission = slice.created_by === currUserId && openSliceUrl
                let buttons = hasEditPermission
                  ? (
                    <span className="fright">
                      {
                        _.get(slice, 'params.vizType', '') !== 'sdk_heat_map'
                          ? <Tooltip title="编辑">
                            <EditOutlined
                              className="pointer color-grey mg2r"
                              onClick={e => {
                                e.stopPropagation()
                                browserHistory.push(openSliceUrl)
                              }} />
                          </Tooltip>
                          : null
                      }
                      <Auth auth="app/overview/delete">
                        <Popconfirm
                          title={`确定移除 ${slice.slice_name} 么？`}
                          placement="topLeft"
                          onConfirm={() => this.delOverview(slice.id)}
                        >
                          <Tooltip title="从概览移除">
                            <CloseCircleOutlined
                              className="pointer color-grey"
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Auth>
                    </span>
                  )
                  : null

                let props = {
                  slice,
                  shouldRenderChart,
                  style,
                  buttons,
                  onClick: () => this.showSlice(slice),
                  className: '',
                  headerClassName: 'width-80',
                  shouldRenderFooter: false,
                  wrapperStyle: {
                    height: '100%'
                  },
                  wrapperClass: 'height-100',
                  dataSources,
                  onSliceNameClick: () => this.showSlice(slice),
                  hasEditPermission,
                  delay: index * 500 + 1,
                  ...DefaultDruidQueryCacheOptsForDashboard
                }
                return (
                  <div key={i}>
                    <SliceCard
                      publicAccess
                      {...props}
                    />
                  </div>
                )
              })
            }
          </ReactGridLayout>
        </div>
      </div>
    );
  }

  renderEmptyHint = () => {
    let { loadingProject, isFetchingOverviews, slices, datasourceCurrent } = this.props
    if (loadingProject || isFetchingOverviews) {
      return null
    }

    let hasSlice = slices.filter(s => {
      return s.druid_datasource_id === datasourceCurrent.id
    }).length
    let createButton = null
    if (canCreate) {
      createButton = hasSlice ? (
        <Link to="/console/slices?hideLeftNavigator=1">
          <Button type="primary">点击进入单图</Button>
        </Link>)
        : (<Link to="/console/analytic">
          <Button type="primary">点击进入多维分析</Button>
        </Link>)
    }
    return (
      <div
        className="relative empty-overview-hint"
        style={{height: 'calc(100vh - 200px)'}}
      >
        <div className="center-of-relative aligncenter">
          <p className="pd2">
            <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
          </p>
          <p className="pd1">
            该项目暂无加入的概览，请到{hasSlice ? '单图里添加概览' : '多维分析添加图表'}
          </p>
          <div className="pd2">
            {createButton}
          </div>
        </div>
      </div>
    )
  }
  
  renderGlobalFilterPicker = () => {
    let {projectCurrent} = this.props
    let {globalFilters, _globalFilters, visiblePopoverKey} = this.state
    return (
      <Popover
        title={
          [
            <span key="title" className="font16 mg2r">设置全局筛选，关闭对话框后生效</span>,
            <CloseCircleOutlined
              key="close"
              className="fright fpointer font18 color-red"
              onClick={() => {
                this.setState({
                  visiblePopoverKey: '',
                  globalFilters: _globalFilters || globalFilters,
                  _globalFilters: null
                })
              }} />
          ]
        }
        placement="bottomRight"
        arrowPointAtCenter
        getPopupContainer={() => document.querySelector('.nav-bar')}
        trigger="click"
        visible={visiblePopoverKey === 'settingGlobalFilters'}
        onVisibleChange={_.noop}
        content={(
          <CommonDruidFilterPanel
            key="filters"
            className="mw460 global-filters-setting-panel"
            uniqFilter
            projectId={projectCurrent && projectCurrent.id}
            getPopupContainer={() => document.querySelector('.global-filters-setting-panel')}
            mainTimeDimFilterDeletable
            timePickerProps={{}}
            dataSourceId={projectCurrent.datasource_id}
            headerDomMapper={_.noop}
            filters={_globalFilters || globalFilters || []}
            dimensionOptionFilter={dbDim => !_.get(dbDim, 'params.type')}
            onFiltersChange={nextFilters => {
              this.setState({
                _globalFilters: nextFilters
              })
            }}
          />
        )}
      >
        <Button
          title="全局筛选覆盖"
          icon={<FilterOutlined />}
          className={classNames('inline mg1r', {
            'color-blue bold': !_.isEmpty(globalFilters),
            'color-gray': _.isEmpty(globalFilters)
          })}
          onClick={() => {
            this.setState({
              visiblePopoverKey: 'settingGlobalFilters'
            })
          }}
        />
      </Popover>
    );
  }
  
  render() {
    let { loadingProject, isFetchingOverviews } = this.props
    let loading = loadingProject || isFetchingOverviews

    let { slice: sliceObj } = this.state
    let help = (<div>
      <p>概览是提供给用户的概览面板，在企业中，</p>
      <p>业务分析的人员可以把自己分析的结果通过概览分享</p>
      <p>到这里，不同层次的人可通过概览预览到公共的数据</p>
      <p>分析结果，可被应用在企业一些公共展示面板。</p>
      <p>添加到概览的方式:</p>
      <p>在单图上点击<PushpinOutlined className="mg1l mg1r" />可完成图表添加到概览的操作</p>
    </div>)
    let extra = (
      <Popover content={help} trigger="hover" placement="bottomLeft">
        <QuestionCircleOutlined className="font14" />
      </Popover>
    )
    return (
      <div className="height-100">
        <Bread
          path={[{ name: '概览' }]}
          extra={extra}
        >
          {this.renderGlobalFilterPicker()}
          {
            canCreate ? (
              <Auth auth={/\/console\/slices$/}>
                <Link to="/console/slices">
                  <Button type="primary" icon={<PlusCircleOutlined />} className="add-overview">添加概览</Button>
                </Link>
              </Auth>)
              : null
          }
        </Bread>
        <div className="scroll-content always-display-scrollbar right-content-bg">
          <Spin spinning={loading} />
          {this.renderSlices()}
          {sliceObj ? this.renderExpandSliceModel() : null}
        </div>
      </div>
    );
  }
}

export default (() => {
  function ExcludeStoppedProject(props) {
    let {datasourceList: dataSources, overviews} = props
    let activeDataSourcesIdSet = new Set(dataSources.map(ds => ds.id))
    let validOverviews = overviews.filter(ov => {
      if (ov.Slice) {
        return activeDataSourcesIdSet.has(ov.Slice.druid_datasource_id)
      } else {
        return false
      }
    })
    return (
      <OverviewList {...{...props, overviews: validOverviews}} />
    )
  }
  let WithOverviews = withOverviews(ExcludeStoppedProject, () => ({type: 'slice'}))
  let WithCommonFilter = withCommonFilter(WithOverviews)
  let WithSizeProvider = withSizeProvider(WithCommonFilter)
  return withSlices(WithSizeProvider)
})()
