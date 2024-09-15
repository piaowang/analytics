import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { connect } from 'react-redux'
import moment from 'moment'
import Bread from '../Common/bread'
import './css.styl'
import { DeleteOutlined, EditOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, message, Card, Popconfirm, Tooltip } from 'antd'
import EditorModal from './modal/editor-modal'
import ConfigureModal from './modal/configure-modal'
import TaskProjectModel from './saga-models/task-project'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import { browserHistory } from 'react-router'
import { bindActionCreators } from 'redux'
import * as actions from '../../actions/users'
import { TASK_PROJECT_USER_ROLE_TYPE } from './constants'
import JobParamsEditModal from './global-props-setting-modal'

const { Meta } = Card

const Index = props => {
  const { pList = [], usermapping = [], users = [], dispatch, getUsers, updateTimes = 0, showPropsSetting, globalProps } = props

  const [currentProject, setCurrentProject] = React.useState({})
  const [cModalVisible, setCModalVisible] = React.useState(false)
  const [eModalVisible, setEModalVisible] = React.useState(false)
  const [list, setList] = React.useState([])

  useEffect(() => {
    getUsers()
  }, [])

  useEffect(() => {
    if (users.length) {
      const keyBy = _.keyBy(users, 'id')

      const dataList = pList.map(p => ({
        ...p,
        first_name: _.get(keyBy, [`${p.created_by}`, 'first_name'], '')
      }))
      setList(dataList)
    }
  }, [pList, users.length])

  const cteateTaskProject = (data, callback) => {
    dispatch({
      type: 'TaskProjectModel/createTaskProject',
      payload: {
        data,
        callback
      }
    })
  }

  const editorTaskProject = (data, callback) => {
    dispatch({
      type: 'TaskProjectModel/ecitorTaskProject',
      payload: {
        data,
        callback
      }
    })
  }

  const deleteTaskProject = project => {
    const { id } = project
    dispatch({
      type: 'TaskProjectModel/deleteTaskProject',
      payload: {
        data: { id },
        callback: err => (err ? message.error(`删除失败! ${err.message}`) : message.success('删除成功'))
      }
    })
  }

  const renderAddButton = () => (
    <div className='task-project-add height-100' onClick={() => setEModalVisible(true)}>
      <a className='new-link block pointer'>
        <PlusOutlined style={{ display: 'block', fontSize: '85px' }} />
        <span>新建项目</span>
      </a>
    </div>
  )

  const getContent = () => {
    let newList = _.get(window, 'sugo.user.SugoRoles', []).filter(r => r.type === 'built-in').length ? _.concat([{ id: 'new' }], list) : list || []
    // （body宽度 - 左侧导航栏宽度 - 左右padding）/ 每个卡片宽度
    const rowsCount = Math.floor((document.body.clientWidth - 180 - 32) / 250)
    newList = _.concat(newList, _.fill(new Array(rowsCount - (newList.length % rowsCount)), { id: 'none' }))
    return (
      <div className='task-project-wrap'>
        {newList.map((project, i) => {
          // 新建项目按钮
          if (project.id === 'new') {
            return (
              <div className='width250 mg3b' key={project.id}>
                {renderAddButton()}
              </div>
            )
          }
          if (project.id === 'none') {
            return <div className='width250 mg3b' key={`none_${i}`} />
          }
          const canManager = project.role_type === TASK_PROJECT_USER_ROLE_TYPE.manager
          return (
            <div className='width250 mg3b' key={project.id}>
              <Card
                className='width-100 height-100 task-project-card'
                cover={
                  <h2 className='project-title pd1 pd2l'>
                    <a onClick={() => browserHistory.push(`/console/task-schedule-v3/task-edit/${project.id}`)}>{project.name}</a>
                  </h2>
                }
                actions={[
                  <Button
                    type='link'
                    key={0}
                    icon={<SettingOutlined />}
                    disabled={!canManager}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent'
                    }}
                    onClick={() => {
                      setCModalVisible(true)
                      setCurrentProject(project)
                    }}
                  >
                    配置
                  </Button>,
                  <Button
                    type='link'
                    key={1}
                    icon={<EditOutlined />}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent'
                    }}
                    disabled={!canManager}
                    onClick={() => {
                      setEModalVisible(true)
                      setCurrentProject(project)
                    }}
                  >
                    编辑
                  </Button>,
                  <Popconfirm
                    key={2}
                    title='确定删除该项目吗?'
                    onConfirm={() => {
                      deleteTaskProject(project)
                    }}
                    okText='删除'
                    cancelText='取消'
                    disabled={!canManager}
                  >
                    <Button
                      type='link'
                      icon={<DeleteOutlined />}
                      style={{
                        border: 'none',
                        backgroundColor: 'transparent'
                      }}
                      disabled={!canManager}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                ]}
              >
                <Meta
                  title={
                    <React.Fragment>
                      <div>
                        <span>创建者</span>:&nbsp;{project.first_name}
                      </div>
                      <div>
                        <span>创建时间</span>:&nbsp;{moment(project.created_at).format('YYYY-MM-DD HH:mm:ss')}
                      </div>
                    </React.Fragment>
                  }
                  description={
                    <div className='description'>
                      项目描述:&nbsp;
                      <Tooltip title={project.description}>{project.description}</Tooltip>
                    </div>
                  }
                />
              </Card>
            </div>
          )
        })}
      </div>
    )
  }

  const isAdmin = _.get(window, 'sugo.user.SugoRoles', []).filter(r => r.type === 'built-in').length
  return (
    <React.Fragment>
      <Bread path={[{ name: '数据开发' }]}>
        {isAdmin ? (
          <Button
            className='mg1l'
            icon={<SettingOutlined />}
            onClick={() => {
              dispatch({
                type: 'TaskProjectModel/changeState',
                payload: { showPropsSetting: true }
              })
            }}
            style={{ position: 'absolute', top: '5px', right: '32px' }}
          >
            设置参数
          </Button>
        ) : null}
      </Bread>
      <div className='pd2 bg-white scroll-content always-display-scrollbar'>{getContent()}</div>
      {/**编辑 */}
      <EditorModal
        visible={eModalVisible}
        project={eModalVisible ? currentProject : {}}
        cancel={() => {
          setEModalVisible(false)
          setCurrentProject({})
        }}
        create={cteateTaskProject}
        editor={editorTaskProject}
      />
      {/**配置 */}
      {cModalVisible && (
        <ConfigureModal
          visible={cModalVisible}
          dispatch={dispatch}
          project={cModalVisible ? currentProject : {}}
          usermapping={usermapping}
          users={users}
          updateTimes={updateTimes}
          cancel={() => {
            setCModalVisible(false)
            setCurrentProject({})
          }}
        />
      )}
      {/**设置参数 */}
      {showPropsSetting ? (
        <JobParamsEditModal
          value={globalProps}
          visible={showPropsSetting}
          hide={() => {
            dispatch({
              type: 'TaskProjectModel/changeState',
              payload: { showPropsSetting: false }
            })
          }}
          save={list => {
            dispatch({
              type: 'TaskProjectModel/saveTaskProps',
              payload: { propsList: list }
            })
          }}
        />
      ) : null}
    </React.Fragment>
  )
}

Index.propTypes = {
  pList: PropTypes.array,
  users: PropTypes.array,
  usermapping: PropTypes.array,
  dispatch: PropTypes.func,
  getUsers: PropTypes.func,
  updateTimes: PropTypes.any,
  showPropsSetting: PropTypes.any,
  globalProps: PropTypes.any
}

const withForm = withRuntimeSagaModel(TaskProjectModel)(
  connect(
    state => _.pick(state.common, ['users']),
    dispatch => bindActionCreators(actions, dispatch)
  )(Index)
)

let mapStateToProps = props => {
  return {
    ...props['TaskProjectModel']
  }
}

export default connect(mapStateToProps)(withForm)
