import React from 'react'
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { Button, Row, Col, Card, Spin, Switch, message } from 'antd'
import { Button2 } from '../Common/sugo-icon'
import Bread from '../Common/bread'
import './css.styl'
import { connect } from 'react-redux'
import { namespace } from './info-model'
import TimePicker from '../Common/time-picker'
import { convertDateType, isRelative } from '../../../common/param-transform'
import ReactHeatmap from '../../common/react-heatmap'
import { getHeatMapPointsAndPanel, HEATMAP_TYPE } from '../../common/sdk-calc-point-position'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'
import UserGroupSelector from '../Common/usergroup-selector'
import CommonSaveModal from '../Common/save-modal'
const ButtonGroup = Button.Group
import { checkPermission } from '../../common/permission-control'
import { browserHistory } from 'react-router'
import { AccessDataType } from '../Project/constants'

const canCreateSlice = checkPermission('/app/slices/create/slices/')
const canEditSlice = checkPermission('/app/slices/update/slices/')

/**
  热力图分析
 */
@connect(state => ({ ...state[namespace], ...state['sagaCommon'] }))
export default class HeatMap extends React.Component {

  componentWillUnmount() {
    this.changeState({ heatMapInfo: {}, heatMapId: '', selectViewMode: HEATMAP_TYPE.HYBRID })
  }


  componentWillMount() {
    const { sliceid: sliceId } = this.props.location.query
    if (sliceId) {
      this.queryData({ sliceId })
      return
    }
    const { id } = this.props.params
    this.queryData({ heatMapId: id })
  }

