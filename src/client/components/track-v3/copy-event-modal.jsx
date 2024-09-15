/**
 * create by xujun at 2020/07/09
 * 复制埋点弹出框
 */
import React, { useRef } from 'react'
import { message, Modal, Alert, Select } from 'antd'

const Option = Select.Option

export default function CopyEventModal(props) {
  let { changeState, eventCopyModalVisible, appVersions, copyEvents } = props
  const selectVersion = useRef('')

  const handlerOk = () => {
    selectVersion.current ? copyEvents(selectVersion.current) : message.error("清先选择一个版本")
  }

  const handlerCancel = () => {
    changeState({ eventCopyModalVisible: false })
  }

  const handlerChangeVersion = val => {
    selectVersion.current = val
  }

  return (
    <Modal
      title="复制事件"
      visible={eventCopyModalVisible}
      maskClosable={false}
      onOk={handlerOk}
      onCancel={handlerCancel}
    >
      <Alert
        message="当前版本app无绑定事件，可复制历史版本绑定事件"
        type="warning"
        showIcon
        className="mg2b"
      />
      <span>选择版本:&nbsp;</span>
      <Select
        className="width200"
        onChange={handlerChangeVersion}
      >
        {appVersions
          .filter(p => p.app_version)
          .map((version, idx) => <Option key={`option-${idx}`} value={version.app_version}>{version.app_version}</Option>)}
      </Select>
    </Modal>
  )
}
