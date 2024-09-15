import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Row, Col, Select, Button, Input, Collapse } from 'antd'
import HorizontalSplitHelper from '../../../Common/horizontal-split-helper'
import JointGraph from './joint-graph'
import { test_value } from './test-data'
import './index.styl'
import { namespace } from '../catalog-tree-model'

const { Option } = Select
const { Search } = Input
const { Panel } = Collapse
const ButtonGroup = Button.Group
// const selectStyle = {
//   style: { width: 100 }
// }

// const searchStyle = {
//   style: { width: 100 }
// }
// const iconStyle = {
//   style: { borderLeft: '1px solid #ccc', padding: '5px 0 5px 8px' }
// }


class Consanguinity extends Component {
  state = {
    selFieldId: 'APP_NUM',
    graphValue: test_value,
    attrPanelInfo: [],
    display: 'table',
    highLightSearch: '',
    isETL: true,
    isReadOnly: true,
    standard: 'data',
    isAllScreen: false
  }

  componentDidMount() {
    const {lineageData } = this.props
    this.setState({graphValue: lineageData })
  }
  
  renderTable() {
    const { highLightSearch, isETL, isReadOnly, standard, display, isAllScreen } = this.state
    const {tableName } = this.props
    return (
      <div className="consang">
        <div className="consang-header">
          <span>血缘分析</span>
          <span style={{ fontSize: '14px', marginLeft: '16px' }}>表名：{tableName}</span>
        </div>
        <div className="tool-con">
          <div className="consang-tools">
            <div>
              <Search
                enterButton="搜索"
                onSearch={v => this.setState({ highLightSearch: v })}
                style={{ width: 200 }}
              />
              <div className="tool-text">搜索</div>
            </div>
            <div className="consang-divi"/>
            <div>
              <ButtonGroup className="consang-btn-group">
                <Button type={isETL ? 'primary' : 'default'} onClick={() => this.setState({ isETL: true })}>ETL</Button>
                <Button type={!isETL ? 'primary' : 'default'} onClick={() => this.setState({ isETL: false })} >无ETL</Button>
              </ButtonGroup>
              <ButtonGroup className="consang-btn-group">
                {/* <Button type={display === 'system' ? 'primary' : 'default'} onClick={() => this.setState({ display: 'system' })}>系统级</Button> */}
                <Button type={display === 'table' ? 'primary' : 'default'} onClick={() => this.setState({ display: 'table' })} >表级</Button>
                <Button type={display === 'field' ? 'primary' : 'default'} onClick={() => this.setState({ display: 'field' })} >字段级</Button>
              </ButtonGroup>
              <ButtonGroup>
                <Button type={standard === 'data' ? 'primary' : 'default'} onClick={() => this.setState({ standard: 'data' })}>数据标准</Button>
                <Button type={standard === 'none' ? 'primary' : 'default'} onClick={() => this.setState({ standard: 'none' })} >无标准</Button>
              </ButtonGroup>
              <div className="tool-text">显示</div>
            </div>
            <div className="consang-divi"/>
            <div>
              <ButtonGroup>
                <Button type={!isReadOnly ? 'primary' : 'default'} onClick={() => this.setState({ isReadOnly: true })}>编辑</Button>
                <Button type={isReadOnly ? 'primary' : 'default'} onClick={() => this.setState({ isReadOnly: false })} >只读</Button>
              </ButtonGroup>
              <div className="tool-text">模式</div>
            </div>
            <div className="consang-divi"/>
            <div>
              <Select style={{ width: 100, marginRight: 10 }} placeholder="排列">
                <Option value="1">Originize</Option>
                <Option value="2">Personal</Option>
              </Select>
              <Select style={{ width: 80, marginRight: 10 }} placeholder="方向">
                <Option value="1">从左往右</Option>
                <Option value="2">从右往左</Option>
              </Select>
              <Button type={isAllScreen ? 'primary' : 'default'} onClick={() => this.setState((prevState) => ({ isAllScreen: !prevState.isAllScreen }))}>全屏</Button>
              <div className="tool-text">布局</div>
            </div>
            <div className="consang-divi"/>
            <div style={{ float: 'right' }}>
              <Button type="primary">刷新</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  renderGraph() {
    const { graphValue, selFieldId, display, highLightSearch } = this.state
    const {lineageData } = this.props
    console.log('graphValue------', graphValue)
    return (
      <JointGraph
        highLightSearch={highLightSearch}
        selFieldId={selFieldId}
        isShowFields={display === 'field'}
        value={lineageData}
        disabled={false}
        onChange={(next, prev ) => {
          this.setState({ graphValue: next })
        }}
        changeAttrPanel={(info) => this.setState({ attrPanelInfo: info })}
      />
    )
  }

  renderAttrsPanel() {
    const { attrPanelInfo } = this.state
    return (
      <React.Fragment>
        <Collapse style={{ height: '100%', overflowY: 'scroll' }} defaultActiveKey={'基本'} >
          {
            (attrPanelInfo || []).map((o) => {
              return (
                <Panel header={o.title} key={o.title}>
                  {(o.content || []).map((p) => {
                    return (
                      <Row type="flex" align="middle" style={{ margin: '10px 0' }} key={o.label}>
                        <Col span={8} style={{ textAlign: 'right' }} >{p.label}</Col>
                        <Col span={14} offset={2} style={{ overflowWrap: 'break-word' }} >{p.value}</Col>
                      </Row>
                    )
                  })}
                </Panel>
              )
            })
          }
        </Collapse>
      </React.Fragment>
    )
  }

  render() {
    return (
      <React.Fragment>
        {this.renderTable()}
        <HorizontalSplitHelper
          style={{ width: '100%', height: 'calc(100% - 70px)' }}
          collapseWidth={160}
          defaultFold="right"
        >
          <div
            defaultWeight={window.innerWidth - 240}
            className="itblock height-100 relative borderr"
          >
            {this.renderGraph()}
          </div>
          <div
            defaultWeight={240}
            className="itblock relative"
          >
            {this.renderAttrsPanel()}
          </div>
        </HorizontalSplitHelper>
      </React.Fragment>
    )
  }


}

export default connect(props => ({...props[namespace]}))(Consanguinity)
