import React from 'react'
import { UploadOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { message, Upload, Button } from 'antd';
import { renderLabel, getValue, formItemLayout } from './contants'
import getConditionValue from './get-condition-value'

const FormItem = Form.Item

@getConditionValue
export default class FileUpload extends React.Component {
  render() {
    let { param, keyToValueMap } = this.props
    let {
      key,
      fullName,
      isHidden,
      description
    } = param

    const props = {
      name: 'file',
      action: 'https://ant.design/components/upload-cn/upload.do',
      headers: {
        authorization: 'authorization-text'
      },
      onChange(info) {
        if (info.file.status !== 'uploading') {
          console.log(info.file, info.fileList)
        }
        if (info.file.status === 'done') {
          message.success(`${info.file.name} 已上传成功`)
        } else if (info.file.status === 'error') {
          message.error(`${info.file.name} 上传失败`)
        }
      }
    }
    return (
      <div className={'ant-form-item' + (isHidden ? ' hide' : '')}>
        <div className="pd1b" style={{lineHeight: '32px'}}>
          {renderLabel(description, fullName)}
        </div>
        <Upload {...props}>
          <Button>
            <UploadOutlined /> Click to Upload
          </Button>
        </Upload>
      </div>
    );
  }
}
