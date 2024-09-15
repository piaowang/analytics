import { PureComponent } from 'react'
import { CloseCircleOutlined, ExclamationCircleOutlined, InboxOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Button, Upload, notification, Input, message } from 'antd';
import {exportFile} from 'common/sugo-utils'
import setStatePromise from 'client/common/set-state-promise'
import Papa from 'papaparse'
import _ from 'lodash'
import FetchFinal from '../../../common/fetch-final'
import {validateFields} from '../../../common/decorators'
import {UploadedFileType} from '../../../../common/constants'

const { TextArea } = Input
/**
 * @description 标签数据导入
 * @export
 * @class TagDataImport
 * @extends {PureComponent}
 */
@Form.create()
@validateFields
@setStatePromise
export default class TagDataImport extends PureComponent {

  constructor() {
    super()
    this.state = {
      uploadResults: [],
      hasUpload: false, 
      uploadding: false,
      uploadFileInfo: {},
      fileSize: {}
    }
  }

  handleSubmit = async () => {
    let values = await this.validateFields()
    if (!values) return
    const { uploadResults, uploadFileInfo, fileSize } = this.state
    const { save, projectId } = this.props
    if (sugo.enableTagUploadHistory && (!uploadResults.length || _.isEmpty(uploadFileInfo))) {
      notification.warn({
        message: '提示',
        description: '上传文件失败, 数据为空'
      })
      return
    }
    const fileInfo = sugo.enableTagUploadHistory
      ? { ...uploadFileInfo, file_size: fileSize, project_id: projectId, file_memo: _.get(values, 'file_memo', '')}
      : {}
    await save(projectId, uploadResults, fileInfo)
  }

  onHideModal = async () => {
    const {hideModal} = this.props
    const { uploadFileInfo } = this.state
    if (!_.isEmpty(uploadFileInfo)) {
      await FetchFinal.delete(`/app/uploaded-files/delete/${uploadFileInfo.id}`)
    }
    hideModal('dataImportVisible')
  }

  onChangeFile = async (info) => {
    if (!sugo.enableTagUploadHistory) {
      return
    }
    const { file } = info
    this.setState({ uploadding: true })
    let { status } = file // uploading done error removed

    if (status === 'error') {
      message.error('文件上传失败，请重试')
    } else if (status === 'done') {
      // 文件上传成功，创建文件记录，标记文件 id 到 hash
      let { filename, originalFilename } = _.get(file, 'response.result') || {}
      if (!filename) {
        message.error('文件上传失败，请重试')
        // this.setState({ subStep: SubStepEnum.SettingColumns })
        return
      }
      try {
        let { result: newFile } = await FetchFinal.post('/app/uploaded-files/create', {
          name: originalFilename,
          type: UploadedFileType.LossPredictTestData,
          path: `/f/${filename}`
        })
        this.updateFile(newFile)
      } catch (err) {
        console.error(err)
        message.error('文件上传失败: ' + err.message)
        this.setState({ uploadding: false })
      }
    }
  }

  updateFile = async (file) => {//更新value，并删除旧文件（如果有）
    const { uploadFileInfo } = this.state
    if (!_.isEmpty(uploadFileInfo)) {
      await FetchFinal.delete(`/app/uploaded-files/delete/${uploadFileInfo.id}`)
    }
    this.setState({ uploadding: false, uploadFileInfo: { id: file.id, file_name: file.name, file_path: file.path } })
  }

  readFile = (file) => {
    Papa.parse(file, {
      config: {
        header: true,
        dynamicTyping: true, // 自动转换数据格式
        skipEmptyLines: true, // 排除空行
        encoding: 'UTF-8' // 编码
      },
      error: (err, file, inputElem, reason) => {
        notification.error({
          message: '提示',
          description: '上传文件错误：' + err
        })
      },
      complete: (result) => {
        const { data: uploadResults } = result
        // 过滤空值
        this.setState({
          uploadResults: uploadResults.filter(d => !_.isEmpty(d[0])),
          fileSize: file.size
        })
      }
    })
  }

  beforeUpload = (file) => {
    if (!/(\.txt|\.csv)$/.test(file.name)) {
      return notification.error({
        message: '提示',
        description: '仅支持上传.txt、.csv结尾的文件'
      })
    }
    this.readFile(file)
    return sugo.enableTagUploadHistory
  }

