import React, { Component } from 'react'
import { Radio, Input, Modal, Row, Col } from 'antd'
import _ from 'lodash'
const { TextArea } = Input
export default class ExamineModal extends Component {

  state = {
    examineStatus: true,
    message: ''
  }

  render() {
    const { hide, save, visible } = this.props
    const { examineStatus, message  } = this.state
    return (
      <Modal
        visible={visible}
        title="审核"
        onCancel={hide}
      onOk={() => save({examineStatus, message})}
      >
        <Row>
          <Col span={6} className="pd1l mg2b">审核结论：</Col>
          <Col span={18}>
            <Radio.Group onChange={e => this.setState({ examineStatus: e.target.value })} defaultValue={true}>
              <Radio value={true}>通过</Radio>
              <Radio value={false}>驳回</Radio>
            </Radio.Group>
          </Col>
        </Row>
        <div className="pd1l mg1b">审核意见：</div>
        <TextArea allowClear onChange={e => this.setState({ message: e.target.value })} />
      </Modal>
    )
  }
}
