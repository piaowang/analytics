import React from 'react'
import {Tooltip, Tabs , Card} from 'antd'
import {browserHistory} from 'react-router'
import {vizTypeIconMap} from '../../constants/viz-component-map'
import SliceChartFacade from '../Slice/slice-chart-facade'
import _ from 'lodash'
import classnames from 'classnames'
import {dateOptions, buildTitle} from '../Common/time-picker'
import {convertDateType, isRelative} from 'common/param-transform'
import {isEqualWithReactObj} from '../../../common/sugo-utils'
import Icon from '../Common/sugo-icon'
import moment from 'moment'
import {getOpenSliceUrl} from '../Slice/slice-helper'
import { AUTHORIZATION_PERMISSIONS_TYPE } from '~/src/common/constants'

const {TabPane} = Tabs

const dateOpts = dateOptions()

let CHECK_ARRAY = [
  'slice',
  'style',
  'className',
  'buttons',
  'shouldRenderChart',
  'datasources',
  'onClick',
  'onSliceNameClick',
  'hasEditPermission', // 仅仅为了触发 render
  'extraComponentUpdateTriggerObj',
  'shouldRenderFooter',
  'sCache',
  'cCache',
  'container'
]

export default class SliceThumb extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      delayRender: true,
      missPermission: false,
      sliceName: '',
      targetSlice: null
    }
    this.delayRender(props.delay)
  }
  
  shouldComponentUpdate(nextProps, nextState) {
    return !isEqualWithReactObj(
      _.pick(this.props, CHECK_ARRAY),
      _.pick(nextProps, CHECK_ARRAY))
      || !_.isEqual(nextState, this.state) || _.get(nextProps,'theme') !== _.get(this.props,'theme')
  }

  componentWillUnmount() {
    clearTimeout(this.timer)
  }

  delayRender = (delay = 0) => {
    this.timer = setTimeout(this.cancelDelay, delay)
  }

  cancelDelay = () => {
    this.setState({
      delayRender: false
    })
  }

  jump(slice) {
    const { openWith, chartExtraSettings, vizType } = _.get(slice, 'params') || {}
    const { imageUrl } = chartExtraSettings || {}
    return e => {
      if(this.state.missPermission) return
      e.stopPropagation()
      if (openWith === 'livescreen' && imageUrl) {
        window.open(`/livescreen/${imageUrl}`)
      } else if(vizType === 'sdk_heat_map') {
        browserHistory.push('/console/heat-map/slice?sliceid=' + slice.id)
      } else {
        let url = getOpenSliceUrl(slice)
        browserHistory.push(url)
      }
    }
  }

  renderTooltip = slice => {
    const { isShow = true } = this.props
    return this.state.missPermission ? null : (slice.nodes ? `备注：${slice.notes}` : `点击访问"${slice.slice_name}"的详情 ${isShow ? this.renderTime1(slice) : ''}`)
  }

  renderFooter = slice => {
    if (slice.SugoDatasource) {
      return `项目:${slice.SugoDatasource.title}`
    }

    let { datasources } = this.props
    let datasource = _.find(datasources, { id: slice.druid_datasource_id }) || {}

    return `项目:${datasource.title}`
  }

  blurFindRelativeTime(relativeTypes, relativeTime) {
    let oldThisYear = ['startOf year', 'endOf year']
    return _.find(relativeTypes, ({dateType}) => {
      if (_.isEqual(dateType, relativeTime)) {
        return true
      }
      // startOf xxx -1 seconds 改为 startOf xxx -1 ms 了，需要兼容
      if (_.isArray(relativeTime) && _.isArray(dateType)) {
        return _.isEqual(relativeTime.map(str => str.replace(/seconds?/gi, 'ms')), dateType)
      }
      // ['startOf year', 'endOf year'] 改为 -1 years，需要兼容
      if (_.isEqual(relativeTime, oldThisYear) && dateType === '-1 years') {
        return true
      }
      return false
    })
  }

  getTimeTitle = dateType => {
    let {natural, exact, custom} = dateOpts
    let obj = this.blurFindRelativeTime(natural, dateType) ||
      _.find(exact, {dateType}) ||
      _.find(custom, {dateType}) ||
    buildTitle(dateType) || {}
    return obj.title
  }

  renderTime = slice => {
    let {params} = slice
    let relativeTime = params.relativeTime || _.find(params.filters, { col: '__time', op: 'in' })
    if (!relativeTime || relativeTime.valueEncrypted) {
      return null
    }
    if (relativeTime && relativeTime.eq) {
      relativeTime = relativeTime.eq
    }
    let time = isRelative(relativeTime)
      ? convertDateType(relativeTime)
      : params.since ? [params.since, params.until] : relativeTime
    if(time) {
      time = time.map(p => moment(p).format('YYYY-MM-DD HH:mm:ss'))
    }
    let dates = time && time.join('~') || '时间不限'
    let title = isRelative(relativeTime) ? this.getTimeTitle(relativeTime) : null
    return (
      <div className="slice-date iblock mg1l font12 elli">
        <Tooltip title={title || dates} overlayClassName='dashboard-wrap'>
          {title || null}
          ({dates})
        </Tooltip>
      </div>
    )
  }

  renderTime1 = slice => {
    let {params} = slice
    let relativeTime = params.relativeTime || _.find(params.filters, { col: '__time', op: 'in' })
    if (!relativeTime || relativeTime.valueEncrypted) {
      return ''
    }
    if (relativeTime && relativeTime.eq) {
      relativeTime = relativeTime.eq
    }
    let time = isRelative(relativeTime)
      ? convertDateType(relativeTime)
      : params.since ? [params.since, params.until] : relativeTime
    if(time) {
      time = time.map(p => moment(p).format('YYYY-MM-DD HH:mm:ss'))
    }
    let dates = time && time.join('~') || '时间不限'
    let title = isRelative(relativeTime) ? this.getTimeTitle(relativeTime) : null
    return `${title || ''} (${dates})`
  }

  renderCancelled = () =>{
    return <div className="aligncenter pd3t width-100">该单图已取消分享</div>
  }

  missPermission = (missPermission) => {
    if(this.state.missPermission !== missPermission) {
      this.setState({
        missPermission
      })
    }
  }

  renderSliceChart = (slice) =>{
    let {
      shouldRenderChart,
      wrapperClass = '',
      chartStyle={ height: '100%' },
      wrapperStyle = { height: '100%' },
      publicAccess,
      echartsOptionsOverwriter,
      sCache,
      cCache,
      changeDashBoardState,
      dashBoardSlicesSettings,
      jumpConfiguration,
      dashboards,
      activeKey 
    } = this.props
    let params = slice.params || {}
    let iconType = vizTypeIconMap[params.vizType || params.viz_type || 'table']
    let { delayRender } = this.state
    return (shouldRenderChart && !delayRender
      ? <SliceChartFacade
        className={`_${slice.id}`}
        wrapperStyle={wrapperStyle}
        wrapperClass={wrapperClass}
        style={chartStyle}
        slice={slice}
        limit={1}
        changeDashBoardState={changeDashBoardState}
        dashBoardSlicesSettings={dashBoardSlicesSettings}
        activeKey={activeKey}
        jumpConfiguration={jumpConfiguration}
        dashboards={dashboards}
        publicAccess={publicAccess}
        optionsOverwriter={echartsOptionsOverwriter}
        missPermission={this.missPermission}
        sCache={sCache}
        cCache={cCache}
        theme={this.props.theme}
        />
      : <div className="icon-slice color-grey"><Icon type={iconType}/></div>)
  }

  renderPileTabs(container) {
    const { closeContainerTab, shouldTitleLink, showSliceData, slice } = this.props
    let { targetSlice } = this.state
    return (
      <Tabs
        style={{height: 'calc(100% - 40px)'}}
        defaultActiveKey={container[0].id}
        type="editable-card"
        onEdit={(sliceId) => {
          let target = container.find(i => i.id === sliceId)
          closeContainerTab({ containerId: container[0].id, sliceId, target})
          showSliceData({[slice.id] : container[0]})
          this.setState({
            sliceName: container[0].slice_name,
            targetSlice: container[0]
          })
        }}
        activeKey={_.isEmpty(targetSlice) ? container[0].id : targetSlice.id}
        hideAdd
        onChange={(sliceId) => {
          let target = container.find(i => i.id === sliceId)
          if (!target) return
          showSliceData({[slice.id] : target})
          this.setState({
            sliceName: target.slice_name,
            targetSlice: target
          })
        }}
      >
        {
          container.map( (i, idx) => (
            <TabPane
              className="height-100"
              tab={i.slice_name}
              key={i.id}
              closable={idx !== 0 && !shouldTitleLink}
            >
              {this.renderSliceBody(i)}
            </TabPane>
          ))
        }
      </Tabs>
    )
  }

  renderSliceBody(slice) {
    let {
      onClick,
      shouldRenderFooter,
      isShow = true,
      mode
    } = this.props
    const { targetSlice } = this.state
    const tSlice = !_.isEmpty(targetSlice) && mode !== 'show' ? targetSlice : slice
    return (
      <React.Fragment>
        <div
          className="slice-body"
          onClick={onClick || this.jump(tSlice)}
          style={shouldRenderFooter ? undefined : {bottom: '10px'}}
        >
          {isShow ? this.renderSliceChart(tSlice) : this.renderCancelled(tSlice)}
        </div>
        {shouldRenderFooter
          ? (
            <div className="slice-footer font12">
              {/* {this.renderFooter(tSlice)} */}
            </div>
          )
          : null}
      </React.Fragment>
    )
  }

  renderSliceCardHead() {
    let {
      slice,
      buttons,
      headerClassName,
      onSliceNameClick,
      isShow = true,
      onPerviewSlice,
      mode
    } = this.props
    const { sliceName, targetSlice } = this.state
    let {slice_name, params: { vizType }} = slice

    const sName = sliceName || slice_name
    const tSlice = !_.isEmpty(targetSlice) && mode !== 'show'? targetSlice : slice
    return (
      <div className="fix font14 slice-head-content" style={{position:'relative'}}>
        <span className={'iblock elli middle-text '}>
          <span className="slice-head-notice" />
          {
            vizType === 'link' ? sName
              : <Tooltip title={this.renderTooltip(tSlice)} overlayClassName='dashboard-wrap'>
                {
                  slice.authorization_permissions_type === AUTHORIZATION_PERMISSIONS_TYPE.owner
                    || slice.authorization_permissions_type === AUTHORIZATION_PERMISSIONS_TYPE.write
                    || !onPerviewSlice
                    ? (<a
                      className="pointer iblock bold"
                      onClick={onSliceNameClick || this.jump(tSlice)}
                       >{sName}</a>)
                    : <a
                      className="pointer iblock bold"
                      onClick={() => onPerviewSlice(tSlice)}
                      >{sName}</a>
                }
              </Tooltip>
          }
          {/* {isShow ? this.renderTime(tSlice) : null} */}
          {this.renderTime(tSlice)}
        </span>
        {buttons ? buttons : null}
        {/* {this.renderTime(tSlice)} */}
      </div>
    ) 
  }

  render() {
    let {
      slice,
      style,
      className,
      shouldRenderFooter,
      container
    } = this.props
    return (
      <div
        className={classnames('slice-card', className, {'no-footer': !shouldRenderFooter})}
        style={{...style,border:'none'}}
      >
        <Card 
          style={{width:'100%',height:'100%'}}
          bodyStyle={{width:'100%',height:'100%',padding:'0px'}} 
          bordered={false}
        >
          <div className="slice-head">
            {/* <span className="slice-head-notice"></span> */}
            {
              this.renderSliceCardHead()
            }
          </div>
          {
            _.isEmpty(container) ? (
              this.renderSliceBody(slice)
            ) : this.renderPileTabs(_.concat(slice, container))
          }
        </Card>
      </div>
    )
  }
}
