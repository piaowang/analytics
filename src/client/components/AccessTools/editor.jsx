import React from 'react'
import Store from './store'
import { UploadOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Select, Input, Button, Upload, Table, Row, Col, message } from 'antd'
import { TypeConfig } from './base/type-conf'
import { dateFormatTipsWrapper } from './base/gen-conf'
import { DIMENSION_MAP } from './constants'
import _ from 'lodash'
import './access-tool.styl'

const FormItem = Form.Item
const DIMENSION_TYPES = _.uniq(_.values(DIMENSION_MAP))
const formItemLayoutTop = {
  labelCol: { span: 5 },
  wrapperCol: { span: 19 }
}
class Main extends React.Component {
  static propTypes = {
    accessDataTask: React.PropTypes.object.isRequired,
    project: React.PropTypes.object.isRequired
  }

  static defaultProps = {
    accessDataTask: {},
    project: {}
  }

  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    /** @type {AccessDataTaskState} */
    this.state = this.store.getState()
  }

  componentWillMount() {
    const { project, accessDataTask } = this.props
    this.store.initEditor(project, accessDataTask)
  }

  beforeUpload(file) {
    this.store.setFile(file)
    return false
  }

  onChangeDir = e => {
    this.store.setFileDir(e.target.value.trim().slice(0, 5000))
  }

  renderBaseConfig() {
    const {
      AccessTypeList,
      ResourceFileTypeList,
      CSVSeparator,
      Projects,

      access_type,
      resource_file_type,
      file_dir,
      csv_separator
    } = this.state.vm

    const project = this.state.Project

    return (
      <div className='pd2b borderb dashed access-tool-form'>
        <FormItem {...formItemLayoutTop} required label='数据接入项目'>
          <Select className='width-100' onChange={id => this.store.setProject(id)} value={project.id}>
            {Projects.map(p => (
              <Select.Option key={p.id} value={p.id}>
                {p.name}
              </Select.Option>
            ))}
          </Select>
        </FormItem>
        <FormItem {...formItemLayoutTop} required label='数据接入类型'>
          <Select className='width-100' onChange={type => this.store.setAccessType(type)} value={access_type}>
            {AccessTypeList.map(p => (
              <Select.Option key={p.value} value={p.value}>
                {p.name}
              </Select.Option>
            ))}
          </Select>
        </FormItem>
        <FormItem {...formItemLayoutTop} required label='数据文件格式'>
          <Select className='width-100' onChange={type => this.store.setResourceFileType(type)} value={resource_file_type}>
            {ResourceFileTypeList.map(p => (
              <Select.Option key={p.value} value={p.value}>
                {p.name}
              </Select.Option>
            ))}
          </Select>
        </FormItem>
        {resource_file_type === 'csv' ? (
          <FormItem {...formItemLayoutTop} required label='CSV分隔符'>
            <Select value={csv_separator} className='width-100' onChange={type => this.store.setCsvListDelimiter(type)}>
              {CSVSeparator.map(p => (
                <Select.Option key={p.value} value={p.value}>
                  {p.name}
                </Select.Option>
              ))}
            </Select>
          </FormItem>
        ) : null}
        <FormItem {...formItemLayoutTop} required label='数据文件路径'>
          <Input value={file_dir || void 0} placeholder='请输入HDFS文件夹路径' className='width-100' onChange={this.onChangeDir} />
        </FormItem>
      </div>
    )
  }

  renderUpload() {
    return (
      <div>
        <div className='pd1b'>设置导入字段：</div>
        <Upload className='iblock' multiple={false} beforeUpload={file => this.beforeUpload(file)}>
          <Button type='primary' icon={<UploadOutlined />}>
            选择配置文件
          </Button>
        </Upload>
        <span className='iblock mg1l pointer' onClick={() => this.store.download()}>
          下载样例文件
        </span>
        <div className='pd3t'>
          <div className='pd1b'>
            <strong className='b'>说明：</strong>
          </div>
          <p>1. 以CSV或TXT方式批量导入列名与数据格式</p>
          <p>
            2. 每一行为一个字段记录，内容格式
            <span className='color-green pd1l'>字段名:类型</span>
          </p>
          <p>3. 类型合法值包括：{DIMENSION_TYPES.join('、')}</p>
        </div>
      </div>
    )
  }

  renderFileData() {
    const { titles, TimeFormatList } = this.state.vm
    const columns = [
      {
        key: 'no',
        dataIndex: 'no',
        title: '列号'
      },
      {
        key: 'name',
        dataIndex: 'name',
        title: '列名'
      },
      {
        key: 'type',
        dataIndex: 'type',
        title: '数据格式',
        render: (text, record) => {
          return (
            <div>
              <span className='pd1r'>{text}</span>
              {text === 'date'
                ? dateFormatTipsWrapper(
                    <div className='iblock'>
                      <Select size='small' value={record.format} className='width180' onChange={v => this.store.setDateFormat(record, v)}>
                        {TimeFormatList.map(r => (
                          <Select.Option key={r.value} value={r.value}>
                            {r.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                  )
                : null}
            </div>
          )
        }
      }
    ]

    return (
      <div>
        <Row gutter={16}>
          <Col span={12}>导入字段设置</Col>
          <Col span={12} className='alignright'>
            <Upload multiple={false} beforeUpload={file => this.beforeUpload(file)}>
              <Button size='small' type='primary' icon={<UploadOutlined />}>
                重新导入
              </Button>
            </Upload>
          </Col>
        </Row>
        <div className='pd2t'>
          <Table bordered rowKey='no' size='small' dataSource={titles} columns={columns} pagination={{ defaultPageSize: 30 }} />
        </div>
      </div>
    )
  }

  renderFieldsParser() {
    return <div className='pd2t width600'>{this.state.vm.file ? this.renderFileData() : this.renderUpload()}</div>
  }

  renderConfig() {
    const {
      file,
      BaseConf,
      //AdvanceConf,
      ot,
      showCode,
      HadoopVersionsList,
      hadoop_version
    } = this.state.vm

    if (!file) return null
    if (showCode) return this.renderCode()

    return (
      <div className='pd2t width600 access-tool-form'>
        <TypeConfig def={ot.valueOf()} base={BaseConf} advance={[]} onMount={ins => (this._conf = ins)} />
        <FormItem {...formItemLayoutTop} required label='数据接入类型'>
          <Select onChange={version => this.store.setHadoopVersion(version)} value={hadoop_version} className='width-100'>
            {HadoopVersionsList.map(p => (
              <Select.Option key={p.value} value={p.value}>
                {p.name}
              </Select.Option>
            ))}
          </Select>
        </FormItem>
        <div className='pd2t'>
          <Button onClick={() => this.showCode()}>下一步</Button>
        </div>
      </div>
    )
  }

  showCode() {
    let { file_dir } = this.state.vm
    if (!file_dir) return message.warn('请填写HDFS文件夹路径')
    this._conf.getConf().then(conf => {
      this.store.showCode(conf)
    })
  }

  renderCode() {
    const { ot } = this.state.vm
    return (
      <div className=''>
        <textarea
          className='width600 height500 border radius'
          value={JSON.stringify(ot.valueOf(), null, 2)}
          onChange={e => this.store.setOtObject(JSON.parse(e.target.value.trim()))}
        />
        <div className='pd2t'>
          <Button className='mg1r' type='default' onClick={() => this.store.showEditor()}>
            上一步
          </Button>
          <Button type='primary' onClick={() => this.store.createAndRun()}>
            执行
          </Button>
        </div>
      </div>
    )
  }

  render() {
    const { showCode } = this.state.vm
    return (
      <div className='pd3x pd2y height-100 overscroll-y bg-white'>
        <div className='mg-auto width600 relative'>
          {showCode ? (
            this.renderCode()
          ) : (
            <div className=''>
              {this.renderBaseConfig()}
              {this.renderFieldsParser()}
              {this.renderConfig()}
            </div>
          )}
        </div>
      </div>
    )
  }
}

export default Main
