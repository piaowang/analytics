import React from 'react'
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Input, Select } from 'antd';
import {immutateUpdate} from '../../../common/sugo-utils'
import {enableSelectSearch} from '../../common/antd-freq-use-props'

const {Group: InputGroup} = Input
const {Option} = Select

export default class OrderColEditor extends React.Component {
  render() {
    let {options, value, onChange, disabled} = this.props
    // sortCols: [{col: 'xxx', direction: 'asc'}]
    return (
      <React.Fragment>
        {(value || []).map((o, i) => {
          let {col, direction} = o
          return (
            <React.Fragment key={i}>
              <InputGroup
                compact
                style={{width: 'calc(100% - 30px)'}}
              >
                <Select
                  className="width-70"
                  value={col}
                  onChange={nextVal => {
                    onChange(immutateUpdate(value, [i, 'col'], () => nextVal))
                  }}
                  {...enableSelectSearch}
                  disabled={disabled}
                >
                  {options.map(o => {
                    return (
                      <Option key={o.key} value={o.key}>{o.title}</Option>
                    )
                  })}
                </Select>
                <Select
                  className="width-30"
                  value={direction}
                  onChange={nextVal => {
                    onChange(immutateUpdate(value, [i, 'direction'], () => nextVal))
                  }}
                  disabled={disabled}
                >
                  <Option value="asc">升序</Option>
                  <Option value="desc">降序</Option>
                </Select>
              </InputGroup>
  
              {
                !disabled
                  ? (
                    <div className="itblock width30 aligncenter">
                      <MinusCircleOutlined
                        title="移除这个过滤条件"
                        className="color-grey font16 pointer line-height32 hover-color-red"
                        onClick={() => {
                          onChange((value || []).filter((o, j) => j !== i))
                        }} />
                    </div>
                  )
                  : null
              }
            </React.Fragment>
          );
        })}
        {
          !disabled
            ? (
              <div className="pd1t">
                <span
                  className="pointer color-black font12"
                  onClick={() => {
                    onChange([...(value || []), {col: null, direction: 'asc'}])
                  }}
                  title="增加一个排序列"
                >
                  <PlusCircleOutlined className="mg1r color-green font14" />
                  增加一个排序列
                </span>
              </div>
            )
            : null
        }
      </React.Fragment>
    );
  }
}
