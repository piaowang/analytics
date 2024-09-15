import {PureComponent} from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Row, Col, Collapse, Button, Input, InputNumber, Radio, Tooltip } from 'antd';
import PubSub from 'pubsub-js'
import EditorGroup from './editor-group'
// import { chartStyleData } from './constants'
import _ from 'lodash'
import { getStyleItem } from './chartStyle'
import ImageUpload from './image-upload'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import * as actions from './actions/workbench'
import * as d3 from 'd3'

const Panel = Collapse.Panel

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
class EditorPanelStyle extends PureComponent {

  state = {
    chartStyle: [],
    groupNames: []
  }

  componentWillMount() {
    const { type, style_config = {}, activedId, componentDataConfig,
      params: {dimensions=[], metrics=[], tempMetricDict={}},
      handleChangeStyle, measureList ,params
    } = this.props
    let accessData = componentDataConfig && componentDataConfig[activedId] && componentDataConfig[activedId].accessData
    if (params.accessData !== '' && params.accessDataType === 'csv') {
      accessData = JSON.stringify(d3.csvParse(params.accessData), null, 2)
    }
    const chartStyle = getStyleItem(type, 
      dimensions,
      style_config,
      handleChangeStyle, metrics,
      tempMetricDict,
      measureList,
      accessData
    ) || []
    const groupNames = chartStyle.map(v => v.name)
    groupNames.push('sizexposition')
    groupNames.push('layoutxsort')
    groupNames.push('upload-image-panel')
    this.setState({
      chartStyle,
      groupNames
    })
    this.props.getMeasureList({
      dataSourceId: this.props.params.druid_datasource_id
    })
    this.props.getDimensionList({
      dataSourceId: this.props.params.druid_datasource_id
    })
  }

  componentWillReceiveProps(nextProps) {
    const { style_config, params, handleChangeStyle, activedId } = this.props

    
    if(style_config !== nextProps.style_config || params !== nextProps.params || !nextProps.isSelecting) {
      let accessData = nextProps.componentDataConfig && nextProps.componentDataConfig[nextProps.activedId] 
    && nextProps.componentDataConfig[nextProps.activedId].accessData
      if (nextProps.params.accessData !== '' && nextProps.params.accessDataType === 'csv') {
        accessData = JSON.stringify(d3.csvParse(nextProps.params.accessData), null, 2)
      }
      const chartStyle = getStyleItem(nextProps.type, 
        nextProps.params.dimensions,
        nextProps.style_config,
        handleChangeStyle,
        nextProps.params.metrics,
        nextProps.params.tempMetricDict,
        nextProps.measureList,
        accessData
      ) || []
      const groupNames = chartStyle.map(v => v.name)
      groupNames.push('sizexposition')
      groupNames.push('layoutxsort')
      groupNames.push('upload-image-panel')
      this.setState({
        chartStyle,
        groupNames
      })
    }
    if(this.props.params.druid_datasource_id !== nextProps.params.druid_datasource_id){
      this.props.getMeasureList({
        dataSourceId: nextProps.params.druid_datasource_id
      })
      this.props.getDimensionList({
        dataSourceId: nextProps.params.druid_datasource_id
      })
    }
  }

  hanldeChangePosition = (o) => {
    const { left, top, changeComponent } = this.props
    PubSub.publish('livescreen.component.updatePosition', { left, top, ...o})
    changeComponent(o)
  }

  render() {
    const { type, style_config = {}, left, top, width, height, changeComponent, activedId } = this.props
    const { chartStyle, groupNames } = this.state
    return (
      <div className="edit-panel-style">
        <Collapse key={groupNames.join()} bordered={false} defaultActiveKey={groupNames}>
          {
            chartStyle
              ? chartStyle.map(si => si && si.editor)
              : false
          }
          {
            type === 'image'
              ? (
                <Panel header="上传图片" key="upload-image-panel">
                  <div className="pd2">
                    <ImageUpload fileId={style_config.fileId} activedId={activedId} />
                  </div>
                </Panel>
              )
              : false
          }
          <EditorGroup key="sizexposition" title="大小和位置" className="bottom-line">
            <Row gutter={6} className="bottom-line pd1b">
              <Col span={12}>
                <label className="mg2r">宽度:</label><InputNumber className="width-60" min={0} value={width} onChange={(width) => changeComponent({width})} />
              </Col>
              <Col span={12}>
                <label className="mg2r">高度:</label><InputNumber className="width-60" min={0} value={height} onChange={(height) => changeComponent({height})} />
              </Col>
            </Row>
            <Row gutter={6} className="pd1t">
              <Col span={12}>
                <label className="mg1r">横坐标:</label><InputNumber className="width-60" min={0} value={left} onChange={(left) => this.hanldeChangePosition({left})} />
              </Col>
              <Col span={12}>
                <label className="mg1r">纵坐标:</label><InputNumber className="width-60" min={0} value={top} onChange={(top) => this.hanldeChangePosition({top})} />
              </Col>
            </Row>
          </EditorGroup>
        </Collapse>
      </div>
    )
  }
}

export default EditorPanelStyle