  // 下载样例文件
  downloadExampleFile = () => {
    const { tagDimenions } = this.props
    // 默认补上唯一id列
    const dims = [{name: 'distinct_id'}].concat(tagDimenions.filter(d => d.name !== 'distinct_id'))
    const csvContent = Papa.unparse({
      fields: dims.map(d => d.name),
      data: new Array(10).fill(1).map((v, idx) => dims.map(d => `value-${d.name}-${idx}`))
    })
    exportFile('tag-data-import-example.csv', csvContent)
  }

  downloadChEnCompare = () => {
    const { tagDimenions } = this.props
    // 默认补上唯一id列
    const dims = [{name: 'distinct_id', 'title': '用户唯一ID'}].concat(tagDimenions.filter(d => d.name !== 'distinct_id'))

    const csv = Papa.unparse( dims.map( i => ({
      '英文名': i.name,
      '中文名': i.title || i.name
    })))
    exportFile('tag-data-chinese-english-compare.csv', csv)
  }

  render() {
    let { visible, saveing, form  } = this.props
    const { getFieldDecorator } = form 
    const { uploadResults } = this.state
    // 标签体系管理列表
    // const tagDimUrl = `/console/dimension?id=${datasourceId}&datasource_type=tag`
    const tagDimUrl = '/console/tag-system-manager?datasource_type=tag'
    const draggerProps = sugo.enableTagUploadHistory
      ? {
        name: 'file',
        showUploadList: false,
        accept: 'text/csv, text/comma-separated-values, application/csv',
        action: '/app/uploaded-files/upload',
        headers: {
          'Access-Control-Allow-Origin': '*',
          token: window.sugo.file_server_token
        },
        onChange: this.onChangeFile,
        beforeUpload: this.beforeUpload
      }
      : {
        name: 'file',
        showUploadList: false,
        onChange: this.onChangeFile,
        beforeUpload: this.beforeUpload
      }
    const footer = (
      <div className="alignright">
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={this.onHideModal}
        >取消</Button>
        <Button
          type="success"
          icon={<LegacyIcon type={saveing ? 'loading' : 'check'} />}
          loading={saveing}
          className="mg1r iblock"
          onClick={this.handleSubmit}
        >{saveing ? '提交中...' : '提交'}</Button>
      </div>
    )
    return (
      <Modal
        title="标签数据导入"
        visible={visible}
        onOk={this.handleSubmit}
        onCancel={this.onHideModal}
        width={720}
        footer={footer}
      >
        <Form>
          <Form.Item {...formItemLayout} label="文件上传">
            <p className="mg2b">
              <ExclamationCircleOutlined className="mg1r" />
              <b className="color-green mg2r">请上传标签数据文件(*.csv / *.txt).</b>
              <a className="pointer" onClick={this.downloadExampleFile}>下载样例文件.csv</a>
              <a className="pointer mg2l" onClick={this.downloadChEnCompare}>下载标签中英文对照表.csv</a>
            </p>
            <Upload.Dragger {...draggerProps}>
              <p className="ant-upload-drag-icon pd3t">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text pd3b pd2t">点击或者拖拽文件到这个区域上传</p>
            </Upload.Dragger>
            {
              !uploadResults.length ? null :
                <h3 className="mg2t">上传文件中共<b className="color-green">{uploadResults.length - 1}</b>条记录(除表头后)</h3>
            }
          </Form.Item>
          {
            sugo.enableTagUploadHistory
              ? <Form.Item {...formItemLayout} label="备注">
                {
                  getFieldDecorator(
                    'file_memo',
                    {
                      rules: [
                        { required: true, message: '请输入内容' }
                      ]
                    }
                  )(<TextArea rows={4} />)
                }
              </Form.Item>
              : null
          }
          <div style={{marginLeft: 100}}>
            <p className="color-red mg2t">
              注意：1.文件中第一行必须为
              <a className="pointer" href={tagDimUrl}>标签体系管理列表</a>
              中存在的<b className="color-green">真实列名</b>名称，否则就会忽略该列数据。
            </p>
            <p className="color-red mg1t" style={{marginLeft: 35}}>
              2.文件列中必须包含<b className="color-green">distinct_id</b>(主键)列 (默认主键列名称为：distinct_id)。
            </p>
            <p className="color-red mg1t" style={{marginLeft: 35}}>
              3.CSV文件默认以逗号为分隔符。具体格式可<a className="pointer" onClick={this.downloadExampleFile}>下载样例文件.csv</a>。
            </p>
          </div>
        </Form>
      </Modal>
    );
  }
}

const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 17 }
}
