import React from 'react'
import { Modal } from 'antd'
export default function CompareModal(props) {
  let {targetUser,viewVisible,changeViewVisible,users} = props

  return (
    <Modal 
      title='查看详情'
      visible={props.viewVisible}
    >
      查看详情
    </Modal>
  )
}


