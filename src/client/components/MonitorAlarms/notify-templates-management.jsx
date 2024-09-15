import React from 'react'
import { CloseCircleOutlined, EditOutlined } from '@ant-design/icons';
import { Select, Button, Table, Popconfirm, message } from 'antd';
import Bread from '~/src/client/components/Common/bread.jsx'
import {synchronizer} from '~/src/client/components/Fetcher/synchronizer.js'
import AlarmNotifyTemplateEditDialog from './alarm-notify-template-edit-dlg'
import _ from 'lodash'
import {SUGO_ALARMS_API_KEYS} from '~/src/common/constants.js'
import {checkPermission} from '~/src/client/common/permission-control.js'
import classNames from 'classnames'
import Search from '~/src/client/components/Common/search.jsx'
import {withDebouncedOnChange} from '~/src/client/components/Common/with-debounce-on-change.jsx'
import AlarmInterfaces from './alarm-interfaces'
import smartSearch from '../../../common/smart-search'

const InputWithDebouncedOnChange = withDebouncedOnChange(Search, ev => ev.target.value, 500)

const canEditNotifyTemplates = checkPermission('put:/app/monitor-alarms/notify-templates/:id')

@synchronizer(() => ({
  url: '/app/monitor-alarms/notify-templates',
  modelName: 'notifyTemplates',
  doSync: true
}))
@synchronizer(() => ({
  url: '/app/alarm/interfaces',
  modelName: 'alarmInterfaces',
  doSync: true
}))
@synchronizer(() => ({
  url: '/app/contact/persons',
  modelName: 'persons'
}))
export default class NotifyTemplatesManagement extends React.Component {
  state = {
    visiblePopoverKey: null,
    filterByInterfaceType: null,
    editingNotifyTemplateId: null,
    filterByKeyword: null
  }

  renderFilterComps() {
    let {
      notifyTemplates, modifyNotifyTemplates, reloadNotifyTemplates, projectCurrent,
      alarmInterfaces, modifyAlarmInterfaces, reloadAlarmInterfaces, persons
    } = this.props
    let {filterByInterfaceType, visiblePopoverKey, editingNotifyTemplateId, filterByKeyword} = this.state

    let interfaceTypeDict = _(SUGO_ALARMS_API_KEYS).mapKeys(a => `${a.type}`).mapValues(a => a.name).value()
    return (
      <div className="fix">
        <div className="mg3x mg2y">
          <div className="itblock mg1l">
            <span className="mg2r">接口类型</span>
            <Select
              dropdownMatchSelectWidth={false}
              className="mg2r"
              style={{ minWidth: 200 }}
              value={filterByInterfaceType || ''}
              onChange={val => {
                this.setState({filterByInterfaceType: val})
              }}
            >
              <Select.Option key="none" value="">全部</Select.Option>
              {_.keys(interfaceTypeDict).map(type => {
                return (
                  <Select.Option
                    key={type}
                    value={type}
                  >
                    {interfaceTypeDict[type]}
                  </Select.Option>
                )
              })}
            </Select>

            <InputWithDebouncedOnChange
              className="itblock width200 mg2r"
              placeholder="搜索通知模版名称"
              value={filterByKeyword}
              onChange={val => {
                this.setState({filterByKeyword: val})
              }}
            />

            <Button
              type="primary"
              className={classNames({hide: !canEditNotifyTemplates})}
              onClick={() => {
                this.setState({visiblePopoverKey: 'alarm-notify-template-management-dialog'})
              }}
            >创建</Button>
          </div>
          <span className="fright">
            <Button
              type="ghost"
              className={classNames('alarm-interfaces-mgr-btn', {hide: !canEditNotifyTemplates})}
              onClick={() => {
                this.setState({visiblePopoverKey: 'alarm-interfaces-management-dialog'})
              }}
            >接口管理</Button>
          </span>
        </div>

        <AlarmNotifyTemplateEditDialog
          projectCurrent={projectCurrent}
          persons={persons}
          interfaces={[..._.values(SUGO_ALARMS_API_KEYS), ...(alarmInterfaces || [])]}
          visible={visiblePopoverKey === 'alarm-notify-template-management-dialog'}
          onCancel={() => this.setState({visiblePopoverKey: null, editingNotifyTemplateId: null})}
          value={editingNotifyTemplateId && _.find(notifyTemplates, {id: editingNotifyTemplateId}) || undefined}
          onChange={async newNotifyTemplate => {
            if (editingNotifyTemplateId) {
              let idx = _.findIndex(notifyTemplates, {id: editingNotifyTemplateId})
              await modifyNotifyTemplates([idx], prev => ({...prev, ...newNotifyTemplate}))
            } else {
              await modifyNotifyTemplates([], prevArr => [...(prevArr || []), newNotifyTemplate])
            }
            await reloadNotifyTemplates()
          }}
        />

        <AlarmInterfaces
          projectCurrent={projectCurrent}
          persons={persons}
          alarmInterfaces={alarmInterfaces}
          reloadAlarmInterfaces={reloadAlarmInterfaces}
          modifyAlarmInterfaces={modifyAlarmInterfaces}
          visible={visiblePopoverKey === 'alarm-interfaces-management-dialog'}
          onCancel={() => this.setState({visiblePopoverKey: null})}
        />
      </div>
    )
  }

