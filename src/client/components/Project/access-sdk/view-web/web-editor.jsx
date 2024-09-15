/**
 * @file WebSDK编辑
 * 应用版本号管理
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Link, browserHistory } from 'react-router'
import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Input, Row, Col, Modal, Table, message, Select, Tabs } from 'antd'
import { EditableCell } from '../../../Common/editable-table'
import CopyEvent from './copy-event'
import { validateFieldsAndScroll } from 'client/common/decorators'
import { AccessDataOriginalType, AccessTypes, TABTYPE } from '../../constants'
import { AccessDataOriginalTypeArr } from '../../../../../common/constants'
import { TRACKTYPE } from './../../../../constants/track'
import { WEB_EDITOR_VIEW_STATE, TRACK_EVENT_TYPE_MAP } from './store/constants'
import DropOption from '../../../Common/DropOption'
import ProjectDataImport from './project-data-import'
import Store from './store'
import { compressUrlQuery } from '../../../../../common/sugo-utils'
import { deleteAppVersion } from '../../../../services/sdk'
import AutoTrackList from '../auto-track/index'
import { Anchor } from '../../../Common/anchor-custom'

const formItemLayout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 }
}
const TabPane = Tabs.TabPane
const Option = Select.Option
const Search = Input.Search
@Form.create()
@validateFieldsAndScroll
export default class Main extends Component {
  static propTypes = {
    project: PropTypes.object.isRequired,
    analysis: PropTypes.object.isRequired,
    title: PropTypes.string.isRequired,
    // 可视化埋点entry
    entry: PropTypes.string.isRequired,
    children: PropTypes.element
  }

  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    /** @type {WebSDKAccessorState} */
    this.state = this.store.getState()
  }

  componentWillMount() {
    const { project, analysis } = this.props
    this.store.init(project, analysis, true)
  }

  /**
   * @param nextProps
   * @param {WebSDKAccessorState} nextState
   */
  componentWillUpdate(nextProps, nextState) {
    const msg = nextState.vm.message
    if (msg) {
      message[msg.type](msg.message)
      this.store.clearMessage()
    }
  }

  /**
   * 渲染上方操作区域
   * @return {XML}
   */
  renderOperate() {
    const { DataAnalysis } = this.state
    const {
      form: { getFieldDecorator },
      entry
    } = this.props
    const { ModalVisible, appVersion } = this.state.vm

    const store = this.store
    const IS_WEB_SDK = DataAnalysis.access_type === AccessDataOriginalType.Web

    return (
      <div className='mg2t pd2y bordert dashed'>
        <Modal
          title='新增版本'
          visible={ModalVisible === 'visibleAppVersionCreatorModal'}
          onOk={() => {
            store.createAppVersion()
            store.setCreateAppVersionModal(false)
          }}
          onCancel={() => store.setCreateAppVersionModal(false)}
        >
          <div className='width300'>
            <span className='pd1r'>应用版本号：</span>
            <Input className='width200' value={appVersion} onChange={e => store.setAppVersion(e.target.value.trim())} />
          </div>
        </Modal>
        <Modal
          title='导入版本'
          visible={ModalVisible === 'batchImport'}
          onOk={async () => {
            const values = await this.validateFieldsAndScroll()
            if (!values) return
            store.createAppVersion()
            store.setCreateAppVersionModal('projectDataImport')
            store.setUploadVersion(appVersion)
            store.setUploadedFilename({
              isUploaded: false,
              filename: '无'
            })
          }}
          onCancel={() => store.setCreateAppVersionModal(false)}
        >
          <div className='width300'>
            <Form>
              <Form.Item {...formItemLayout} label='应用版本号' hasFeedback>
                {getFieldDecorator('appVersion', {
                  rules: [
                    {
                      required: true,
                      message: '请输入版本号'
                    },
                    {
                      min: 1,
                      max: 30,
                      type: 'string',
                      message: '1~30个字符'
                    }
                  ]
                })(<Input onChange={e => store.setAppVersion(e.target.value.trim())} />)}
              </Form.Item>
            </Form>
          </div>
        </Modal>
        {ModalVisible ? <ProjectDataImport visible={ModalVisible} store={store} state={this.state} /> : null}
        <Row gutter={16}>
          <Col span={12}>
            <Input onChange={e => store.filterAppVersion(e.target.value.trim())} placeholder='请输入版本号' />
          </Col>
          <Col span={12}>
            <div className='fright mg1l'>
              {IS_WEB_SDK ? null : (
                <Button size='small' type='primary' icon={<PlusOutlined />} onClick={() => store.setCreateAppVersionModal('batchImport')}>
                  导入版本
                </Button>
              )}
            </div>
            <div className='fright mg1l'>
              <Link to={entry}>
                <Button type='primary' size='small' icon={<PlusOutlined />}>
                  可视化圈选
                </Button>
              </Link>
            </div>
            <div className='fright'>
              {IS_WEB_SDK ? null : (
                <Button size='small' type='primary' icon={<PlusOutlined />} onClick={() => store.setCreateAppVersionModal('visibleAppVersionCreatorModal')}>
                  新增版本
                </Button>
              )}
            </div>
          </Col>
        </Row>
      </div>
    )
  }

  /**
   * 渲染AppVersion Table
   * @return {XML}
   */
  renderDataTable() {
    const { DataAnalysis } = this.state
    const { visibleAppVersionModels } = this.state.vm
    const { store, renderButtonList } = this
    const { project } = this.props
    const columns = [
      {
        title: '应用版本号',
        dataIndex: 'app_version',
        key: 'app_version',
        render(text, record) {
          return record.deploy_events_count > 0 ? text : <EditableCell value={text} onChange={value => store.updateAppVersion(value, record.id)} />
        }
      },
      {
        title: 'SDK状态',
        dataIndex: 'sdk_init',
        key: 'sdk_init',
        render: text => {
          return (
            <div>
              <span className={`mg1r ${text ? 'icon-active' : 'icon-normal'}`} />
              <span>{text ? '已启用' : '未启用'}</span>
            </div>
          )
        }
      },
      {
        title: '是否强制拉取配置',
        dataIndex: 'sdk_force_update_config',
        key: 'sdk_force_update_config',
        render: text => {
          return (
            <div>
              <span className={`mg1r ${text ? 'icon-active' : 'icon-normal'}`} />
              <span>{text ? '是' : '否'}</span>
            </div>
          )
        }
      },
      {
        title: '事件埋点数',
        dataIndex: 'deploy_events_count',
        key: 'deploy_events_count',
        render: (v, record) => {
          v = v || 0
          return (
            <div>
              <span className='pd1r'>已部署{v}个事件,</span>
              {
                // <span className="pd1r">未部署{record.draft_event_count || 0}个事件</span>
              }
              <a className='pointer ' onClick={() => this.store.listAppVersionEvents(record)}>
                事件列表
              </a>
            </div>
          )
        }
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'op',
        render(text, record, index) {
          return <div className='pd1'>{renderButtonList({ store, record, text, dataSourceName: project.datasource_name })}</div>
        }
      }
    ]

    return (
      <div className='pd2t'>
        <Table bordered rowKey='id' size='small' dataSource={visibleAppVersionModels} columns={columns} />
      </div>
    )
  }

  renderButtonList({ store, record, text, dataSourceName }) {
    const paths = _.compact([
      record.deploy_events_count
        ? {
          click: () => store.openCopyEventsModal(record.id),
          label: '复制埋点'
        }
        : null,
      {
        click: () => store.deployAppEvents(record.app_version),
        label: '部署埋点'
      },
      /* 删除csv格式的导出 */
      // record.deploy_events_count
      //   ? {
      //     click: () => store.downloadEvents(record.id),
      //     label: '导出埋点'
      //   }
      //   : null
      // ,
      {
        click: () => {
          store.setCreateAppVersionModal('projectDataImport')
          store.setUploadVersion(record.app_version)
          store.setUploadedFilename({
            isUploaded: false,
            filename: '无'
          })
        },
        label: '导入版本'
      },
      record.deploy_events_count
        ? {
          click: () => store.batchExport(record.id),
          label: '批量导出'
        }
        : null,
      {
        click: () => store.setAppVersionSdkConfig({ projectId: dataSourceName, token: record.appid, id: record.id, sdkInit: !record.sdk_init }),
        label: `${!record.sdk_init ? '启用SDK' : '禁用SDK'}`
      },
      {
        click: () => store.setAppVersionSdkConfig({ projectId: dataSourceName, token: record.appid, id: record.id, sdkForceUpdateConfig: !record.sdk_force_update_config }),
        label: `${!record.sdk_force_update_config ? '强制拉取配置' : '取消强制拉取配置'}`
      },
      record.deploy_events_count
        ? null
        : {
          click: async () => {
            const res = await deleteAppVersion(record.appid, record.app_version)
            if (res?.success) {
              message.success('删除成功')
              store.refreshData()
              return
            }
            message.error('删除失败')
          },
          label: '删除该版本'
        }
    ])
    return <DropOption menuOptions={paths} />
  }

  renderEditor() {
    const { copyEventsComponentProps } = this.state.vm
    const { title, entry, project } = this.props
    const { DataAnalysis } = this.state
    return (
      <div className='pd2'>
        {copyEventsComponentProps ? <CopyEvent {...copyEventsComponentProps} /> : null}
        <Row gutter={16}>
          <Col span={6}>
            <strong className='font18'>{title}</strong>
          </Col>
          <Col span={18}>
            <div className='alignright'>
              {/* <Anchor
                <Anchor
                  key="downloadBtn"
                  href={`/app/sdk/heat-map/export?q=${compressUrlQuery(JSON.stringify({appid:DataAnalysis.id, appType: AccessDataOriginalTypeArr[DataAnalysis.access_type]}))}`}
                  target="_blank"
                >
                  <Button type="primary" className="mg2r">导出热图</Button>
                </Anchor> */}

              <Link
                onClick={() => {
                  this.store.setDataAnalyticsSdkConfig({ projectId: project.datasource_name, id: DataAnalysis.id, auto_track_init: !DataAnalysis.auto_track_init })
                }}
              >
                <Button
                  title={DataAnalysis.auto_track_init ? '当前处于打开状态，点击关闭全埋点' : '当前处于禁止状态，点击启用全埋点'}
                  type={DataAnalysis.sdk_init ? 'danger' : 'primary'}
                  className='mg2r'
                >
                  {DataAnalysis.auto_track_init ? '禁用全埋点' : '启用全埋点'}
                </Button>
              </Link>
              <Link
                onClick={() => {
                  this.store.setDataAnalyticsSdkConfig({ projectId: project.datasource_name, id: DataAnalysis.id, sdk_init: !DataAnalysis.sdk_init })
                }}
              >
                <Button
                  title={DataAnalysis.sdk_init ? '当前处于打开状态，点击关闭' : '当前处于禁止状态，点击启动'}
                  type={DataAnalysis.sdk_init ? 'danger' : 'primary'}
                  className='mg2r'
                >
                  {DataAnalysis.sdk_init ? '禁用' : '启动'}
                </Button>
              </Link>

              <Link
                onClick={() => {
                  this.store.setDataAnalyticsSdkConfig({ projectId: project.datasource_name, id: DataAnalysis.id, sdk_force_update_config: !DataAnalysis.sdk_force_update_config })
                }}
              >
                <Button type={DataAnalysis.sdk_force_update_config ? 'danger' : 'primary'} className='mg2r'>
                  {DataAnalysis.sdk_force_update_config ? '取消强制拉取' : '强制拉取'}
                </Button>
              </Link>
            </div>
          </Col>
        </Row>
        {this.renderOperate()}
        {this.renderDataTable()}
      </div>
    )
  }

  renderDocs() {
    return <div className='pd2'>{this.props.children}</div>
  }

  /**
   * 渲染事件列表
   */
  renderEventsTable() {
    const { title, accessType } = this.props
    return (
      <div className='pd2'>
        <div className='pd2'>
          <Row gutter={16}>
            <Col span={12}>
              <strong className='font18'>{`${title}/事件列表`}</strong>
            </Col>
            <Col span={12}>
              <div className='alignright'>
                <Button type='primary' size='small' onClick={() => this.store.setViewState(WEB_EDITOR_VIEW_STATE.EDITOR)}>
                  返回
                </Button>
              </div>
            </Col>
          </Row>
        </div>
        <Tabs>
          <TabPane tab='事件列表' key='tabEventList'>
            {this.renderEventList()}
          </TabPane>
          <TabPane tab='页面列表' key='tabPageList'>
            {this.renderPageList()}
          </TabPane>
          {accessType === 'web' ?
            <TabPane tab='分类列表' key='tabCategoryList'>
              {this.renderCategories()}
            </TabPane> : null
          }
        </Tabs>
      </div>
    )
  }

  renderEventList() {
    const { vm } = this.state
    const total = vm.appEvents.totalCount ? parseInt(vm.appEvents.totalCount) : 0
    const columns = [
      {
        title: '事件名称',
        dataIndex: 'event_name',
        width: '30%',
        key: 'event_name',
        render(v) {
          return (
            <div className='elli width-100' style={{ whiteSpace: 'normal' }}>
              {v}
            </div>
          )
        }
      },
      {
        title: '事件类型',
        dataIndex: 'event_type',
        key: 'event_type',
        width: '10%',
        render(v) {
          return TRACK_EVENT_TYPE_MAP[v] || TRACK_EVENT_TYPE_MAP.undef
        }
      },
      {
        title: '匹配页面',
        dataIndex: 'page',
        width: '30%',
        key: 'page',
        render(v) {
          return (
            <div className='elli width-100' style={{ whiteSpace: 'normal' }}>
              {v}
            </div>
          )
        }
      },
      {
        title: '页面名称',
        dataIndex: 'page_name',
        width: '10%',
        key: 'page_name',
        render: v => (v ? v : '系统自动获取')
      },
      {
        title: '事件状态',
        dataIndex: 'id',
        key: 'id',
        width: '10%',
        render(v, r) {
          return vm.appEventsFilter.state === 'DEPLOYED' ? '已部署' : '未部署'
        }
      }
    ]
    return (
      <div>
        <div className='mg2t pd2y bordert dashed'>
          <Row gutter={16}>
            <Col span={18}>
              <Select
                allowClear
                showSearch
                placeholder='匹配页面'
                className='width220 mg2r'
                onSearch={name => {
                  this.store.getAppEventPages(name)
                }}
                value={vm.appEventsFilter.page || void 0}
                onChange={page => this.store.filterEvents({ page, pageIndex: 1 })}
              >
                {vm.appEventPages.map(page => (
                  <Option value={page.page} key={page.id}>
                    {page.page_name || page.page}
                  </Option>
                ))}
              </Select>
              <Select className='width120' placeholder='事件状态' value={vm.appEventsFilter.state || void 0} onChange={state => this.store.filterEvents({ state, pageIndex: 1 })}>
                {vm.appEventState.map(state => (
                  <Option value={state.value} key={state.value}>
                    {state.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <div className='alignright'>
                <Search
                  className='width240'
                  placeholder='请输入事件名称进行搜索'
                  type='text'
                  onSearch={value => {
                    if (value !== (vm.appEventsFilter.name || '')) {
                      this.store.filterEvents({ name: value, pageIndex: 1 })
                    }
                  }}
                />
              </div>
            </Col>
          </Row>
        </div>
        <div className='pd1t'>
          <QuestionCircleOutlined />
          <span className='pd1l'>如果事件属性发生了变化，即使该事件已经部署，也会出现在未部署列表。</span>
        </div>
        <div className='pd2t'>
          <Table
            bordered
            rowKey='id'
            columns={columns}
            dataSource={vm.appEvents.data}
            pagination={{
              current: vm.appEventsFilter.pageIndex || 1,
              total: total,
              defaultPageSize: 20,
              onChange: current => {
                this.store.filterEvents({ pageIndex: current })
              }
            }}
          />
        </div>
      </div>
    )
  }

  renderPageList = () => {
    const { vm } = this.state
    const total = vm.appPages.totalCount ? parseInt(vm.appPages.totalCount) : 0
    const columns = [
      {
        title: '页面名称',
        dataIndex: 'page_name',
        width: '30%',
        key: 'page_name',
        render: v => (v ? v : '系统自动获取')
      },
      {
        title: '页面路径',
        dataIndex: 'page',
        key: 'page',
        width: '60%'
      },
      {
        title: '页面状态',
        dataIndex: 'id',
        key: 'id',
        width: '10%',
        render(v, r) {
          return vm.appPagesFilter.state === 'DEPLOYED' ? '已部署' : '未部署'
        }
      }
    ]
    return (
      <div>
        <div className='mg2t pd2y bordert dashed'>
          <Row gutter={16}>
            <Col span={18}>
              <Select className='width120' placeholder='页面状态' value={vm.appPagesFilter.state || void 0} onChange={state => this.store.filterPages({ state, pageIndex: 1 })}>
                {vm.appEventState.map(state => (
                  <Option value={state.value} key={state.value}>
                    {state.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <div className='alignright'>
                <Search
                  className='width240'
                  placeholder='请输入页面名称进行搜索'
                  type='text'
                  onSearch={value => {
                    if (value !== (vm.appPagesFilter.name || '')) {
                      this.store.filterPages({ name: value, pageIndex: 1 })
                    }
                  }}
                />
              </div>
            </Col>
          </Row>
        </div>
        <div className='pd1t'>
          <QuestionCircleOutlined />
          <span className='pd1l'>如果页面属性发生了变化，即使该页面已经部署，也会出现在未部署列表。</span>
        </div>
        <div className='pd2t'>
          <Table
            bordered
            rowKey='id'
            columns={columns}
            dataSource={vm.appPages.data}
            pagination={{
              current: vm.appPagesFilter.pageIndex || 1,
              total: total,
              defaultPageSize: 20,
              onChange: current => {
                this.store.filterPages({ pageIndex: current })
              }
            }}
          />
        </div>
      </div>
    )
  }

  renderCategories() {
    const { vm } = this.state
    const total = vm.appCategories.totalCount ? parseInt(vm.appCategories.totalCount) : 0
    const columns = [
      {
        title: '分类名称',
        dataIndex: 'name',
        width: '30%',
        key: 'name',
        render(v) {
          return (
            <div className='elli width-100' style={{ whiteSpace: 'normal' }}>
              {v}
            </div>
          )
        }
      },
      {
        title: '匹配规则',
        dataIndex: 'regulation',
        key: 'regulation',
        width: '60%'
      },
      {
        title: '页面状态',
        dataIndex: 'id',
        key: 'id',
        width: '10%',
        render(v, r) {
          return vm.appCategoriesFilter.state === 'DEPLOYED' ? '已部署' : '未部署'
        }
      }
    ]
    return (
      <div>
        <div className='mg2t pd2y bordert dashed'>
          <Row gutter={16}>
            <Col span={18}>
              <Select
                className='width120'
                placeholder='页面状态'
                value={vm.appCategoriesFilter.state || void 0}
                onChange={state => this.store.filterCategories({ state, pageIndex: 1 })}
              >
                {vm.appEventState.map(state => (
                  <Option value={state.value} key={state.value}>
                    {state.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <div className='alignright'>
                <Search
                  className='width240'
                  placeholder='请输入分类名称进行搜索'
                  type='text'
                  onSearch={value => {
                    if (value !== (vm.appCategoriesFilter.name || '')) {
                      this.store.filterCategories({ name: value, pageIndex: 1 })
                    }
                  }}
                />
              </div>
            </Col>
          </Row>
        </div>
        <div className='pd2t'>
          <Table
            bordered
            rowKey='id'
            columns={columns}
            dataSource={vm.appCategories.data}
            pagination={{
              current: vm.appCategoriesFilter.pageIndex || 1,
              total: total,
              defaultPageSize: 20,
              onChange: current => {
                this.store.filterCategories({ pageIndex: current })
              }
            }}
          />
        </div>
      </div>
    )
  }
  renderDocOrList() {
    const { view_state } = this.state.vm
    const { sdkType, analysis, project, title, entry, accessType } = this.props
    const { DataAnalysis } = this.state
    const params = { token: analysis.id, appName: analysis.name, project_id: analysis.project_id, type: TRACKTYPE.TRACKAUTO }

    if (view_state === WEB_EDITOR_VIEW_STATE.EDITOR) {
      switch (sdkType) {
        // 全埋点
        case TABTYPE.TRACKAUTO:
          return (
            <AutoTrackList
              DataAnalysis={DataAnalysis}
              autoTrackEntry={
                analysis.access_type === AccessDataOriginalType.Web
                  ? `/console/track/choose-website-track/${compressUrlQuery(params)}`
                  : `/console/trackAuto/${analysis.id}?type=${accessType}&dsId=${_.get(project, 'datasource_id')}&trackType=trackauto`
              }
              analysis={analysis}
              project={project}
              autoTrackTitle={title}
            />
          )
        // 接入文档
        case TABTYPE.DOCUMENT:
          return this.renderDocs()
        // 可视化埋点
        case TABTYPE.TRACKVISUAL:
        default:
          return (
            <div>
              {this.renderOperate()}
              {this.renderDataTable()}
            </div>
          )
      }
    }
    // 事件列表
    if (view_state === WEB_EDITOR_VIEW_STATE.EVENTS_LIST) {
      return this.renderEventsTable()
    }
  }

  render() {
    const { view_state } = this.state.vm
    const { sdkType, analysis, project, title, entry, accessType } = this.props
    const { DataAnalysis } = this.state
    const params = { token: analysis.id, appName: analysis.name, project_id: analysis.project_id, type: TRACKTYPE.TRACKAUTO }

    const { copyEventsComponentProps } = this.state.vm
    return (
      <div className='pd2'>
        {copyEventsComponentProps ? <CopyEvent {...copyEventsComponentProps} /> : null}
        <Row gutter={16}>
          <Col span={6}>
            <strong className='font18'>{title}</strong>
          </Col>
          <Col span={18}>
            <div className='alignright'>
              {/* <a
                key="downloadBtn"
                href={`/app/sdk/heat-map/export?q=${compressUrlQuery(JSON.stringify({appid:DataAnalysis.id, appType: AccessDataOriginalTypeArr[DataAnalysis.access_type]}))}`}
                target="_blank"
              >
                <Button type="primary" className="mg2r">导出热图</Button>
              </a> */}

              <Link
                onClick={() => {
                  this.store.setDataAnalyticsSdkConfig({ projectId: project.datasource_name, id: DataAnalysis.id, auto_track_init: !DataAnalysis.auto_track_init })
                }}
              >
                <Button
                  title={DataAnalysis.auto_track_init ? '当前处于打开状态，点击关闭全埋点' : '当前处于禁止状态，点击启用全埋点'}
                  type={DataAnalysis.auto_track_init ? 'danger' : 'primary'}
                  className='mg2r'
                >
                  {DataAnalysis.auto_track_init ? '禁用全埋点' : '启用全埋点'}
                </Button>
              </Link>

              <Link
                onClick={() => {
                  this.store.setDataAnalyticsSdkConfig({ projectId: project.datasource_name, id: DataAnalysis.id, sdk_init: !DataAnalysis.sdk_init })
                }}
              >
                <Button
                  title={DataAnalysis.sdk_init ? '当前处于打开状态，点击关闭' : '当前处于禁止状态，点击启动'}
                  type={DataAnalysis.sdk_init ? 'danger' : 'primary'}
                  className='mg2r'
                >
                  {DataAnalysis.sdk_init ? '禁用' : '启动'}
                </Button>
              </Link>

              <Link
                onClick={() => {
                  this.store.setDataAnalyticsSdkConfig({ projectId: project.datasource_name, id: DataAnalysis.id, sdk_force_update_config: !DataAnalysis.sdk_force_update_config })
                }}
              >
                <Button type={DataAnalysis.sdk_force_update_config ? 'danger' : 'primary'} className='mg2r'>
                  {DataAnalysis.sdk_force_update_config ? '取消强制拉取' : '强制拉取'}
                </Button>
              </Link>
            </div>
          </Col>
        </Row>
        {/* 筛选渲染文档还是可视化还是全埋点 */}
        {this.renderDocOrList()}
      </div>
    )
  }
}
