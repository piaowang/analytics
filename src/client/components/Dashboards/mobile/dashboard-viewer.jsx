import React from 'react'
import _ from 'lodash'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import Fetch from '../../../common/fetch-final'
import {Col, Row, Card} from 'antd'
import {
  analyticVizTypeChartComponentMap,
  vizTypeChartComponentMap,
  vizTypeHintMap
} from '../../../constants/viz-component-map'
import SliceChartFacade from '../../Slice/slice-chart-facade'
import Rect from '../../Common/react-rectangle'
import {immutateUpdate, immutateUpdates, isDiffByPath, isDiffBySomePath} from '../../../../common/sugo-utils'
import {Helmet} from 'react-helmet'
import {RESPONSIVE_PAGE_MAX_WIDTH} from '../../../../common/constants'
import '../theme/dark-theme.less'
import { isMobile } from 'common';

const namespace = 'dashboard-viewer'
const {siteName} = window.sugo

const genDashboardViewerSagaModel = props => {
  let dashboardId = _.get(props, 'params.dashboardId')
  return ({
    namespace: `${namespace}-${dashboardId}`,
    state: {
      isFetching: true,
      dashboard: null,
      slices: null,
      theme:''
    },
    reducers: {
      updateState(state, {payload: updater}) {
        return updater(state)
      }
    },
    sagas: {
      * fetch({}, effects) {
        yield effects.put({
          type: 'updateState',
          payload: prevState => ({...prevState, isFetching: true})
        })
        let sharesWrapped = yield effects.call(Fetch.get, `/app/dashboards/get/${dashboardId}`)
        const dashboard = _.get(sharesWrapped, 'result.dashboard')
        yield effects.put({
          type: 'updateState',
          payload: prevState => ({
            ...prevState,
            dashboard: dashboard,
            slices: _.get(sharesWrapped, 'result.slices'),
            isFetching: false
          })
        })
      }
    },
    subscriptions: {
      setup({dispatch, history}) {
        dispatch({type: 'fetch'})
        return () => {
        }
      }
    }
  })
}


let mapStateToProps = (state, ownProps) => {
  let dashboardId = _.get(ownProps, 'params.dashboardId')
  let runtimeNamespace = `${namespace}-${dashboardId}`
  const dashboardViewerModelState = state[runtimeNamespace] || {}
  return {
    ...dashboardViewerModelState,
    // datasourceCurrent: _.get(state, 'sagaCommon.datasourceCurrent', {}),
    runtimeNamespace
  }
}


@connect(mapStateToProps)
@withRuntimeSagaModel(genDashboardViewerSagaModel)
export default class DashboardViewer extends React.Component {
  constructor(props) {
    super(props)
    let filtersStrInUrl = _.get(props, 'location.query.filters')
    let rawFiltersStrInUrl = _.get(props, 'location.query.rawFilters')
    // 需要加密的传 filters，不需要加密的传 rawFilters
    let filtersInUrl = [
      ...(filtersStrInUrl && eval(filtersStrInUrl) || []).map(flt => ({...flt, valueEncrypted: true})),
      ...(rawFiltersStrInUrl && eval(rawFiltersStrInUrl) || [])
    ]
    this.state = {
      globalFilters: filtersInUrl,
      windowWidth: window.outerWidth
    }
  }

  componentDidMount() {
    if(this.props.location.query.theme) {
      this.setState(()=>{
        return{
          ...this.state,
          theme:this.props.location.query.theme
        }
      })
    }else{
      this.setState(()=>{
        return{
          ...this.state,
          theme:''
        }
      })
    }
    this._timer = setInterval(() => {
      if (window.outerWidth !== this.state.windowWidth) {
        this.setState({
          windowWidth: window.outerWidth
        })
      }
    }, 500)
    if(isMobile()) {
      document.body.classList.add('is-mobile');
    }
  }
  
