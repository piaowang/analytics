import React from 'react'
import PropTypes from 'prop-types'
import { DownOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { Button, Dropdown, Menu, InputNumber, Card, Select, Input, Row, Col } from 'antd';
import _ from 'lodash'

const OFFLINEFILE = 'offline_file'
const REALTIMEFILE = 'realtime_file'
const OFFLINEDATABASE = 'offline_db'
const REALTIMEKAFKAREADER = 'realtime_kafka'
const LOGFILEREADER = 'log_file'

const redDotColor = '#DC143C'
const redDotSize = '17px'
const redDotTop = '7px'

const NAMED = {
  offline_file: '离线文件读取器',
  realtime_file: '实时文件读取器',
  log_file: '日志文件读取器',
  offline_db: '离线数据库读取器',
  realtime_kafka: '实时Kafka读取器'
}

export default class Reader extends React.Component {

  static propTypes = {
    changeState: PropTypes.func,
    parser: PropTypes.object,
    taskMap: PropTypes.object
  }


  componentDidUpdate(prevProps) {
    if (!_.isEqual(prevProps.reader, this.props.reader)) {
      console.log(this.props.reader, 'handleMenuClick====', prevProps.reader)
    }
  }


  menu = () => {
    return (
      <Menu onClick={(e) => this.handleMenuClick(e)}>
        <Menu.Item key={OFFLINEFILE}> {NAMED[OFFLINEFILE]} </Menu.Item>
        <Menu.Item key={REALTIMEFILE}>{NAMED[REALTIMEFILE]}</Menu.Item>
        <Menu.Item key={OFFLINEDATABASE}>{NAMED[OFFLINEDATABASE]}</Menu.Item>
        <Menu.Item key={REALTIMEKAFKAREADER}>{NAMED[REALTIMEKAFKAREADER]}</Menu.Item>
        <Menu.Item key={LOGFILEREADER}>{NAMED[LOGFILEREADER]}</Menu.Item>
      </Menu>
    )
  }

  handleMenuClick = (e) => {
    let reader = {}
    switch (e.key) {
      case REALTIMEKAFKAREADER:
        reader = {
          type: REALTIMEKAFKAREADER,
          topic: '',
          consumerProperties: {
            'bootstrapServers': '',
            'autoOffsetReset': '',
            propertiesList: []
          },
          threadCount: '4',
          batchSize: '1000',
          scanInterval: '3000',
          extraMessages: []
        }
        break
      case OFFLINEFILE:
        reader = {
          type: OFFLINEFILE,
          fileDir: '',
          fileNameRegex: '.*',
          threadCount: '2',
          batchSize: '1000',
          extraMessages: []
        }
        break
      case REALTIMEFILE:
        reader = {
          type: REALTIMEFILE,
          fileName: '',
          batchSize: '1000',
          extraMessages: [],
          scanInterval: '3000',
          goOn: 'false',
          lineSeparator: '\\n'
        }
        break
      case OFFLINEDATABASE:
        reader = {
          type: OFFLINEDATABASE,
          server: '',
          port: '',
          user: '',
          password: '',
          dbType: '',
          database: '',
          sql: '',
          separator: '',
          batchSize: '',
          extraMessages: []
        }
        break
      case LOGFILEREADER:
        reader = {
          type: LOGFILEREADER,
          fileDir: '',
          host: '',
          isSeparate: 'false',
          lineSeparator: '\\n',
          threadCount: '2',
          messageMaxSize: '1048576',
          httpCollectorUrl: '',
          scanInterval: '3000',
          timeRange: '120',
          batchSize: '10000',
          fileNameRegex: '.*',
          firstLinePattern: '',
          extraMessages: []
        }
        break

    }
    this.setParentConverters(reader)
  }

  logFileReader = reader => {
    let extraMessages = reader.extraMessages
    if (_.isEmpty(extraMessages)) {
      extraMessages = []
    }
    return (
      <div className="mg1l">
        <Row>
          <Col span={5}>
            <div className="fright">
              <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                className="alignright iblock"
              >*
              </div>
              <div className="fright" style={{marginTop: '7px'}}>读取文件名:</div>
            </div>
          </Col>
          <Col span={19}>
            <Input className="mg2l mg3r"
              style={{width: '80%'}}
              value={reader.fileDir}
              placeholder={'请输入要读取的文件夹名'}
              onChange={(v) => this.handleChange(v.target.value, 'fileDir')}
            />
          </Col>
        </Row>

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <div className="fright" style={{marginTop: '7px'}}>机器host:</div>
            </Col>
            <Col span={19}>
              <Input className="mg2l mg3r"
                style={{width: '80%'}}
                value={reader.host}
                placeholder={'请输入当前采集机器的host'}
                onChange={(v) => this.handleChange(v.target.value, 'host')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <div className="fright" style={{marginTop: '7px'}}>是否为分割日志文件:</div>
            </Col>
            <Col span={19}>
              <Select
                className="mg2l mg3r"
                style={{width: '80%'}}
                value={reader.isSeparate === 'false' ? 'no' : 'yes'}
                onChange={(v) => this.handleChange(v, index, i, 'isSeparate')}
              >
                <Option value="true">yes</Option>
                <Option value="false">no</Option>
              </Select>
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <div className="fright" style={{marginTop: '7px'}}>日志行分隔符:</div>
            </Col>
            <Col span={19}>
              <Input className="mg2l mg3r"
                style={{width: '80%'}}
                value={reader.lineSeparator}
                placeholder={'请输入日志的行分隔符'}
                onChange={(v) => this.handleChange(v.target.value, 'lineSeparator')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <div className="fright" style={{marginTop: '7px'}}>最大启动线程数:</div>
            </Col>
            <Col span={19}>
              <InputNumber className="mg2l mg3r"
                style={{width: '80%'}}
                value={reader.threadCount}
                placeholder={'请输入最大的启动线程数'}
                onChange={(v) => this.handleChange(v, 'threadCount')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <div className="fright" style={{marginTop: '7px'}}>单条记录最大字节数:</div>
            </Col>
            <Col span={19}>
              <Input className="mg2l mg3r"
                style={{width: '80%'}}
                value={reader.messageMaxSize}
                placeholder={'请输入单条记录的最大字节数'}
                onChange={(v) => this.handleChange(v.target.value, 'messageMaxSize')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <div className="fright" style={{marginTop: '7px'}}>发送错误记录url:</div>
            </Col>
            <Col span={19}>
              <Input className="mg2l mg3r"
                style={{width: '80%'}}
                value={reader.httpCollectorUrl}
                placeholder={'请输入发送错误记录的url链接'}
                onChange={(v) => this.handleChange(v.target.value, 'httpCollectorUrl')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <div className="fright" style={{marginTop: '7px'}}>读取实时日志等待时间:</div>
            </Col>
            <Col span={19}>
              <InputNumber className="mg2l mg3r"
                style={{width: '80%'}}
                value={reader.scanInterval}
                placeholder={'请输入读取到最新的实时日志之后的等待时间，单位是毫秒'}
                onChange={(v) => this.handleChange(v, 'scanInterval')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <div className="fright" style={{marginTop: '7px'}}>发送错误记录url:</div>
            </Col>
            <Col span={19}>
              <InputNumber className="mg2l mg3r"
                style={{width: '80%'}}
                value={reader.timeRange}
                placeholder={'请输入读取日志距离现在的时间，超过该时间的日志不读，单位为分钟'}
                onChange={(v) => this.handleChange(v, 'timeRange')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <div className="fright" style={{marginTop: '7px'}}>reader的批处理数量:</div>
            </Col>
            <Col span={19}>
              <InputNumber className="mg2l mg3r"
                style={{width: '80%'}}
                value={reader.batchSize}
                placeholder={'请输入reader的批处理数量'}
                onChange={(v) => this.handleChange(v, 'batchSize')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <div className="fright" style={{marginTop: '7px'}}>读取日志文件名的正则表达式:</div>
            </Col>
            <Col span={19}>
              <Input className="mg2l mg3r"
                style={{width: '80%'}}
                value={reader.fileNameRegex}
                placeholder={'请输入要读取的日志文件名的正则匹配'}
                onChange={(v) => this.handleChange(v.target.value, 'fileNameRegex')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <div className="fright" style={{marginTop: '7px'}}>文件多行合并一行正则表达式:</div>
            </Col>
            <Col span={19}>
              <Input className="mg2l mg3r"
                style={{width: '80%'}}
                value={reader.firstLinePattern}
                placeholder={'请输入日志文件多行要合并为一行时第一行的正则匹配'}
                onChange={(v) => this.handleChange(v.target.value, 'firstLinePattern')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={5}>
              <div className="fright" style={{marginTop: '7px'}}>额外信息添加:</div>
            </Col>
            <Col span={19} />
          </Row>
        </div>


        {
          extraMessages.map((p, i) => {
            return (
              <div>
                <div className="mg2t">
                  <Row>
                    <Col span={8}>
                      <Input className="fright"
                        style={{width: '50%'}}
                        value={p.key}
                        placeholder={'请输入额外信息名称'}
                        onChange={(v) => this.extraMessagesChange(v.target.value, i, 'key')}
                      />
                    </Col>
                    <Col span={8}>
                      <Input className="mg2l mg3r"
                        style={{width: '100%'}}
                        value={p.value}
                        placeholder={'请输入额外信息的值'}
                        onChange={(v) => this.extraMessagesChange(v.target.value, i, 'value')}
                      />
                    </Col>

                    <Col span={8}>
                      <MinusCircleOutlined
                        title="移除这个配置"
                        className="color-grey font16 pointer line-height32 hover-color-red mg3l"
                        onClick={() => this.extraMessagesDelete(i)} />
                    </Col>
                  </Row>
                </div>
              </div>
            );
          })
        }

        <div className="mg2t">
          <Row>
            <Col span={8}>
              <Button style={{width: '50%'}}
                className="fright"
                type="primary"
                onClick={() => this.extraMessagesAdd('k')}
              >
                增加配置
              </Button>
            </Col>
            <Col span={16} />
          </Row>
        </div>

      </div>
    );
  }


  extraMessagesChange = (value, i, p) => {
    let {reader} = this.props
    reader = _.cloneDeep(reader)
    _.set(reader, `extraMessages.${i}.${p}`, value)
    this.setParentConverters(reader)
  }


  extraMessagesAdd = (i) => {
    let {reader} = this.props
    reader = _.cloneDeep(reader)
    let propertiesList = reader.extraMessages
    propertiesList.push({
      key: '',
      value: ''
    })
    _.set(reader, 'extraMessages', propertiesList)
    this.setParentConverters(reader)
  }

  extraMessagesDelete = index => {
    let {reader} = this.props
    reader = _.cloneDeep(reader)
    _.set(reader, 'extraMessages', reader.extraMessages.filter((p, i) => i !== index))
    this.setParentConverters(reader)
  }

  selectReader = reader => {
    switch (reader.type) {
      case REALTIMEKAFKAREADER:
        return this.kafkaReader(reader)
      case OFFLINEFILE:
        return this.offlineFileReader(reader)
      case REALTIMEFILE:
        return this.realTimeFileReader(reader)
      case OFFLINEDATABASE:
        return this.offlineDataBaseReader(reader)
      case LOGFILEREADER:
        return this.logFileReader(reader)
    }
  }

  offlineDataBaseReader = reader => {
    let extraMessages = reader.extraMessages
    if (_.isEmpty(extraMessages)) {
      extraMessages = []
    }
    return (
      <div className="mg1l">
        <Row>
          <Col span={3}>
            <div className="fright">
              <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                className="alignright iblock"
              >*
              </div>
              <div className="fright" style={{marginTop: '7px'}}>数据库ip地址:</div>
            </div>
          </Col>
          <Col span={21}>
            <Input className="mg2l mg3r"
              style={{width: '70%'}}
              value={reader.server}
              placeholder={'请输入数据库ip地址'}
              onChange={(v) => this.handleChange(v.target.value, 'server')}
            />
          </Col>
        </Row>


        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright">
                <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                  className="alignright iblock"
                >*
                </div>
                <div className="fright" style={{marginTop: '7px'}}>数据库端口号:</div>
              </div>
            </Col>
            <Col span={21}>
              <InputNumber className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.port}
                placeholder={'请输入数据库端口号'}
                onChange={(v) => this.handleChange(v, 'port')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright">
                <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                  className="alignright iblock"
                >*
                </div>
                <div className="fright" style={{marginTop: '7px'}}>数据库用户名:</div>
              </div>
            </Col>
            <Col span={21}>
              <Input className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.user}
                placeholder={'请输入数据库用户名'}
                onChange={(v) => this.handleChange(v.target.value, 'user')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright">
                <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                  className="alignright iblock"
                >*
                </div>
                <div className="fright" style={{marginTop: '7px'}}>数据库密码:</div>
              </div>
            </Col>
            <Col span={21}>
              <Input className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.password}
                placeholder={'请输入数据库密码'}
                onChange={(v) => this.handleChange(v.target.value, 'password')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright">
                <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                  className="alignright iblock"
                >*
                </div>
                <div className="fright" style={{marginTop: '7px'}}>数据库类型:</div>
              </div>
            </Col>
            <Col span={21}>
              <Input className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.dbType}
                placeholder={'请输入数据库类型'}
                onChange={(v) => this.handleChange(v.target.value, 'dbType')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright">
                <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                  className="alignright iblock"
                >*
                </div>
                <div className="fright" style={{marginTop: '7px'}}>数据库名称:</div>
              </div>
            </Col>
            <Col span={21}>
              <Input className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.database}
                placeholder={'请输入使用的数据库名称'}
                onChange={(v) => this.handleChange(v.target.value, 'database')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright">
                <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                  className="alignright iblock"
                >*
                </div>
                <div className="fright" style={{marginTop: '7px'}}>sql语句:</div>
              </div>
            </Col>
            <Col span={21}>
              <Input className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.sql}
                placeholder={'请输入执行的sql语句'}
                onChange={(v) => this.handleChange(v.target.value, 'sql')}
              />
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright">
                <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                  className="alignright iblock"
                >*
                </div>
                <div className="fright" style={{marginTop: '7px'}}>字段分隔符:</div>
              </div>
            </Col>
            <Col span={21}>
              <Input className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.separator}
                placeholder={'请输入合成记录的时候的字段分隔符'}
                onChange={(v) => this.handleChange(v.target.value, 'separator')}
              />
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>处理数量:</div>
            </Col>
            <Col span={21}>
              <InputNumber className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.batchSize}
                placeholder={'reader批处理数量，中间结果的数量'}
                onChange={(v) => this.handleChange(v, 'batchSize')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>额外信息添加:</div>
            </Col>
            <Col span={21} />
          </Row>
        </div>

        {
          extraMessages.map((p, i) => {
            return (
              <div>
                <div className="mg2t">
                  <Row>
                    <Col span={7}>
                      <Input className="fright"
                        style={{width: '50%'}}
                        value={p.key}
                        placeholder={'请输入额外信息的名称'}
                        onChange={(v) => this.extraMessagesChange(v.target.value, i, 'key')}
                      />
                    </Col>
                    <Col span={9}>
                      <Input className="mg2l mg3r"
                        style={{width: '100%'}}
                        value={p.value}
                        placeholder={'请输入额外信息的值'}
                        onChange={(v) => this.extraMessagesChange(v.target.value, i, 'value')}
                      />
                    </Col>

                    <Col span={8}>
                      <MinusCircleOutlined
                        title="移除这个配置"
                        className="color-grey font16 pointer line-height32 hover-color-red mg3l"
                        onClick={() => this.extraMessagesDelete(i)} />
                    </Col>
                  </Row>
                </div>
              </div>
            );
          })
        }

        <div className="mg2t">
          <Row>
            <Col span={7}>
              <Button style={{width: '50%'}}
                className="fright"
                type="primary"
                onClick={() => this.extraMessagesAdd('k')}
              >
                增加配置
              </Button>
            </Col>
            <Col span={17} />
          </Row>
        </div>


      </div>
    );
  }

  realTimeFileReader = (reader) => {
    let extraMessages = reader.extraMessages
    if (_.isEmpty(extraMessages)) {
      extraMessages = []
    }
    return (
      <div className="mg1l">
        <Row>
          <Col span={3}>
            <div className="fright">
              <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                className="alignright iblock"
              >*
              </div>
              <div className="fright" style={{marginTop: '7px'}}>读取文件名:</div>
            </div>
          </Col>
          <Col span={21}>
            <Input className="mg2l mg3r"
              style={{width: '70%'}}
              value={_.isEmpty(reader.fileName) ? '' : reader.fileName}
              placeholder={'请输入要读取的文件名'}
              onChange={(v) => this.handleChange(v.target.value, 'fileName')}
            />
          </Col>
        </Row>


        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>处理数量:</div>
            </Col>
            <Col span={21}>
              <InputNumber className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.batchSize}
                placeholder={'reader批处理数量，中间结果的数量'}
                onChange={(v) => this.handleChange(v, 'batchSize')}
              />
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>等待毫秒数:</div>
            </Col>
            <Col span={21}>
              <InputNumber className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.scanInterval}
                placeholder={'请输入当没有新数据的时候的等待毫秒数'}
                onChange={(v) => this.handleChange(v, 'scanInterval')}
              />
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>从上次消费位置读取:</div>
            </Col>
            <Col span={21}>
              <Select
                className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.goOn === 'false' ? 'no' : 'yes'}
                onChange={(v) => this.handleChange(v, index, i, 'goOn')}
              >
                <Option value="true">yes</Option>
                <Option value="false">no</Option>
              </Select>
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>行分隔符:</div>
            </Col>
            <Col span={21}>
              <Input className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.lineSeparator}
                placeholder={'请输入读取文件中的行分割符'}
                onChange={(v) => this.handleChange(v.target.value, 'lineSeparator')}
              />
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>额外信息添加:</div>
            </Col>
            <Col span={21} />
          </Row>
        </div>

        {
          extraMessages.map((p, i) => {
            return (
              <div>
                <div className="mg2t">
                  <Row>
                    <Col span={7}>
                      <Input className="fright"
                        style={{width: '50%'}}
                        value={p.key}
                        placeholder={'请输入额外信息的名称'}
                        onChange={(v) => this.extraMessagesChange(v.target.value, i, 'key')}
                      />
                    </Col>
                    <Col span={9}>
                      <Input className="mg2l mg3r"
                        style={{width: '100%'}}
                        value={p.value}
                        placeholder={'请输入额外信息的值'}
                        onChange={(v) => this.extraMessagesChange(v.target.value, i, 'value')}
                      />
                    </Col>

                    <Col span={8}>
                      <MinusCircleOutlined
                        title="移除这个配置"
                        className="color-grey font16 pointer line-height32 hover-color-red mg3l"
                        onClick={() => this.extraMessagesDelete(i)} />
                    </Col>
                  </Row>
                </div>
              </div>
            );
          })
        }

        <div className="mg2t">
          <Row>
            <Col span={7}>
              <Button style={{width: '50%'}}
                className="fright"
                type="primary"
                onClick={() => this.extraMessagesAdd('k')}
              >
                增加配置
              </Button>
            </Col>
            <Col span={17} />
          </Row>
        </div>


      </div>
    );
  }

  offlineFileReader = (reader) => {
    let extraMessages = reader.extraMessages
    if (_.isEmpty(extraMessages)) {
      extraMessages = []
    }
    return (
      <div className="mg1l">

        <Row>
          <Col span={3}>
            <div className="fright">
              <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                className="alignright iblock"
              >*
              </div>
              <div className="fright" style={{marginTop: '7px'}}>读取目录名称:</div>
            </div>
          </Col>
          <Col span={21}>
            <Input className="mg2l mg3r"
              style={{width: '70%'}}
              value={reader.fileDir}
              placeholder={'请输入要读取文件的文件夹'}
              onChange={(v) => this.handleChange(v.target.value, 'fileDir')}
            />
          </Col>
        </Row>
        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright">
                <div className="fright" style={{marginTop: '7px'}}>文件名正则匹配:</div>
              </div>
            </Col>
            <Col span={21}>
              <Input className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.fileNameRegex}
                placeholder={'请输入要读取的文件名的正则匹配'}
                onChange={(v) => this.handleChange(v.target.value, 'fileNameRegex')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>线程启动数:</div>
            </Col>
            <Col span={21}>
              <InputNumber className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.threadCount}
                placeholder={'请输入线程启动数'}
                onChange={(v) => this.handleChange(v, 'threadCount')}
              />
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>处理数量:</div>
            </Col>
            <Col span={21}>
              <InputNumber className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.batchSize}
                placeholder={'reader批处理数量，中间结果的数量'}
                onChange={(v) => this.handleChange(v, 'batchSize')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>额外信息添加:</div>
            </Col>
            <Col span={21} />
          </Row>
        </div>

        {
          extraMessages.map((p, i) => {
            return (
              <div>
                <div className="mg2t">
                  <Row>
                    <Col span={7}>
                      <Input className="fright"
                        style={{width: '50%'}}
                        value={p.key}
                        placeholder={'请输入额外信息的名称'}
                        onChange={(v) => this.extraMessagesChange(v.target.value, i, 'key')}
                      />
                    </Col>
                    <Col span={9}>
                      <Input className="mg2l mg3r"
                        style={{width: '100%'}}
                        value={p.value}
                        placeholder={'请输入额外信息的值'}
                        onChange={(v) => this.extraMessagesChange(v.target.value, i, 'value')}
                      />
                    </Col>

                    <Col span={8}>
                      <MinusCircleOutlined
                        title="移除这个配置"
                        className="color-grey font16 pointer line-height32 hover-color-red mg3l"
                        onClick={() => this.extraMessagesDelete(i)} />
                    </Col>
                  </Row>
                </div>
              </div>
            );
          })
        }

        <div className="mg2t">
          <Row>
            <Col span={7}>
              <Button style={{width: '50%'}}
                className="fright"
                type="primary"
                onClick={() => this.extraMessagesAdd('k')}
              >
                增加配置
              </Button>
            </Col>
            <Col span={17} />
          </Row>
        </div>

      </div>
    );
  }


  kafkaReader = (reader) => {
    let extraMessages = reader.extraMessages
    if (_.isEmpty(extraMessages)) {
      extraMessages = []
    }
    let {propertiesList} = reader.consumerProperties
    if (_.isEmpty(propertiesList)) {
      propertiesList = []
    }

    return (
      <div className="mg1l">

        <Row>
          <Col span={3}>
            <div className="fright">
              <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                className="alignright iblock"
              >*
              </div>
              <div className="fright" style={{marginTop: '7px'}}>topic:</div>

            </div>
          </Col>
          <Col span={21}>
            <Input className="mg2l mg3r"
              style={{width: '70%'}}
              value={reader.topic}
              placeholder={'请输入要读取的topic'}
              onChange={(v) => this.handleChange(v.target.value, 'topic')}
            />
          </Col>
        </Row>


        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>consumer配置:</div>
            </Col>
            <Col span={21} />
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
            <Col span={19}>
              <Input className="mg2l mg3r"
                style={{width: '60%'}}
                value={_.get(reader.consumerProperties, 'bootstrapServers')}
                placeholder={'请输入bootstrap.servers配置'}
                onChange={(v) => this.consumerPropertyDefaultChange(v.target.value, 'bootstrapServers')}
              />
            </Col>
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
                <div className="fright" style={{marginTop: '7px'}}>auto.offset.reset:</div>

              </div>
            </Col>
            <Col span={19}>
              <Input className="mg2l mg3r"
                style={{width: '60%'}}
                value={_.get(reader.consumerProperties, 'autoOffsetReset')}
                placeholder={'请输入auto.offset.reset配置'}
                onChange={(v) => this.consumerPropertyDefaultChange(v.target.value, 'autoOffsetReset')}
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
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>启动线程数:</div>
            </Col>
            <Col span={21}>
              <InputNumber className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.threadCount}
                placeholder={'请输入启动线程数，当大于partition数时与partition数相同'}
                onChange={(v) => this.handleChange(v, 'threadCount')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>reader处理数量:</div>
            </Col>
            <Col span={21}>
              <InputNumber className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.batchSize}
                placeholder={'请输入reader批处理数量，中间结果的数量'}
                onChange={(v) => this.handleChange(v, 'batchSize')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>等待毫秒数:</div>
            </Col>
            <Col span={21}>
              <InputNumber className="mg2l mg3r"
                style={{width: '70%'}}
                value={reader.scanInterval}
                placeholder={'请输入当没有新数据的时候的等待毫秒数'}
                onChange={(v) => this.handleChange(v, 'scanInterval')}
              />
            </Col>
          </Row>
        </div>


        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{marginTop: '7px'}}>额外信息添加:</div>
            </Col>
            <Col span={21} />
          </Row>
        </div>

        {
          extraMessages.map((p, i) => {
            return (
              <div>
                <div className="mg2t">
                  <Row>
                    <Col span={7}>
                      <Input className="fright"
                        style={{width: '50%'}}
                        value={p.key}
                        placeholder={'请输入额外信息的名称'}
                        onChange={(v) => this.extraMessagesChange(v.target.value, i, 'key')}
                      />
                    </Col>
                    <Col span={9}>
                      <Input className="mg2l mg3r"
                        style={{width: '100%'}}
                        value={p.value}
                        placeholder={'请输入额外信息的值'}
                        onChange={(v) => this.extraMessagesChange(v.target.value, i, 'value')}
                      />
                    </Col>

                    <Col span={8}>
                      <MinusCircleOutlined
                        title="移除这个配置"
                        className="color-grey font16 pointer line-height32 hover-color-red mg3l"
                        onClick={() => this.extraMessagesDelete(i)} />
                    </Col>
                  </Row>
                </div>
              </div>
            );
          })
        }

        <div className="mg2t">
          <Row>
            <Col span={7}>
              <Button style={{width: '50%'}}
                className="fright"
                type="primary"
                onClick={() => this.extraMessagesAdd('k')}
              >
                增加配置
              </Button>
            </Col>
            <Col span={17} />
          </Row>
        </div>
      </div>
    );
  }



  setParentConverters(reader) {
    const {taskMap} = this.props
    this.props.changeState({
      taskMap: {
        ...taskMap,
        reader: reader
      }
    })
  }

  consumerPropertyAdd = (i) => {
    let {reader} = this.props
    reader = _.cloneDeep(reader)
    let {propertiesList} = reader.consumerProperties
    propertiesList.push({
      key: '',
      value: ''
    })
    _.set(reader, 'consumerProperties.consumerProperties', propertiesList)
    this.setParentConverters(reader)
  }

  consumerPropertyDelete = index => {
    let {reader} = this.props
    reader = _.cloneDeep(reader)
    _.set(reader, 'consumerProperties.propertiesList', reader.consumerProperties.propertiesList.filter((p, i) => i !== index))
    this.setParentConverters(reader)
  }

  setParentConverters(reader) {
    const {taskMap} = this.props
    this.props.changeState({
      taskMap: {
        ...taskMap,
        reader: reader
      }
    })
  }


  consumerPropertyChange = (value, i, p) => {
    let {reader} = this.props
    reader = _.cloneDeep(reader)
    _.set(reader, `consumerProperties.propertiesList.${i}.${p}`, value)
    this.setParentConverters(reader)
  }

  consumerPropertyDefaultChange = (value, p) => {
    let {reader} = this.props
    reader = _.cloneDeep(reader)
    _.set(reader, `consumerProperties.${p}`, value)
    this.setParentConverters(reader)
  }


  handleChange = (value, p) => {
    let {reader} = this.props
    _.set(reader, `${p}`, value)
    this.setParentConverters(reader)

  }


  render() {
    let {reader} = this.props
    return (
      <div>
        <Dropdown overlay={this.menu()} className="mg2t">
          <Button style={{marginLeft: 8}}>
            {_.isEmpty(reader) ? '选择读取器' : NAMED[reader.type]} <DownOutlined />
          </Button>
        </Dropdown>
        <div className="mg1l mg2t">
          {this.getFields()}
        </div>
      </div>
    );
  }

  getFields() {
    const {reader} = this.props
    if (_.isEmpty(reader)) return
    return this.selectReader(reader)
  }

}
