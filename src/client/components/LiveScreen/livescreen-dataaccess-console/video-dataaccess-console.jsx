import React, { Component } from 'react'
import { Input } from 'antd'
import _ from 'lodash'

const { TextArea } = Input

export default class VideoDataAccessConsole extends Component {

  render() {
    const { componet, activedId } = this.props

    return (
      <div className="data-access-panel">
        <div className="access-title pd2l">
          视频地址
        </div>
        <TextArea
          rows={5}
          className="mg2"
          placeholder="输入视频地址"
          value={_.get(componet, 'params.videoUrl') || sugo.demoVideoSource}
          onChange={(e) => {
            this.props.doModifyComponent({
              id:activedId,
              params: {
                ...componet.params,
                videoUrl: e.target.value
              }
            })
          }}
          style={{ width: 'calc(100% - 32px)' }}
        />
      </div>
    )
  }
}