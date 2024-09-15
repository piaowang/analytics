import React, { useState } from 'react'
import { RetweetOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Table, Button, Modal, Input, Popconfirm } from 'antd';
import LabelWithInput from '../../Common/labelWithInput'
import LabelWithTimePicker from '../../Common/labelWithTimePicker'
import { connect } from 'react-redux'
import {namespace } from './model'
import  moment from 'moment'
import _ from 'lodash'

const FormItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 6 }
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 18 }
  }
}

function ShowPackage(props) {
  const {dispatch, form: { getFieldDecorator, validateFields, resetFields }, packageList, users } = props
  const [packageSearch, setPackageSearch] = useState('')
  const [authorSearch, setAuthorSearch] = useState('')
  const [timeSearch, setTimeSearch] = useState('')

 

  function genColumns() {
    return [
      {
        title: '克隆包名称',
        dataIndex: 'name',
        key: 'name'
      }, {
        title: '克隆人名称',
        dataIndex: 'first_name',
        key: 'first_name'
      }, {
        title: '克隆时间',
        dataIndex: 'created_at',
        key: 'created_at',
        render: t => moment(t).format('YYYY-MM-DD HH:mm')
      }, {
        title: '工作流个数',
        dataIndex: 'task_ids',
        key: 'task_ids',
        render: t => t.split(',').length
      }, {
        title: '描述',
        dataIndex: 'desc',
        key: 'desc',
        width: 350
      }, {
        title: '操作',
        dataIndex: 'action',
        key: 'action',
        render: (t, r) => {
          return (
            <div>
              <a
                href={`/app/task-v3/download-clone-package?ids=${r.task_ids}&name=${r.name}`}
                className="mg2r"
              >下载</a>
              <Popconfirm
                title="确定删除该克隆包吗？"
                onConfirm={() => onDel(r)}
              >
                <a className="mg2r" >删除</a>
              </Popconfirm>
            </div>
          )
        }
      }
    ]
  }

  function onDowload(r) {
    dispatch({
      type: `${namespace}/onDownload`,
      payload: {ids: r.task_ids, name: r.name}
    })
  }

  function onReset() {
    setAuthorSearch('')
    setTimeSearch([])
    setPackageSearch([])
  }


  function onDel(r) {
    dispatch({
      type: `${namespace}/deleteClonePackage`,
      payload: {packageIds: r.id, type: 1 }
    })
  }

  const keyByUsers = _.keyBy(users, 'id')
  packageList.forEach(o => o.first_name = _.get(keyByUsers, `${o.created_by}.first_name`, ''))
  let filterList = packageList.filter(o => {
    return (o.name || '').includes(packageSearch) && (o.first_name || '').includes(authorSearch)
  })
  if (timeSearch && timeSearch.length) {
    let [start, end] = timeSearch
    start = moment(start).startOf('d')
    end = moment(end).endOf('d')
    filterList = filterList.filter(o => moment(o.created_at).isBetween(start, end))
  }

  return (
    <React.Fragment>
      <div className="mg2b" style={{}}>
        <LabelWithInput
          label="克隆包名称: "
          onChange={(e) => setPackageSearch(e.target.value)}
          value={packageSearch}
        />
        <LabelWithInput
          label="创建人: "
          labelClassName="mg2l"
          onChange={(e) => setAuthorSearch(e.target.value)}
          value={authorSearch}
        />
        <LabelWithTimePicker
          label="时间:"
          labelClassName="mg2l"
          onChange={(v) => setTimeSearch(v)}
          value={timeSearch}
        />
        <Button type="primary" icon={<RetweetOutlined />}  className="mg3l" onClick={() => onReset()} >重置</Button>
      </div>
      <div>
        <Table
          rowKey="id"
          bordered
          dataSource={filterList}
          columns={genColumns()}
          pagination={{
            total: filterList.length,
            showSizeChanger: true,
            defaultPageSize: 10,
            showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`
          }}
        />
      </div>
    </React.Fragment>
  );
}

export default connect(props => ({...props[namespace], ...props['common']}))(Form.create()(ShowPackage))
