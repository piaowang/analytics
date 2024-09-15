import React from 'react'
import { Input } from 'antd'
// import { recurTreeNode } from '../../../components/common/genTreeSelectNode'

export default function InputSearch(props) {

  const dispatch = props.dispatch
  
  return (
    <div className="fright width-40">
      <span style={{ fontWeight: 'bold' }}>应用名称: </span>
      <Input
        className="width-70"
        onPressEnter={(e) => {
          e.preventDefault()
        }}
        placeholder="请输入应用名称"
        onChange={(e) => {
          const value = e.target.value
          dispatch({
            type: 'appAuthorizeApplication/changeState',
            payload: {
              appNameSearchVal: value
            }
          })
        }}
        // value={}
      />
    </div>
  )
}
