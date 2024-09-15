import React, { Component } from 'react'
import _ from 'lodash'
import PropTypes from 'prop-types'
import { vizTypeChartComponentMap, vizTypeNameMap } from '../../constants/viz-component-map'
import classNames from 'classnames'
import { Tooltip, Button, Input } from 'antd'
import Icon from '../Common/sugo-icon'
import './design.styl'
import {chartData, NewVizTypeNameMap} from './constants'

export default class PanelList extends Component {

  static propTypes = {
    screenComponents: PropTypes.array,
    doModifyComponent: PropTypes.func,
    activedId: PropTypes.string,
    doActiveComponent: PropTypes.func,
    doHoverComponent: PropTypes.func
  }

  state={
    editable: false,
    value: ''
  }

  changeLayer = (type) => {
    const { screenComponents, activedId, doModifyComponent } = this.props
    const sortScreenComponents = _.orderBy(screenComponents, 'zIndex', 'desc')
    if (type === 'bottom') {
      let offset = _.last(sortScreenComponents).zIndex
      // 防止穿底
      doModifyComponent({ id: activedId, offset })
    }
    if (type === 'top') {
      let offset = _.first(sortScreenComponents).zIndex
      doModifyComponent({ id: activedId, offset: offset })
    }
    if (type === 'up') {
      const col = screenComponents.find(p => p.id === activedId)
      let firstZIndex = _.first(sortScreenComponents).zIndex
      const offset = _.get(col, 'zIndex', 0) + 1
      doModifyComponent({ id: activedId, offset: col.zIndex === firstZIndex ? firstZIndex : offset })
    }
    if (type === 'down') {
      const col = screenComponents.find(p => p.id === activedId)
      let lastIndex = _.last(sortScreenComponents).zIndex
      const offset = _.get(col, 'zIndex', 0) - 1
      doModifyComponent({ id: activedId, offset: col.zIndex === lastIndex ? lastIndex : offset })
    }
  }

  handleChange = (e) => {
    let {value} = e.target
    this.setState({ value })
  }

  cancelEdit = () => {
    const {value} = this.state
    this.setState({
      value,
      editable: false
    })
  }

  check = () => {
    let { activedId, doModifyComponent } = this.props
    this.setState({ editable: false })
    let stateValue = this.state.value
    doModifyComponent({ id: activedId, componentName: stateValue })

  }

  edit = (value) => {
    this.setState({ editable: true, value})
  }

  render() {
    let { screenComponents, doActiveComponent, activedId, doHoverComponent, hoverId, doModifyComponent } = this.props
    let { value, editable } = this.state
    return (
      <div className="live-screen-panel-list screen-workbench-control-theme">
        <div className={classNames('layer-list charts switch-on')}>
          <div className="title">图层</div>
          <div className="aligncenter pd1 tool">
            <Tooltip title="移到顶层"><div className="iblock mg2r"><i className="mg1r sugoicon sugo-move-top" onClick={() => this.changeLayer('top')}/></div></Tooltip>
            <Tooltip title="上移一层"><div className="iblock mg2r"><i className="sugoicon sugo-move-up" onClick={() => this.changeLayer('up')} /></div></Tooltip>
            <Tooltip title="下移一层"><div className="iblock mg2r"><i className="mg1r sugoicon sugo-move-down" onClick={() => this.changeLayer('down')} /></div></Tooltip>
            <Tooltip title="移到底层"><div className="iblock"><i className="sugoicon sugo-move-bottom" onClick={() => this.changeLayer('bottom')} /></div></Tooltip>
          </div>
          <div onMouseOut={() => doHoverComponent('')}>
            {
              _.orderBy(screenComponents, 'zIndex', 'desc').map((p, i) => {
                let name = _.get(p.style_config, 'componentName') || NewVizTypeNameMap[p.type] || p.type
                return (
                  <div
                    key={`slice-panel-${i}`}
                    className={`list-item elli ${activedId === p.id ? 'color-white bg-purple' : hoverId === p.id ? 'list-item-hover' : ''}`}
                    onMouseOver={() => {
                      doHoverComponent(p.id)
                    }}
                    onClick={() => doActiveComponent(p.id)}
                  >
                    {
                      editable && p.id === activedId ?
                        (
                          <div className="editable-cell-input-wrapper">
                            <Input
                              value={value}
                              style={{ width: 'calc(100% - 40px)' }}
                              onChange={this.handleChange}
                              //onPressEnter={this.check}
                            />
                            <Icon
                              type="check-circle"
                              title="提交更改"
                              className="font14 color-green iblock pointer mg1l editable-cell-icon"
                              onClick={this.check}
                            />
                            <Icon
                              type="close-circle-o"
                              title="放弃编辑"
                              className="font14 color-grey iblock pointer mg1l editable-cell-icon"
                              onClick={this.cancelEdit}
                            />
                          </div>
                        )
                        :
                        (
                          <div className="editable-cell-text-wrapper relative hover-display-trigger">
                            <span ref="wrap">{name}</span>
                            <Icon
                              type="sugo-edit"
                              className="color-white font12 pointer editable-cell-icon hover-color-main absolute right0 hover-display-iblock"
                              onClick={() => {
                                this.edit(name)
                              }}
                            />
                          </div>
                        )
                    }
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>
    )
  }
}
