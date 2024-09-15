import React, { Component } from 'react'
import { Collapse, Input, Button } from 'antd'
import {immutateUpdate} from '../../../../common/sugo-utils'
import JsCodeEditor from '../js-code-editor/jsCodeEditor'
import _ from 'lodash'

export default class LineTextDataAccessConsole extends Component {

  changeAccessType = this.props.changeAccessType

  onRefreshData = this.props.onRefreshData

  changeFatherState = this.props.changeFatherState

  render() {
    const { componet, activedId } = this.props

    return (
      <div className="data-access-panel">
        <div className="access-title pd2l">内容</div>
        <Input.TextArea
          className="mg2"
          rows={4}
          placeholder="输入文本"
          value={_.get(componet, 'params.text')}
          onChange={(e) => {
            this.props.doModifyComponent({
              id: activedId,
              params: { text: e.target.value }
            })
          }}
          style={{ width: 'calc(100% - 32px)' }}
          autosize
        />

        <div className="access-title pd2l">高级模式: </div>
        <JsCodeEditor
          className="mg2t"
          style={{ width: 'calc(100% - 32px)' }}
          value={_.get(componet, 'params.paramsOverWriter')}
          onChange={val => {
            this.props.doModifyComponent(immutateUpdate(componet, 'params.paramsOverWriter', () => val))
          }}
          defaultValue={`((params, runtimeState, utils) => {
/* 联动筛选逻辑 */
return utils.copyOnUpdate(params, 'text', () => utils.moment().format('YYYY/MM/DD'))
})`}
        />
        <Button
          onClick={() => {
            PubSub.publish('liveScreenCharts.debugCurrentParamsOverWriter')
          }}
        >在控制台调试</Button>
      </div>
    )
  }
}
