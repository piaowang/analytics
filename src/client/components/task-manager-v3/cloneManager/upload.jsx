import React, { useState} from 'react'
import { Form } from '@ant-design/compatible'
import { RetweetOutlined, DownloadOutlined, InboxOutlined } from '@ant-design/icons'
import '@ant-design/compatible/assets/index.css'
import {
  Table,
  Button,
  Modal,
  Input,
  Upload,
  message,
  Select,
  Popconfirm,
  Switch
} from 'antd'
import LabelWithInput from '../../Common/labelWithInput'
import LabelWithTimePicker from '../../Common/labelWithTimePicker'
import { connect } from 'react-redux'
import { namespace } from './model'
import _ from 'lodash'
import HoverHelp from '../../Common/hover-help'
import moment from 'moment'

const { Option } = Select
const { Dragger } = Upload
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

function UploadPackage(props) {
  const { dispatch, form: { getFieldDecorator, validateFields, resetFields, getFieldValue }, uploadPackageList,
    projectList, categoryList, packageList, users } = props
  const [packageSearch, setPackageSearch] = useState('')
  const [authorSearch, setAuthorSearch] = useState('')
  const [timeSearch, setTimeSearch] = useState([])
  const [isImportModal, setIsImportModal] = useState(false)
  const [fileName, setFileName] = useState('')


  const importProps = {
    name: 'file',
    action: '/app/task-v3/upload-clone-package',
    accept: 'application/zip,application/x-zip,application/x-zip-compressed',
    onChange(info) {
      const { status } = info.file
      if (status === 'done') {
        message.success(`${info.file.name} 上传成功`)
        // const list = _.get(info, 'file.response.createdProjects').map(o => _.pick(o, ['id', 'showName']))
        setFileName(info.file.name)
      } else if (status === 'error') {
        message.error(`${info.file.name} 上传失败`)
      }
    }
  }

  function genColumns() {
    return [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name'
      }, {
        title: '上传人名称',
        dataIndex: 'first_name',
        key: 'first_name'
      }, {
        title: '上传时间',
        dataIndex: 'created_at',
        key: 'created_at',
        render: t => moment(t).format('YYYY-MM-DD HH:mm')
      }, {
        title: '工作流个数',
        dataIndex: 'task_ids',
        key: 'task_ids',
        render: t => t.split(',').length
      }, {
        title: '应用项目',
        dataIndex: 'projectName',
        key: 'projectName'
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
              {/* <a className="mg2r" onClick={() => setIsApplyModal(true)} >应用</a> */}
              <Popconfirm
                title="确定删除该已上传的克隆包吗？"
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

  function onReset() {
    setAuthorSearch('')
    setTimeSearch([])
    setPackageSearch([])
  }

  function onDel(r) {
    dispatch({
      type: `${namespace}/deleteClonePackage`,
      payload: { packageIds: r.id, type: 2 }
    })

  }

  function onImportPackage() {
    validateFields((err, vals) => {
      if (err) return
      if (!fileName) {
        return message.warn('请先上传克隆包')
      }
      dispatch({
        type: `${namespace}/importClonePackage`,
        payload: { ...vals, filename: fileName },
        callback: () => {
          resetFields()
          setIsImportModal(false)
          setFileName('')
        }
      })
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
      <div className="mg2b" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
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
            allowClear
            onChange={(v) => setTimeSearch(v)}
            value={timeSearch}
          />
          <Button type="primary" icon={<RetweetOutlined />} className="mg3l" onClick={() => onReset()} >重置</Button>
        </div>
        <Button type="primary" icon={<DownloadOutlined />} onClick={() => setIsImportModal(true)} >导入</Button>
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

      {
        isImportModal && <Modal
          width={600}
          title={'克隆包导入'}
          visible={isImportModal}
          onCancel={() => {
            setIsImportModal(false)
            resetFields()
            setFileName('')
          }}
          onOk={() => onImportPackage()}
        >
          <Dragger disabled={!!fileName} {...importProps} className="mg2b">
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或者拖拽文件到这个区域上传</p>
          </Dragger>

          <Form className="mg2t">
            <Form.Item {...FormItemLayout} label="克隆包名称">
              {getFieldDecorator('name', {
                rules: [{
                  required: true,
                  message: '请输入克隆包名称'
                }, {
                  pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9]+$/g,
                  message: '只能是数字、字母和中文组成!'
                }, {
                  max: 30,
                  message: '不应超过30个字符'
                }]
              })(<Input placehold="请输入克隆包名称" style={{ width: 300 }} />)
              }
            </Form.Item>
            <Form.Item {...FormItemLayout} label="应用项目">
              {getFieldDecorator('projectId', {
                rules: [{
                  required: true,
                  message: '请选择应用项目'
                }]
              })(
                <Select
                  optionFilterProp="children"
                  placehold="请选择应用项目"
                  showSearch style={{ width: 300 }}
                >
                  {projectList.map(o => {
                    return (
                      <Option value={o.id} key={o.id}>{o.name}</Option>
                    )
                  })}
                </Select>
              )
              }
            </Form.Item>
            <Form.Item
              {...FormItemLayout}
              label={(
                <HoverHelp
                  icon="question-circle-o"
                  addonBefore="是否覆盖更新 "
                  content="上传克隆包如果存在相同目录下已存在相同名称工作流，如果选择覆盖更新，那么上传克隆包直接覆盖该工作流，如果选择不覆盖更新，那么上传克隆包在对应目录下追加一个工作流，名称为_copy"
                />
              )}
            >
              {getFieldDecorator('isCover', {
                initialValue: false
              })(
                <Switch />
              )}
            </Form.Item>
            <Form.Item {...FormItemLayout} label="描述">
              {getFieldDecorator('desc', {
                rules: [{
                  max: 150,
                  message: '不应超过150个字符'
                }]
              })(<Input.TextArea placehold="请输入相关描述‘" autoSize={{ minRows: 3, maxRows: 5 }} style={{ width: 350 }} />)
              }
            </Form.Item>
          </Form>
        </Modal>}
    </React.Fragment>
  )
}

export default connect(props => ({ ...props[namespace], ...props['common'] }))(Form.create()(UploadPackage))
