import React from 'react'
import { LayoutOutlined, SettingOutlined } from '@ant-design/icons'
import { Tabs } from 'antd'
import classNames from 'classnames'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from './actions/workbench'
import EditorPanelStyle from './editor-panel-style'
import { chartData } from './constants'
import { immutateUpdate } from '../../../common/sugo-utils'
import _ from 'lodash'
import PubSub from 'pubsub-js'
import PageStyleEdit from './page-style-edit'
import DataAccessPanel from './data-access-panel'
import { DisableDataSettingControl } from './constants'

import { DoubleLeftOutlined,DoubleRightOutlined } from '@ant-design/icons'
const TabPane = Tabs.TabPane
/**
 * 图表属性编辑面板
 * 
 * @class EditorPanel
 * @extends {React.Component}
 */
@connect(
  state => state.livescreen_workbench,
  dispatch => bindActionCreators(actions, dispatch)
)
class EditorPanel extends React.PureComponent {

  state = {
    collapsed: false,
    isSelecting: false
  }

  componentDidMount() {
    let self = this
    PubSub.subscribe('livescreen.component.sliceReadyToSet', () => {
      self.setState({ isSelecting: true })
    })
    PubSub.subscribe('livescreen.component.sliceHasSet', () => {
      self.setState({ isSelecting: false })
    })
  }

  componentWillUnmount() {
    PubSub.unsubscribe('livescreen.component.sliceReadyToSet')
    PubSub.unsubscribe('livescreen.component.sliceHasSet')
  }

  chartTypeNameMap = _.flatMap(chartData).reduce((res, v) => {
    res[v.type] = v.name
    return res
  }, {})

  swtichCollapsed = () => {
    const { doChangeRightWidth } = this.props
    const { collapsed } = this.state
    this.setState({
      collapsed: !collapsed
    })
    doChangeRightWidth(collapsed ? 271 : 0)
  }

  /**
   * 修改组件的样式同步到store
   * 
   * 
   * @memberof EditorPanel
   */
  changeStyle = (path, updater) => {
    const { doModifyComponent } = this.props
    const component = this.currentComponent
    if (component && updater) {
      let { style_config = {}, zIndex, id } = component
      style_config = immutateUpdate(style_config, path, updater)
      doModifyComponent({
        zIndex,
        id,
        style_config
      })
    }
  }

  /**
   * 修改组件的普通属性
   *
   * 
   * @memberof EditorPanel
   */
  changeComponent = (kv) => {
    const { activedId, doModifyComponent } = this.props
    doModifyComponent({ id: activedId, ...kv })
  }

  render() {
    const { collapsed, isSelecting } = this.state
    const { screenComponents, activedId, doModifyComponent, cover_mode } = this.props
    const currentComponent = _.find(screenComponents, v => v.id === activedId)
    this.currentComponent = currentComponent
    // const { style_config = {} } = currentComponent || {}
    return (
      <div className="screen-workbench-control-theme">
        <div id="editor" className={classNames({ 'switch-on': !collapsed })}>
          <div>
            <div className="compontent-name">
              {currentComponent ? this.chartTypeNameMap[currentComponent.type] : '页面设置'}
            </div>
          </div>
          {
            currentComponent
              ?
              <Tabs defaultActiveKey="1">
                <TabPane tab={<SettingOutlined className="tab-icon" />} key="1">
                  <EditorPanelStyle
                    {...currentComponent}     
                    isSelecting={isSelecting}
                    activedId={activedId}
                    handleChangeStyle={this.changeStyle}
                    changeComponent={this.changeComponent}
                  />
                </TabPane>
                {
                  DisableDataSettingControl.includes(currentComponent.type)
                    ? null
                    : (
                      <TabPane tab={<LayoutOutlined className="tab-icon" />} key="2">
                        <DataAccessPanel currentComponent={currentComponent} doModifyComponent={doModifyComponent} activedId={activedId} />
                      </TabPane>
                    )
                }
              </Tabs>
              : <PageStyleEdit cover_mode={cover_mode} />
          }
        </div>
        <span
          className={classNames('switch-item switch-for-editor pointer', { 'switch-on': !collapsed })}
          onClick={this.swtichCollapsed}
        >
          {
            !collapsed?<DoubleRightOutlined />:<DoubleLeftOutlined />
          }
        </span>
      </div>
    )
  }
}

export default EditorPanel
