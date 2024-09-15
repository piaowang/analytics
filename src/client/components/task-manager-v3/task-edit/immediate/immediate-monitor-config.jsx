import * as React from 'react'
import { Button, Table, Select, Input, Checkbox } from 'antd'
import CodeEditor from './immediate-code-editor'
import _ from 'lodash'

export default class ImmediateMonitorConfig extends React.Component {

  renderLimitCol = (valueCol, obj, value) => {
    const col = valueCol.option.find((p) => p.value === obj.judgeType) || valueCol.option[0]
    if (col.type === 'select') {
      return (
        <Select value={value} placeholder={col.tips} className='width-100' onChange={(v) => this.onChangeData(obj.index, valueCol.id, v)} >
          {
            col.option.map((p, i) => {
              return <Select.Option value={p.value} key={`${p.value}_${i}`}>{p.label}</Select.Option>
            })
          }
        </Select>)
    }
    if (col.type === 'input') {
      return <Input value={value} placeholder={col.tips} onChange={(v) => this.onChangeData(obj.index, valueCol.id, v.target.value)} />
    }
    if (col.type === 'input_checkbox') {
      const { containsUp = false, containsDown = false, up, down } = value
      return (
        <div>
          <Checkbox checked={containsUp} onChange={(v) => this.onChangeData(obj.index, valueCol.id, { containsUp: v.target.checked, containsDown, up, down })} />
          <Input placeholder={_.get(col, 'option.1.tips')} className='width50' value={up} onChange={(v) => this.onChangeData(obj.index, valueCol.id, { containsUp, containsDown, up: v.target.value, down })} />
          <Checkbox checked={containsDown} onChange={(v) => this.onChangeData(obj.index, valueCol.id, { containsUp, containsDown: v.target.checked, up, down })} />
          <Input className='width50' placeholder={_.get(col, 'option.2.tips')} value={down} onChange={(v) => this.onChangeData(obj.index, valueCol.id, { containsUp, containsDown, up, down: v.target.value })} />
        </div>
      )
    }
    return null
  }

  onChangeData = (index, name, value) => {
    let { value: dataList, onChange, nodeStructure } = this.props
    const [judgeCol, valueCol] = nodeStructure.items
    let newValue = _.clone(dataList)
    if (name === judgeCol.id) {
      _.set(newValue, [index, valueCol.id], '')
    }
    _.set(newValue, [index, name], value)
    onChange && onChange(newValue)
  }

  getColumns = () => {
    const { nodeStructure } = this.props
    const [nameCol, judgeCol, valueCol] = nodeStructure.items
    return [
      {
        title: nameCol.label,
        dataIndex: nameCol.id,
        width: 70,
        render: (val, obj) => <Input value={val} placeholder={nameCol.tips} onChange={v => this.onChangeData(obj.index, nameCol.id, v.target.value)} />
      },
      {
        title: judgeCol.label,
        dataIndex: judgeCol.id,
        width: 60,
        render: (val, obj) => {
          return (
            <Select className='width-100' value={val} onChange={(v) => this.onChangeData(obj.index, judgeCol.id, v)} >
              {
                judgeCol.option.map((p, i) => {
                  return <Select.Option value={p.value} key={`${p.value}_${i}`}>{p.label}</Select.Option>
                })
              }
            </Select>
          )
        }
      },
      {
        title: valueCol.label,
        dataIndex: valueCol.id,
        width: 120,
        render: (val, obj) => {
          return this.renderLimitCol(valueCol, obj, val)
        }
      }
    ]
  }

  // 添加判断条件
  onClkAddJudge = () => {
    let { value, onChange, nodeStructure } = this.props
    const [nameCol, judgeCol, valueCol] = nodeStructure.items
    let newValue = _.clone(value)
    newValue.push({ [nameCol.id]: '', [judgeCol.id]: '', [valueCol.id]: '' })
    onChange && onChange(newValue)
  }

  render() {
    const { value, params, onChange, onChangeParams } = this.props
    return (
      <div>
        <div className='mg1y aligncenter'>
          <Select
            value={params.type}
            onChange={(v) => {
              onChangeParams({ type: v })
            }}
          >
            <Select.Option value='default'>默认类型</Select.Option>
            <Select.Option value='groovy'>自定义脚本</Select.Option>
          </Select>
        </div>
        {
          params.type === 'default'
            ? (<div className='aligncenter'>
              <Table
                rowKey='index'
                size='middle'
                columns={this.getColumns()}
                dataSource={value.map((p, i) => ({ ...p, index: i, key: i }))}
                bordered
                pagination={false}
              />
              <Button onClick={this.onClkAddJudge} className={'mg-auto mg2t'}>+ 添加判断条件</Button>
            </div>)
            : (
              <CodeEditor
                value={value.toString()}
                height='calc(100vh - 400px)'
                onChange={(v) => onChange(v)}
              />)
        }
        {
          params.type === 'default'
            ? <div className='footCon mg2t mg2l'>
              <Checkbox checked={params.intercept === 'true'} onChange={e => onChangeParams({ intercept: e.target.checked.toString() })}>是否拦截</Checkbox>
            </div>
            : null
        }
      </div>
    )
  }
}

