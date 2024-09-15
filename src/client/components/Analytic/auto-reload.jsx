import React from 'react'
import PropTypes from 'prop-types'
import PubSub from 'pubsub-js'
import { ReloadOutlined } from '@ant-design/icons';
import {Select, Tooltip, Popover, Button} from 'antd'
import moment from 'moment'


class AutoReload extends React.Component {
  static propTypes = {
    autoReloadInterval: PropTypes.number,
    onTimer: PropTypes.func.isRequired,
    candidateIntervals: PropTypes.array
  }

  static defaultProps = {
    autoReloadInterval: 0, // in seconds, 0 means disabled
    candidateIntervals: [5, 10, 15, 30, 60, 300]
  }

  state = {
    tickNum: 0
  }

  timer = null

  componentDidMount() {
    let {autoReloadInterval} = this.props
    if (0 < autoReloadInterval) {
      this.timer = setInterval(this.onTick, 1000)
    }
  }
  
  componentDidUpdate(prevProps, prevState) {
    if (this.props.autoReloadInterval !== prevProps.autoReloadInterval) {
      let nextInterval = prevProps.autoReloadInterval
    
      if (0 < nextInterval) {
        this.setState({tickNum: nextInterval})
        if (this.timer === null) {
          this.timer = setInterval(this.onTick, 1000)
        }
      } else {
        if (this.timer !== null) {
          clearInterval(this.timer)
          this.timer = null
        }
      }
    }
  }
  
  componentWillUnmount() {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  getNextTick = prevState => {
    if (prevState.tickNum <= 1) {
      return { tickNum: this.props.autoReloadInterval }
    }
    return { tickNum: prevState.tickNum - 1 }
  }

  onTick = () => {
    if (this.state.tickNum === 1) {
      // console.info('looped: ' + moment().toISOString())
      if (this.props.onTimer) {
        this.props.onTimer()
      }
    }
    this.setState(this.getNextTick)
  }

  onIntervalSet = (val) => {
    let {updateHashState} = this.props
    updateHashState({ autoReloadInterval: val * 1 })
  }

  renderPopupContent() {
    let {autoReloadInterval, candidateIntervals} = this.props
    return (
      <div className="width200">
        <Select
          value={'' + autoReloadInterval}
          className="width-100"
          onChange={this.onIntervalSet}
        >
          <Select.Option key="0" value="0">关闭自动刷新</Select.Option>
          {candidateIntervals.map(ci => {
            return (
              <Select.Option key={`${ci}`} value={`${ci}`}>{ci < 60 ? `${ci} 秒` : moment.duration(ci, 's').humanize()}</Select.Option>
            )
          })}
        </Select>
      </div>
    )
  }

  render() {
    let {visiblePopoverKey} = this.props
    let {tickNum} = this.state

    return (
      <Tooltip
        title="设置自动刷新，自动刷新时不会使用缓存"
        placement="left"
      >
        <Popover
          title="自动刷新设置"
          trigger="click"
          visible={visiblePopoverKey === 'autoReloadSettings'}
          content={visiblePopoverKey === 'autoReloadSettings' ? this.renderPopupContent() : <div className="width200" />}
          onVisibleChange={visible => {
            PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && 'autoReloadSettings')
          }}
          placement="topLeft"
        >
          <Button
            type="ghost"
            icon={<ReloadOutlined />}
            className="mg2r iblock"
            onClick={() => {
              PubSub.publish('analytic.onVisiblePopoverKeyChange', 'autoReloadSettings')
            }}
          >
            {this.timer === null ? '设置自动刷新' : `${tickNum} 秒后刷新`}
          </Button>
        </Popover>
      </Tooltip>
    );
  }
}

import {withHashState} from '../../components/Common/hash-connector'
export default withHashState(AutoReload, state => {
  return {
    autoReloadInterval: state.autoReloadInterval || 0
  }
})
