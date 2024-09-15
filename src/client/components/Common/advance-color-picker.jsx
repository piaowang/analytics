import React from 'react'
import PropTypes from 'prop-types'
import { Select } from 'antd'
import ColorPicker from './color-picker'
import deepCopy from '../../../common/deep-copy'
import _ from 'lodash'

const Option = Select.Option

const defaultColorValue = ['rgba(147, 235, 248, 0)', '#00BAF74c']

/**
 * 
 * @class AdvanceColorPicker
 * @extends {React.PureComponent}
 */
class AdvanceColorPicker extends React.PureComponent {

  static propTypes = {
    onChange: PropTypes.func,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ]),
    defaultValue: PropTypes.string,
    popOverContainer: PropTypes.element
  }

  constructor(props) {
    super(props)
  }

  handleChangeMode = (mode) => {
    if (mode === 'fill') {
      this.handleChangeValue('#00bde1')
    } else {
      this.handleChangeValue(defaultColorValue)
    }
  }

  handleChangeValue = (v, i) => {
    const { onChange, value } = this.props
    let targetValue = v
    if (!_.isUndefined(i)) {
      targetValue = _.isString(value) ? _.cloneDeep(defaultColorValue) : deepCopy(value)
      targetValue[i] = v
    }
    onChange && onChange(targetValue)
  }

  render() {
    const { value, className, style, ...res } = this.props
    return (
      <div className={className} style={style}>
        <Select
          value={_.isArray(value) ? 'gradient' : 'fill'}
          {...res}
          onChange={this.handleChangeMode}
          className="width-100"
        >
          <Option key="fill">颜色填充</Option>
          <Option key="gradient">渐变</Option>
        </Select>
        {
          _.isArray(value)
            ? <div style={{ display: 'table' }}>
              <div style={{ display: 'table-cell', width: 15, height: '100%', paddingTop: 5, verticalAlign: 'top' }}>
                <div style={{ width: 10, height: '100%', backgroundImage: `linear-gradient(${value[0]}, ${value[1]})` }} />
              </div>
              <div style={{ display: 'table-cell' }}>
                <ColorPicker key="1" value={value[0]} onChange={v => this.handleChangeValue(v, 0)} className="mg1y" />
                <ColorPicker key="2" value={value[1]} onChange={v => this.handleChangeValue(v, 1)} />
              </div>
            </div>
            : <ColorPicker value={value} onChange={this.handleChangeValue} className="mg1y" />
        }
      </div>
    )
  }
}

export default AdvanceColorPicker
