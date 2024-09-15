import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Modal, Tabs, Table, Button, message, Popconfirm, Radio, Input, Row, Col } from 'antd'
import UserPick from '../user-pick'
import DataSource from './data-source'
import { TASK_PROJECT_USER_ROLE_TYPE, TASK_PROJECT_USER_ROLE_TYPE_TRANSLATE } from '../constants'

const { TabPane } = Tabs

let Member = props => {
  const {
    dispatch,
    project,
    usermapping,
    users = [],
    form: { getFieldDecorator, validateFields, resetFields },
    updateTimes
  } = props

  const [visible, setVisible] = React.useState(false)
  const [userList, setUserList] = React.useState(users)
  const [dataSource, setDataSource] = React.useState([])
  const [editUser, setEditUser] = React.useState({})
  const [showRoleSetting, setShowRoleSetting] = React.useState(false)

  React.useEffect(() => {
    if (users.length) {
      const userIds = usermapping.map(({ user_id }) => user_id) // 已经映射过的用户的id
      const userMap = _.keyBy(
        users.filter(p => userIds.includes(p.id)),
        p => p.id
      )
      const _dataSource = usermapping.map(p => {
        const { first_name, cellphone, email } = userMap[p.user_id]
        return {
          id: p.id,
          first_name,
          cellphone,
          email,
          user_id: p.user_id,
          role_type: p.role_type
        }
      })
      setDataSource(_dataSource)
      // 把映射过的用户剔除，不用重新映射
      const _userList = users.filter(({ id }) => !userIds.includes(id))
      setUserList(_userList)
    }
  }, [users.length, usermapping.length, updateTimes])

  const addUser = () => {
    validateFields((err, value) => {
      if (err) {
        return
      }
      const { user_id } = value
      dispatch({
        type: 'TaskProjectModel/taskProjectMappingUser',
        payload: {
          data: {
            user_id,
            project_id: project.id
          },
          callback: err => {
            if (err) {
              message.error('添加成员失败')
            }
            resetFields(user_id)
            setVisible(false)
          }
        }
      })
    })
  }

  const changeRoleType = () => {
    dispatch({
      type: 'TaskProjectModel/editTaskProjectUser',
      payload: {
        data: {
          id: editUser.id,
          role_type: editUser.role_type
        },
        projectId: project.id,
        updateTimes
      },
      callback: () => setShowRoleSetting(false)
    })
  }

  const columns = () => {
    return [
      {
        title: '用户名',
        width: '15%',
        dataIndex: 'first_name'
      },
      {
        title: '手机号码',
        dataIndex: 'cellphone'
      },
      {
        title: '邮箱',
        dataIndex: 'email'
      },
      {
        title: '角色',
        dataIndex: 'role_type',
        render: v =>
          _.get(
            TASK_PROJECT_USER_ROLE_TYPE_TRANSLATE,
            _.findKey(TASK_PROJECT_USER_ROLE_TYPE, p => p === v)
          )
      },
      {
        title: '操作',
        width: 120,
        dataIndex: 'op',
        // eslint-disable-next-line react/display-name
        render: (obj, row) => (
          <div>
            <a
              type='link'
              onClick={() => {
                setShowRoleSetting(true)
                setEditUser(row)
              }}
            >
              授权
            </a>

            <Popconfirm
              title='确定要删除该用户吗'
              onConfirm={() => {
                dispatch({
                  type: 'TaskProjectModel/taskProjectDeleteUser',
                  payload: {
                    data: {
                      id: row.id,
                      project_id: project.id
                    },
                    callback: err => {
                      if (err) {
                        message.error('删除成员失败')
                      }
                      resetFields()
                      setVisible(false)
                    }
                  }
                })
              }}
              okText='删除'
              cancelText='取消'
            >
              <a type='link' className='mg2l'>
                删除
              </a>
            </Popconfirm>
          </div>
        )
      }
    ]
  }

  return (
    <React.Fragment>
      <div className='pd2b'>
        <Button onClick={() => setVisible(true)}>添加用户</Button>
      </div>
      <Table rowKey='id' size='middle' bordered dataSource={dataSource} columns={columns()} pagination={false} />
      <Modal title={'添加项目成员'} width={480} visible={visible} onCancel={() => setVisible(false)} onOk={addUser}>
        <Form>
          <Form.Item>
            {getFieldDecorator('user_id', {
              rules: [
                {
                  required: true,
                  message: '至少添加一个项目成员'
                }
              ],
              initialValue: []
            })(<UserPick users={userList} />)}
          </Form.Item>
        </Form>
      </Modal>
      {showRoleSetting ? (
        <Modal title={'设置用户权限'} width={480} visible={showRoleSetting} onCancel={() => setShowRoleSetting(false)} onOk={changeRoleType}>
          <Row>
            <Col span={5} className='pd1r alignright' style={{ lineHeight: '32px', fontWeight: 900 }}>
              用户：
            </Col>
            <Col span={17}>
              <Input disabled value={_.get(editUser, 'first_name')} />
            </Col>
          </Row>

          <Row className='pd2t'>
            <Col span={5} className='pd1r alignright' style={{ lineHeight: '32px', fontWeight: 900 }}>
              用户角色：
            </Col>
            <Col span={17}>
              <Radio.Group defaultValue={_.get(editUser, 'role_type', 0)} onChange={v => setEditUser({ ...editUser, role_type: v.target.value })}>
                {_.keys(TASK_PROJECT_USER_ROLE_TYPE).map(p => {
                  return (
                    <Radio.Button value={TASK_PROJECT_USER_ROLE_TYPE[p]} key={`rd_${p}`}>
                      {TASK_PROJECT_USER_ROLE_TYPE_TRANSLATE[p]}
                    </Radio.Button>
                  )
                })}
              </Radio.Group>
            </Col>
          </Row>
        </Modal>
      ) : null}
    </React.Fragment>
  )
}
Member.propTypes = {
  form: PropTypes.any,
  visible: PropTypes.bool,
  project: PropTypes.any,
  usermapping: PropTypes.array,
  users: PropTypes.array,
  setVisible: PropTypes.func,
  dispatch: PropTypes.func,
  getUsers: PropTypes.func,
  updateTimes: PropTypes.any
}

Member = Form.create()(Member)

const ConfigureModal = props => {
  const { usermapping = [], users = [], dispatch, visible, cancel, project, updateTimes } = props

  const [activeKey, setActiveKey] = React.useState('member')

  React.useEffect(() => {
    if (project.id) {
      dispatch({
        type: 'TaskProjectModel/getMappingUser',
        payload: {
          data: { id: project.id }
        }
      })
    }
    setActiveKey('member')
  }, [project.id])

  return (
    <Modal width={'60%'} title={null} footer={null} visible={visible} onCancel={cancel}>
      <Tabs defaultActiveKey='member' activeKey={activeKey} onChange={key => setActiveKey(key)} style={{ minHeight: '600px' }}>
        <TabPane tab='项目成员' key='member'>
          <Member usermapping={usermapping} users={users} dispatch={dispatch} project={project} updateTimes={updateTimes} />
        </TabPane>
        <TabPane tab='数据源' key='dataSoure'>
          <DataSource projectId={project.id} />
        </TabPane>
      </Tabs>
    </Modal>
  )
}

ConfigureModal.propTypes = {
  usermapping: PropTypes.array,
  users: PropTypes.array,
  visible: PropTypes.bool,
  cancel: PropTypes.func,
  dispatch: PropTypes.func,
  project: PropTypes.any,
  updateTimes: PropTypes.any
}

export default ConfigureModal
