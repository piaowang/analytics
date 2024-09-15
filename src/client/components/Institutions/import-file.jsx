import React from 'react'
import _ from 'lodash'
import {exportFile} from 'common/sugo-utils'
import Papa from 'papaparse'
import PropTypes from 'prop-types'
import { ExclamationCircleOutlined, InboxOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Modal, Upload, message } from 'antd'

const {Item: FItem} = Form
const {Dragger} = Upload

// 下载样例文件
const downloadExampleFile = () => {
  const fields = ['机构编号', '机构名称', '上层机构', '机构状态', '备注']
  const csvContent = Papa.unparse({
    fields,
    data: [
      ['distinct-1', 'double-1', undefined, '启用','备注-1'],
      ['distinct-2', 'double-2', 'double-1', '启用','备注-2'],
      ['distinct-3', 'double-3', 'double-2', '启用','备注-3'],
      ['distinct-4', 'double-4', 'double-3', '启用','备注-4'],
      ['distinct-5', 'double-5', 'double-4', '启用','备注-5']
    ]
  })
  exportFile('tag-data-import-example.csv', csvContent)
}

const MyModal = ({
  visible,
  importFile,
  cancel,
  form: {getFieldDecorator, validateFields, setFieldsValue}
}) => {
  const [loading, changeLoading] = React.useState(false)
  const [result, setResult] = React.useState([])

  React.useEffect(()=> {
    if (visible === false) {
      changeLoading(false)
      cancel()
    } else {
      setResult([])
    }
    
  }, [visible])

  // 根据文件中的数据数据转换成后端接口需要的格式
  const fromatData = (data) => {
    const map = {
      '机构编号': undefined,
      '机构名称': undefined,
      '上层机构': undefined,
      '机构状态': undefined,
      '备注': undefined
    }
    let i =0 // 循环时使用的下标变量
    let result = []
    if (!data.length) {
      return
    }
    const title = data[0]
    for(i=0; i<title.length; i+=1) {
      const name = title[i]
      map[name] = i
    }

    for(i=1; i<data.length; i+=1) {
      const rowData = data[i]
      const row = {
        serial_number: rowData[map['机构编号']],
        name: rowData[map['机构名称']],
        parent: rowData[map['上层机构']],
        status: rowData[map['机构状态']],
        description: rowData[map['备注']]
      }
      result.push(row)
    }
    setResult(result)
    setFieldsValue({upload: result})
  }

  const readFile = (file) => {
    Papa.parse(file, {
      config: {
        header: true,
        dynamicTyping: true, // 自动转换数据格式
        skipEmptyLines: true, // 排除空行
        encoding: 'UTF-8' // 编码
      },
      error: (err, file, inputElem, reason) => {
        message.error({
          message: '提示',
          description: '上传文件错误：' + err
        })
      },
      complete: (result) => {
        const { data: uploadResults } = result
        const data = uploadResults.filter(d => !_.isEmpty(d[0]))
        fromatData(data)
      }
    })
  }

  const props = {
    beforeUpload: (file) => {
      if (!/(\.txt|\.csv)$/.test(file.name)) {
        message.error('仅支持上传.txt、.csv结尾的文件')
        return  false
      }
      readFile(file)
      return true
    },
    name: 'file',
    action: '/app/uploaded-files/upload',
    headers: {
      'Access-Control-Allow-Origin': '*',
      token: window.sugo.file_server_token
    },
    showUploadList: false
  }
  const submit = () => {
    validateFields((err, value)=> {
      if(err) {return}
      changeLoading(true)
      importFile(value, () => {
        cancel()
      })
    })
  }
  return (
    <Modal 
      title='从文件中导入数据'
      visible={visible}
      onOk={submit}
      confirmLoading={loading}
      onCancel={cancel}
    >
      <Form>
        <FItem>
          <p className='mg2b'>
            <ExclamationCircleOutlined className='mg1r' />
            <b className='color-green mg2r'>请上传标签数据文件(*.csv / *.txt).</b>
          </p>
          <Dragger {...props}>
            <p className='ant-upload-drag-icon'>
              <InboxOutlined />
            </p>
            <p className='ant-upload-text'>点击或拖拽文件到这个区域导入数据</p>
          </Dragger>
          {result.length 
            ? <p className='ant-upload-text'>文件读取成功，当前文件包含了{result.length}条数据</p>
            : null
          }
        </FItem>
        <FItem labelCol={{span: 4}} wrapperCol={{span: 18}}>
          {
            getFieldDecorator('upload', {
              initialValue: [],
              rules: [
                {
                  required: true,
                  message: '必须上传一个文件'
                }
              ]
            })(<div value={result} />)}
        </FItem>
      </Form>
      <div>
        <p className='color-red mg2t'>
          注意：
        </p>
        <p className='color-red mg1t' style={{marginLeft: 35}}>
          1.文件中第一行为标签列表,可以存在以下字段:机构编号，机构名称，上层机构，机构状态，备注
        </p>
        <p className='color-red mg1t' style={{marginLeft: 35}}>
          2.文件列中必须包含“机构编号”和“机构名称”且不能够重复不能为空。
        </p>
        <p className='color-red mg1t' style={{marginLeft: 35}}>
          3.CSV文件默认以逗号为分隔符。具体格式可<a className='pointer' onClick={downloadExampleFile}>下载样例文件.csv</a>。
        </p>
      </div>
    </Modal>
  )
}

MyModal.propTypes  = {
  visible: PropTypes.bool,
  form: PropTypes.object
}

export default Form.create()(MyModal)
