import React from 'react'
import PropTypes from 'prop-types'
import { DownOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { Button, Dropdown, Menu, InputNumber, Card, Select, Input, Row, Col } from 'antd';
import _ from 'lodash'

const GATEWAY = 'gateway'
const KAFKA = 'kafka'
const CONSOLE = 'console'
const HDFS = 'hdfs'
const FILE = 'file'

const NAMED = {
  gateway: '网关输出器',
  kafka: 'Kafka输出器',
  console: '控制台输出器',
  hdfs: 'HDFS输出器',
  file: '文件输出器'

}

const redDotColor = '#DC143C'
const redDotSize = '17px'
const redDotTop = '5px'

export default class Writer extends React.Component {

  static propTypes = {
    changeState: PropTypes.func,
    writer: PropTypes.object,
    taskMap: PropTypes.object
  }

  setParentConverters(writer) {
    const {taskMap} = this.props
    this.props.changeState({
      taskMap: {
        ...taskMap,
        writer: writer
      }
    })
  }

  componentDidUpdate(prevProps) {
    if (!_.isEqual(prevProps.writer, this.props.writer)) {
      console.log(this.props.writer, 'handleMenuClick====', prevProps.writer)
    }
  }


  menu = () => {
    return (
      <Menu onClick={(e) => this.handleMenuClick(e)}>
        <Menu.Item key={KAFKA}>{NAMED[KAFKA]}</Menu.Item>
        <Menu.Item key={CONSOLE}>{NAMED[CONSOLE]}</Menu.Item>
        <Menu.Item key={HDFS}>{NAMED[HDFS]}</Menu.Item>
        <Menu.Item key={FILE}>{NAMED[FILE]}</Menu.Item>
      </Menu>
    )
  }

  handleMenuClick = (e) => {
    let writer = {}
    switch (e.key) {
      case GATEWAY:
        writer = {
          type: GATEWAY,
          api: ''
        }
        break
      case KAFKA:
        writer = {
          type: KAFKA,
          topic: '',
          partition: '2',
          replication: '1',
          zkHosts: '',
          zkSessionTimeout: '30000',
          zkConnectionTimeout: '30000',
          properties: {
            propertiesList: [],
            bootstrapServers: ''
          },
          failRetryTime: '5'

        }
        break
      case CONSOLE:
        writer = {
          type: CONSOLE
        }
        break
      case HDFS:
        writer = {
          type: HDFS,
          clusterName: 'sugo',
          nameNodes: '',
          outputFilePrefix: 'collect_file',
          outputFileMaxLine: '100000',
          outputDir: '/sugo/sugo_collect',
          autoMakeDir: 'true'
        }
        break
      case FILE:
        writer = {
          type: FILE,
          outputDir: '/tmp/file_writer',
          outputFilePrefix: 'collect_file',
          autoMakeDir: 'true',
          outputFileMaxLine: '100000'
        }
        break
    }
    this.setParentConverters(writer)
  }


  selectWriter = writer => {
    switch (writer.type) {
      case GATEWAY:
        return this.gateWayWriter(writer)
      case KAFKA:
        return this.kafkaWriter(writer)
      case CONSOLE:
        return this.consoleWriter(writer)
      case HDFS:
        return this.HdfsWriter(writer)
      case FILE:
        return this.fileWriter(writer)
    }
  }

  fileWriter = (writer) => {
    return (
      <div className="mg1l">
        <Row>
          <Col span={4}>
            <div className="fright" style={{marginTop: '7px'}}>数据目录名称:</div>
          </Col>
          <Col span={20}>
            <Input className="mg2l mg3r"
              style={{width: '60%'}}
              value={writer.outputDir}
              placeholder={'请输入存放数据名录'}
              onChange={(v) => this.handleChange(v.target.value, 'outputDir')}
            />
          </Col>
        </Row>

        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright" style={{marginTop: '7px'}}>数据文件命名前缀:</div>
            </Col>
            <Col span={20}>
              <Input className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.outputFilePrefix}
                placeholder={'请输入数据文件命名前缀'}
                onChange={(v) => this.handleChange(v.target.value, 'outputFilePrefix')}
              />
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright" style={{marginTop: '7px'}}>是否自动创建数据目录:</div>
            </Col>
            <Col span={20}>
              <Select
                className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.autoMakeDir === 'false' ? 'no' : 'yes'}
                onChange={(v) => this.handleChange(v, index, i, 'autoMakeDir')}
              >
                <Option value="true">yes</Option>
                <Option value="false">no</Option>
              </Select>
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright" style={{marginTop: '7px'}}>数据文件最大行数:</div>
            </Col>
            <Col span={20}>
              <InputNumber className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.outputFileMaxLine}
                placeholder={'请输入每个数据文件的最大行数'}
                onChange={(v) => this.handleChange(v, 'outputFileMaxLine')}
              />
            </Col>
          </Row>
        </div>


      </div>
    )
  }


  kafkaWriter = (writer) => {
    let propertiesList = writer.properties.propertiesList
    if (_.isEmpty(propertiesList)) {
      propertiesList = []
    }
    return (
      <div className="mg1l">

        <Row>
          <Col span={4}>
            <div className="fright">
              <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                className="alignright iblock"
              >*
              </div>
              topic名称:
            </div>

          </Col>
          <Col span={20}>
            <Input className="mg2l mg3r"
              style={{width: '60%'}}
              value={writer.topic}
              placeholder={'请输入kafka topic名称'}
              onChange={(v) => this.handleChange(v.target.value, 'topic')}
            />
          </Col>
        </Row>

        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright" style={{marginTop: '7px'}}>partition个数:</div>
            </Col>
            <Col span={20}>
              <InputNumber className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.partition}
                placeholder={'请输入partition个数'}
                onChange={(v) => this.handleChange(v, 'partition')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright" style={{marginTop: '7px'}}>replication个数:</div>
            </Col>
            <Col span={20}>
              <InputNumber className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.partition}
                placeholder={'请输入replication副本数'}
                onChange={(v) => this.handleChange(v, 'replication')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright">
                <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                  className="alignright iblock"
                >*
                </div>
                zookeeper路径:
              </div>
            </Col>
            <Col span={20}>
              <Input className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.zkHosts}
                placeholder={'请输入kafka在zookeeper上的路径'}
                onChange={(v) => this.handleChange(v.target.value, 'zkHosts')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright" style={{marginTop: '7px'}}>zookeeper会话超时时间:</div>
            </Col>
            <Col span={20}>
              <InputNumber className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.zkSessionTimeout}
                placeholder={'请输入zookeeper会话超时时间'}
                onChange={(v) => this.handleChange(v, 'zkSessionTimeout')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright" style={{marginTop: '7px'}}>zookeeper连接超时时间:</div>
            </Col>
            <Col span={20}>
              <InputNumber className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.zkConnectionTimeout}
                placeholder={'请输入zookeeper连接超时时间'}
                onChange={(v) => this.handleChange(v, 'zkConnectionTimeout')}
              />
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright" style={{marginTop: '7px'}}>producer配置:</div>
            </Col>
            <Col span={20} />
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <div className="fright">
                <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                  className="alignright iblock"
                >*
                </div>
                <div className="fright" style={{marginTop: '7px'}}>bootstrap.servers:</div>

              </div>
            </Col>
            <Col span={11}>
              <Input className="mg2l mg3r"
                style={{width: '100%'}}
                value={writer.properties.bootstrapServers}
                placeholder={'请输入bootstrap.servers配置'}
                onChange={(v) => this.handleChange(v.target.value, 'properties.bootstrapServers')}
              />
            </Col>
          </Row>
        </div>


        {
          propertiesList.map((p, i) => {
            return (
              <div>
                <div className="mg2t">
                  <Row>
                    <Col span={5}>
                      <Input className="fright"
                        style={{width: '60%'}}
                        value={p.key}
                        placeholder={'请输入配置名称'}
                        onChange={(v) => this.consumerPropertyChange(v.target.value, i, 'key')}
                      />
                    </Col>
                    <Col span={11}>
                      <Input className="mg2l mg3r"
                        style={{width: '100%'}}
                        value={p.value}
                        placeholder={'请输入配置'}
                        onChange={(v) => this.consumerPropertyChange(v.target.value, i, 'value')}
                      />
                    </Col>

                    <Col span={8}>
                      <MinusCircleOutlined
                        title="移除这个配置"
                        className="color-grey font16 pointer line-height32 hover-color-red mg3l"
                        onClick={() => this.consumerPropertyDelete(i)} />
                    </Col>
                  </Row>
                </div>
              </div>
            );
          })
        }

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <Button style={{width: '60%'}}
                className="fright"
                type="primary"
                onClick={() => this.consumerPropertyAdd('k')}
              >
                增加配置
              </Button>
            </Col>
            <Col span={19} />
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright" style={{marginTop: '7px'}}>失败重发次数:</div>
            </Col>
            <Col span={20}>
              <InputNumber className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.failRetryTime}
                placeholder={'请输入失败重发次数'}
                onChange={(v) => this.handleChange(v, 'failRetryTime')}
              />
            </Col>
          </Row>
        </div>

      </div>
    );
  }

  consumerPropertyAdd = (i) => {
    let {writer} = this.props
    writer = _.cloneDeep(writer)
    let {propertiesList} = writer.properties
    propertiesList.push({
      key: '',
      value: ''
    })
    _.set(writer, 'properties.propertiesList', propertiesList)
    this.setParentConverters(writer)
  }

  consumerPropertyDelete = index => {
    let {writer} = this.props
    writer = _.cloneDeep(writer)
    _.set(writer, 'properties.propertiesList', writer.properties.propertiesList.filter((p, i) => i !== index))
    this.setParentConverters(writer)
  }

  consumerPropertyChange = (value, i, p) => {
    let {writer} = this.props
    writer = _.cloneDeep(writer)
    _.set(writer, `properties.propertiesList.${i}.${p}`, value)
    this.setParentConverters(writer)
  }

  HdfsWriter = (writer) => {
    return (
      <div className="mg1l">

        <Row>
          <Col span={4}>
            <div className="fright" style={{marginTop: '7px'}}>topic名称:</div>
          </Col>
          <Col span={20}>
            <Input className="mg2l mg3r"
              style={{width: '60%'}}
              value={writer.clusterName}
              placeholder={'请输入kafka topic名称'}
              onChange={(v) => this.handleChange(v.target.value, 'clusterName')}
            />
          </Col>
        </Row>

        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright">
                <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                  className="alignright iblock"
                >*
                </div>
                hdfs节点:
              </div>

            </Col>
            <Col span={20}>
              <Input className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.nameNodes}
                placeholder={'请输入hdfs namenode节点，通过英文逗号隔开'}
                onChange={(v) => this.handleChange(v.target.value, 'nameNodes')}
              />
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright" style={{marginTop: '7px'}}>文件命名前缀:</div>
            </Col>
            <Col span={20}>
              <Input className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.outputFilePrefix}
                placeholder={'请输入数据文件命名前缀'}
                onChange={(v) => this.handleChange(v.target.value, 'outputFilePrefix')}
              />
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright" style={{marginTop: '7px'}}>文件最大行数:</div>
            </Col>
            <Col span={20}>
              <InputNumber className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.outputFileMaxLine}
                placeholder={'请输入每个数据文件的最大行数'}
                onChange={(v) => this.handleChange(v, 'outputFileMaxLine')}
              />
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright" style={{marginTop: '7px'}}>存放数据目录:</div>
            </Col>
            <Col span={20}>
              <Input className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.outputDir}
                placeholder={'请输入存放数据目录'}
                onChange={(v) => this.handleChange(v.target.value, 'outputDir')}
              />
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={4}>
              <div className="fright" style={{marginTop: '7px'}}>是否自动创建数据目录:</div>
            </Col>
            <Col span={20}>
              <Select
                className="mg2l mg3r"
                style={{width: '60%'}}
                value={writer.autoMakeDir === 'false' ? 'no' : 'yes'}
                onChange={(v) => this.handleChange(v, index, i, 'autoMakeDir')}
              >
                <Option value="true">yes</Option>
                <Option value="false">no</Option>
              </Select>
            </Col>
          </Row>
        </div>

      </div>
    )
  }

  gateWayWriter = (writer) => {
    return (
      <div className="mg1l">
        <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
          className=" width40 alignright iblock"
        >*
        </div>
        网关路径:
        <Input className="mg2l mg3r"
          style={{width: '60%'}}
          value={writer.api}
          placeholder={'请输入网关路径'}
          onChange={(v) => this.handleChange(v.target.value, 'api')}
        />
      </div>
    )
  }

  consoleWriter = (writer) => {
    return (
      <div className="mg1l" />
    )
  }


  handleChange = (value, p) => {
    let {writer} = this.props
    _.set(writer, `${p}`, value)
    this.setParentConverters(writer)

  }


  render() {
    let {writer} = this.props
    return (
      <div>
        <Dropdown overlay={this.menu()} className="mg2t">
          <Button style={{marginLeft: 8}}>
            {_.isEmpty(writer) ? '选择输出器' : NAMED[writer.type]} <DownOutlined />
          </Button>
        </Dropdown>
        <div className="mg1l mg2t">
          {this.getFields()}
        </div>
      </div>
    );
  }

  getFields() {
    const {writer} = this.props
    if (_.isEmpty(writer)) return
    return this.selectWriter(writer)

  }


}
