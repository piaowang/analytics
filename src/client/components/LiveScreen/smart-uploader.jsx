import React from 'react'
import UploadedImageViewer from '../Common/uploaded-image-viewer'
import Icon from '../Common/sugo-icon'
import ImagePicker from '../Common/image-picker'
import PropTypes from 'prop-types'

export default class SmartUploader extends React.PureComponent {
  
  static propTypes = {
    onPick: PropTypes.func
  }
  
  state = {
    visible: false
  }
  
  handleClick = () => {
    this.setState({
      visible: true
    })
  }
  
  render() {
    const { value, onPick } = this.props
    const { visible } = this.state
    return (
      <React.Fragment>
        <div className="ant-upload ant-upload-drag" onClick={this.handleClick}>
          <span tabIndex="0" className="ant-upload ant-upload-btn" role="button">
            <div className="ant-upload-drag-container">
              {
                value
                  ?
                  <UploadedImageViewer
                    uploadedImageId={value}
                    className="width80 height50 ignore-mouse"
                  />
                  :
                  <p className="ant-upload-drag-icon">
                    <Icon type="plus" />
                  </p>
              }
              <p className="ant-upload-text">点击选择或上传</p>
            </div>
          </span>
        </div>
        <ImagePicker
          value={value}
          visible={visible}
          onImageSelected={imageId => {
            onPick && onPick(imageId)
          }}
          onVisibleChange={visible => {
            this.setState({
              visible
            })
          }}
        />
      </React.Fragment>
    )
  }
}
