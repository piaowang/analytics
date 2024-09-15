import React from 'react'
import { PlusOutlined } from '@ant-design/icons';
import { Button, Table, Tooltip, Popconfirm, Input, message } from 'antd'
import Bread from 'client/components/Common/bread'
import { Link } from 'react-router'
import BusinessInfo from './new'
import _ from 'lodash'
import Store from './store'
import { BUSINESS_SETTING_MESSAGE_TYPE as messageType } from '../../models/business-db-setting/constants'
import Icon from '../Common/sugo-icon'
import { DataSourceType } from '../../../common/constants'
import {checkPermission} from '../../common/permission-control'
import smartSearch from '../../../common/smart-search'

const canCreate = checkPermission('post:/app/businessdbsetting/create')
const canEdit = checkPermission('post:/app/businessdbsetting/update')
const canDelete = checkPermission('post:/app/businessdbsetting/delete')
const canToggleState = checkPermission('post:/app/businessdbsetting/updatestate')

export default class  extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
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

  componentWillUpdate() {
    this.showMessage()
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

  saveInfo = () => {
    let { saveInfo } = this.store
    let { projectCurrent, datasourceCurrent } = this.props
    saveInfo(projectCurrent.id, datasourceCurrent.type === DataSourceType.Uindex)
  }

  showMessage = () => {
    let { BusinessDbSetting, vm } = this.state
    let { messages } = vm
    if (messages) {
      if (messages.type === messageType.error) {
        message.error(messages.content, 2)
      } else if (messages.type === messageType.notice) {
        message.success(messages.content, 2)
      }
    }
    if (BusinessDbSetting.message) {
      if (BusinessDbSetting.message.type === messageType.error) {
        message.error(BusinessDbSetting.message.message, 3)
      } else {
        message.success(BusinessDbSetting.message.message, 2)
      }
    }
  }

  render() {
    let { Loading, BusinessDbSetting, vm } = this.state
    let { settingList, modalVisible, serach, testOk, dimensions, fields, retest } = vm
    let { changeProp, hideModalVisible, testConnection } = this.store
    let { projectCurrent } = this.props
    let tableColumns = [{
      title: '业务表名称',
      dataIndex: 'table_title',
      key: 'table_title',
      sorter: (a, b) => a.table_title > b.table_title ? 1 : -1
    }, {
      title: '数据库类型',
      key: 'db_type',
      dataIndex: 'db_type',
      sorter: (a, b) => a.db_type > b.db_type ? 1 : -1
    }, {
      title: 'JDBC地址',
      key: 'db_jdbc',
      dataIndex: 'db_jdbc',
      sorter: (a, b) => a.db_jdbc > b.db_jdbc ? 1 : -1
    }, {
      title: '数据库表名称',
      key: 'table_name',
      dataIndex: 'table_name',
      sorter: (a, b) => a.table_name > b.table_name ? 1 : -1
    }, {
      title: '状态',
      key: 'state',
      dataIndex: 'state',
      className: 'aligncenter',
      sorter: (a, b) => a.state > b.state ? 1 : -1,
      render: (text) => {
        return text ? '启用' : '禁用'
      }
    }, {
      title: '操作',
      key: 'op',
      className: 'aligncenter',
      render: (text, ug) => {
        return (
          <div className="aligncenter">
            {!canToggleState ? null : (
              <Tooltip
                title={ug.state ? '禁用' : '启用'}
                placement="left"
              >
                <Link onClick={() => this.store.updateState(ug.id, ug.state ? 0 : 1, projectCurrent.datasource_id)}>
                  <Icon
                    type={ug.state ? 'sugo-pause' : 'sugo-play'}
                    className="mg2x font16 color-grey pointer"
                  />
                </Link>
              </Tooltip>
            )}

            {!canEdit ? null : (
              <Tooltip title="修改" placement="left">
                <Link onClick={() => this.store.initEditModel(ug.id)}>
                  <Icon
                    type="sugo-edit"
                    className="font16 color-grey pointer"
                  />
                </Link>
              </Tooltip>
            )}

            {!canDelete ? null : (
              <Popconfirm
                title={`确定删除 "${ug.table_title}" 吗？`}
                placement="topLeft"
                onConfirm={() => this.store.delete(ug.id)}
              >
                <Tooltip title="删除" placement="right">
                  <Icon type="sugo-trash" className="mg2l font14 color-grey pointer hover-color-red" />
                </Tooltip>
              </Popconfirm>
            )}
          </div>
        )
      }
    }]
    let sources = settingList ? settingList.filter(d => d.project_id === projectCurrent.id && (!serach || smartSearch(serach, d.table_name) || smartSearch(serach, d.table_title))) : []
    sources = _.sortBy(sources, p => p.created_at)
    return (
      <div className="height-100 bg-white">
        <Bread
          path={[{ name: '业务表管理' }]}
        />
        <div className="scroll-content always-display-scrollbar">
          <div className="pd3x pd2y">
            <div className="itblock width200 mg1l">
              <Input
                placeholder="请输入业务表名称/数据库表名称"
                onChange={e => this.store.serach(e.target.value)}
              />
            </div>
            {!canCreate ? null : (
              <div className="fright">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    this.store.initEditModel()
                  }}
                >创建业务表</Button>
              </div>
            )}
          </div>

          <div className="pd3x">
            <Table
              loading={Loading.loading}
              bordered
              size="small"
              rowKey="id"
              columns={tableColumns}
              dataSource={sources}
              pagination={{
                total: sources.length,
                showSizeChanger: true,
                defaultPageSize: 30
              }}
            />
            {
              modalVisible ? <BusinessInfo
                saveing={Loading.saveing}
                testing={Loading.testing}
                data={BusinessDbSetting}
                fields={fields}
                dimensions={dimensions}
                hideModal={hideModalVisible}
                visible={modalVisible}
                save={this.saveInfo}
                testOk={BusinessDbSetting.id || modalVisible ? testOk : false}
                changeProp={changeProp}
                test={testConnection}
                retest={retest}
                             />
                : null
            }
          </div>
        </div>
      </div>
    );
  }
}
