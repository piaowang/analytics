import React from 'react'
import { InputNumber, Select } from 'antd'
const Option = Select.Option

const unit = [
  {value: 0, showName: '天', key: 'day'},
  {value: 2, showName: '小时', key: 'hour'}
]

class UnitTime extends React.Component{
  state = {
    data:'',
    value: 0,
    unitVal: 'day'
  }

  componentDidMount() {
    const { executeTime } = this.props
    let arr = executeTime.split(',')
    this.setState({
      data: executeTime,
      value: +arr[0],
      unitVal: arr[1]
    })
  }

  componentDidUpdate(prevProps) {
    if(prevProps.executeTime !== this.props.executeTime){
      const { executeTime } = this.props
      let arr = executeTime.split(',')
      this.setState({
        data: executeTime,
        value: +arr[0],
        unitVal: arr[1]
      })
    }
  }

  inputChange = (e) => {
    const { unitVal } = this.state
    const { onChange } = this.props
    onChange(`${e},${unitVal}`)
  }

  selectChange = (e) => {
    const { value } = this.state
    const { onChange } = this.props
    onChange(`${value},${e}`)
  }

  render() {
    const { className, disabled } = this.props
    const { value, unitVal } = this.state
    return (
      <div className={className}>
        <InputNumber  
          className="custom-excute-input mg1r" 
          value={value}
          min={0}
          max={9999}
          placeholder="请输入时间" 
          onChange={this.inputChange} 
          disabled={disabled}
        />
        <Select 
          value={unitVal} 
          style={{ width: 120 }} 
          onChange={this.selectChange}
          className="custom-timeunit-select"
          disabled={disabled}
        >
          {
            unit.map((item, i) => {
              return (<Option key={i} value={item.key}>
                {item.showName}
              </Option>)
            })
          }
        </Select>
        <span className="custom-timeunit-text"> 前</span>
        
      </div>
    )
  }
}

export default UnitTime