  componentWillUnmount() {
    clearInterval(this._timer)
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(this.props, prevProps, 'spWidth')) {
      if (RESPONSIVE_PAGE_MAX_WIDTH <= this.props.spWidth) {
        window.location.reload()
      }
    }
    if (isDiffBySomePath(this.props, prevProps, 'location.query.filters', 'location.query.rawFilters')) {
      let filtersStrInUrl = _.get(this.props, 'location.query.filters')
      let rawFiltersStrInUrl = _.get(this.props, 'location.query.rawFilters')
      // 需要加密的传 filters，不需要加密的传 rawFilters
      let filtersInUrl = [
        ...(filtersStrInUrl && eval(filtersStrInUrl) || []).map(flt => ({...flt, valueEncrypted: true})),
        ...(rawFiltersStrInUrl && eval(rawFiltersStrInUrl) || [])
      ]
      this.setState({ globalFilters: filtersInUrl })
    }
  }
  
  optionsOverwriter = opt => {
    return {...opt, animation: false}
  }
  
  render() {
    let {isFetching, dashboard, slices} = this.props
    let {globalFilters} = this.state
    if (isFetching) {
      return (
        <div className="aligncenter color-gray font18 pd3">加载中...</div>
      )
    }
    if (!dashboard) {
      return (
        <div className="aligncenter color-gray font18 pd3">查无数据</div>
      )
    }
    let {windowWidth} = this.state
    let mappingIdDict = _.keyBy(slices, 'slice_id')
    let orderedSlices = _(dashboard.position_json)
      .orderBy(['y', 'x'])
      .map(o => _.get(mappingIdDict[o.i], 'Slice'))
      .filter(slice => {
        return !slice || !(_.get(slice, 'params.vizType') in analyticVizTypeChartComponentMap) ? null : slice
      })
      .value()
    let tableSliceHeightDict = _(dashboard.position_json)
      .filter(o => {
        let slice = _.get(mappingIdDict[o.i], 'Slice')
        return _.startsWith(slice && slice.params.vizType, 'table')
      })
      .keyBy('i')
      .mapValues(o => o.h * 40 - 77)
      .value()

    let title = `${dashboard.dashboard_title}-看板分享`
    return (
      <div
        className={'dashboard-theme-'+this.state.theme}
        key={windowWidth}
        style={{
          padding: '2.67vw'
        }}
      > 
        <Helmet>
          <title>{title ? `${title}-${siteName}` : siteName}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
          <style>
            {'body { background: #e4eaef }'}
          </style>
        </Helmet>
        {!_.isEmpty(orderedSlices) ? null : (
          <div className="aligncenter color-gray font18 pd3">暂无内容</div>
        )}
        <Row gutter={10} >
          {orderedSlices.map(slice => {
            if (!_.isEmpty(globalFilters)) {
              slice = immutateUpdates(slice, 'params.filters', flts => _.uniqBy([...globalFilters, ...(flts || [])], f => f.col), '', sl => {
                const vizType = _.get(sl, 'params.vizType')
                if ((vizType in vizTypeChartComponentMap) && !(vizType in analyticVizTypeChartComponentMap)) {
                  // 对于特殊的单图，全局筛选放到 params.chartExtraSettings 内
                  return immutateUpdate(sl, 'params.chartExtraSettings', s => ({...(s || {}), globalFilters}))
                }
                return sl
              })
            }
            return (
              <Col
                key={slice.id}
                xs={24}
                sm={24}
                md={24}
                lg={12}
                // className="bg-white"
                style={{marginBottom: '2.67vw', padding: '2.67vw'}}
              >
                <Card bodyStyle={{padding:'0px'}}>
                  <div className="bold color-gray font14 wordwrap-break-word">{slice.slice_name}</div>
                  {_.startsWith(slice.params.vizType, 'table')
                    ? (
                      <SliceChartFacade
                        wrapperClassName="corner"
                        wrapperStyle={{height: `${tableSliceHeightDict[slice.id] || 300}px`}}
                        style={{height: '100%'}}
                        slice={slice}
                        isThumbnail
                        showLegend={false}
                        vizTypeHintMap={vizTypeHintMap}
                        opts={{renderer: 'svg'}}
                        cCache={60}
                        theme={this.state.theme}
                      />
                    )
                    : (
                      <Rect aspectRatio={16 / 10}>{(
                        <SliceChartFacade
                          wrapperClassName="height-100 corner"
                          style={{height: '100%'}}
                          slice={slice}
                          isThumbnail
                          showLegend={/bar|line/i.test(slice.params.vizType)}
                          vizTypeHintMap={vizTypeHintMap}
                          componentVizTypeMap={analyticVizTypeChartComponentMap}
                          opts={{renderer: 'svg'}}
                          // optionsOverwriter={this.optionsOverwriter}
                          cCache={60}
                          theme={this.state.theme}
                        />
                      )}</Rect>
                    )}
                </Card>
              </Col>
            )
          })}
        </Row>
      </div>
    )
  }
}
