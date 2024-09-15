import React, { Component } from 'react'
import { Collapse, message, Select } from 'antd'
import CodeEditor from '../panel-utils/code-editor'
import _ from 'lodash'

const { Panel } = Collapse
const { Option } = Select

export default class ImageDataAccessConsole extends Component { 

  changeAccessType = this.props.changeAccessType

  onRefreshData = this.props.onRefreshData

  changeFatherState = this.props.changeFatherState

  screeningData = (v) => {
    let canPass = true
    v.map(i => {
      if (_.get(window.sugo, `liveScreenDiYConstCode${i}`)) {
        return _.get(window.sugo, `liveScreenDiYConstCode${i}`)
      }
      canPass = false
    })
    if (!canPass) return message.error('该选项无效,请联系管理员')

    const next = {
      id: this.props.activedId,
      params: {
        ..._.get(this.props.componet, 'params', {}),
        paramsOverWriterPreSetList: v
      }
    }
    this.props.doModifyComponent(next)
  }

  render() {
    const { componet } = this.props
 
    let interactiveCodeNameList = {}
    let paramsOverWriterCodeNameList = {}
    if (!_.isEmpty(sugo.liveScreenDIYCodeInteractiveyConstList)) interactiveCodeNameList = sugo.liveScreenDIYCodeInteractiveyConstList
    if (!_.isEmpty(sugo.liveScreenDIYCodeParamsOverWriterConstList)) paramsOverWriterCodeNameList = sugo.liveScreenDIYCodeParamsOverWriterConstList
    let preParamsOverWriteCode = _.get(componet, 'params.paramsOverWriterPreSetList',[])
    let preInteractionCode = _.get(componet, 'params.interactionPreSetList',[])
    if (_.isArray(preParamsOverWriteCode)){
      preParamsOverWriteCode = preParamsOverWriteCode.filter( i => _.get(window.sugo, `liveScreenDiYConstCode${i}`))
    } else { preParamsOverWriteCode = [] }
    if (_.isArray(preInteractionCode)){
      preInteractionCode = preInteractionCode.filter( i => _.get(window.sugo, `liveScreenDiYConstCode${i}`))
    } else { preInteractionCode = [] }
    return (
      <div className="data-access-panel">
        <div>
          {/* <EditorPanelData accessDataType={accessDataType} /> */}
          <Collapse bordered={false} defaultActiveKey={['0', '1', '2', '3']}>
            <Panel header="查询条件预封装代码">
              <div className="pd2x pd1y">
                请选择:<Select
                  className="mg1l width-80 height-100"
                  mode="multiple"
                  value={preParamsOverWriteCode}
                  getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
                  onChange={(v) => {
                    this.screeningData(v)
                  }}
                >
                  {Object.keys(paramsOverWriterCodeNameList).map(i => {
                    //查询
                    return <Option key={i} value={paramsOverWriterCodeNameList[i]}>{i}</Option>
                  })}
                </Select>
              </div>
            </Panel>
            <Panel header="交互预封装代码">
              <div className="pd2x pd1y">
                请选择:<Select
                  className="mg1l width-80 height-100"
                  mode="multiple"
                  value={preInteractionCode}
                  getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
                  onChange={(v) => {
                    let canPass = true
                    v.map(i => {
                      if (_.get(window.sugo, `liveScreenDiYConstCode${i}`)) {
                        return _.get(window.sugo, `liveScreenDiYConstCode${i}`)
                      }
                      canPass = false
                    })
                    if (!canPass) return message.error('该选项无效,请联系管理员')

                    const next = {
                      id: this.props.activedId,
                      params: {
                        ..._.get(componet, 'params', {}),
                        interactionPreSetList: v
                      }
                    }
                    this.props.doModifyComponent(next)
                  }}
                    >
                  {Object.keys(interactiveCodeNameList).map(i => {
                    return <Option key={i} value={interactiveCodeNameList[i]}>{i}</Option>
                  })}
                </Select>
              </div>
            </Panel>
            <CodeEditor
              title="查询条件修改器"
              value={_.get(componet, 'params.paramsOverWriter', '')}
              changeFatherState={(v) => {
                this.props.doModifyComponent({
                  id: this.props.activedId,
                  params: {
                    ..._.get(componet, 'params', {}),
                    paramsOverWriter: v
                  }
                })
              }}
            />
            <CodeEditor
              title="设置交互代码"
              value={_.get(componet, 'params.interactionCode', '')}
              changeFatherState={(v) => {
                this.props.doModifyComponent({
                  id: this.props.activedId,
                  params: {
                    ..._.get(componet, 'params', {}),
                    interactionCode: v
                  }
                })
              }}
            />
          </Collapse>
        </div>
      </div>
    )
  }
}
