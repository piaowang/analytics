import React from 'react'
import { Radio, Select } from 'antd'
import HoverHelp from '../Common/hover-help'
import _ from 'lodash'

const Option = Select.Option
const RadioGroup = Radio.Group

// 执行器组件
class ExecutoreScript extends React.Component{
  static getDerivedStateFromProps(props, state) {
    return {
      ...props.value
    }
  }

  state = {
    type: 0,
    activeLists: []
    // defaultValue:[]
  }

  componentDidUpdate(prevProps) {
    if(prevProps.taskId !== this.props.taskId) {
      console.log('diffrent' )

    }
  }


  renderSelectExecutores = () => {
    const { executors, value, taskExecutor, taskId } = this.props
    const { activeLists } = value

    if(activeLists && activeLists.length) {
      let executorsIds = executors.map(item => item.id)
      let arr = activeLists.filter(item => executorsIds.indexOf(item) === -1)
      taskExecutor && taskExecutor.map(item => {
        if(arr.indexOf(item.id) >= 0) {
          executors.push(item)
        }
      })
    }

    let children = []
    children = executors.map((item, i) => {
      return(<Option value={item.id} key={taskId+`${i}`}>{`${item.host}:${item.port}`}</Option>)
    })

    return (<div style={{display: 'inline-block', width: '400px'}}>
      <Select
        allowClear
        mode="multiple"
        placeholder="选择执行器"
        value={activeLists} // TODO
        onChange={this.changeTypeExecutores}
        style={{ width: '100%' }}
        disabled={!executors.length}
      >
        {children}
      </Select>
      {
        !executors.length && <HoverHelp 
          icon="question-circle-o" 
          content="当前不支持多执行器" 
          className="mg1l"
        />
      }
    </div>)
  }

  changeType = e => {
    const { onChange, value } = this.props
    const { activeLists } = this.state
    const type = e.target.value

    if (onChange) {
      onChange({...value, type, activeLists})
    }
  }

  changeTypeExecutores = arr => {
    const { onChange } = this.props
    const result = arr.map(item => +item)
    if (onChange) {
      onChange({type: this.state.type, activeLists: result})
    }
  }

  render(){
    const { type } = this.state

    return (<div>
      <RadioGroup onChange={this.changeType} value={type}>
        <Radio value={0}>默认</Radio>
        <Radio value={1}><span style={{marginRight: '10px'}}>指定执行器</span>
          
          {
            type === 1 && this.renderSelectExecutores()
          }
        </Radio>
      </RadioGroup>
    </div>)
  }
}

export default ExecutoreScript
