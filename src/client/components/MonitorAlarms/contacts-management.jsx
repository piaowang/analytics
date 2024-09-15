import React from 'react'
import { CloseCircleOutlined, EditOutlined } from '@ant-design/icons';
import { Select, Button, Table, Popconfirm, message } from 'antd';
import Bread from '~/src/client/components/Common/bread.jsx'
import {synchronizer} from '~/src/client/components/Fetcher/synchronizer.js'
import DepartmentMgrDlg from './departments-mgr-dlg'
import ContactEditDlg from './contact-editor-dlg'
import _ from 'lodash'
import Search from '~/src/client/components/Common/search.jsx'
import {withDebouncedOnChange} from '~/src/client/components/Common/with-debounce-on-change.jsx'
import {checkPermission} from '~/src/client/common/permission-control.js'
import classNames from 'classnames'
import smartSearch from '../../../common/smart-search'

const InputWithDebouncedOnChange = withDebouncedOnChange(Search, ev => ev.target.value, 500)

const canEditContact = checkPermission('put:/app/contact/persons/:personId')
const canEditDepartments = checkPermission('put:/app/contact/departments/:id')

@synchronizer(() => {
  return ({
    url: '/app/contact/departments',
    modelName: 'departments',
    doFetch: true,
    doSync: true
  })
})
@synchronizer(() => {
  return ({
    url: '/app/contact/persons',
    modelName: 'contacts',
    doFetch: true,
    doSync: true
  })
})
export default class ContactsManagement extends React.Component {
  state = {
    visiblePopoverKey: null,
    filterByDepartmentId: null,
    filterByKeyword: null,
    editingContactId: null
  }

  renderFilterComps() {
    let {departments, modifyDepartments, reloadDepartments, contacts, modifyContacts, reloadContacts} = this.props
    let {filterByDepartmentId, visiblePopoverKey, editingContactId, filterByKeyword} = this.state

    return (
      <div className="fix">
        <div className="mg3x mg2y">
          <div className="itblock mg1l">
            <span className="mg2r">所属部门</span>
            <Select
              dropdownMatchSelectWidth={false}
              className="mg2r"
              style={{ minWidth: 200 }}
              value={filterByDepartmentId || ''}
              onChange={val => {
                this.setState({filterByDepartmentId: val})
              }}
            >
              <Select.Option key="none" value="">全部</Select.Option>
              {(departments || []).map(dep => {
                return (
                  <Select.Option
                    key={dep.id}
                    value={dep.id}
                  >
                    {dep.name}
                  </Select.Option>
                )
              })}
            </Select>

            <InputWithDebouncedOnChange
              className="itblock width200 mg2r"
              placeholder="搜索联系人姓名，手机或邮件"
              value={filterByKeyword}
              onChange={val => {
                this.setState({filterByKeyword: val})
              }}
            />

            <Button
              type="primary"
              className={classNames({hide: !canEditContact})}
              onClick={() => {
                this.setState({visiblePopoverKey: 'alarm-contacts-management-dialog'})
              }}
            >创建联系人</Button>
          </div>
          <span className="fright">
            <Button
              type="default"
              className={classNames({hide: !canEditDepartments})}
              onClick={() => {
                this.setState({visiblePopoverKey: 'departments-management-dialog'})
              }}
            >部门管理</Button>
          </span>
        </div>

        <ContactEditDlg
          departments={departments}
          visible={visiblePopoverKey === 'alarm-contacts-management-dialog'}
          onCancel={() => this.setState({visiblePopoverKey: null, editingContactId: null})}
          value={editingContactId && _.find(contacts, {id: editingContactId}) || undefined}
          onChange={async newContact => {
            if (editingContactId) {
              let idx = _.findIndex(contacts, {id: editingContactId})
              await modifyContacts([idx], prev => ({...prev, ...newContact}))
            } else {
              await modifyContacts([], prevArr => [...(prevArr || []), newContact])
            }
            await reloadContacts()
          }}
        />

        <DepartmentMgrDlg
          departments={departments}
          modifyDepartments={modifyDepartments}
          reloadDepartments={reloadDepartments}
          visible={visiblePopoverKey === 'departments-management-dialog'}
          onCancel={() => this.setState({visiblePopoverKey: null, editingContactId: null})}
        />

      </div>
    )
  }

  genTableCols() {
    let {departments} = this.props
    let depIdDict = _.keyBy(departments, 'id')
    return [
      {
        title: '接收人名称',
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: '所属部门',
        dataIndex: 'department_id',
        key: 'department_id',
        render: depId => {
          return _.get(depIdDict, [depId, 'name'])
        }
      },
      {
        title: '手机号码',
        dataIndex: 'phone',
        key: 'phone'
      },
      {
        title: '邮件地址',
        dataIndex: 'email',
        key: 'email'
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'id',
        render: (id, rec) => {
          return (
            <span>
              <span
                className={classNames('mg1x pointer', {hide: !canEditContact})}
                onClick={() => {
                  this.setState({
                    visiblePopoverKey: 'alarm-contacts-management-dialog',
                    editingContactId: id
                  })
                }}
              >
                <EditOutlined className="font16 color-grey pointer" />
              </span>
              <Popconfirm
                placement="left"
                title="确定要删除该接收人吗？"
                okText="确定"
                cancelText="取消"
                onConfirm={async () => {
                  let {modifyContacts, reloadContacts} = this.props
                  let res = await modifyContacts([], prevArr => prevArr.filter(temp => temp.id !== id))
                  if (res && !_(res.resDelete).compact().isEmpty()) {
                    message.success('删除成功!')
                    await reloadContacts()
                  }
                }}
              >
                <span className={classNames('mg1x pointer', {hide: !canEditContact})}>
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
    let {contacts, isFetchingContacts} = this.props
    let {filterByKeyword, filterByDepartmentId} = this.state
    if (filterByDepartmentId) {
      contacts = contacts.filter(c => c.department_id === filterByDepartmentId)
    }
    if (filterByKeyword) {
      contacts = contacts.filter(c => {
        return smartSearch(filterByKeyword, c.name)
          || smartSearch(filterByKeyword, c.phone)
          || smartSearch(filterByKeyword, c.email)
      })
    }
    return (
      <div className="mg3x">
        <Table
          rowKey="id"
          bordered
          loading={isFetchingContacts}
          size="small"
          columns={this.genTableCols()}
          dataSource={contacts}
        />
      </div>
    )
  }

  render() {

    return (
      <div>
        <Bread
          path={[{name: '联系人管理'}]}
        />

        {this.renderFilterComps()}

        {this.renderNotifyTemplatesTable()}
      </div>
    )
  }
}