  changeState = (params) => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: params
    })
  }
  queryData = (params) => {
    const { selectViewMode, projectCurrent } = this.props
    this.props.dispatch({
      type: `${namespace}/queryHeatMapData`,
      payload: {
        selectViewMode,
        projectCurrent,
        ...params
      }
    })
  }

  renderHeatMapInfo = () => {
    const { heatMapInfo, loadingEvents, selectViewMode, showPointGroup, showDataInHeatPanel } = this.props
    if (_.isEmpty(heatMapInfo)) {
      return null
    }
    const { events = [], event_groups = [], points = [], heatmap_points = [] } = heatMapInfo
    const config = {
      radius: 10,
      maxOpacity: 0.5,
      minOpacity: 0,
      blur: 0.75
    }
    const { width, height } = _.get(heatMapInfo, 'params', {})

    let heatPoints = []
    let heatMapDivs = []

    if (selectViewMode === HEATMAP_TYPE.HYBRID) {
      const dataEvent = getHeatMapPointsAndPanel(_.concat(events, event_groups), showDataInHeatPanel, 'events')
      const dataPoint = getHeatMapPointsAndPanel(heatmap_points, showDataInHeatPanel, 'heat', width, height)
      heatPoints = dataPoint.heatPoints
      heatMapDivs = _.concat(dataPoint.heatMapDivs, dataEvent.heatMapDivs)
    } else if (selectViewMode === HEATMAP_TYPE.GRID) {
      const data = showPointGroup ? getHeatMapPointsAndPanel(points, showDataInHeatPanel, 'events')
        : getHeatMapPointsAndPanel(heatmap_points, showDataInHeatPanel, 'heat', width, height)
      heatPoints = data.heatPoints
      heatMapDivs = data.heatMapDivs
    } else {
      const dataEvent = getHeatMapPointsAndPanel(_.concat(events, event_groups), showDataInHeatPanel, 'events')
      heatMapDivs = dataEvent.heatMapDivs
    }
    return (<div className="mg1b">
      <div className="mg1y aligncenter">
        <ButtonGroup className="iblock" >
          <Button
            type={selectViewMode === HEATMAP_TYPE.HYBRID ? 'primary' : ''}
            onClick={() => this.changeState({ selectViewMode: HEATMAP_TYPE.HYBRID })}
          >混合模式</Button>
          <Button
            type={selectViewMode === HEATMAP_TYPE.EVENT ? 'primary' : ''}
            onClick={() => this.changeState({ selectViewMode: HEATMAP_TYPE.EVENT })}
          >基于事件</Button>
          <Button
            type={selectViewMode === HEATMAP_TYPE.GRID ? 'primary' : ''}
            onClick={() => this.changeState({ selectViewMode: HEATMAP_TYPE.GRID })}
          >基于坐标</Button>
        </ButtonGroup>
        {
          selectViewMode ===  HEATMAP_TYPE.GRID
            ? <div className="display-point-group iblock">
              显示圈选分组：<Switch size="small" checked={showPointGroup} onChange={(ck) => { this.changeState({ showPointGroup: ck }) }} />
            </div>
            : <div className="display-point-group iblock"/>
        }
      </div>
      <Spin spinning={loadingEvents}>
        <div style={{ width: '100%', overflow: 'auto' }}>
          <div className="aligncenter always-display-scrollbar" style={{ overflowY: 'auto', height: 'calc(100vh - 235px)' }}>
            <div className="pd1 bg-dark-white iblock" style={{ width: `calc(${width}px + 10px)` }}>
              <div style={{ width: `${width}px`, margin: 'auto', position: 'relative' }} className="sdk-img-disable-select">
                {
                  heatPoints.length
                    ? <div style={{ width: `${width}px`, height: `${height}px`, zIndex: 1, position: 'absolute', top: '0px' }}>
                      <ReactHeatmap configObject={config} max={(_.maxBy(heatPoints, p => p.value) || {}).value} min={0} data={heatPoints} />
                    </div>
                    : null
                }
                <img src={`data:image/png;base64,${heatMapInfo.screenshot}`} />
                {heatMapDivs}
              </div>
            </div>
          </div>
        </div>
      </Spin>
    </div>)
  }

  renderFilter = () => {
    const { projectCurrent, dimensionFilters, timeRange, userGroupId, loadingEvents } = this.props
    const { id: projectId, datasource_id: datasourceId } = projectCurrent

    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(timeRange)
    if (!datasourceId) return null
    return (<div className="alignleft heat-map-filter">
      <Row >
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
      <Row className="mg2y">
        <Col span="6" className="lineh28"> 用户群：</Col>
        <Col span="18">
          <UserGroupSelector
            datasourceCurrent={{ datasourceId }}
            allowCrossProject={false}
            className="width250"
            value={userGroupId}
            onChange={nextUserGroup => {
              this.changeState({ userGroupId: nextUserGroup && nextUserGroup.id })
            }}
            userGroupFilter={item => item.druid_datasource_id === datasourceId}
          />
        </Col>
      </Row>
      <CommonDruidFilterPanel
        projectId={projectId}
        headerDomMapper={_.noop}
        dataSourceId={datasourceId}
        filters={dimensionFilters}
        onFiltersChange={nextfilters => this.changeState({ dimensionFilters: nextfilters })}
      />
      <div className="aligncenter">
        <Button type="success" loading={loadingEvents} onClick={() => this.queryData({})}>查询</Button>
      </div>
    </div>)
  }

  updateOrCreateSlice = async (newName, action = 'saveAs') => {
    let { projectCurrent } = this.props
    let tempSlice = {
      id: action === 'update' ? slice.id : undefined,
      druid_datasource_id: projectCurrent.datasource_id,
      slice_name: newName
    }
    this.props.dispatch({
      type: `${namespace}/saveSlice`,
      payload: {
        slice: tempSlice
      }
    })
  }

  renderSaveButton = () => {
    const { showSaveModal } = this.props
    return (
      <CommonSaveModal
        className="iblock fright"
        modelType="单图"
        visible={showSaveModal}
        onVisibleChange={visible => {
          this.changeState({ showSaveModal: visible })
        }}
        // currModelName={slice && slice.slice_name}
        canSaveAsOnly={true}
        allowCreate={true}
        allowUpdate={false}
        onSaveAs={async newName => {
          let res = await this.updateOrCreateSlice(newName, 'saveAs')
          if (res) {
            message.success('保存成功')
            browserHistory.push(`/console/analytic?sliceId=${res.result.id}`)
          }
        }}
      // onUpdate={async (newName) => {
      //   let res = await this.updateOrCreateSlice(newName, 'update')
      //   if (res) {
      //     message.success('保存成功!', 8)
      //     reloadSlices()
      //   }
      // }}
      >
        {/* <Button
          className="mg1t"
          type="success"
          icon={<LegacyIcon type="sugo-save" />}
          size="default"
        >保存单图</Button> */}
        <Button2
          className="mg1t"
          type="success"
          icon={<LegacyIcon type="sugo-save" />}
          size="default"
        >保存单图</Button2>
      </CommonSaveModal>
    );
  }

  render() {
    const { sliceid: sliceId } = this.props.location.query
    const { projectCurrent = {} } = this.props
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
    return (
      <div className="always-display-scrollbar">
        <Bread path={[{ name: '热力图分析' }]} >
          <Button onClick={() => browserHistory.push(sliceId ? '/console/slices?hideLeftNavigator=1' : '/console/heat-map')} className="mg1r">
            {sliceId ? '返回单图列表' : '返回热图列表'}
          </Button>
          {!sliceId ? this.renderSaveButton() : null}
        </Bread>
        <div className="pd2t pd3x heat-map-container">
          <Row>
            <Col span={14}>
              <Card
                title="热图信息"
                className="mg1r"
                bodyStyle={{ padding: '5px 5px 0px 5px' }}
                headStyle={{ background: '#f7f7f7' }}
                style={{ height: 'calc(100vh - 120px)' }}
              >
                {this.renderHeatMapInfo()}
              </Card>
            </Col>
            <Col span={10}>
              <Card
                title="筛选条件"
                headStyle={{ background: '#f7f7f7' }}
                bodyStyle={{ padding: '25px' }}
                style={{ height: 'calc(100vh - 120px)' }}
              >
                {this.renderFilter()}
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    )
  }
}
