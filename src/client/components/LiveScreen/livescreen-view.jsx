import React from 'react'
import Chart from './chart'
import WithSingleFile from './with-single-file'
import _ from 'lodash'
import * as ls from '../../common/localstorage'
import {UploadedFileType} from '../../../common/constants'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { message, Input, Button } from 'antd'
import CryptoJS from 'crypto-js'
/** @jsx jsx */
import { jsx, css } from '@emotion/core'
import {connect} from 'react-redux'
import {ActionTypes as WorkbenchActionTypes, getProjectList} from './actions/workbench'

const FormItem = Form.Item
const Search = Input.Search

const componentMap = {
  id: 'id',
  viz_type: 'type',
  style_config: 'style_config',
  data_source_config: 'params',
  width: 'width',
  height: 'height',
  left: 'left',
  top: 'top',
  z_index: 'zIndex'
}

@connect(state => {
  return {
    runtimeState: _.get(state, 'livescreen_workbench.runtimeState', {})
  }
})
class LiveScreenView extends React.Component {

  state = {
    isValid: false,
    prending: 'block',
    inputValue: ''
  }
  
  componentDidMount() {
    window.addEventListener('resize', this.onWindowResize)
    this.onWindowResize()
  
    // 单图展开按钮依赖这个数据
    const livescreen = window.sugo.is_liveScreen_preview ? ls.get('livescreen_preview') : window.sugo.liveScreen
    window.store.dispatch({
      type: WorkbenchActionTypes.initState,
      livescreen: livescreen
    })
  
    // 取得项目信息，MySQL 项目不使用排队查询逻辑
    getProjectList()()
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // 查看分享时改变 top 窗口标题
    let hasJwt = -1 < (window.location.search || '').indexOf('jwtSign')
    if (hasJwt) {
      const livescreen = window.sugo.is_liveScreen_preview ? ls.get('livescreen_preview') : window.sugo.liveScreen
      const {siteName} = window.sugo
      try {
        window.parent.document.title = `${livescreen && livescreen.title}-大屏分享-${siteName}`
      } catch (e) { }
    }
  }
  
  componentWillUnmount() {
    window.removeEventListener('resize', this.onWindowResize)
  }

  onWindowResize = () => {
    const { screen_width, screen_height } = window.sugo.liveScreen
    const { clientWidth, clientHeight } = document.documentElement
    const mountNode = this.props.mountTo
    if (mountNode) {
      const style = {
        transform: `scale(${clientWidth / screen_width}, ${clientHeight / screen_height})`,
        'transform-origin': 'left top 0px',
        // background: 'url("/static/images/livefeed-template-bg.jpg") 0% 0% / 100% 100%',
        width: `${screen_width}px`,
        height: `${screen_height}px`,
        overflow: 'hidden'
      }
      Object.assign(mountNode.style, style)
    }
  }

  generateComponentDom = (component) => {
    const { left, top, width, height, z_index, offset = 0 } = component
    const comStyle = {
      left,
      top,
      width,
      height,
      zIndex: z_index + offset
    }
    const wraperStyle = {
      width,
      height
    }
    const screenComponent = _(component)
      .pick(_.keys(componentMap))
      .mapKeys((v, k) => componentMap[k])
      .value()

    return (
      <div key={`sc_${z_index}`} className="-screen-com" style={comStyle}>
        <div className="-screen-wraper" style={wraperStyle}>
          <Chart {...screenComponent} />
        </div>
      </div>
    )
  }

  checkPassWord = (v) => {
    const md5val = CryptoJS.MD5(v).toString()
    if (md5val === window.sugo.password) {
      this.setState({ isValid: true })
    } else {
      message.error('密码错误')
    }
  }

  renderPasswordValidPanel = () => {
    const { cdn, siteName, loginLogoName } = window.sugo
    let logoPath = loginLogoName.includes('/')
      ? `${cdn}${loginLogoName}`
      : `${cdn}/static/images/${loginLogoName}`
    if (_.startsWith(loginLogoName, 'http')) {
      logoPath = loginLogoName
    }
    return (
      <div id="universe-wrapper">
        <div id="check-content">
          <div
            style={{
              width:'500px',
              margin:'auto',
              marginTop:'calc(50vh - 199px)'
            }}
          >
            <h1 className="aligncenter mg3b">
              <img className="iblock mw200" src={logoPath} alt={siteName} />
            </h1>
            <div className="check-panel">
              <div className="check-panel-body pd3x pd3y">
                <FormItem>
                  <Input.Group compact>
                    <Input.Password placeholder="输入查看密码" 
                      style={{ width: 'calc(100% - 60px)'}}
                      onChange={(e) => {
                        this.setState({inputValue: e.target.value})
                      }}
                      onPressEnter={(e)=>{this.checkPassWord(e.target.value)}}
                    />
                    <Button 
                      type="primary" 
                      style={{width:'60px'}}
                      onClick={()=>{this.checkPassWord(this.state.inputValue)}}
                    >
                确定
                    </Button>
                  </Input.Group>
                </FormItem>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  render() {
    let {file, runtimeState} = this.props
    const livescreen = window.sugo.is_liveScreen_preview ? ls.get('livescreen_preview') : window.sugo.liveScreen
    const { components } = livescreen
    const { isValid, prending } = this.state
    if (window.sugo.password && !isValid) {
      return this.renderPasswordValidPanel()
    }

    if (components.length > 30) {
      setTimeout(() => this.setState({prending: 'none'}), 3000)
    }

    return (
      <div
        className="screen-layout"
        css={{
          background: file
            ? `url("${file.path}") 0% 0% / 100% 100%`
            : '#373d43',
          ...(_.get(runtimeState, 'theme.screenCss') || {})
        }}
      >
        {
          components.length > 30 
            ? <div
              className="width-100 height-100 pd2 relative"
              style={{
                position: 'absolute',
                zIndex: 9999,
                display: prending,
                background: '#ffffff'
              }}
            >
              <div className="spinner" style={{color: '#000', top: '45%', width: '220px', margin: '0 0 0 -107px'}}>
        系统正在加载数据中。请稍候。。。
              </div>
              <div className="spinner">
                <div className="bounce1" />
                <div className="bounce2" />
                <div className="bounce3" />
              </div>
            </div>
            : null
        }
        {components.map(component => this.generateComponentDom(component))}
      </div>
    )
  }
}

export default (props) => {
  const { background_image_id } = window.sugo.liveScreen
  const Component = background_image_id
    ? WithSingleFile(LiveScreenView, () => ({ fileId: background_image_id, type: UploadedFileType.Image }))
    : LiveScreenView
  return <Component {...props} />
}

