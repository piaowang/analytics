import React, { Component } from 'react'
import { Input } from 'antd'
import _ from 'lodash'

const { TextArea } = Input

export default class IframeBoxDataAccessConsole extends Component {

  render() {
    const { componet, activedId } = this.props

    return (
      <div className="data-access-panel">
        <div className="access-title pd2l">
          网址
        </div>
        <TextArea
          rows={5}
          className="mg2"
          placeholder="输入地址"
          value={_.get(componet, 'params.chartExtraSettings.iframeUrl')}
          onChange={(e) => {
            this.props.doModifyComponent({
              id:activedId,
              params: {
                ...componet.params,
                chartExtraSettings: { iframeUrl: e.target.value }
              }
            })
          }}
          style={{ width: 'calc(100% - 32px)' }}
        />
      </div>
    )
  }
}