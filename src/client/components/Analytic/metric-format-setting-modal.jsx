import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import {Modal, InputNumber, Radio, Checkbox} from 'antd'


// 千分位 在头部加上逗号
// 小数位 2 位 中间加上 .2f
// 百分比 尾部的 f 替换成 %

let formatTypeReg = /^(.+)(.)$/
let precisionReg = /^(.+?)(\d+)(.)$/

export default class MetricFormatSettingModal extends React.Component {
  static propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    visible: PropTypes.bool,
    onVisibleChange: PropTypes.func
  }

  static defaultProps = {}

  state = {
    settings: null
  }

  componentDidMount() {
    this.loadSettingsFromProps(this.props)
  }
  
  componentDidUpdate(prevProps, prevState) {
    let {value} = prevProps
  
    if (!_.isEqual(value, this.props.value)) {
      this.loadSettingsFromProps(this.props)
    }
  }
  
  loadSettingsFromProps(props) {
    this.setState({
      settings: props.value
    })
  }

  renderNumperOrPercentSettingPart() {
    let {settings} = this.state

    let m = (settings || '').match(formatTypeReg)
    return (
      <Radio.Group
        value={m && m[2] || undefined}
        onChange={ev => {
          this.setState({
            settings: settings.replace(formatTypeReg, `$1${ev.target.value}`)
          })
        }}
      >
        <Radio value="f">显示为数值</Radio>
        <Radio value="%">显示为百分比</Radio>
      </Radio.Group>
    )
  }

  renderPrecisionSettingPart() {
    let {settings} = this.state

    let m = (settings || '').match(precisionReg)
    return (
      <div>
        <span>小数位：</span>
        <InputNumber
          value={m && +m[2]}
          onChange={val => {
            if (!val || isNaN(val)) {
              val = 0
            }
            this.setState({
              settings: settings.replace(precisionReg, `$1${val}$3`)
            })
          }}
        />
      </div>
    )
  }

  renderCommaSeparatorSettingPart() {
    let {settings} = this.state

    let isCommaSepEnabled = _.startsWith(settings, ',')
    return (
      <Checkbox
        onChange={() => {
          this.setState({
            settings: isCommaSepEnabled ? settings.substr(1) : `,${settings}`
          })
        }}
        checked={isCommaSepEnabled}
      >使用千分位作为分隔符</Checkbox>
    )
  }

  render() {
    let {
      onChange,
      visible,
      onVisibleChange
    } = this.props
    let {settings} = this.state

    return (
      <Modal
        title="指标显示格式"
        visible={visible}
        onVisibleChange={onVisibleChange}
        onOk={() => {
          onChange(settings)
          onVisibleChange(false)
        }}
        onCancel={() => {
          onVisibleChange(false)
        }}
      >
        {this.renderNumperOrPercentSettingPart()}
        <div className="mg2t">
          <div className="itblock width-50">
            {this.renderPrecisionSettingPart()}
          </div>
          <div className="itblock width-50 line-height28">
            {this.renderCommaSeparatorSettingPart()}
          </div>
        </div>
      </Modal>
    )
  }
}
