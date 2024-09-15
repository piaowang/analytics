import React, { Component } from 'react'
import { Row, Col, Input, Select, InputNumber, message, Button, Collapse } from 'antd'
import {
  LiveScreenSliceDataAccessTypeEnum,
  LiveScreenSliceDataAccessTypeTranslation
} from '../constants'
import CodeEditor from '../panel-utils/code-editor'
import _ from 'lodash'
import EditorPanelData from '../editor-panel-data'

const { Panel } = Collapse
const { TextArea } = Input
const { Option } = Select

export default class DataAccessConsole extends Component { 

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
    const { accessDataType, filedsName, accessData, dataPath, componet } = this.props
    let interactiveCodeNameList = {}
    let paramsOverWriterCodeNameList = {}
    if (!_.isEmpty(sugo.liveScreenDIYCodeInteractiveyConstList)) interactiveCodeNameList = sugo.liveScreenDIYCodeInteractiveyConstList
    if (!_.isEmpty(sugo.liveScreenDIYCodeParamsOverWriterConstList)) paramsOverWriterCodeNameList = sugo.liveScreenDIYCodeParamsOverWriterConstList
    let preParamsOverWriteCode = _.get(componet, 'params.paramsOverWriterPreSetList',[])
    let selectParamsOverWriterPreSetList = _.get(componet, 'params.selectParamsOverWriterPreSetList',[])
    let preInteractionCode = _.get(componet, 'params.interactionPreSetList',[])
    if (_.isArray(preParamsOverWriteCode)){
      preParamsOverWriteCode = preParamsOverWriteCode.filter( i => _.get(window.sugo, `liveScreenDiYConstCode${i}`))
    } else { preParamsOverWriteCode = [] }
    if (_.isArray(selectParamsOverWriterPreSetList)){
      selectParamsOverWriterPreSetList = selectParamsOverWriterPreSetList.filter( i => _.get(window.sugo, `liveScreenDiYConstCode${i}`))
    } else { selectParamsOverWriterPreSetList = [] }
    if (_.isArray(preInteractionCode)){
      preInteractionCode = preInteractionCode.filter( i => _.get(window.sugo, `liveScreenDiYConstCode${i}`))
    } else { preInteractionCode = [] }

