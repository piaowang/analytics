import React, { Component } from 'react'
import { InboxOutlined } from '@ant-design/icons';
import {
  Row,
  Col,
  Input,
  Select,
  InputNumber,
  message,
  Button,
  Radio,
  Upload,
  Modal,
} from 'antd';
import {
  ChartFieldsAndDefaultData,
  LiveScreenSliceDataAccessTypeEnum,
  LiveScreenSliceDataAccessTypeTranslation
} from './constants'
import EditorPanelData from './editor-panel-data'
import * as d3 from 'd3'
import _ from 'lodash'
import {ChartsDataSettingsAdapter} from './chartsDataSettingAdapter'
import JsCodeEditor from './js-code-editor/jsCodeEditor'
import {immutateUpdate} from '../../../common/sugo-utils'
import PubSub from 'pubsub-js'
import Fetch  from '../../common/fetch-final'
import {UploadedFileType} from '../../../common/constants'
import DataAccessConsole from './livescreen-dataaccess-console/data-access-console'
import ImageDataAccessConsole from './livescreen-dataaccess-console/image-access-console'
import LineTextDataAccessConsole from './livescreen-dataaccess-console/line-text-dataaccess-console'
import IframeBoxDataAccessConsole from './livescreen-dataaccess-console/iframebox-dataaccess-console'
import VideoDataAccessConsole from './livescreen-dataaccess-console/video-dataaccess-console'

const { TextArea } = Input
const radioStyle = {
  display: 'block',
  height: '30px',
  lineHeight: '30px'
}

export default class DataAccessPanel extends Component {
  state = {
    accessDataType: 'csv',
    interval: 10,
    timeUnit: 'second',
    filedsName: {},
    accessData: '',
    dataPath: '',
    addSliceModalVisible: false
    // 保存数据
  }

  componentWillMount() {
    const { currentComponent } = this.props
    this.getData(currentComponent)
  }

  getData = (currentComponent) => {
    if (_.get(currentComponent, 'params.accessDataType', '') === 'project') {
      this.setState({ accessDataType: 'project' })
      return
    }
    if (_.get(currentComponent, 'params.accessDataType', '') === 'external') {
      this.setState({ accessDataType: 'external' })
      return
    }
    let accessDataType = _.get(currentComponent, 'params.accessDataType', 'csv')
    const data = ChartFieldsAndDefaultData[currentComponent.type] || {}
    let value = _.get(currentComponent, 'params.accessData', _.get(data, accessDataType, ''))
    if (!value) {
      return
    }
    let filedsName = {}
    const dimensions = _.get(currentComponent, 'params.dimensions')
    const metrics = _.get(currentComponent, 'params.metrics')
    const dimNameDict = _.get(currentComponent, 'params.dimNameDict', {})
    const metricNameDict = _.get(currentComponent, 'params.metricNameDict', {})
    const dataPath = _.get(currentComponent, 'params.dataPath', '')
    if (metrics || dimensions) {
      filedsName = [
        ...dimensions.map((p, i) => ({ key: 'x' + (i + 1), value: p, title: dimNameDict[p] || p })),
        ...metrics.map((p, i) => ({ key: 'y' + (i + 1), value: p, title: metricNameDict[p] || p }))
      ]
      filedsName = _.reduce(filedsName, (r, v) => {
        r[v.key] = { name: v.value, title: v.title }
        return r
      }, {})
    } else {
      filedsName = _.reduce(data.fields, (r, v) => {
        r[v] = { name: v, title: v }
        return r
      }, {})
    }
    this.setState({
      filedsName,
      accessData: value,
      accessDataType,
      dataPath
    })
  }

