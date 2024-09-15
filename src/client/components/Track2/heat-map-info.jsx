/**
 * Created by xj on 17/10/31.
 */
import React from 'react'
import {
  CheckOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
  SaveOutlined
} from '@ant-design/icons'
import { Input, Button, Popover, message, Row, Col, Tabs, Switch } from 'antd'
import _ from 'lodash'
import moment from 'moment'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'
import { convertDateType, isRelative } from '../../../common/param-transform'
import UserGroupSelector from '../Common/usergroup-selector'
import { browserHistory } from 'react-router'
import TimePicker from '../Common/time-picker'
import { Relation_Field, APP_LIB } from '../../common/sdk-calc-point-position'

const TabPane = Tabs.TabPane

class HeatMapEdit extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      advanceChecked: false,
      filters: [],
      usergroupId: '',
      timeRange: '-7 days',
      heatMapName: '',
      visiblePopoverKey: false,
      visibleSaveModal: false,
      relationType: Relation_Field.evnetId,
      showTimePickPop: false
    }
  }

  componentWillMount() {
    const { appType, pageName, pathName } = this.props
    const { relationType } = this.state
    let filters = [{ col: 'sugo_lib', op: 'in', eq: [APP_LIB[appType]] }]
    if (relationType === Relation_Field.evnetName && pageName) {
      filters.push({ col: 'page_name', op: 'in', eq: [pageName], type: 'string' })
    } else {
      filters.push({ col: 'path_name', op: 'in', eq: [pathName], type: 'string' })
    }
    this.setState({ filters })
  }

  componentDidUpdate(prevProps, prevState) {
    const { heatMapInfo, pageName, appType, pathName, previewHeatMap, changeState } = this.props
    const { filters, relationType } = this.state
    if (prevProps.heatMapInfo !== heatMapInfo) {
      let filters = [{ col: 'sugo_lib', op: 'in', eq: [APP_LIB[appType]] }]
      if (relationType === Relation_Field.evnetName && pageName ) {
        filters.push({ col: 'page_name', op: 'in', eq: [pageName], type: 'string' })
      } else {
        filters.push({ col: 'path_name', op: 'in', eq: [pathName], type: 'string' })
      }
      this.setState({
        heatMapName: _.get(heatMapInfo, 'name'),
        relationType: _.get(heatMapInfo, 'params.relation_type', Relation_Field.evnetId),
        filters: _.get(heatMapInfo, 'params.filters', filters)
      })
    }
    if (pageName !== prevProps.pageName || pathName !== prevProps.pathName || relationType !== prevState.relationType) {
      if (relationType === Relation_Field.evnetName && pageName ) {
        this.setState({ filters: [
          ...filters.filter(p => p.col !== 'page_name' && p.col !== 'path_name'), 
          { col: 'page_name', op: 'in', eq: [pageName], type: 'string' }] 
        })
      } else {
        this.setState({ filters: [
          ...filters.filter(p => p.col !== 'page_name' && p.col !== 'path_name'), 
          { col: 'path_name', op: 'in', eq: [pathName], type: 'string' }] 
        })
      }
      
      if (previewHeatMap) {
        changeState({ previewHeatMap: false, showPointGroup: false })
      }
    }
  }

  save = () => {
    let { saveHeatMap } = this.props
    let { usergroupId, filters, heatMapName, relationType } = this.state
    if (!heatMapName) {
      message.error('热图名称不能为空')
      return
    }
    let params = {
      relation_type: relationType
    }
    if (usergroupId) {
      params.usergroup_id = usergroupId
    }
    if (filters) {
      params.filters = filters.filter(p => p.col)
    }
    saveHeatMap(heatMapName, params)
    this.setState({ visibleSaveModal: false })
  }

  renderLayerExtraFilter = () => {
    const { projectId, datasourceId } = this.props
    const { filters, visiblePopoverKey } = this.state
    return (
      <Popover
        title={
          [
            <span key="title" className="font16 mg2r">筛选</span>,
            <CloseCircleOutlined
              key="close"
              className="fright fpointer font18 color-red"
              onClick={() => this.setState({ visiblePopoverKey: false })}
            />
          ]
        }
        getPopupContainer={null}
        placement="bottom"
        arrowPointAtCenter
        trigger="click"
        visible={visiblePopoverKey}
        onVisibleChange={_.noop}
        content={(
          <CommonDruidFilterPanel
            key="filters"
            className="mw460 heatmapCondFilter"
            // dimensionOptionFilter={isCharDimension}
            getPopupContainer={() => document.querySelector('.heatmapCondFilter')}
            projectId={projectId}
            timePickerProps={{}}
            dataSourceId={datasourceId}
            headerDomMapper={_.noop}
            filters={filters || []}
            onFiltersChange={nextFilters => {
              this.setState({ filters: nextFilters })
            }}
          />
        )}
      >
        <Button
          className="iblock"
          onClick={() => this.setState({ visiblePopoverKey: true })}
        >
          <FilterOutlined className="iblock fpointer font22" />
          <span>过滤</span>
        </Button>
      </Popover>
    )
  }

  render() {
    let { projectList, usergroupId, datasourceId, isVisualization, getHeatMapData, previewHeatMap, changeState, changeHeatMapModel } = this.props
    let { timeRange, heatMapName, filters, visibleSaveModal, relationType, showTimePickPop } = this.state
    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(timeRange)
    return (
      <div >
        <div className="heat-map-nav1">
          {this.renderLayerExtraFilter()}
          <span className="mg2l color-white">时间：</span>
          <TimePicker
            className="width280"
            key="sdkTimeFilter"
            showPop={showTimePickPop}
            dateType={relativeTime}
            dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
            onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
              this.setState({ timeRange: relativeTime === 'custom' ? [since, until] : relativeTime})
            }}
            popoverProps={{
              onVisibleChange: (isVisible) => {
                this.setState({ showTimePickPop: isVisible })
              }
            }}
          />
          <span className="mg2l color-white">用户群：</span>
          <UserGroupSelector
            datasourceCurrent={{ datasourceId }}
            projectList={projectList}
            className="width250"
            value={usergroupId}
            onChange={nextUserGroup => {
              this.setState({ usergroupId: nextUserGroup && nextUserGroup.id })
            }}
          />
          <Switch
            className="mg2l color-white"
            checkedChildren={<CheckOutlined />}
            unCheckedChildren={<CloseOutlined />}
            checked={relationType === Relation_Field.evnetName}
            onChange={(checked) => this.setState({ relationType: checked ? Relation_Field.evnetName : Relation_Field.eventId })}
          />
          <span className="mg1l color-white">事件名称关联</span>
        </div>
        <div className="heat-map-nav2">
          <div className="height-100 iblock">
            <Button className={`mg1r mg2l pd3x tabs-button ${isVisualization ? 'tabs-button-ckeck' : ''}`} onClick={() => changeHeatMapModel(true, filters, timeRange)}>事件热图</Button>
            <Button className={`mg2r pd3x tabs-button ${!isVisualization ? 'tabs-button-ckeck' : ''}`} onClick={() => changeHeatMapModel(false, filters, timeRange)}>网格热图</Button>
          </div>
          <span className="fright mg2r">
            <Popover
              placement="bottom"
              trigger="click"
              visible={visibleSaveModal}
              content={
                <Tabs className="wdith300">
                  <TabPane tab="保存热图" key="saveAs">
                    <Row>
                      <Col className="pd1" span={24}>热图名称</Col>
                      <Col className="pd1" span={24}>
                        <Input value={heatMapName} className="width-100" placeholder="未输入名称" onChange={v => this.setState({ heatMapName: v.target.value })} />
                      </Col>
                      <Col className="pd1 alignright" span={24}>
                        <Button icon={<SaveOutlined />} type="primary" className="width-100" onClick={this.save}>保存</Button>
                      </Col>
                    </Row>
                  </TabPane>
                </Tabs>
              }
            >
              <Button type="success" size="small" icon={<DownloadOutlined />} onClick={() => this.setState({ visibleSaveModal: !visibleSaveModal })}>保存热图</Button>
            </Popover>
            <Button
              className="mg2l"
              type="success"
              size="small"
              icon={<EyeOutlined />}
              onClick={previewHeatMap ? () => changeState({ previewHeatMap: false, showPointGroup: false }) : () => getHeatMapData({ dimFilters: filters, heatMapQueryTimeRange: timeRange })}
            >
              {previewHeatMap ? '取消预览' : '预览热图'}
            </Button>
            <Button icon={<ReloadOutlined />} className="mg2l" onClick={() => browserHistory.push('/console/heat-map')}>
              返回列表
            </Button>
          </span>
        </div>
      </div>
    )
  }
}

export default HeatMapEdit
