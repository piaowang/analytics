import React, { Component, PropTypes } from 'react'
import ImagePicker from '../Common/image-picker'
import UploadedImageViewer from '../Common/uploaded-image-viewer'
import { PlusOutlined } from '@ant-design/icons';
import { InputNumber, Radio, Tooltip } from 'antd';
import * as actions from './actions/workbench'
import { LIVE_SCREEN_COVER_MODE } from '../../../common/constants'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import _ from 'lodash'
import './design.styl'


const {Group: RadioGroup} = Radio

const radioStyle = {
  display: 'block',
  height: '30px',
  lineHeight: '30px',
  color: 'white'
}

// 快速上传组件
class SmartUploader extends React.PureComponent {

  static propTypes = {
    onPick: PropTypes.func
  }

  state = {
    visible: false
  }

  render() {
    const { value, onPick } = this.props
    const { visible } = this.state
    return (
      <React.Fragment>
        <div className="ant-upload ant-upload-drag" onClick={() => this.setState({ visible: true })}>
          <span tabIndex="0" className="ant-upload ant-upload-btn" role="button">
            <div className="ant-upload-drag-container">
              {
                value
                  ? <UploadedImageViewer uploadedImageId={value} className="width80 height50 ignore-mouse" />
                  : <p className="ant-upload-drag-icon"><PlusOutlined /></p>
              }
              <p className="ant-upload-text">点击选择或上传</p>
            </div>
          </span>
        </div>
        <ImagePicker
          value={value}
          visible={visible}
          onImageSelected={imageId => onPick && onPick(imageId)}
          onVisibleChange={visible => this.setState({ visible })}
        />
      </React.Fragment>
    );
  }
}


@connect(
  state => state.livescreen_workbench,
  dispatch => bindActionCreators(actions, dispatch)
)
export default class PageStyleEdit extends Component {

  constructor (props) {
    super(props)
    const {cover_mode, doChangeCoverMode} = props
    this.state = {
      coverMode: cover_mode || LIVE_SCREEN_COVER_MODE.automatic // 2是手动上传，1是跟随大屏实时截取微缩图
    }
    typeof doChangeCoverMode ==='function' && doChangeCoverMode(cover_mode || LIVE_SCREEN_COVER_MODE.manual)
  }

  componentDidUpdate(prevProps) {
    const {cover_mode, doChangeCoverMode} = this.props
    const {cover_mode: prev_cover_mode} = prevProps
    if (cover_mode !== prev_cover_mode) {
      this.setState({
        coverMode: cover_mode
      })
      typeof doChangeCoverMode ==='function' && doChangeCoverMode(cover_mode)
    }
  }

  

  /**
   * 更改背景
   */
  handleChangeBackground = (id) => {
    const { doChangeBackgroundImage } = this.props
    doChangeBackgroundImage(id)
  }

  /**
   * 更改缩略图
   */
  handleChangeCover = (id) => {
    const { doChangeCoverImage } = this.props
    doChangeCoverImage(id)
  }

  /**
   * 更改缩略图生成的方式
   */
  handleChangeCoverMode = (e) => {
    const mode = e.target.value
    const { doChangeCoverMode } = this.props
    doChangeCoverMode(mode)
    this.setState({
      coverMode: mode
    })
  }

  render() {
    const {
      screenWidth,
      screenHeight,
      backgroundImageId,
      coverImageId,
      doChangeScreenWidth,
      doChangeScreenHeight
    } = this.props
    const {coverMode} = this.state
    return (
      <div className="live-screen-page-edit">
        <div className="pd2">
          <div className="item-title mg1b width80 iblock">屏幕大小</div>
          <div className="mg1b width180 iblock">
            <Tooltip title="宽度"><InputNumber className="width80 mg1r" value={screenWidth} onChange={v => doChangeScreenWidth(v)} /></Tooltip>
            <Tooltip title="高度"><InputNumber className="width80" value={screenHeight} onChange={v => doChangeScreenHeight(v)} /></Tooltip>
          </div>
          <div className="item-title mg2t mg1b width80 iblock">背景图</div>
          <div className="mg2b width180 itblock">
            <SmartUploader value={backgroundImageId} onPick={this.handleChangeBackground} />
          </div>
          <div className="item-title mg1t mg2b width80"  style={{display: 'inline-block', verticalAlign: 'top'}}>封面图</div>
          <div className="mg1b width180 itblock">
            <RadioGroup className="mg2b" onChange={this.handleChangeCoverMode} value={coverMode}>
              <Radio style={radioStyle} value={LIVE_SCREEN_COVER_MODE.automatic}>自动更新</Radio>
              <Radio style={radioStyle} value={LIVE_SCREEN_COVER_MODE.manual}>手动上传</Radio>
            </RadioGroup>
            { coverMode === LIVE_SCREEN_COVER_MODE.manual
              ?<SmartUploader value={coverImageId} onPick={this.handleChangeCover} />
              :null
            }
          </div>
        </div>
      </div>
    )
  }
}