  changeAccessType = (type) => {
    let { accessData, accessDataType } = this.state
    const { currentComponent } = this.props
    //切换数据源时 把维度清空了 作用不明
    //切换数据源时 把协议去掉 需要的地方有缺省逻辑 只有从需要协议的数据源 切换为 不需要协议的数据源 才会走这个逻辑
    this.props.doModifyComponent({ id: currentComponent.id, params: { ..._.omit(currentComponent.params, 'requestProtocolParams'), dimensions: [] } })
    if (type !== 'csv' && type !== 'json') {
      this.setState({
        accessData: '',
        accessDataType: type,
        dataPath: '',
        interval: 0,
        filedsName: []
      })
      return
    }
    //切换数据源类型时 csv json才走下面逻辑
    const newAccessData = _.get(ChartFieldsAndDefaultData, [currentComponent.type, type])
    const { fields = []} = ChartFieldsAndDefaultData[currentComponent.type] || {}
    const dimensions = fields.filter(p => p.indexOf('x') === 0)
    const metrics = fields.filter(p => p.indexOf('y') === 0)
    const filedsName = _.reduce([...dimensions, metrics], (r, v) => {
      r[v] = { name: v, title: v }
      return r
    }, {})
    let data = ''
    if (type === 'csv') {
      try {
        data = (accessData !== '' && accessDataType === 'json')
          ? d3.csvFormat(JSON.parse(accessData))
          : newAccessData
      } catch (error) {
        message.error('数据格式错误')
      }
    } else {
      try {
        data = (accessData !== '' && accessDataType === 'csv')
          ? JSON.stringify(d3.csvParse(accessData), null, 2)
          : newAccessData
      } catch (error) {
        message.error('数据格式错误')
      }
    }
    this.setState({
      filedsName,
      accessData: data,
      accessDataType: type,
      dataPath: '',
      interval: 0
    })
    
    return
  }

  componentDidUpdate(prevProps) {
    if (this.props.activedId !== prevProps.activedId) {
      this.getData(this.props.currentComponent)
    }
  }

  onRefreshData = () => {
    const { activedId, currentComponent } = this.props
    const { accessDataType, filedsName, accessData, interval, timeUnit, dataPath } = this.state
    let intervalTime = interval
    if (timeUnit === 'second'){
      intervalTime = interval * 1
    } else if (timeUnit === 'min') {
      intervalTime = interval * 60
    } else if (timeUnit === 'hour') {
      intervalTime = interval * 60 * 60
    }


    const keys = _.keys(filedsName)
    const dim = keys.filter(p => p.indexOf('x') === 0)
    const met = keys.filter(p => p.indexOf('y') === 0)
    let params = {
      metrics: met.map(p => _.get(filedsName, `${p}.name`, '')),
      dimensions: dim.map(p => _.get(filedsName, `${p}.name`, '')),
      accessDataType,
      accessData,
      translationDict: _.reduce(filedsName, (r, v) => {
        r[v.name] = v.title
        return r
      }, {}),
      autoReloadInterval: intervalTime,
      dataPath: dataPath
    }
    this.props.doModifyComponent({ id: activedId, params: { ...currentComponent.params, ...params } })
  }

  // renderAddSliceButton = () => {
  //   const { activedId, currentComponent } = this.props
  //   return <div className="pd2x pd3y">
  //     <Button
  //       type="primary"
  //       onClick={() => {
  //         PubSub.publishSync('livescreen.component.sliceReadyToSet')
  //         return this.setState({ addSliceModalVisible: true })
  //       }}
  //     >
  //       添加单图
  //   </Button>
  //     <SlicePicker
  //       visible={this.state.addSliceModalVisible}
  //       onSliceSelected={async (sliceId) => {
  //         let sliceDetail = await Fetch.get(`/app/slices/get/slices/${sliceId}`)
  //         let { params } = sliceDetail
  //         const tempParams = {
  //           ...params,
  //           accessDataType: 'project',
  //           druid_datasource_id: sliceDetail.druid_datasource_id,
  //           dimensionExtraSettingDict: params.dimensionExtraSettingDict
  //         }
  //         this.props.doModifyComponent({ id: activedId, type: params.vizType, params: tempParams })
  //       }}
  //       onVisibleChange={visible => this.setState({ addSliceModalVisible: visible })}
  //     />
  //   </div>
  // }
  
