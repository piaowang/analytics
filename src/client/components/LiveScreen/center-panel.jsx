import React from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import classNames from 'classnames'
import * as actions from './actions/workbench'
import _ from 'lodash'
import Rnd from 'react-rnd-custom'
import Chart from './chart'
import WithSingleFile from './with-single-file'
import PubSub from 'pubsub-js'
import {UploadedFileType} from '../../../common/constants'
/** @jsx jsx */
import { jsx, css } from '@emotion/core'

// import { withUploadedFiles } from '../Fetcher/uploaded-files-fetcher'

/**
 * 中间区域的视图
 * 
 * @class CenterPanel
 * @extends {React.PureComponent}
 */
/*@connect(
  state => state.livescreen_workbench,
  dispatch => bindActionCreators(actions, dispatch)
)*/
class CenterPanel extends React.PureComponent {

  state = {
    layerHover: false
  }

  componentDidMount() {
    // 通过样式面板手动修改组件位置时要把位置信息同步传递给layer防止错位
    PubSub.subscribe('livescreen.component.updatePosition', (msg, {left, top}) => {
      this.rnd.updatePosition({ x: left, y: top })
    })
  }

  componentDidUpdate(prevProps) {
    if(this.props.activedId !== prevProps.activedId) {
      this.updateLayerPosition(this.props.activedId)
    }
  }

  componentWillUnmount() {
    PubSub.unsubscribe('livescreen.component.updatePosition')
  }

  /**
   * 生成单个组件dom
   *
   * @memberOf CenterPanel
   */
  generateComponentDom = (component) => {
    const { doActiveComponent, doHoverComponent, activedId, hoverId, doChangeComponentDataConfig } = this.props
    const { layerHover } = this.state
    const { left, top, width, height, zIndex, offset = 0, id } = component
    const comStyle = {
      left,
      top,
      width,
      height,
      zIndex : activedId === id ? '9999': zIndex
    }
    const wraperStyle = {
      width,
      height,
      zIndex: comStyle.zIndex - 1
    }
    const comClassNames = classNames({
      '-screen-com': true,
      'active': activedId === id,
      'hover': hoverId === id
    })
    return (
      <div 
        key={`component_${id}`}
        className={comClassNames}
        style={comStyle}
        onMouseOver={() => doHoverComponent(id)}
        onMouseOut={(event) => {
          doHoverComponent('')
        }}
        onClick={() => doActiveComponent(id)}>
        <div className="-screen-wraper" style={wraperStyle}>
          <Chart {...component} doChangeComponentDataConfig={doChangeComponentDataConfig}/>
        </div>
      </div>
    )
  }

  updateLayerPosition = (id) => {
    const { screenComponents } = this.props
    const component = _.find(screenComponents, c => c.id === id)
    if (component) {
      const { left, top } = component
      this.rnd && this.rnd.updatePosition({ x: left, y: top })
    }
  }

  handleDrag = (e, ui) => {
    const { screenComponents, activedId, doModifyComponent } = this.props
    const component = _.find(screenComponents, c => c.id === activedId)
    if (component) {
      const { left, top, id } = component
      
      // console.log(`渲染：${id}, ${top + ui.deltaY}, ${left + ui.deltaX} `)
      doModifyComponent({
        id: activedId,
        left: left + ui.deltaX,
        top: top + ui.deltaY
      })
    }
  }

  handleResize = (direction, styleSize, clientSize, delta, newPos) => {
    const { screenComponents, activedId, doModifyComponent } = this.props
    const component = _.find(screenComponents, c => c.id === activedId)
    if (component) {
      const { x, y } = newPos
      const { width, height } = styleSize
      doModifyComponent({
        id: activedId,
        left: x,
        top: y,
        width,
        height
      })
    }
  }

  handleLayerHover = (layerHover) => {
    this.setState({
      layerHover
    })
  }

  handleRemoveComponent = () => {
    const { activedId, doRemoveComponent } = this.props
    Modal.confirm({
      title: '提示',
      content: '组件删除后无法恢复，确认删除？',
      maskClosable: true,
      centered: true,
      className: 'delete-slice-modal-panel',
      onOk() {
        doRemoveComponent(activedId)
      }
    })
  }

  handleCopyComponent = () => {
    const { activedId, doCopyComponent } = this.props
    doCopyComponent(activedId)
  }

  handleClickBlank = (e) => {
    const targetId = e.target.id
    // 点击空白区域取消选择组件
    if (targetId === 'center-panel' || targetId === 'preview-container') {
      const { doActiveComponent, activedId } = this.props
      activedId && doActiveComponent('') // active 0 就是不选任何组件因为组件是从2开始
    }
  }