    //每个组件是否对每个数据筛选联动的过滤
    let filterDataComponentsDims = _.get(componet, 'params.filterDataComponentsDims',[])
    let screenComponents = _.get(window.store.getState().livescreen_workbench, 'screenComponents', [])
    let getFilterDataComponents = screenComponents.filter(item => item.type === 'data_filter_control')
    let getFilterData = getFilterDataComponents.map(item => {
      return item.params && item.params.dimensions && item.params.dimensions[0] || ''
    })
    return (
      <div className="data-access-panel">
        <div>
          <div className="access-title pd2l">数据源类型</div>
          <div>
            <Select
              getPopupContainer={() => document.getElementsByClassName('screen-workbench')[0]}
              value={accessDataType}
              disabled={componet.type === 'blank'}
              className="width150 pd2l pd1y"
              onChange={val => this.changeAccessType(val)}
            >
              {_.keys(LiveScreenSliceDataAccessTypeEnum).map(k => {
                return (
                  <Select.Option key={`test${k}`} value={k}>{LiveScreenSliceDataAccessTypeTranslation[k] || k}</Select.Option>
                )
              })}
            </Select>
          </div>
          {
            accessDataType !== LiveScreenSliceDataAccessTypeEnum.project && accessDataType !== LiveScreenSliceDataAccessTypeEnum.external
              ? <div>
                <Row className="access-title aligncenter">
                  <Col span={12}>字段</Col>
                  <Col span={12}>别名</Col>
                </Row>
                {
                  _.keys(filedsName).map((p, i) => {
                    return (
                      <Row key={`filed_${i}`} className="access-fields-item">
                        {/* <Col span={8}>{p}</Col> */}
                        <Col span={12}>
                          <Input
                            value={_.get(filedsName, `${p}.name`, p)}
                            size="small"
                            onChange={e => {
                              _.set(filedsName, `${p}.name`, e.target.value)
                              this.changeFatherState({ filedsName: filedsName })
                            }}
                          />
                        </Col>
                        <Col span={12}>
                          <Input
                            value={_.get(filedsName, `${p}.title`, p)}
                            size="small"
                            onChange={e => {
                              _.set(filedsName, `${p}.title`, e.target.value)
                              this.changeFatherState({ filedsName: filedsName })
                            }}
                          />
                        </Col>
                      </Row>
                    )
                  })
                }
              </div>
              : null
          }
          {
            accessDataType === LiveScreenSliceDataAccessTypeEnum.api
              ? <div>
                <div className="access-title pd2l">刷新间隔</div>
                <div className="pd2x pd1y">
                  <InputNumber
                    defaultValue={10}
                    min={0}
                    max={200}
                    step={5}
                    onChange={val => {
                      const { timeUnit } = this.props
                      let intervalTime = val
                      if (timeUnit === 'second') {
                        intervalTime = val * 1
                      } else if (timeUnit === 'min') {
                        intervalTime = val * 60
                      } else if (timeUnit === 'hour') {
                        intervalTime = val * 60 * 60
                      }
                      if (intervalTime > 172800) {
                        message.error('间隔时间超出最大值：48小时')
                        return
                      }
                      this.changeFatherState({ interval: val })
                    }}
                  />
                  <Select
                    defaultValue="second"
                    className="mg1l width80 height-100"
                    getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
                    onChange={val => {
                      const { interval } = this.props
                      let intervalTime = val
                      if (val === 'second') {
                        intervalTime = interval * 1
                      } else if (val === 'min') {
                        intervalTime = interval * 60
                      } else if (val === 'hour') {
                        intervalTime = interval * 60 * 60
                      }
                      if (intervalTime > 172800) {
                        message.error('间隔时间超出最大值：48小时')
                        return
                      }
                      this.changeFatherState({ timeUnit: val })
                    }}
                  >
                    <Select.Option key={1} value="second">秒</Select.Option>
                    <Select.Option key={2} value="min">分钟</Select.Option>
                    <Select.Option key={3} value="hour">小时</Select.Option>
                  </Select>
                </div>
              </div>
              : null
          }
          <div>
            {
              accessDataType === LiveScreenSliceDataAccessTypeEnum.project || accessDataType === LiveScreenSliceDataAccessTypeEnum.external
                ? <EditorPanelData accessDataType={accessDataType} />
                : (
                  <div className="pd2x">
                    {
                      accessDataType === 'api'
                        ? <div>
                          <div className="access-title pd2l">数据路径</div>
                          <Input
                            value={dataPath}
                            onChange={e => this.changeFatherState({ dataPath: e.target.value })}
                          />
                        </div>
                        : null
                    }
                    <div className="access-title pd2l">{accessDataType === 'api' ? '地址' : '静态数据'}</div>
                    <TextArea rows={20} value={accessData} onChange={e => this.changeFatherState({ accessData: e.target.value })} />
                  </div>
                )
            }
          </div>
          <div>
            {
              accessDataType !== LiveScreenSliceDataAccessTypeEnum.project && accessDataType !== LiveScreenSliceDataAccessTypeEnum.external
                ? <div className="access-button" onClick={this.onRefreshData}>刷新数据</div>
                : null
            }
          </div>
        </div>
        <div className="data-access-panel">
          <div>
            {/* <EditorPanelData accessDataType={accessDataType} /> */}
            <Collapse bordered={false} defaultActiveKey={['0', '1', '2', '3']}>
              {
                <Panel header="数据筛选联动过滤数据所用维度">
                  <div className="pd2x pd1y">
                请选择:<Select
                      className="mg1l width-80 height-100"
                      mode="multiple"
                      value={filterDataComponentsDims}
                      getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
                      onChange={(v) => {
                        const next = {
                          id: this.props.activedId,
                          params: {
                            ..._.get(this.props.componet, 'params', {}),
                            filterDataComponentsDims: v
                          }
                        }
                        this.props.doModifyComponent(next)
                      }}
                    >
                      {getFilterData.map(i => {
                        return <Option key={i} value={i}>{i}</Option>
                      })}
                    </Select>
                  </div>
                </Panel>
              }
              {
                componet && componet.params && componet.params.vizType === 'data_filter_control'
                  ? <Panel header="选择页面所有组件查询预封装代码">
                    <div className="pd2x pd1y">
                请选择:<Select
                        className="mg1l width-80 height-100"
                        mode="multiple"
                        value={selectParamsOverWriterPreSetList}
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
                              ..._.get(this.props.componet, 'params', {}),
                              selectParamsOverWriterPreSetList: v
                            }
                          }
                          this.props.doModifyComponent(next)
                        }}
                    >
                        {Object.keys(paramsOverWriterCodeNameList).map(i => {
                          return <Option key={i} value={paramsOverWriterCodeNameList[i]}>{i}</Option>
                        })}
                      </Select>
                    </div>
                  </Panel>
                  : null
              }
              {
                componet && componet.params && componet.params.vizType !== 'data_filter_control'
                  ? <Panel header="查询条件预封装代码">
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
                          return <Option key={i} value={paramsOverWriterCodeNameList[i]}>{i}</Option>
                        })}
                      </Select>
                    </div>
                  </Panel>
                  : null
              }
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
                      //交互
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
      </div>
    )
  }
}

