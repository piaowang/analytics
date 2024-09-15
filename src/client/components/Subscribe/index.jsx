import React from 'react'
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { PlusCircleOutlined, QuestionCircleOutlined, StarOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Spin, Tooltip, message, Popover } from 'antd';
import {Link} from 'react-router'
import Bread from '../Common/bread'
import { autoWidth } from '../../common/auto-width'
import _ from 'lodash'
import SliceCard from '../Slices/slice-thumb'
import {Auth} from '../../common/permission-control'
import classNames from 'classnames'
import {withSubscribes} from '../Fetcher/subscribe-fetcher'
import {withCommonFilter} from '../Common/common-filter'
import smartSearch from '../../../common/smart-search'

const {cdn} = window.sugo
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`

let typeNameDict = {
  slice: '单图',
  dashboard: '看板'
}

@autoWidth
class SubscribeList extends React.Component {

  state = {
    sliceStateTree: {},
    shouldShowCount: 0,
    sliceWidth: 300,
    maxItem: 3
  }

  componentDidMount() {
    this.initOnResize({
      margin: 20
    })
  }

  componentWillUnmount() {
    this.removeResizeEvt()
  }

  delSubscribe = async (id, type) => {
    let {removeFromSubscribe, reloadSubscribes} = this.props
    let res = await removeFromSubscribe(id, type)
    if (res) {
      message.success('取消订阅成功', 8)
      await reloadSubscribes()
    }
  }

  renderFilterPart() {
    let {
      subscribes,
      keywordInput: KeywordInput
    } = this.props
    let cls = classNames(
      'pd2t pt1b pd3l line-height26',
      { hide: !subscribes.length }
    )
    return (
      <div className={cls}>
        <KeywordInput
          className="mg1l itblock width200"
          placeholder="搜索订阅"
        />
      </div>
    )
  }

  renderSliceList = ({
    filteredSubscribes,
    dsbDict,
    sliceDict,
    shouldShowCount,
    sliceWidth,
    maxItem,
    dataSources
  }) => {
    return filteredSubscribes.map((ds, j) => {
      let type
      let slices
      let title
      let url
      let subId
      if (ds.dashboard_id) {
        type = 'dashboard'
        subId = ds.dashboard_id
        slices = dsbDict[ds.dashboard_id].dbSlices.slice(0, 3)
        title = dsbDict[ds.dashboard_id].dashboard_title
        url = `/console/dashboards/${ds.dashboard_id}`
      } else {
        type = 'slice'
        subId = ds.slice_id
        slices = [sliceDict[ds.slice_id]]
        title = sliceDict[ds.slice_id].slice_name
        url = `/console/analytic?sliceId=${ds.slice_id}`
      }
      let len = slices.length
      let shouldRenderChart = shouldShowCount > j
      let style = {
        width: sliceWidth
      }
      if ((j + 1) % maxItem === 0) style.marginRight = 0
      return (
        <div key={j + '-ss-' + ds.id} className="dash-unit" style={style}>
          <h3 className="pd2y">
            <div className="fix">
              <span className="fleft width-90 elli">
                <Link className="pointer" to={url}>{typeNameDict[type] + ':'}{title}</Link>
              </span>
              <span className="fright">
                <Popconfirm
                  title="确定取消订阅么？"
                  placement="topLeft"
                  onConfirm={() => this.delSubscribe(subId, type)}
                >
                  <Tooltip title="取消订阅">
                    <CloseCircleOutlined
                      className="pointer mg1l"
                      title="取消订阅"
                    />
                  </Tooltip>
                </Popconfirm>
              </span>
            </div>
          </h3>

          <div className={'slices' + (len > 1 ? ' more-than-one' : ' only-one')}>
            {slices.map((slice, index) => {
              let style = {
                width: sliceWidth
              }
              let props = {
                slice,
                shouldRenderChart: shouldRenderChart && index === 0,
                style,
                onClick: _.noop,
                className: 'slice-' + (index + 1),
                headerClassName: 'width-100',
                shouldRenderFooter: false,
                index,
                delay: j * 500,
                datasources: dataSources
              }
              return (
                <SliceCard
                  {...props}
                  key={index + 'scard' + slice.id}
                />
              )
            })}
          </div>
        </div>
      );
    });
  }

  renderLoading = (loading) => {
    return loading
      ? <p className="pd3 aligncenter">载入中...</p>
      : this.renderNoContentAfterSearch()
  }

  renderSlices() {
    let {
      loading: propLoading,
      subscribes,
      datasourceList: dataSources,
      mergedFilterCreator,
      subscribedSlices,
      subscribedDashboards,
      datasourceCurrent,
      isFetchingSubscribes,
      keyword,
      loadingProject
    } = this.props
    let loading = propLoading || loadingProject
    let dsbDict = _.keyBy(subscribedDashboards, dsb => dsb.id)
    let sliceDict = _.keyBy(subscribedSlices, s => s.id)
    let mergedFilter = mergedFilterCreator(
      searching => subscribe => {
        let dsdata
        if (subscribe.dashboard_id) {
          dsdata = dsbDict[subscribe.dashboard_id].dashboard_title
        } else {
          dsdata = sliceDict[subscribe.slice_id].slice_name
        }
        return searching ? smartSearch(searching, dsdata) : true
      },
      dsId => subscribe => {
        let dsdata
        if (subscribe.dashboard_id) {
          dsdata = dsbDict[subscribe.dashboard_id].dbSlices
        } else {
          dsdata = [sliceDict[subscribe.slice_id]]
        }
        return _.some(dsdata, s => s.druid_datasource_id === dsId)
      },
      datasourceCurrent.id
    )
    let { sliceWidth, shouldShowCount, maxItem } = this.state
    let filteredSubscribes = subscribes.filter(mergedFilter)

    if (!filteredSubscribes.length && !keyword) {
      return this.renderEmpty()
    }

    return (
      <div className="height-100">
        <Spin spinning={isFetchingSubscribes}>
          {
            !filteredSubscribes.length && !keyword
              ? this.renderEmpty()
              : this.renderFilterPart()
          }
          <div className="pd3x">
            <div className="dash-list fix">
              {
                !filteredSubscribes.length && keyword
                  ? this.renderNoContentAfterSearch()
                  : this.renderSliceList({
                    filteredSubscribes,
                    dsbDict,
                    sliceDict,
                    shouldShowCount,
                    sliceWidth,
                    maxItem,
                    dataSources
                  })
              }
            </div>
          </div>
        </Spin>
      </div>
    )
  }

  renderNoContentAfterSearch() {
    return (
      <div className="empty-overview pd3 aligncenter">
        <h2>
          没有符合条件的内容
        </h2>
      </div>
    )
  }

  renderEmpty = () => {
    let { isFetchingSubscribes } = this.props
    return isFetchingSubscribes
      ? null
      : (
        <div
          className="relative"
          style={{height: 'calc(100vh - 200px)'}}
        >
          <div className="center-of-relative aligncenter">
            <p className="pd2">
              <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
            </p>
            <p className="pd1">当前项目没有订阅内容, 请先订阅单图</p>
            <div className="pd2">
              <Link to="/console/slices">
                <Button type="primary">前往订阅单图</Button>
              </Link>
            </div>
          </div>
        </div>
      )
  }

  render() {
    let help = (
      <div>
        <p>我的订阅是提供给用户的便捷式单图或者看板的</p>
        <p>常用管理面板，用户可以帮经常需要查看的单图或者数据</p>
        <p>看板放在我的订阅中。</p>
        <p>添加到我的订阅的方式:</p>
        <p>在单图上点击<StarOutlined className="mg1l mg1r" />可完成图表添加到我的订阅的操作</p>
      </div>
    )
    let extra = (
      <Popover content={help} trigger="hover" placement="bottomLeft">
        <QuestionCircleOutlined className="font14" />
      </Popover>
    )
    return (
      <div className="height-100">
        <Bread
          path={[{ name: '订阅列表', link: '/console/subscribe' }]}
          extra={extra}
        >
          <Auth auth="/console/slices" >
            <Link to="/console/slices">
              <Button type="primary" icon={<PlusCircleOutlined />}>订阅单图</Button>
            </Link>
          </Auth>
          <Auth auth="/console/dashboards" >
            <Link to="/console/dashboards" className="mg1l" style={{marginRight:'32px'}}>
              <Button type="primary" icon={<PlusCircleOutlined />}>订阅数据看板</Button>
            </Link>
          </Auth>
        </Bread>
        <div className="scroll-content always-display-scrollbar" id="scroll-content">
          {this.renderSlices()}
        </div>
      </div>
    );
  }
}

let Wrapped = (()=>{
  function ExcludeStoppedProject(props) {
    let {
      datasourceList: dataSources,
      subscribes,
      subscribedSlices,
      subscribedDashboards
    } = props
    let activeDataSourcesIdSet = new Set(dataSources.map(ds => ds.id))

    let sliceFilter = sl => activeDataSourcesIdSet.has(sl.druid_datasource_id)
    let validSlices = subscribedSlices.filter(sliceFilter)
    let validDashboards = subscribedDashboards.map(dsb => ({...dsb, dbSlices: dsb.dbSlices.filter(sliceFilter)}))
      .filter(dsb => dsb.dbSlices.length)

    let validIdSet = new Set([...validSlices.map(s => s.id), ...validDashboards.map(dsb => dsb.id)])
    let validSubscripts = subscribes.filter(sub => validIdSet.has(sub.slice_id || sub.dashboard_id))
    return (
      <SubscribeList
        {...{...props,
          subscribes: validSubscripts,
          subscribedSlices: validSlices,
          subscribedDashboards: validDashboards
        }}
      />
    )
  }
  let WithSubscribes = withSubscribes(ExcludeStoppedProject)
  return withCommonFilter(WithSubscribes)
})()

export default Wrapped
