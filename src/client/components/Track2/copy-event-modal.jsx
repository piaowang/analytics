import React from 'react'
import {
  Modal,
  Alert,
  Select
} from 'antd'

const Option = Select.Option

export default class CopyEventModal extends React.Component {

  render() {
    let { changeState, eventCopyPanelVisible, appVersions, selectCopyVersion, copyEvents } = this.props
    const options = (
      appVersions.map((version, idx) => <Option key={'option-' + idx} value={version}>{version}</Option>)
    )
    return (
      <Modal
        title="复制事件"
        visible={eventCopyPanelVisible}
        maskClosable={false}
        onOk={copyEvents}
        onCancel={() => changeState({ eventCopyPanelVisible: false })}
      >
        <Alert message="当前版本app无绑定事件，可复制历史版本绑定事件" type="warning" showIcon  className="mg2b"/>
        <span>选择版本:&nbsp;</span>
        <Select
          defaultValue={selectCopyVersion}
          style={{ width: 200 }}
          onChange={(value) => changeState({ selectCopyVersion: value })}
        >
          {options}
        </Select>
      </Modal>
    )
  }
}
