import React from 'react'
import InputConfig from './input-config'
import { Spin } from 'antd'
export default function DataCollect(props) {
  return (
    <div>
      <Spin spinning={props.loadding}>
        <InputConfig id={props.id} />
      </Spin>
    </div>
  )
}
