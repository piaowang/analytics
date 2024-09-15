/**
 * @file AccessDataTask List
 */
import React from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Icon as LegacyIcon } from '@ant-design/compatible'
import { Row, Col, Button, Table, Alert, Badge, Tooltip } from 'antd'
import Icon from '../Common/sugo-icon'
import { Link } from 'react-router'
import Bread from '../Common/bread'
import LoadingElement from '../Common/loading'
import moment from 'moment'
import { compressUrlQuery } from '../../../common/sugo-utils'
import Store from './store'
import { ACCESS_DATA_TASK_STATUS } from './constants'
import './access-tool.styl'
import helpLinkMap from 'common/help-link-map'
import { Anchor } from '../Common/anchor-custom'

const STATUS_MAP = {
  [ACCESS_DATA_TASK_STATUS.WAITING]: '排队中',
  [ACCESS_DATA_TASK_STATUS.PENDING]: '排队中',
  [ACCESS_DATA_TASK_STATUS.RUNNING]: '运行中',
  [ACCESS_DATA_TASK_STATUS.SUCCESS]: '已完成',
  [ACCESS_DATA_TASK_STATUS.FAILED]: '失败'
}

const statusColorMap = {
  [ACCESS_DATA_TASK_STATUS.WAITING]: 'bg-blue',
  [ACCESS_DATA_TASK_STATUS.PENDING]: 'bg-blue',
  [ACCESS_DATA_TASK_STATUS.RUNNING]: 'bg-blue',
  [ACCESS_DATA_TASK_STATUS.SUCCESS]: 'bg-green',
  [ACCESS_DATA_TASK_STATUS.FAILED]: 'bg-red'
}

const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['/console/access-tools']

class Main extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    /** @type {AccessDataTaskState} */
    this.state = this.store.getState()
  }

  componentWillMount() {
    this.init(this.props.projectCurrent)
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.projectCurrent.id !== nextProps.projectCurrent.id) {
      this.init(nextProps.projectCurrent)
    }
  }

  /**
   * 入口组件，有两种方式进入
   * 1. 输入路由直接进入，此时需要从 componentWillReceiveProps 中取值
   * 2. 通过页面Link跳转，此时可以在 componentWillMount 中父级传入取值
   * @param project
   */
  init(project) {
    if (project.id) {
      this.store.initViewListModel(project)
    }
  }

  renderRunBtn = record => {
    const { store } = this
    const running = record.status === ACCESS_DATA_TASK_STATUS.RUNNING
    let text = running ? '停止' : '启动'
    let icon = running ? 'sugo-pause' : 'sugo-play'
    let cls = running ? 'iblock color-grey pointer hover-color-red' : 'iblock color-grey pointer hover-color-green'
    let onClick = running ? () => store.stopOne(record) : () => store.runOne(record)
    return (
      <Tooltip title={text}>
        <Icon type={icon} className={cls} onClick={onClick} />
      </Tooltip>
    )
  }

  renderAccessDataTaskList() {
    const { AccessDataTask } = this.state.vm
    const Project = this.props.projectCurrent

    const columns = [
      {
        key: 'project_id',
        dataIndex: 'project_id',
        title: '项目名称',
        render() {
          return Project.name
        }
      },
      {
        key: 'datasource_name',
        dataIndex: 'datasource_name',
        title: '项目ID',
        render() {
          return Project.datasource_name
        }
      },
      {
        key: 'params',
        dataIndex: 'params',
        title: '数据文件路径',
        render(params) {
          return <span>{params.spec.ioConfig.inputSpec.paths}</span>
        }
      },
      {
        key: 'status',
        dataIndex: 'status',
        title: '任务状态',
        render(text) {
          let color = statusColorMap[text]
          return (
            <span>
              <span className={'mg1r iblock status-dot ' + color} />
              <span className='iblock'>{STATUS_MAP[text]}</span>
            </span>
          )
        }
      },
      {
        key: 'created_at',
        dataIndex: 'created_at',
        title: '任务创建时间',
        render(text) {
          return moment(text).format('YYYY-MM-DD HH:mm:ss')
        }
      },
      {
        key: 'id',
        dataIndex: 'id',
        title: '操作',
        render: (text, record) => {
          return (
            <div>
              {this.renderRunBtn(record)}
              <Tooltip title='查看日志'>
                <Anchor
                  target='_blank'
                  href={`/app/project/access-task/log?q=${compressUrlQuery({ id: record.id, size: 1 << 20 })}`}
                  className='mg1x font14 color-grey iblock hover-color-main'
                >
                  <Icon type='code-o' />
                </Anchor>
              </Tooltip>
              {record.status === ACCESS_DATA_TASK_STATUS.SUCCESS || record.status === ACCESS_DATA_TASK_STATUS.FAILED ? (
                <Tooltip title='修改设置'>
                  <Link className='font12 mg1x color-grey iblock hover-color-blue' to={`/console/access-tools/edit/${record.id}`}>
                    <Icon type='sugo-edit' visible={false} />
                  </Link>
                </Tooltip>
              ) : null}
            </div>
          )
        }
      }
    ]
    return (
      <div className='pd3x pd2b access-table-wrap'>
        <Table rowKey='id' bordered size='default' columns={columns} dataSource={AccessDataTask} />
      </div>
    )
  }

  render() {
    const {
      Project,
      Loading,
      vm: { AccessDataTask }
    } = this.state
    const { from } = this.props.location.query
    let extra = (
      <Anchor href={helpLink} target='_blank' className='color-grey pointer'>
        <Icon type='question-circle' />
      </Anchor>
    )
    const loading = Loading.project || Loading.accessDataTask
    return (
      <div className='height-100 bg-white'>
        <Bread path={[{ name: '数据接入工具', link: '/console/access-tools' }]} extra={extra}>
          {null}
        </Bread>
        <div className='scroll-content always-display-scrollbar' style={{ height: window.innerHeight - 44 - 48 }}>
          <div className='pd2y pd3x'>
            {from === 'create' && AccessDataTask.length > 0 ? (
              <Alert
                closable
                type='success'
                message='接入提示'
                description={
                  <p>
                    任务创建后，服务器需要一段时间来处理。 你可以隔一段时间后刷新页面来观察任务处理结果。 如果任务处理成功，你可以点击下方 <strong>同步维度</strong> 按钮更新维度。
                    之后即可在各个功能中使用任务上传的数据。
                  </p>
                }
              />
            ) : null}
            <Row gutter={16}>
              <Col span={12} className='pd1t'>
                任务列表
              </Col>
              <Col span={12}>
                <div className='alignright'>
                  <Link to={`/console/access-tools/create/${Project.id}`}>
                    <Button type='primary' icon={<PlusOutlined />}>
                      新建导入任务
                    </Button>
                  </Link>
                  {AccessDataTask.length > 0 ? (
                    <Button onClick={() => this.store.sync()} disabled={Loading.sync} icon={<LegacyIcon type={Loading.sync ? 'loading' : ''} />} type='primary' className='mg2l'>
                      同步维度
                    </Button>
                  ) : null}
                </div>
              </Col>
            </Row>
          </div>
          <LoadingElement isLoading={loading}>{loading ? null : this.renderAccessDataTaskList()}</LoadingElement>
        </div>
      </div>
    )
  }
}

export default Main
