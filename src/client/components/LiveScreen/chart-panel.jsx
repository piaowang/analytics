import React from 'react'
import PropTypes from 'prop-types'
import { Row, Col, Tabs, InputNumber, Select, Upload } from 'antd'
import { DoubleRightOutlined, DoubleLeftOutlined } from '@ant-design/icons'
import classNames from 'classnames'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from './actions/workbench'
import { chartData } from './constants'
import ImagePicker from '../Common/image-picker'
import UploadedImageViewer from '../Common/uploaded-image-viewer'
import _ from 'lodash'
import Icon from '../Common/sugo-icon'
import { vizTypeIconMap } from '../../constants/viz-component-map'
import SmartUploader from './smart-uploader'

const Option = Select.Option
const TabPane = Tabs.TabPane
const Dragger = Upload.Dragger

// 所有的主要控件集
const ChartItems = props => {
  const { data, handleClick } = props
  return (
    <Row type='flex' justify='start'>
      {data.map((item, i) => (
        <Col key={`col_${i}`} span={8} className='chart-item' onClick={() => handleClick(item.type, item.name)}>
          {item.imgSrc ? (
            <img src={item.imgSrc} alt={item.name} className='ibblock' />
          ) : (
            <Icon type={item.iconType || vizTypeIconMap[item.type]} className='ibblock' style={{ fontSize: '35px', lineHeight: '35px', ...item.extraStyle }} />
          )}
          <p>{item.name}</p>
        </Col>
      ))}
      {_.times(3 - (data.length % 3), i => (
        <Col key={i} span={8} className='chart-item' />
      ))}
    </Row>
  )
}

// 快速上传组件
// 快速上传组件
class SmartUploader extends React.PureComponent {
  static propTypes = {
    onPick: PropTypes.func
  }

  state = {
    visible: false
  }

  handleClick = () => {
    this.setState({
      visible: true
    })
  }

  render() {
    const { value, onPick } = this.props
    const { visible } = this.state
    return (
      <React.Fragment>
        <div className='ant-upload ant-upload-drag' onClick={this.handleClick}>
          <span tabIndex='0' className='ant-upload ant-upload-btn' role='button'>
            <div className='ant-upload-drag-container'>
              {value ? (
                <UploadedImageViewer uploadedImageId={value} className='width80 height50 ignore-mouse' />
              ) : (
                <p className='ant-upload-drag-icon'>
                  <Icon type='plus' />
                </p>
              )}
              <p className='ant-upload-text'>点击选择或上传</p>
            </div>
          </span>
        </div>
        <ImagePicker
          value={value}
          visible={visible}
          onImageSelected={imageId => {
            onPick && onPick(imageId)
          }}
          onVisibleChange={visible => {
            this.setState({
              visible
            })
          }}
        />
      </React.Fragment>
    )
  }
}
/*<Dragger {...props}>
    <p className="ant-upload-drag-icon">
      <Icon type="plus" />
    </p>
    <p className="ant-upload-text">{props.children || '点击上传或者拖入图片'}</p>
  </Dragger>*/

/**
 * 左侧图标控件工具面板
 *
 * @class ChartPanel
 * @extends {React.Component}
 */
@connect(state => state.livescreen_workbench, dispatch => bindActionCreators(actions, dispatch))
class ChartPanel extends React.PureComponent {
  state = {
    collapsed: false
  }

  swtichCollapsed = () => {
    const { doChangeLeftWidth } = this.props
    const { collapsed } = this.state
    this.setState({
      collapsed: !collapsed
    })
    doChangeLeftWidth(collapsed ? 185 : 0)
  }

  handleChangeBackground = id => {
    const { doChangeBackgroundImage } = this.props
    doChangeBackgroundImage(id)
  }

  handleChangeCover = id => {
    const { doChangeCoverImage } = this.props
    doChangeCoverImage(id)
  }

  handleAddComponent = _.debounce(
    (type, name) => {
      const { doAddComponent } = this.props
      doAddComponent(type, name)
    },
    1000,
    { leading: true, trailing: false }
  )

  render() {
    const { collapsed } = this.state
    const { screenWidth, screenHeight, backgroundImageId, coverImageId, doChangeScreenWidth, doChangeScreenHeight } = this.props
    const chartGroupKeys = Object.keys(chartData)
    return (
      <div id='chart-panel'>
        <div className={classNames('layer-list charts', { 'switch-on': !collapsed })}>
          <Tabs defaultActiveKey='0'>
            {chartGroupKeys.map((groupName, i) => (
              <TabPane tab={groupName} key={`chart_${i}`}>
                <div className='chart-box bottom-line height-100'>
                  <ChartItems data={chartData[groupName]} handleClick={this.handleAddComponent} />
                </div>
              </TabPane>
            ))}
          </Tabs>
          <div className='pd2 bottom-line height80'>
            {/*<p className="mg1b">自动刷新间隔:</p>
            <Select className="width-100" defaultValue="no">
              <Option key="no">关闭自动刷新</Option>
              <Option key="10s">10s</Option>
              <Option key="30s">30s</Option>
              <Option key="1m">1m</Option>
            </Select>*/}
            <p className='mg1b'>屏幕大小:</p>
            <InputNumber className='width100 mg1r' value={screenWidth} onChange={v => doChangeScreenWidth(v)} />
            <InputNumber className='width100' value={screenHeight} onChange={v => doChangeScreenHeight(v)} />
          </div>
          <div className='pd2 bottom-line height160'>
            <p className='mg1b'>背景图:</p>
            <SmartUploader value={backgroundImageId} onPick={this.handleChangeBackground} />
          </div>
          <div className='pd2 bottom-line height160'>
            <p className='mg1b'>封面图:</p>
            <SmartUploader value={coverImageId} onPick={this.handleChangeCover} />
          </div>
        </div>
        <span className={classNames('switch-item switch-for-charts pointer', { 'switch-on': !collapsed })} onClick={this.swtichCollapsed}>
          {!collapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
        </span>
      </div>
    )
  }
}

export default ChartPanel