  //该函数抽成文件 DataAccessConsole 
  renderDataAccessPanel = () => {
    const { currentComponent: componet, activedId } = this.props
    let { accessDataType, filedsName, accessData, dataPath } = this.state
    filedsName = _.cloneDeep(filedsName)
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
                  <Select.Option key={`${k}`}>{LiveScreenSliceDataAccessTypeTranslation[k] || k}</Select.Option>
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
                              this.setState({ filedsName: filedsName })
                            }}
                          />
                        </Col>
                        <Col span={12}>
                          <Input
                            value={_.get(filedsName, `${p}.title`, p)}
                            size="small"
                            onChange={e => {
                              _.set(filedsName, `${p}.title`, e.target.value)
                              this.setState({ filedsName: filedsName })
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
              ?<div>
                <div className="access-title pd2l">刷新间隔</div>
                <div className="pd2x pd1y">
                  <InputNumber
                    defaultValue={10}
                    min={0}
                    max={200}
                    step={5}
                    onChange={val => {
                      const {timeUnit} = this.state
                      let intervalTime = val
                      if (timeUnit === 'second'){
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
                      this.setState({ interval: val })
                    }}
                  />
                  <Select
                    defaultValue="second"
                    className="mg1l width80 height-100"
                    getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
                    onChange={val => {
                      const {interval} = this.state
                      let intervalTime = val
                      if (val === 'second'){
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
                      this.setState({ timeUnit: val })
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
                            onChange={e => this.setState({dataPath: e.target.value})}
                          />
                        </div>
                        : null
                    }
                    <div className="access-title pd2l">{accessDataType === 'api' ? '地址' : '静态数据'}</div>
                    <TextArea rows={20} value={accessData} onChange={e => this.setState({accessData: e.target.value})}/>
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
      </div>
    )
  }

  handleRemoveFile = (file,fileList ) => {
    // let { reloadFiles}  = this.props
    return new Promise((resolve,reject)=>{
      const { currentComponent: componet, activedId } = this.props
      Modal.confirm({
        title: '提示',
        content: `确定删除文件 ${file.name} ？`,
        onOk: () => {
          Fetch.delete(`/app/uploaded-files/delete/${file.uid}`, null, {
            handleResponse: () => {
              this.props.doModifyComponent({
                id: activedId,
                params: {
                  ...componet.params,
                  videoUrl:  ''
                }
              })
              message.success('文件删除成功')
              resolve()
              // reloadFiles()
            },
            handleErr: (resp) => {
              reject()
              message.error('文件删除失败: ' + resp.message)
            }
          })
        }
      })
    })
    // return false
  }
  // app/uploaded-files/get-file/f/S1GKMI18I.png
  handleChangeFile = ({file, fileList}) => {
    const { currentComponent: componet, activedId } = this.props
    this.setState({fileList}, () => {
      if (file.status === 'done') {
        let { filename, originalFilename } = _.get(file, 'response.result') || {}
        if (!filename) {
          message.error('文件上传失败，请重试')
          return
        }
        let newFileRecord = {
          name: originalFilename,
          type: UploadedFileType.Unknown,
          path: `/f/${filename}`
        }
        Fetch.post('/app/uploaded-files/create', newFileRecord, {
          handleResponse: () => {
            this.props.doModifyComponent({
              id: activedId,
              params: {
                ...componet.params,
                videoUrl:  `/app/uploaded-files/get-file/f/${filename}`
              }
            })
            message.success('文件上传成功')
            // reloadFiles()
          },
          handleErr: (resp) => {
            message.error('文件上传失败: ' + resp.message)
          }
        })
      }
    })
  }

  render() {
    const { currentComponent: componet, activedId } = this.props
    let { accessDataType, filedsName, accessData, dataPath } = this.state
    const data = ChartFieldsAndDefaultData[componet.type]
    let CustomDataSettingPanel = ChartsDataSettingsAdapter[componet.type]
    if (CustomDataSettingPanel) {
      return (
        <CustomDataSettingPanel
          value={componet}
          onChange={nextComp => {
            this.props.doModifyComponent(nextComp)
          }}
        />
      )
    }
    // TODO refactor to LiveScreen/chartsDataSettingAdapter/index.js
    if (componet.type === 'video') {
      return (
        <div className="data-access-panel">
          <div className="access-title pd2l">
            载入视频
          </div>
          <Radio.Group
            className="mg2l"
            onChange={(e) => { 
              this.props.doModifyComponent({
                id: activedId,
                params: {
                  ...componet.params,
                  uploadStyle: e.target.value,
                  videoUrl: ''
                }
              })
            }}
            value={_.get(componet, 'params.uploadStyle')|| sugo.demoVideoSource}
          >
            <Radio style={radioStyle} value={'1'} key="videoUrl">
              视频路径
            </Radio>
            {(_.get(componet, 'params.uploadStyle') === '1')
              && <TextArea
                rows={5}
                className="mg2"
                placeholder="输入视频地址"
                value={_.get(componet, 'params.videoUrl') || sugo.demoVideoSource}
                onChange={(e) => {
                  this.props.doModifyComponent({
                    id: activedId,
                    params: {
                      ...componet.params,
                      videoUrl: e.target.value
                    }
                  })
                }}
                style={{ width: 'calc(100% - 32px)' }}
              />}
            <Radio style={radioStyle} value={'2'} key="videoAction">
              手动上传
            </Radio>
            {(_.get(componet, 'params.uploadStyle') === '2') && (
              <div className="pd2">
                <Upload.Dragger
                  accept="video/mp4, video/avi, video/rm, video/rmvb,"
                  headers={{
                    'Access-Control-Allow-Origin': '*',
                    token: window.sugo.file_server_token
                  }}
                  fileList={this.state.fileList}
                  multiple={false}
                  beforeUpload={(file, fileList) => {
                    if (!/(\.mp4|\.avi|\.rm|\.rmvb)$/.test(file.name)) {
                      message.error('仅支持上传.mp4、.avi、.rm、.rmvb结尾的文件')
                      return false
                    }
                    if (fileList.length > 1) return false
                    return true
                  }}
                  onRemove={this.handleRemoveFile}
                  onChange={this.handleChangeFile}
                  name={'file'}
                  action={'/app/uploaded-files/upload'}
                >
                  {
                    _.get(componet, 'params.videoUrl') ? (
                      <video src={_.get(componet, 'params.videoUrl')}  width="100%" controls={null} />
                    ) : <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  }
                  <p className="ant-upload-text">点击选择文件或拖动文件到此区域</p>
                </Upload.Dragger>
              </div>)}
          </Radio.Group>
          {/* {(_.get(componet, 'params.uploadStyle') === '1')
            ? <TextArea
              rows={5}
              className="mg2"
              placeholder="输入视频地址"
              value={_.get(componet, 'params.videoUrl') || sugo.demoVideoSource}
              onChange={(e) => {
                this.props.doModifyComponent({
                  id: activedId,
                  params: {
                    ...componet.params,
                    videoUrl: e.target.value
                  }
                })
              }}
              style={{ width: 'calc(100% - 32px)' }}
            />
            : 
            } */}
        </div>
      );
    }
    if (componet.type === 'IframeBox') {
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
    if (componet.type === 'line_text') {
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
            style={{width: 'calc(100% - 32px)'}}
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
    
    // if (componet.type === 'blank' && !_.get(componet, 'params.dimensions', []).length) {
    //   return this.renderAddSliceButton()
    // }

    const consoleUtilsComp = {
      'image':  ImageDataAccessConsole,
      'line_text': LineTextDataAccessConsole,
      'IframeBox': IframeBoxDataAccessConsole,
      'video': VideoDataAccessConsole
    }
    let Comp = consoleUtilsComp[componet.type] || null

    if (!_.isEmpty(data)) {
      Comp = DataAccessConsole
    }

    if (!Comp) return null
    return (
      <Comp 
        activedId={activedId}
        onRefreshData={this.onRefreshData}
        changeAccessType={this.changeAccessType}
        accessDataType={accessDataType} 
        filedsName={filedsName} 
        accessData={accessData} 
        dataPath={dataPath} 
        componet={componet} 
        timeUnit={this.state.timeUnit}
        changeFatherState={(v) => this.setState(v)}
        doModifyComponent={this.props.doModifyComponent}
      />
    )
  }
}