  handlePreiveMouseLeave = () => {
    const { doActiveComponent } = this.props
    if (this.dragging) {
      doActiveComponent('')
      this.dragging = false
    }
  }

  render() {
    const {
      screenWidth,
      screenHeight,
      leftWidth,
      centerWidth,
      centerHeight,
      previewContainerPaddingLeft,
      previewContainerPaddingTop,
      previewContainerWidth,
      previewContainerHeight,
      previewTransformScale,
      screenComponents = [],
      activedId,
      loading,
      hoverId,
      // widthUploadedFiles 获取
      file,
      runtimeState
    } = this.props
    const centerPanelStyle = {
      left: leftWidth,
      width: centerWidth,
      height: centerHeight
    }
    const previewContainerStyle = {
      width: previewContainerWidth,
      height: previewContainerHeight,
      paddingLeft: previewContainerPaddingLeft,
      paddingTop: previewContainerPaddingTop
    }
    const previewStyle = {
      width: screenWidth,
      height: screenHeight,
      background: file ? `url(${file.path}) 0% 0% / 100% 100%` : '#0E2A42'
    }
    const currentComponent = _.find(screenComponents, component => component.id === activedId)
    const tranformToolStyle = {}
    if (currentComponent) {
      const { id, left, top, width, height } = currentComponent
      Object.assign(tranformToolStyle, {
        left,
        top,
        // transform: `translate(${left}px, ${top}px)`,
        width,
        height,
        zIndex: 10000
      })
    }
    
    return (
      <div id="center-panel" className="screen-workbench-control-theme" style={centerPanelStyle} onClick={this.handleClickBlank}>
        <div id="preview-container" style={previewContainerStyle}>
          <div id="screenshot">
            <div style={{width: screenWidth, height: screenHeight,transform: `scale(${previewTransformScale})`, transformOrigin: '0 0'}}>
              <div
                id="preview"
                style={previewStyle}
                onMouseLeave={this.handlePreiveMouseLeave}
                css={_.get(runtimeState, 'theme.screenCss')}
              >
                <div className="screen-layout">
                  {
                    !loading ? screenComponents.map(component => this.generateComponentDom(component)) : false
                  }
                  {
                    activedId ? (
                      <div 
                        style={{
                          height: tranformToolStyle.top + 80,
                          width: tranformToolStyle.left + 80,
                          position: 'absolute',
                          top: '-80px',
                          left: '-80px',
                          paddingTop: (tranformToolStyle.top + 50) + 'px',
                          textAlign: 'right',
                          paddingRight: '10px',
                          borderBottom: '1px dashed #fff',
                          borderRight: '1px dashed #fff',
                          color: '#fff',
                          fontSize:'18px'
                        }}
                      >
                        {tranformToolStyle.top + ' * ' + tranformToolStyle.left}
                      </div>
                    ) : null
                  }
                  {
                    activedId ? (
                      <Rnd
                        ref={c => { this.rnd = c }}
                        initial={{
                          x: tranformToolStyle.left,
                          y: tranformToolStyle.top,
                          width: tranformToolStyle.width ,
                          height: tranformToolStyle.height
                        }}
                        onDragStart={() => this.dragging = true}
                        onDrag={this.handleDrag}
                        onDragStop={() => this.dragging = false}
                        onResize={this.handleResize}
                        bounds={'parent'}
                        className="transform-tool"
                        zIndex={10000}
                        parentScale={previewTransformScale}
                      >
                        <div
                          className="height-100 width-100"
                          onClick={(e) => e.stopPropagation()}
                          onMouseOver={() => this.handleLayerHover(true)}
                          onMouseOut={() => this.handleLayerHover(false)}
                        >
                          <div className="tools">
                            <a title="复制" onClick={this.handleCopyComponent}>
                              <CopyOutlined />
                            </a>
                            <a title="删除" onClick={this.handleRemoveComponent}>
                              <DeleteOutlined />
                            </a>
                          </div>
                        </div>
                      </Rnd>
                    ) : false
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// 这里注入能获取图片的能力，通过props.files拿出最后的url
export default (()=>{
  const withFile = WithSingleFile(CenterPanel, props => ({ fileId: props.backgroundImageId, type: UploadedFileType.Image }))
  return connect(
    state => state.livescreen_workbench,
    dispatch => bindActionCreators(actions, dispatch)
  )(withFile)
})()
