import React from 'react'

import {
  ArrowRightOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';

import { Input, Button, Row, Col, Steps, Select } from 'antd';
import _ from 'lodash'

import '../../../Project/style.styl'
import './etl-task-edit.styl'
import {STEP_PARAMS_REMARK} from '../../constants'

const ReaderDefaultProps = {
  kafka: {
    readerClass: 'KafkaReader',
    brokers: 'localhost:9092',
    filePath: ' '
  },
  file: {
    readerClass: 'fileReader',
    filePath: '',
    fileName: ''
  }
}


const ParserDefaultProps = {
  type: {
    0: 'json',
    1: 'csv'
  },
  column: ''
}

const ETLTaskComponent = {
  reader: '0',
  converter: '1',
  writer: '2'
}

class ETLTaskEdit extends React.Component {

  state = {
    taskMap: {},
    activePanel: '',
    editPanel: '',
    readerType: '',
    readerProps: {},
    parserType: '',
    parserProps: {}

  }

  configCol () {
    const { onAppendParams, resetConfig } = this.props
    return (
      <div className="pd1t">
        <span
          className="pointer color-black font12"
          onClick={onAppendParams}
          title="增加一个参数"
        >
          <PlusCircleOutlined className="mg1r color-green font14" />
            增加一个参数
        </span>

        <Button
          size="small"
          className="pointer color-black font12"
          onClick={resetConfig}
          title="还原修改"
          icon={<ReloadOutlined />}
          type="primary"
          style={{height: 24,marginLeft: 20,color: '#fff'}}
        >
          还原修改
        </Button>
      </div>
    );
  }

  taskChain () {

    return (
      <div className="access-type">
        <div className={`access-type-item${this.state.editPanel === ETLTaskComponent.reader ? ' active' : ''}`}
          onClick={() => {this.setState({activePanel: ETLTaskComponent.reader, editPanel: ETLTaskComponent.reader})}}
        >
          <div className="access-icon-box">
            <FileTextOutlined />
          </div>
          <div className="access-text-box">Reader</div>
        </div>

        <div className="inline width200 aligncenter">
          <div className="access-icon-box">
            <ArrowRightOutlined />
          </div>
        </div>

        <div className={`access-type-item${this.state.editPanel === ETLTaskComponent.converter ? ' active' : ''}`}
          onClick={() => {this.setState({activePanel: ETLTaskComponent.converter, editPanel: ETLTaskComponent.converter})}}
        >
          <div className="access-icon-box">
            <SyncOutlined />
          </div>
          <div className="access-text-box">Converter</div>
        </div>

        <div className="inline width200 aligncenter">
          <div className="access-icon-box">
            <ArrowRightOutlined />
          </div>
        </div>

        <div className={`access-type-item${this.state.editPanel === ETLTaskComponent.writer ? ' active' : ''}`}
          onClick={() => {this.setState({activePanel: ETLTaskComponent.writer, editPanel: ETLTaskComponent.writer})}}
        >
          <div className="access-icon-box">
            <DatabaseOutlined />
          </div>
          <div className="access-text-box">Writer</div>
        </div>
      </div>
    );
  }

  readerEditPanel = () => {
    const Option = Select.Option
    const { readerProps, parserProps } = this.state

    // console.log(params)

    // let {
    //   showAddButton = true
    // } = this.props


    let { params,
      defaultParamsKey,
      onChangeParams,
      onRemoveParams,
      omitKey,
      showAddButton = true,
      projectId
    } = this.props

    const readerParams = params['reader']

    return (
      <div className="width500">
        <div className="pd1">
          <span className="inline width100 aligncenter">接入方式</span>
          <Select placeholder="请选择"
            onChange={id => this.changeReaderProps(id)}
            className="width300 inline"
            allowClear
          >
            {
              _.keys(ReaderDefaultProps).map(k => {
                return (
                  <Option
                    key={k + ''}
                    value={k + ''}
                  >{k}</Option>
                )
              })
            }
          </Select>
        </div>
        <div className="pd1">
          <span className="inline width100 aligncenter">数据格式</span>
          <Select placeholder="(可选)指定采集数据格式"
            onChange={id => this.changeParserProps(id)}
            className="width300 inline"
            allowClear
          >
            {
              _.keys(ParserDefaultProps.type).map(k => {
                return (
                  <Option
                    key={k + ''}
                    value={ParserDefaultProps.type[k + '']}
                  >{ParserDefaultProps.type[k + '']}</Option>
                )
              })
            }
          </Select>
        </div>
        <div className="pd1">
          <span className="inline width100 aligncenter">指定字段</span>
          <Input defaultValue="" placeholder="(可选)指定采集字段" className="width300 inline"/>
        </div>
        <div>
          {
            _.keys(readerProps).map(k => {
              return (
                <Row key={readerProps[k]} className="pd1 aligncenter">
                  <Col span={6}>{k}</Col>
                  <Col span={14} offset={1}>
                    <Input defaultValue={readerProps[k]}/>
                  </Col>
                </Row>
              )
            })
          }
          {
            <div>
              {
                params.map((k, i) => {
                  const isDefaultParam = defaultParamsKey.includes(k.name)
                  let Control = (<Input
                    className="inline mg1r"
                    value={k.value}
                    placeholder="请输入参数值"
                    onChange={(e) => onChangeParams({...k, value: e.target.value}, i)}
                  />)

                  return (<Row key={`key_param_${i}`}>
                    <div className="mg1t aligncenter">
                      {
                        omitKey.indexOf('showName') > 0 && params[0].name ?
                          <div>
                            <Col span={6}>
                              {
                                k.type === 'new'
                                  ? <Input
                                    // className="width180 inline mg1r"
                                    placeholder="请输入参数名"
                                    value={k.name}
                                    readOnly={isDefaultParam}
                                    onChange={(e) => onChangeParams({...k, name: e.target.value}, i)}
                                  />
                                  // : <div className="width180 inline mg1r alignleft">
                                  : <div>
                                    {STEP_PARAMS_REMARK[k.name] || k.name}：
                                  </div>
                              }
                            </Col>
                            <Col span={14} offset={1}>{Control}</Col>
                          </div>
                          :
                          <div />
                      }
                    </div>
                  </Row>)
                })
              }
            </div>
          }
          {
            showAddButton && this.configCol()
          }
        </div>
      </div>
    )
  }

  converterEditPanel = () => {
    return (<div>conveter</div>)
  }

  writerEditPanel = () => {
    return (<div>writer</div>)
  }

  changeReaderProps = (p) => {
    this.setState({readerType: p})
    this.setState({readerProps: ReaderDefaultProps[p]})
  }

  changeParserProps = (p) => {
    this.setState({parserType: p})
    this.setState({parserProps: ParserDefaultProps[p]})
  }

  activePanel = () => {
    const { activePanel } = this.state
    const { reader, converter, writer } = ETLTaskComponent

    // const paramsMap = _.keyBy(params, 'name')

    let panel = null

    // switch (activePanel) {
    //   case reader:
    //     panel = this.readerEditPanel(paramsMap['reader'])
    //     break
    //   case converter:
    //     panel = this.converterEditPanel(paramsMap['converter'])
    //     break
    //   case writer:
    //     panel = this.writerEditPanel(paramsMap['writer'])
    //     break
    //   default : return <div/>
    //
    // }

    switch (activePanel) {
      case reader:
        panel = this.readerEditPanel()
        break
      case converter:
        panel = this.converterEditPanel()
        break
      case writer:
        panel = this.writerEditPanel()
        break
      default : return <div/>

    }
    return panel
  }

  saveConfigInfo

  render() {

    const { taskMap } = this.state

    let { params,
      defaultParamsKey,
      onChangeParams,
      onRemoveParams,
      omitKey,
      showAddButton = true,
      projectId
    } = this.props

    params = _.cloneDeep(params)
    params = params.filter(p => !omitKey.includes(p.name))
    params = _.sortBy(params, p => {
      const order = defaultParamsKey.findIndex(k => k === p.name)
      return order >= 0 ? order : 999
    })

    return (
      <div>
        {
          this.taskChain()
        }
        <div>
          {
            this.activePanel()
          }

        </div>
      </div>)


  }
}

export default ETLTaskEdit
