import React from 'react'
import { CloseOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, Modal, Upload, message, Divider } from 'antd'
import Fetch from '../../common/fetch-final'
import './upload-modal.styl'
// import PropTypes from 'prop-types';
/**
 * @class
 * @param showBtn:{Boolean}  是否显示按钮
 * @param showBtnName:{String}, // 按钮名称
 * @param showModal: {Boolean}, // 是否显示弹出层
 * @param uploadUrl: {String}, // 上传地址
 * @param showTips: {Boolean}, // 是否显示
 * @param tips: {String} // 解释文本 
 */
class UploadModal extends React.Component{
  state = {
    showModalVisable: false,
    fileListFromOrigin:[], // 远端数据， 解耦至父级上传 
    fileList: [],
    uploading: false
  }

  componentDidMount() {
    const { showModal } = this.props
    this.setState({
      showModalVisable: showModal
    })
  }

  componentDidUpdate(prevProps) {
    if(prevProps.showModal !== this.props.showModal) {
      this.setState({
        showModalVisable: this.props.showModal
      })

      if(this.props.showModal === true) {
        this.fetchOriginFile()
      }
    }
  }

  // 展示上传组件
  showUploadModal = () => {
    // this.setState({
    //   showModalVisable: true
    // })
  }

  // 获取已上传文件
  fetchOriginFile = async () => {
    // TODO 解耦 获取已上传数据，用于展示

    const { refProjectId, name } = this.props
    const url = `/app/task-schedule/manager?project=${name}&refProjectId=${refProjectId}&ajax=listDepFile`
    let resp = await Fetch.get(url)
    if(resp && resp.fileNames) {
      this.setState({
        fileListFromOrigin: resp.fileNames
      })
    }
  }

  // 删除已上传文件
  deleteFile = async item => {
    // TODO 删除逻辑 解耦 
    
    const { fileListFromOrigin } = this.state
    const { name, refProjectId } = this.props
    item = encodeURIComponent(item)
    const url = `/app/task-schedule/manager?project=${name}&refProjectId=${refProjectId}&ajax=delDepFile&fileName=${item}`
    let resp = await Fetch.get(url)

    if(resp) {
      message.success('文件删除成功')
      let newArr = fileListFromOrigin.filter(origin => encodeURIComponent(origin) !== item)
      this.setState({
        fileListFromOrigin: newArr
      })
    } else {
      message.info('文件删除失败')
    }
  }

  // 进行上传
  handleUpload = async () => {
    const { fileList } = this.state
    const { name, refProjectId } = this.props
    const param = {
      ajax: 'uploadfile',
      project: name,
      refProjectId
    }

    this.setState({
      uploading: true
    })

    // todo 上传逻辑在结构， 这个函数只负责返回用户将要上传的数据

    let request = fileList.map(item => {
      const formData = new FormData()
      formData.append('file', item)
      for(let x in param) {
        formData.append(x, param[x])
      }
      return Fetch.post('/app/task-schedule/manager', {}, {
        body: formData,
        headers: {}
      })
    })

    await Promise.all(request).then(resp => {
      if(resp) {
        this.setState({
          fileList: [],
          uploading: false
        })
        message.success('文件已上传！')
        this.fetchOriginFile()
      }
    }, err => {
      this.setState({
        uploading: false
      })
      message.error('文件上传失败.')
    })
  }

  // 渲染已上传文件列表
  renderFileList = () => {
    const { fileListFromOrigin } = this.state
    return fileListFromOrigin.map((item, i) => (
      <div className="upload-modal-file-item" key={i}>
        {item} <span className="file-item-icon" onClick={() => this.deleteFile(item)}><CloseOutlined /></span> 
      </div>)
    )
  }

  onsubmit = () => {
    // const { onok, toggleUploadModal } = this.props
    // this.props.onok()
    // this.props.toggleUploadModal()

  }

  render() {
    const { refProjectId, name } = this.props
    const { uploading, showModalVisable, fileListFromOrigin } = this.state
    const props = {
      data: {
        ajax: 'uploadfile',
        project: name,
        refProjectId: refProjectId
      },
      action: '/app/task-schedule/manager',
      multiple: true,
      onRemove: (file) => {
        this.setState(({ fileList }) => {
          const index = fileList.indexOf(file)
          const newFileList = fileList.slice()
          newFileList.splice(index, 1)
          return {
            fileList: newFileList
          }
        })
      },
      beforeUpload: (file) => {
        this.setState(({ fileList }) => {
          return ({
            fileList: [...fileList, file]
          })
        })
        return false
      },
      fileList: this.state.fileList
    }

    return [
      // <Button className="mg2l" icon="folder-open" key={'button'} onClick={this.fetchOriginFile}>依赖文件</Button>,
      <Modal 
        key={'uploadModal'}
        visible={showModalVisable}
        onOk={this.props.toggleUploadModal}
        onCancel={this.props.toggleUploadModal}
      >
        <Divider orientation="left">已上传文件</Divider>
        {fileListFromOrigin ? this.renderFileList() : '暂无文件'}

        <Divider orientation="left">正在上传文件</Divider>
        <Upload {...props}>
          <Button size="small">
            <UploadOutlined /> 选择文件
          </Button>
        </Upload>
        <Button
          className="upload-demo-start mg2t"
          type="primary"
          size="small"
          onClick={this.handleUpload}
          disabled={this.state.fileList.length === 0}
          loading={uploading}
        >
          {uploading ? '上传中...' : '开始上传' }
        </Button><br/>
        <p>
          使用方法： <br/>
          1.复制已上传文件的文件名（例如： 我们上传了mycustom.jar）<br/>
          2.在文件名前添加 files/ 组成成 ( files/mycustom.jar )<br/>
          3.粘贴到编辑器当中即可使用
        </p>
      </Modal>
    ]
  }
}

// UploadModal.propTypes = {
//   showBtn: PropTypes.bool, // 是否显示按钮
//   showBtnName: PropTypes.string, // 配合showBtn使用，按钮名称

//   showModal: PropTypes.bool, // 是否显示弹出层

//   showTips: PropTypes.bool, // 是否显示
//   tipsText: PropTypes.string, // 解释文本 

//   dofetch: PropTypes.func
// }

export default UploadModal
