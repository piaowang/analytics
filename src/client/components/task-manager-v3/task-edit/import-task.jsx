import React from 'react'
import { InboxOutlined } from '@ant-design/icons'
import { Upload, message, Modal, Button } from 'antd'
const { Dragger } = Upload

const ImportTaskFlow = function (props) {
  const { projectId, showInportTask, hideModal, refresh } = props
  const importProps = {
    name: 'file',
    action: '/app/task-schedule-v3/manager?action=upload',
    accept: 'application/zip,application/x-zip,application/x-zip-compressed',
    data: {
      projectId
    },
    onChange(info) {
      const { status } = info.file
      if (status === 'done') {
        message.success(`${info.file.name} 上传成功`)
        refresh()
      } else if (status === 'error') {
        message.error(`${info.file.name} 上传失败`)
      }
    }
  }
  return (
    <Modal
      maskClosable={false}
      title={'流程导入'}
      wrapClassName='vertical-center-modal'
      visible={showInportTask}
      bodyStyle={{ padding: '10px 20px' }}
      onCancel={hideModal}
      footer={<div className='alignright'><Button onClick={hideModal}>关闭</Button></div>}
      width={'600px'}
    >
      <Dragger {...importProps}>
        <p className='ant-upload-drag-icon'>
          <InboxOutlined />
        </p>
        <p className='ant-upload-text'>点击或者拖拽文件到这个区域上传</p>
      </Dragger>
    </Modal>
  )
}

export default ImportTaskFlow
