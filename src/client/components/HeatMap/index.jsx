import React from 'react'
import { CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Input,
  Button,
  Select,
  Row,
  Col,
  Spin,
  List,
  message,
  Popover,
  Popconfirm,
  Radio,
} from 'antd';
import Bread from '../Common/bread'
import './css.styl'
import { connect } from 'react-redux'
import { namespace, pageSize } from './model'
import TimePicker from '../Common/time-picker'
import { convertDateType, isRelative } from '../../../common/param-transform'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'
import UserGroupSelector from '../Common/usergroup-selector'
const Option = Select.Option
import InfiniteScroll from 'react-infinite-scroller'
import { browserHistory, Link } from 'react-router'
import Rect from '../Common/react-rectangle'
import { AccessDataType } from '../Project/constants'
import { renderPageTitle } from '../Common/bread'
import ImportHeatMapModal from './import-heat-map'
import { AccessDataOriginalType } from '../../../common/constants'

const ListItem = List.Item
const Search = Input.Search

const APP_TYPE = {
  Android: 'android',
  iOS: 'ios'
}

/**
  热力图分析
 */
@connect(state => ({ ...state[namespace], ...state['sagaCommon'] }))
export default class HeatMap extends React.Component {

  componentDidUpdate(prevProps, prevState) {
    const { projectCurrent: oldProjectCurrent } = prevProps
    const { projectCurrent } = this.props
    if (projectCurrent.id && projectCurrent.id !== oldProjectCurrent.id) {
      this.props.dispatch({
        type: `${namespace}/queryHeatMapList`,
        payload: { pageIndex: 1 }
      })
    }
  }

  handleInfiniteOnLoad = () => {
    let { heatMapList, pageIndex } = this.props
    if (heatMapList.length % pageSize !== 0) {
      message.warning('已经加载全部数据...')
      this.changeState({ hasMore: false, loading: false })
      return
    }
    this.props.dispatch({
      type: `${namespace}/queryHeatMapList`,
      payload: { pageIndex: pageIndex + 1 }
    })
  }

  renderFilterPanel = () => {
    const { appType } = this.props
    return (
      <div className="pd2b fix iblock">
        <div className="fleft">
          <span className=" color-white">SDK类型：</span>
          <Radio.Group value={appType} onChange={v => this.props.dispatch({ type: `${namespace}/queryHeatMapList`, payload: { pageIndex: 1, appType: v.target.value } })}>
            {
              _.keys(APP_TYPE).map(p => <Radio.Button className="width80" value={APP_TYPE[p]} key={`apptype_${p}`}>{p}</Radio.Button>)
            }
          </Radio.Group>
          <span className=" color-white  mg2l">热图名称：</span>
          <Search
            enterButton={<div><SearchOutlined />搜索</div>}
            style={{verticalAlign: 'middle'}}
            placeholder="热图名称或路径"
            className="width300 mg1r"
            onSearch={v => this.props.dispatch({ type: `${namespace}/queryHeatMapList`, payload: { searchKey: v } })}
          />
        </div>
      </div >
    );
  }