  genTableCols() {
    let {alarmInterfaces} = this.props
    let intfTypeIdDict = _([..._.values(SUGO_ALARMS_API_KEYS), ...(alarmInterfaces || [])])
      .keyBy('id')
      .mapValues(v => `${v.type}`)
      .value()
    return [
      {
        title: '通知模版名称',
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: '接口类型',
        dataIndex: 'interface_id',
        key: 'interface_id',
        render: interfaceId => {
          let type = intfTypeIdDict[interfaceId]
          return _.get(_.find(SUGO_ALARMS_API_KEYS, {type: +type}), 'name')
        }
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'id',
        render: (id, rec) => {
          return (
            <span>
              <span
                className={classNames('mg1x pointer', {hide: !canEditNotifyTemplates})}
                onClick={() => {
                  this.setState({
                    visiblePopoverKey: 'alarm-notify-template-management-dialog',
                    editingNotifyTemplateId: id
                  })
                }}
              >
                <EditOutlined className="font16 color-grey pointer" />
              </span>
              <Popconfirm
                placement="left"
                title="确定要删除该通知模版吗？"
                okText="确定"
                cancelText="取消"
                onConfirm={async () => {
                  let {modifyNotifyTemplates, reloadNotifyTemplates} = this.props
                  let res = await modifyNotifyTemplates([], prevArr => prevArr.filter(temp => temp.id !== id))

                  if (res && !_(res.resDelete).compact().isEmpty()) {
                    message.success('删除成功!')
                    await reloadNotifyTemplates()
                  }
                }}
              >
                <span className={classNames('mg1x pointer', {hide: !canEditNotifyTemplates})}>
                  <CloseCircleOutlined className="mg2x font16 color-grey pointer" />
                </span>
              </Popconfirm>
            </span>
          );
        }
      }
    ];
  }

  renderNotifyTemplatesTable() {
    let {notifyTemplates, isFetchingNotifyTemplates, alarmInterfaces} = this.props
    let {filterByInterfaceType, filterByKeyword} = this.state
    if (filterByInterfaceType) {
      let intfTypeIdDict = _([..._.values(SUGO_ALARMS_API_KEYS), ...(alarmInterfaces || [])])
        .keyBy('id')
        .mapValues(v => `${v.type}`)
        .value()
      notifyTemplates = notifyTemplates.filter(temp => intfTypeIdDict[temp.interface_id] === filterByInterfaceType)
    }
    if (filterByKeyword) {
      notifyTemplates = notifyTemplates.filter(c => smartSearch(filterByKeyword, c.name))
    }
    return (
      <div className="mg3x">
        <Table
          rowKey="id"
          bordered
          size="small"
          loading={isFetchingNotifyTemplates}
          columns={this.genTableCols()}
          dataSource={notifyTemplates}
        />
      </div>
    )
  }

  render() {

    return (
      <div>
        <Bread
          path={[{name: '通知模版管理'}]}
        />

        {this.renderFilterComps()}

        {this.renderNotifyTemplatesTable()}
      </div>
    )
  }
}
