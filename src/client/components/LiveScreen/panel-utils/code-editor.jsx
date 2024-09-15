import React from 'react'
import JsCodeEditor from '../js-code-editor/jsCodeEditor'
import EditorGroup from '../editor-group'
import {Button} from 'antd'

class CodeEditor extends React.Component {
  render() {
    const { title, value } = this.props
    return (
      // this.props除了显式传给该组件的 还有Collapse给子组件的信息 没有redux信息
      <EditorGroup title={title} {...this.props}>
        <div>
          <JsCodeEditor
            className="mg2t"
            value={value}
            onChange={value => {
              this.props.changeFatherState(value)
            }}
            defaultValue={`((params, runtimeState, utils) => {
  let extraFilters = utils._.keys(runtimeState.dataFilter)
    .map(col => ({ col, op: 'in', eq: [runtimeState.dataFilter[col]].filter(x=>x!=='全部') }))
  return utils.copyOnUpdate(params, 'filters', prevFilters => [...(prevFilters || []), ...extraFilters])
})`}
          />
          <Button
            onClick={() => {
              PubSub.publish('liveScreenCharts.debugCurrentParamsOverWriter')
            }}
          >在控制台调试</Button>
        </div>
      </EditorGroup>
    )
  }
}

export default CodeEditor