  changeState = (params) => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: params
    })
  }

  importHeatMap = (heatmaps) => {
    const { projectCurrent = {}, appType } = this.props
    this.props.dispatch({
      type: `${namespace}/importHeatMap`,
      payload: {
        heatmaps,
        appType: appType === APP_TYPE.Android ? AccessDataOriginalType.Android : AccessDataOriginalType.Ios,
        projectId: projectCurrent.id
      }
    })
  }

  renderList = () => {
    const { heatMapList = [], loading, hasMore } = this.props
    return (
      <div style={{ height: 'calc(100vh - 123px)' }} className="demo-infinite-container always-display-scrollbar pd3r">
        <InfiniteScroll
          initialLoad={false}
          pageStart={0}
          loadMore={this.handleInfiniteOnLoad}
          hasMore={!loading && hasMore}
          useWindow={false}
        >
          <List
            dataSource={heatMapList}
            grid={{
              gutter: 5, xs: 4, sm: 4, md: 4, lg: 4, xl: 4, xxl: 6
            }}
            renderItem={item => (
              <ListItem>
                <Rect className="height-100" aspectRatio={0.6}>
                  <div className="mg1 bg-white heat-list-item">

                    <div className="fright">
                      <Popconfirm
                        title={`确定热图 "${item.name}" 么？`}
                        placement="topLeft"
                        onConfirm={() => this.props.dispatch({ type: `${namespace}/deleteHeatMap`, payload: { id: item.id } })}
                      >
                        <CloseCircleOutlined className="color-green font14 item-del" />
                      </Popconfirm>
                    </div>
                    <div>
                      <div className="pd2x pd2t">
                        <Link to={`/console/heat-map/${item.id}`}>
                          <img
                            alt="example"
                            className="width-100"
                            style={{ position: 'relative' }}
                            src={`data:image/png;base64,${item.screenshot}`}
                          />
                        </Link>
                      </div>
                    </div>
                    <div className="item-title">{item.name}</div>
                  </div>
                </Rect>
              </ListItem>
            )}
          />
        </InfiniteScroll>

        {!hasMore && (
          <div className="aligncenter mg2b">没有更多内容...</div>
        )}
      </div>
    );
  }

  renderFilter = () => {
    const { projectCurrent, dimensionFilters, timeRange, userGroupId } = this.props
    const { id: projectId, datasource_id: datasourceId } = projectCurrent

    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(timeRange)
    return (<div>
      <Row>
        <Col span="6" className="lineh28">时间范围：</Col>
        <Col span="18"> <TimePicker
          className="width280"
          dateType={relativeTime}
          dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
          onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
            this.changeState({ timeRange: relativeTime === 'custom' ? [since, until] : relativeTime })
          }}
        /></Col>
      </Row>
      <Row className="mg2t">
        <Col span="6" className="lineh28"> 用户群：</Col>
        <Col span="18"><UserGroupSelector
          datasourceCurrent={{ datasourceId }}
          // projectList={projectList}
          className="width250"
          value={userGroupId}
          onChange={nextUserGroup => {
            this.changeState({ userGroupId: nextUserGroup && nextUserGroup.id })
          }}
        /></Col>
      </Row>
      <div className="mg2t mg1b">过滤条件</div>
      <CommonDruidFilterPanel
        projectId={projectId}
        headerDomMapper={() => null}
        dataSourceId={datasourceId}
        filters={dimensionFilters}
        onFiltersChange={nextfilters => this.changeState({ dimensionFilters: nextfilters })}
        headerDomMapper={_.noop}
      />
      <Button className="fright" type="success" onClick={() => this.queryData({})}>查询</Button>
    </div>)
  }

  render() {
    const { loading, tokens, projectCurrent = {}, appType, showImportHeatmap } = this.props
    if (projectCurrent.access_type !== AccessDataType.SDK) {
      const { cdn } = window.sugo
      const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`
      return (
        <div
          className="relative"
          style={{ height: 'calc(100vh - 200px)' }}
        >
          <div className="center-of-relative aligncenter">
            <p>
              <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
            </p>
            <div className="pd2t">
              这个项目不是SDK项目，不能使用热力图分析，请切换到由SDK创建的项目。
            </div>
          </div>
        </div>
      )
    }
    const content = tokens.map(p => {
      return (<div className="mg1b" key={`select-${p.name}`}>
        <a
          onClick={() => browserHistory.push(`/console/track/heat-map/${p.id}?type=${p.access_type}&dsid=${p.datasource_id}&projid=${p.project_id}`)}
        >
          {p.name}
        </a>
      </div>)
    })
    return (
      <div>
        {
          renderPageTitle('APP热力图分析')
        }
        <div className="heat-map-list-nav aligncenter">
          <div className="fleft pd3x color-white">热力图分析</div>
          {this.renderFilterPanel()}
          <div className="fright pd3x color-white">
            <Button onc type="primary" className="mg2r" placement="bottomRight" onClick={() => this.changeState({ showImportHeatmap: true })}>
                导入热图
            </Button>
            <Popover content={content}>
              <Button type="primary" placement="bottomRight">
                新建热图
              </Button>
            </Popover>
          </div>
        </div>
        <div className="pd2t pd3l heat-map-container bg-dark-white">
          <Spin spinning={loading}>
            {this.renderList()}
          </Spin>
        </div>
        <ImportHeatMapModal
          visible={showImportHeatmap}
          importHeatMap={this.importHeatMap}
          projectCurrent={projectCurrent}
          hideModal={() => this.changeState({ showImportHeatmap: false })}
        />
      </div>
    )
  }
}
