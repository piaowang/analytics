import { PureComponent } from 'react'
import { CloseCircleOutlined, ExclamationCircleOutlined, InboxOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Button, Upload, notification, Input, message } from 'antd';
import setStatePromise from 'client/common/set-state-promise'
import Papa from 'papaparse'
import _ from 'lodash'
import * as d3 from 'd3'

@setStatePromise
export default class ImportHeatMapModal extends PureComponent {

  constructor() {
    super()
    this.state = {
      uploadResults: [],
      fileSize: {},
      saveing: false,
      errorCount: 0
    }
  }

  componentWillUnmount() {
    this.setState({
      uploadResults: [],
      fileSize: {},
      saveing: false,
      errorCount: 0
    })
  }

  componentDidUpdate(prevProps, prevState) {
    const { visible } = this.props
    if (!visible && prevProps.visible) {
      this.setState({
        uploadResults: [],
        fileSize: {},
        saveing: false,
        errorCount: 0
      })
    }
  }

  handleSubmit = async () => {
    const { uploadResults } = this.state
    const { importHeatMap } = this.props
    if (!uploadResults.length) {
      notification.warn({
        message: '提示',
        description: '上传文件失败, 数据为空'
      })
      return
    }
    this.setState({ saveing: true })
    await importHeatMap(uploadResults)
  }

  readFile = (file) => {
    const { projectCurrent } = this.props
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
        const { data } = result
        const title = _.first(data)
        const uploadResults = data.map((p, i) => {
          if (i === 0) return null
          return _.reduce(p, (r, v, k) => {
            _.set(r, title[k], v)
            return r
          }, {})
        })
        const res = uploadResults
          .filter(p => p && p.datasource_name === projectCurrent.datasource_name)
          .map(p => ({ ...p, project_id: projectCurrent.id }))

        this.setState({
          uploadResults: res,
          fileSize: file.size,
          errorCount: uploadResults.length - res.length - 1
        })
      }
    })
  }

  beforeUpload = (file) => {
    if (!/(\.csv)$/.test(file.name)) {
      return notification.error({
        message: '提示',
        description: '仅支持上传.csv结尾的文件'
      })
    }
    this.readFile(file)
    return false
  }

  render() {
    let { visible, hideModal } = this.props
    const { uploadResults, saveing, errorCount } = this.state
    // 标签体系管理列表
    const draggerProps = {
      name: 'file',
      showUploadList: false,
      beforeUpload: this.beforeUpload
    }
    const footer = (
      <div className="alignright">
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={hideModal}
        >取消</Button>
        <Button
          type="success"
          icon={<LegacyIcon type={saveing ? 'loading' : 'check'} />}
          loading={saveing}
          className="mg1r iblock"
          onClick={this.handleSubmit}
          disabled={!uploadResults.length || errorCount}
        >{saveing ? '提交中...' : '提交'}</Button>
      </div>
    )
    return (
      <Modal
        title="热图数据导入"
        visible={visible}
        width={720}
        onCancel={hideModal}
        footer={footer}
      >
        <Form>
          <Form.Item {...formItemLayout} label="文件上传">
            <p className="mg2b">
              <ExclamationCircleOutlined className="mg1r" />
              <b className="color-green mg2r">请上传热图数据文件(*.csv).</b>
            </p>
            <Upload.Dragger {...draggerProps}>
              <p className="ant-upload-drag-icon pd3t">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text pd3b pd2t">点击或者拖拽文件到这个区域上传</p>
            </Upload.Dragger>
            {
              !uploadResults.length ? null :
                <h3 className="mg2t">
                  上传文件中共<b className="color-green">{uploadResults.length}</b>条记录(除表头后)<br />
                  将覆盖appId：{_.get(uploadResults, '0.appid', '')}<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;App类型：{_.get(uploadResults, '0.app_type', '')} 的热图信息
                </h3>
            }
            {
              errorCount > 0
                ? <h3 className="mg2t color-red">上传文件中共<b >{errorCount}</b>条记录项目信息不匹配</h3>
                : null
            }
          </Form.Item>
        </Form>
      </Modal>
    );
  }
}

const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 17 }
}
