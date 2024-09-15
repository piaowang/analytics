import React, {Component} from 'react'
import ImagePicker from '../Common/image-picker'
import UploadedImageViewer from '../Common/uploaded-image-viewer'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from './actions/workbench'
import WithSingleFile from './with-single-file'
import { PlusOutlined } from '@ant-design/icons';
import EditorGroup from './editor-group'
import _ from 'lodash'
import {UploadedFileType} from '../../../common/constants'

class ImageUpload extends Component {

  state = {
    imagePickerVisible: false,
    value: null
  }

  componentWillReceiveProps(nextProps) {
    if( !_.isEqual(this.props.file, nextProps.file)) {
      this.props.doModifyComponent({
        id: this.props.activedId,
        style_config: {
          file: nextProps.file
        }
      })
    }
  }

  renderImagePickerPanel = () => {
    const {imagePickerVisible, value} = this.state
    return (
      <React.Fragment>
        <div
          className="ant-upload ant-upload-drag"
          onClick={() => {
            this.setState({
              imagePickerVisible: true
            })
          }}
        >
          <span tabIndex="0" className="ant-upload ant-upload-btn" role="button">
            <div className="ant-upload-drag-container">
              {value
                ?
                <UploadedImageViewer
                  uploadedImageId={value}
                  className="width80 height50 ignore-mouse"
                />
                :
                <p className="ant-upload-drag-icon">
                  <PlusOutlined />
                </p>
              }
              <p className="ant-upload-text">点击选择或上传</p>
            </div>
          </span>
          <EditorGroup key="image" title="" className="bottom-line" />
        </div>
        <ImagePicker
          value={value}
          visible={imagePickerVisible}
          onImageSelected={imageId => {
            this.setState({
              value: imageId
            })
            this.props.doModifyComponent({
              id: this.props.activedId,
              style_config: {
                fileId: imageId
              }
            })
            //onPick && onPick(imageId)
          }}
          onVisibleChange={visible => {
            this.setState({
              imagePickerVisible: visible
            })
          }}
        />
      </React.Fragment>
    );
  }

  render() {
    return (
      this.renderImagePickerPanel()
    )
  }
}
// 这里注入能获取图片的能力，通过props.files拿出最后的url
export default (()=>{
  //const withFile = WithSingleFile(ImageUpload, props => ({ fileId: props.fileId, type: UploadedFileType.Image })) 
  return connect(
    state => state.livescreen_workbench,
    dispatch => bindActionCreators(actions, dispatch)
  )(ImageUpload)
})()
