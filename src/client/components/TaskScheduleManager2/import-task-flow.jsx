import React, { Component } from 'react'

import { InboxOutlined } from '@ant-design/icons'

import { Upload, message, Modal, Button } from 'antd'
const { Dragger } = Upload

export default class ImportTaskFlow extends Component {
  render() {
    const { taskName, showInportTask, hideModal } = this.props
    const props = {
      name: 'file',
      action: '/app/new-task-schedule/manager?amp&ajax=upload',
      accept: 'application/zip,application/x-zip,application/x-zip-compressed',
      data: {
        project: taskName
      },
      onChange:(info)=> {
        const { status } = info.file
        if (status !== 'uploading') {
          console.log(info.file, info.fileList)
        }
        if (status === 'done') {
          message.success(`${info.file.name} 上传成功`)
        } else if (status === 'error') {
          message.error(`${info.file.name} 上传失败`)
        }
      }
    }
    return (
      <Modal
        maskClosable={false}
        title={'流程导入'}
        wrapClassName="vertical-center-modal"
        visible={showInportTask}
        bodyStyle={{ padding: '10px 20px' }}
        onCancel={hideModal}
        footer={<div className="alignright"><Button onClick={hideModal}>关闭</Button></div>}
        width={'600px'}
      >
        <Dragger {...props}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或者拖拽文件到这个区域上传</p>
        </Dragger>
      </Modal>
    )
  }
}
