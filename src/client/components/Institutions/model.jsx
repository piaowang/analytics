import React from 'react'
import _ from 'lodash'
import PropTypes from 'prop-types'
import { Auth } from '../../common/permission-control'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { DeleteOutlined, PlusCircleOutlined, SearchOutlined, SelectOutlined } from '@ant-design/icons'
import { Button, Select, Input, Table, Popconfirm, Modal, message, Tooltip, Tag } from 'antd'
import moment from 'moment'
import { browserHistory } from 'react-router'
let enableDataChecking = _.get(window.sugo, 'enableDataChecking', false)

const { Item: FItem } = Form
const { Option } = Select

const MyModal = ({
  create = () => {},
  editor = () => {},
  institutionsList = [],
  loading,
  id,
  showModal,
  hideModal,
  visible = false,
  add,
  deleteData,
  updateCheckFn,
  users,
  showImportModal,
  roles,
  form: { getFieldDecorator, validateFields, resetFields, setFieldsValue, getFieldValue }
}) => {
  const [expandKey, setExpandKey] = React.useState([])
  const [lowerLevel, setLowerLevel] = React.useState(false)
  const [institutionData, setInstitutionData] = React.useState({})
  const [selectValue, setSelectValue] = React.useState(undefined)
  const [inputValue, setInputValue] = React.useState('')
  let [select, setSelect] = React.useState(institutionsList)
  let [roleList, setRoleList] = React.useState([])
  let [roleVisible, setRoleVisible] = React.useState(false)
  let [showUserList, setShowUserList] = React.useState(false)
  let [newableData, setTableData] = React.useState([])

  React.useEffect(() => {
    setSelectValue(undefined)
    setInputValue('')
    setSelect(institutionsList)
  }, [id, institutionsList])

  React.useEffect(() => {
    setExpandKey([id])
    setTableData([])
  }, [id])

  const submit = (num = -1) => {
    validateFields((err, value) => {
      if (err) {
        return message.warning('提交失败,请重新填写')
      }
      setLowerLevel(false)
      setInstitutionData({})
      hideModal()

      if (value.id) {
        let institutionsData = _.find(institutionsList, { id: value.id })
        let newInstitutionsData = {}
        Object.keys(value).map(key => {
          if (key === 'description') {
            newInstitutionsData[key] = _.isEmpty(institutionsData[key]) ? '' : institutionsData[key]
          } else {
            newInstitutionsData[key] = 'serial_number' === key ? institutionsData['serialNumber'] : institutionsData[key]
          }
        })
        if (_.isEqual(newInstitutionsData, value)) {
          resetFields()
          return message.info('没有内容修改，无需提交')
        }
        let type = institutionsData.checking.checkStatus === 1 ? { status: 0, operationType: 2 } : { status: num, operationType: 1 }
        value = {
          ...value,
          checkData: type
        }
        editor({ ...value, checkData: type })
      } else {
        create({ ...value, checkStatus: num })
      }
      resetFields()
    })
  }
  const search = () => {
    let newInstitutionsList = _.cloneDeep(institutionsList)

    newInstitutionsList = newInstitutionsList.map(item => {
      if (inputValue) {
        item = (item.serialNumber && item.serialNumber.includes(inputValue)) || item.name.includes(inputValue) ? item : ''
      }
      if (_.isEmpty(item)) {
        return ''
      }
      switch (item.checking && item.checking.checkStatus) {
        case -1:
          return '未提交'
        case 0:
          return '待审核'
        case 1:
          return '正常'
        case 2:
          return '未提交'
      }
    })
    newInstitutionsList = _.compact(newInstitutionsList)

    if (inputValue || selectValue) {
      let data = []
      let selectMap = {}
      newInstitutionsList.map(item => {
        selectMap[item.id] = {
          ...item,
          ...(item.checking || {})
        }
        return item
      })
      let institutionsListMap = {}
      institutionsList.map(item => {
        institutionsListMap[item.id] = {
          ...item,
          ...(item.checking || {})
        }
        return item
      })
      if (selectMap[id])
        data.push({
          ...(institutionsListMap[id] || {}),
          key: id,
          parentName: (institutionsListMap[id] && institutionsListMap[institution.parent] && institutionsListMap[institutionsListMap[id].parent].name) || ''
        })
      const findAll = function (institutionsList = [], parentId = '') {
        institutionsList
          .filter(item => item.parent === parentId)
          .map(item => {
            if (selectMap[item.id]) {
              data.push({
                ...item,
                ...(item.checking || {}),
                key: item.id,
                parentName: (institutionsListMap[item.parent] && institutionsListMap[item.parent].name) || '',
                children: findAll(institutionsList, item.id)
              })
            }
            return item
          })
        return []
      }
      findAll(institutionsList, id)
      setTableData(data)
    } else {
      setTableData([])
    }
    setSelect(_.compact(newInstitutionsList))
  }

  const roleListDom = () => {
    let rolesMap = {}
    roles.map(r => {
      rolesMap[r.id] = r.name
      return r
    })
    return (
      <Modal
        title={showUserList ? '关联用户' : '关联角色'}
        footer={null}
        visible={roleVisible}
        onCancel={() => {
          setRoleVisible(false)
        }}
      >
        <div className='user-box-list'>
          {roleList.map((val, index) => {
            return (
              <Tag key={index} color='blue'>
                {showUserList ? val : rolesMap[val]}
              </Tag>
            )
          })}
        </div>
      </Modal>
    )
  }

  let data = {}
  let disabled = false

  let tableData = []
  let institutionsListMap = {}
  institutionsList.map(item => {
    institutionsListMap[item.id] = {
      ...item,
      ...(item.checking || {})
    }
    return item
  })
  let institution = institutionsListMap[id]
  const findChildren = function (select = [], parentId = '') {
    return select
      .filter(item => item.parent === parentId)
      .map(item => {
        return {
          ...item,
          ...(item.checking || {}),
          key: item.id,
          parentName: (institutionsListMap[item.parent] && institutionsListMap[item.parent].name) || '',
          children: findChildren(select, item.id)
        }
      })
  }
  let children = findChildren(select, id)
  tableData[0] = {
    ...(institution || {}),
    key: id,
    parentName: (institution && institutionsListMap[institution.parent] && institutionsListMap[institution.parent].name) || '',
    children: children
  }
  if (!_.find(select, { id })) {
    tableData = []
  }
  let columns = [
    {
      title: '机构编号',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      elli: true
    },
    {
      title: '机构名称',
      dataIndex: 'name',
      key: 'name',
      width: 100
    },
    {
      title: '机构层级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: function level(val, record) {
        return record.level ? <div>{toChinesNum(record.level)}层</div> : <div>无</div>
      }
    },
    {
      title: '上级机构',
      dataIndex: 'parentName',
      key: 'parentName',
      width: 100
    },
    {
      title: '启用状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: function available(val, record) {
        return record.status === 1 ? <div>启用</div> : <div>禁用</div>
      }
    },
    // {
    //   title: '是否可用',
    //   dataIndex: 'available',
    //   key: 'available',
    //   render: function available(val, record){
    //     let string = !_.isEmpty(record.hasId) ? '可用' : record.checking.checkStatus === 1 ? '可用' : '不可用'
    //     return <div>{string}</div>
    //   }
    // },
    {
      title: '所属用户',
      dataIndex: 'userIds',
      key: 'userIds',
      width: 110,
      render: function available(val = [], record) {
        if (val.length === 0) return <div>暂无关联用户</div>
        return (
          <Tooltip placement='topLeft' title='查看用户'>
            <a
              onClick={() => {
                setRoleList(val)
                setShowUserList(true)
                setRoleVisible(true)
              }}
            >
              {val.length}(查看用户)
            </a>
          </Tooltip>
        )
      }
    },
    {
      title: '所属角色',
      dataIndex: 'roleIds',
      key: 'roleIds',
      width: 110,
      render: function available(val = [], record) {
        if (val.length === 0) return <div>暂无关联角色</div>
        return (
          <Tooltip placement='topLeft' title='查看角色'>
            <a
              onClick={() => {
                setRoleList(val)
                setShowUserList(false)
                setRoleVisible(true)
              }}
            >
              {val.length}(查看角色)
            </a>
          </Tooltip>
        )
      }
    },
    {
      title: '审核状态',
      dataIndex: 'checkStatus',
      key: 'checkStatus',
      width: 110,
      render: function checkStatus(val, record) {
        let string = ''
        switch (val) {
          case -1:
            string = <Tag color='red'>未提交</Tag>
            break
          case 0:
            if (record.operationType === 1) {
              string = <Tag color='#f90'>新增待审核</Tag>
            } else if (val.operationType === 2) {
              string = <Tag color='#f80'>编辑待审核</Tag>
            } else {
              string = <Tag color='#f50'>删除待审核</Tag>
            }
            break
          case 1:
            string = <Tag color='#87d068'>正常</Tag>
            break
          case 2:
            string = <Tag color='red'>已拒绝</Tag>
            break
          default:
            break
        }
        return <div>{string}</div>
      }
    },
    {
      title: '最近更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 130,
      render: function time(val) {
        return <div>{moment(val).format('YYYY-MM-DD HH:mm:ss')}</div>
      }
    },
    {
      title: '更新人',
      dataIndex: 'updated_by',
      key: 'updated_by',
      width: 130,
      render: function updatedBy(val) {
        let user = _.find(users, { id: val })
        return <div>{_.get(user, 'first_name', val)}</div>
      }
    },
    {
      title: '操作',
      dataIndex: 'id',
      key: 'op',
      width: 200,
      render: function action(val, record) {
        if (!enableDataChecking) {
          return (
            <React.Fragment>
              {id && record.status === 1 ? (
                <Auth auth='post:/app/institutions/create'>
                  <span
                    className='color-blue mg2r pointer'
                    onClick={() => {
                      let institution = institutionsListMap[record.id]
                      showModal()
                      setLowerLevel(true)
                      add()
                      // setInstitutionData({...institutionData,parent: institution && institution.id , level: institution && institution.level + 1})
                      setFieldsValue({
                        parent: institution && institution.id,
                        level: institution && institution.level + 1
                      })
                    }}
                  >
                    新建下级机构
                  </span>
                </Auth>
              ) : null}
              <Auth auth='post:/app/institutions/editor'>
                <span
                  className='color-blue mg2r pointer'
                  onClick={() => {
                    showModal()
                    setInstitutionData(institutionsListMap[record.id])
                  }}
                >
                  修改
                </span>
              </Auth>
              <Auth auth='post:/app/institutions/delete'>
                <Popconfirm
                  title='您确定删除吗'
                  onConfirm={() => {
                    if (_.find(institutionsList, { parent: record.id })) return message.warning('请先删除子节点')
                    deleteData({ id: record.id }, institution && institution.id === record.id)
                  }}
                >
                  <a className='color-blue mg2r pointer'>删除</a>
                </Popconfirm>
              </Auth>
            </React.Fragment>
          )
        }
        const dom = (
          <React.Fragment>
            {record.checking.checkStatus === -1 || record.checking.checkStatus === 1 ? (
              <Auth auth='post:/app/institutions/editor'>
                <a
                  className='color-blue mg2r pointer'
                  onClick={() => {
                    showModal()
                    setInstitutionData(institutionsListMap[record.id])
                  }}
                >
                  修改
                </a>
              </Auth>
            ) : null}

            {record.checking.checkStatus === -1 || record.checking.checkStatus === 1 ? (
              <Auth auth='post:/app/institutions/delete'>
                <Popconfirm
                  title='您确定删除吗'
                  onConfirm={() => {
                    if (_.find(institutionsList, { parent: record.id })) return message.warning('请先删除子节点')
                    deleteData({ id: record.id }, institution && institution.id === record.id)
                  }}
                >
                  <a className='color-blue mg2r pointer'>删除</a>
                </Popconfirm>
              </Auth>
            ) : null}
            {record.checking.checkStatus === -1 && (
              <a
                className='color-blue mg2r pointer'
                onClick={() => {
                  updateCheckFn({ id: record.id, status: 0 })
                }}
              >
                提交审核
              </a>
            )}
            {record.checking.checkStatus === 0 && (
              <a
                onClick={() => {
                  updateCheckFn({ id: record.id, status: -1 })
                }}
                className='color-blue mg2r pointer'
              >
                撤销
              </a>
            )}
            {record.checking.checkStatus === 1 && (
              <a
                className='color-blue mg2r pointer'
                onClick={() => {
                  browserHistory.push('/console/institutions-details/' + record.id + '?backId=' + id)
                }}
              >
                查看详情
              </a>
            )}
          </React.Fragment>
        )
        return (
          <div>
            {id && record.checking.checkStatus === 1 && record.status === 1 ? (
              <span
                className='color-blue mg2r pointer'
                onClick={() => {
                  let institution = institutionsListMap[record.id]
                  showModal()
                  setLowerLevel(true)
                  add()
                  // setInstitutionData({...institutionData,parent: institution && institution.id , level: institution && institution.level + 1})
                  setFieldsValue({
                    parent: institution && institution.id,
                    level: institution && institution.level + 1
                  })
                }}
              >
                新建下级机构
              </span>
            ) : null}
            {dom}
          </div>
        )
      }
    }
  ]

  if (!enableDataChecking) {
    columns = columns.filter(item => {
      return item.key !== 'available' && item.key !== 'checkStatus' && item.key !== 'updated_by'
    })
  }
  return (
    <div className='width-100 height-100'>
      {roleListDom()}
      <Modal
        maskClosable='false'
        footer=''
        visible={visible}
        onOk={() => {
          hideModal()
          setLowerLevel(false)
        }}
        onCancel={() => {
          hideModal()
          setInstitutionData({})
          setLowerLevel(false)
          resetFields()
        }}
      >
        <div className='width-100 height-100'>
          <Form>
            {institutionData.id ? (
              <FItem label='id' style={{ display: 'none' }}>
                {getFieldDecorator('id', {
                  initialValue: institutionData.id
                })(<Input />)}
              </FItem>
            ) : null}
            <FItem label='机构编号' labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
              {getFieldDecorator('serial_number', {
                initialValue: institutionData.serialNumber || undefined,
                rules: [
                  {
                    required: true,
                    max: 15,
                    message: '机构编号不能为空不能重复且不超过15 个字符!',
                    validator: (rule, value, callback) => {
                      let data = institutionData.id ? institutionsList.filter(i => i.id !== institutionData.id) : institutionsList
                      if (_.find(data, { serialNumber: value }) || !value || value.length > 15) {
                        callback('机构编号已经存在')
                      }
                      if (!_.trim(value)) return callback('机构编号不能为空')
                      callback()
                    }
                  }
                ]
              })(<Input disabled={disabled} />)}
            </FItem>
            <FItem label='机构层级' labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
              {getFieldDecorator('level', {
                initialValue: institutionData.level || undefined,
                rules: [
                  {
                    required: true,
                    message: '机构层级不能为空!'
                  }
                ]
              })(
                <Select
                  getPopupContainer={triggerNode => triggerNode.parentNode}
                  disabled={!_.isEmpty(institutionData) || lowerLevel}
                  onChange={() => {
                    setFieldsValue({ parent: '' })
                  }}
                >
                  {_.range(20).map(i => (
                    <Option key={i + 1} value={i + 1}>
                      {toChinesNum(i + 1)}层
                    </Option>
                  ))}
                </Select>
              )}
            </FItem>
            <FItem label='上级机构' labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
              {getFieldDecorator('parent', {
                initialValue: institutionData.parent || '',
                rules: [
                  {
                    required: (getFieldValue('level') || institutionData.level) !== 1,
                    message: '上层机构不能为空'
                  }
                ]
              })(
                <Select getPopupContainer={triggerNode => triggerNode.parentNode} disabled={(getFieldValue('level') || institutionData.level) === 1 || lowerLevel}>
                  {institutionsList
                    .filter(
                      ({ level: l, checking, status }) =>
                        (enableDataChecking ? checking.checkStatus === 1 : true) && status === 1 && l === (getFieldValue('level') || institutionData.level) - 1
                    )
                    .map(({ id, name }) => (
                      <Option key={id} value={id}>
                        {name}
                      </Option>
                    ))}
                </Select>
              )}
            </FItem>
            <FItem label='机构名称' labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
              {getFieldDecorator('name', {
                initialValue: institutionData.name || undefined,
                rules: [
                  {
                    required: true,
                    max: 15,
                    message: '机构名称不能为空不能重复且不超过15个字符!',
                    validator: (rule, value, callback) => {
                      let data = institutionData.id ? institutionsList.filter(i => i.id !== institutionData.id) : institutionsList
                      const pId = getFieldValue('parent')
                      const parent = data.filter(val => val.parent === pId)
                      if (_.find(parent, { name: value }) || !value || value.length > 15) {
                        callback('机构名称已经存在')
                      }
                      if (!_.trim(value)) return callback('机构名称不能为空')
                      callback()
                    }
                  }
                ]
              })(<Input disabled={disabled} />)}
            </FItem>
            <FItem label='机构状态' labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
              {getFieldDecorator('status', {
                initialValue: institutionData.status,
                rules: [
                  {
                    required: true,
                    message: '机构状态不能为空!'
                  }
                ]
              })(
                <Select getPopupContainer={triggerNode => triggerNode.parentNode} onChange={() => {}}>
                  <Option key={1} value={1}>
                    启用
                  </Option>
                  <Option key={2} value={2}>
                    禁用
                  </Option>
                </Select>
              )}
            </FItem>
            {/*<FItem label="关联角色" labelCol={{span: 4}} wrapperCol={{span: 18}}>
              {getFieldDecorator('roleIds', {
                initialValue: data.roleIds || []
              })(<RoleSelect roles={roles} />)}
            </FItem>*/}
            <FItem label='备注' labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
              {getFieldDecorator('description', {
                initialValue: institutionData.description || ''
              })(<Input />)}
            </FItem>
          </Form>
          <div className='aligncenter width-100'>
            <Button
              className='mg2r'
              loading={loading}
              onClick={() => {
                hideModal()
                setInstitutionData({})
                setLowerLevel(false)
                resetFields()
              }}
            >
              取消
            </Button>
            {enableDataChecking && institutionData && institutionData?.checking?.checkStatus ? (
              <Button
                className='mg2r'
                loading={loading}
                type='success'
                onClick={() => {
                  submit(-1)
                }}
              >
                保存
              </Button>
            ) : null}
            <Auth auth='post:/app/institutions/create'>
              <Button
                loading={loading}
                type='primary'
                onClick={() => {
                  submit(0)
                }}
                style={{ marginRight: '18px' }}
              >
                提交
              </Button>
            </Auth>

            {/*<Button loading={loading}  type="danger" onClick={cancel}>重置</Button>*/}
          </div>
        </div>
      </Modal>
      <div className='mg2b'>
        <div className='iblock flight'>
          {enableDataChecking ? (
            <Select
              showSearch
              style={{ width: 200, marginRight: '16px' }}
              placeholder='选择审核状态'
              onChange={value => {
                setSelectValue(value)
              }}
              optionFilterProp='children'
              value={selectValue}
              filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
            >
              <Option value='0'>正常</Option>
              <Option value='1'>未提交</Option>
              <Option value='2'>新增待审核</Option>
              <Option value='3'>修改待审核</Option>
              <Option value='4'>删除待审核</Option>
            </Select>
          ) : null}
          <Input
            className='mg2r'
            style={{ width: 200 }}
            placeholder='请输入机构代码/名称'
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value)
            }}
          />
          <Button className='mg2r' type='primary' icon={<SearchOutlined />} onClick={search}>
            搜索
          </Button>
          <Button
            icon={<DeleteOutlined />}
            onClick={() => {
              setSelectValue(undefined)
              setInputValue('')
              setSelect(institutionsList)
            }}
          >
            清空
          </Button>
        </div>
        <div className='iblock fright'>
          <Auth auth='post:/app/institutions/create'>
            <Button
              type='primary'
              className='mg2r'
              icon={<PlusCircleOutlined />}
              onClick={() => {
                showModal()
                add()
              }}
            >
              新增机构
            </Button>
          </Auth>
          <Auth auth='post:/app/uploaded-files/upload'>
            {!enableDataChecking ? (
              <Button onClick={showImportModal} icon={<SelectOutlined />}>
                导入
              </Button>
            ) : null}
          </Auth>
        </div>
      </div>

      <Table
        expandedRowKeys={expandKey}
        columns={columns}
        onExpandedRowsChange={expandedRows => {
          setExpandKey(expandedRows)
        }}
        defaultPageSize={10}
        dataSource={_.isEmpty(newableData) ? tableData : newableData}
        pagination
      />
    </div>
  )
}

MyModal.propTypes = {
  modelType: PropTypes.string,
  create: PropTypes.func,
  editor: PropTypes.func,
  institutions: PropTypes.object,
  institutionsList: PropTypes.array,
  roles: PropTypes.array,
  parent: PropTypes.string,
  loading: PropTypes.bool,
  form: PropTypes.object,
  id: PropTypes.string
}

export default Form.create()(MyModal)

let toChinesNum = num => {
  let changeNum = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  let unit = ['', '十', '百', '千', '万']
  num = parseInt(num)
  let getWan = temp => {
    let strArr = temp.toString().split('').reverse()
    let newNum = ''
    for (var i = 0; i < strArr.length; i++) {
      newNum = (i === 0 && strArr[i] === 0 ? '' : i > 0 && strArr[i] === 0 && strArr[i - 1] == 0 ? '' : changeNum[strArr[i]] + (strArr[i] === 0 ? unit[0] : unit[i])) + newNum
    }
    return newNum
  }
  let overWan = Math.floor(num / 10000)
  let noWan = num % 10000
  if (noWan.toString().length < 4) {
    noWan = '0' + noWan
  }
  return overWan ? getWan(overWan) + '万' + getWan(noWan) : getWan(num)
}
