import React, { useState, useEffect } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Menu, Layout, Popconfirm, message, Modal, Input, Button, Table } from 'antd'
import { FLOW_NODE_TYPE, FLOW_NODE_INFOS, TASK_EDIT_TABS_TYPE, DISPLAY_TASK_MODEL, FLOW_GROUP_BAS_NODE, TASK_CAN_EDIT_NODE_TYPE, FLOW_NODE_TYPE_REAL_TIME_CALC } from '../constants'
import SizeProvider from '../../Common/size-provider'
import FlowDesignPanel from './flow-edit'
import { namespace } from './model'
import { connect } from 'react-redux'
import ImportTask from './import-task'
import FlowConsole from './flowConsole'
import JobConsole from './flowConsole/job-index'
import _ from 'lodash'
import { immutateUpdate, immutateUpdates } from 'common/sugo-utils'
import Fetch from '../../../common/fetch-final'
import shortid from 'shortid'
import TaskNodeList from './task-node-list'
import moment from 'moment'
import TaskEditTopTool from './task-eidt-top-tool'
import TasksTree from './tasks-tree'
import HorizontalSplitHelper from '../../Common/horizontal-split-helper'
import VerticalSplitHelper from '../../Common/vertical-split-helper'
import DraggableBtn from './draggable-btn'
import { isRealTimeCalcProject } from 'client/components/task-manager-v3/task-edit/immediate/real-time-calc-helper'
import TaskEditTopToolsForRealTimeCalcTask from 'client/components/task-manager-v3/real-time-calc/task-edit-top-tools'
import { copyTaskNode } from './services'
import { recvJSON } from 'client/common/fetch-utils'

const LEFT_PANEL_WIDTH = 260
const { Content } = Layout
const { SubMenu } = Menu
const { Item: FItem } = Form
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

const Edit = function (props) {
  const [graphInfo, setGraphInfo] = useState(null)
  const [selectJob, setSelectJob] = useState({ id: 'main' })
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [isAddVersionModal, setIsAddVersionModal] = useState(false)
  const [flowConsoleWidth, setFlowConsoleWidth] = useState(0)
  const [openKeys, setOpenKeys] = useState(['task_group_default_node_1'])
  const [executeParams, setExecuteParams] = useState({
    flowPriority: 5,
    executeType: 1,
    idealExecutorIds: '',
    executors: []
  })

  const {
    id,
    tabObjs,
    openNewTab,
    editTaskInfo = {},
    metaconnectors,
    changeEditStatus,
    taskProjectId,
    disabled,
    realTimeNodeList,
    realTimeNodeInfo,
    form: { getFieldDecorator, validateFields, resetFields },
    taskList,
    categoryData,
    activeTabsKey,
    jobParams,
    cacheJobParams,
    versionList,
    isGest
  } = props

  useEffect(() => {
    if (id) {
      props.dispatch({
        type: `${namespace}/getTaskGraph`,
        payload: { id },
        callback: obj => {
          setGraphInfo(obj)
        }
      })
      props.dispatch({
        type: `${namespace}/fetchTaskById`,
        payload: { id, isTaskGroup }
      })
    } else {
      setGraphInfo({})
    }
    Fetch.get('/app/task-schedule-v3/executors?action=getAllExecutors').then(data => {
      const { executors = [] } = data
      setExecuteParams({
        ...executeParams,
        executors
      })
    })
  }, [])

  // 获取一个projectType作为工作流/工作流组的名称，用来下面做区分，不破坏原有的结构
  const tabInfo = tabObjs.find(p => p.key === activeTabsKey) || {}
  if (!tabInfo.type) {
    return null
  }

  const isTaskGroup = tabInfo.model === DISPLAY_TASK_MODEL.offLineTaskGroup
  if (!graphInfo) {
    return null
  }

  // 打开右侧面板
  const refresh = function (id) {
    setShowImportPanel(false)
    props.dispatch({
      type: `${namespace}/getTaskGraph`,
      payload: { id },
      callback: obj => {
        setGraphInfo(obj)
      }
    })
  }

  const onCopyTask = function () {
    validateFields((err, value) => {
      if (err) {
        return
      }
      const newProjectName = shortid()
      props.dispatch({
        type: `${namespace}/copyProject`,
        payload: { taskProjectId, projectId: editTaskInfo.id, newProjectName, ...value },
        callback: () => setShowCopyModal(false)
      })
    })
  }

  const onAddVersion = function () {
    validateFields(async (err, values) => {
      if (err) return
      values.projectId = id
      values.createUser = window.sugo.user.id
      await props.dispatch({
        type: `${namespace}/addVersion`,
        payload: values
      })
      resetFields()
      setIsAddVersionModal(false)
    })
  }

  const onApply = function (r, isTaskGroup) {
    props.dispatch({
      type: `${namespace}/applyVersion`,
      payload: { projectId: id, controlId: r.id || '', isTaskGroup },
      callback: () => {
        refresh(editTaskInfo.id)
        setShowVersionModal(false)
      }
    })
  }

  const onDel = function (r) {
    props.dispatch({
      type: `${namespace}/delVersion`,
      payload: { projectId: id, controlId: r.id || '' }
    })
  }

  const genColumns = function (isTaskGroup = false) {
    return [
      {
        title: '序号',
        dataIndex: 'id',
        render: t => versionList.findIndex(o => o.id === t) + 1
      },
      {
        title: '修改人',
        dataIndex: 'author'
      },
      {
        title: '修改时间',
        dataIndex: 'createTimestamp',
        render: t => moment(t).format('YYYY-MM-DD hh:mm'),
        width: 180
      },
      {
        title: '版本号',
        dataIndex: 'versionNo'
      },
      {
        title: '备注',
        dataIndex: 'remark',
        width: 240
      },
      {
        title: '操作',
        dataIndex: '',
        render: (_t, r) => {
          return r.active ? (
            '- 当前版本 -'
          ) : (
            <div>
              <Popconfirm title={'确定应用该版本吗？'} onConfirm={() => onApply(r, isTaskGroup)}>
                <a className='mg2r'>应用</a>
              </Popconfirm>
              <Popconfirm title='确定删除该版本吗？' onConfirm={() => onDel(r)}>
                <a>删除</a>
              </Popconfirm>
            </div>
          )
        }
      }
    ]
  }

  const handleCopyNode = async id => {
    const newNode = graphInfo?.graph?.find(p => p.id === id)
    if (newNode) {
      const newJobName = moment().format('x')
      const newId = `${editTaskInfo.name}_node_${newJobName}`
      const params = {
        ...recvJSON,
        body: JSON.stringify({ projectId: editTaskInfo.id, newJobName, jobName: _.chain(id).split('_').last().value() })
      }
      const { status } = await copyTaskNode(params)
      if (status !== 'success') {
        message.error('节点复制失败')
        return
      }
      const [x, y] = newNode?.pos || [0, 0]
      let newObj = {
        ...newNode,
        id: newId,
        type: newNode?.type,
        title: `${newNode?.title}_copy`,
        params: {},
        pos: [x + 10, y + 10],
        inputs: [],
        outputs: []
      }
      setGraphInfo(
        immutateUpdate(graphInfo, 'graph', arr => [...(arr || []), newObj]),
        true
      )
    }
  }

  const onAddNodeJob = (nodeType, pos) => {
    const taskGroupBaseNode = FLOW_GROUP_BAS_NODE.map(p => p.nodeType)
    // 判断添加的是否为工作流节点 工作流节点生成数据的规则不一样
    const addIsTask = isTaskGroup && !_.includes(taskGroupBaseNode, nodeType)
    if (addIsTask && graphInfo.graph && graphInfo.graph.find(p => p.type === nodeType)) {
      message.error('已添加该流程')
      return
    }
    if (nodeType === 'end' && graphInfo.graph && graphInfo.graph.find(p => p.type === 'end')) {
      message.error('已添加结束节点')
      return
    }

    let nodeIndex = 0
    let nodeDic = {}
    if (isTaskGroup) {
      nodeDic = _.keyBy([...taskList, ...FLOW_GROUP_BAS_NODE], p => p.id || p.nodeType)
    } else {
      if (tabInfo.type === DISPLAY_TASK_MODEL.offLineTask || tabInfo.type === DISPLAY_TASK_MODEL.realTimeCalc) {
        nodeDic = _.keyBy(FLOW_NODE_INFOS, p => p.nodeType)
      } else {
        nodeDic = _.keyBy(realTimeNodeInfo, p => p.nodeType)
      }
    }

    let opt = {}
    const showName = _.get(nodeDic, `${nodeType}.showName`, '-')
    if (addIsTask) {
      opt = {
        'proxy.job': _.get(nodeDic, `${nodeType}.name`, ''),
        'proxy.job.id': nodeType
      }
    } else {
      const items = (graphInfo.graph || []).filter(p => _.includes(p.title, showName))
      if (items.length) {
        nodeIndex = _.max(items.map(p => _.toNumber(p.title.replace(showName, '') || 0))) + 1
      }
    }
    let newObj = {
      id: `${editTaskInfo.name}_node_${addIsTask ? nodeType : moment() + 0}`,
      type: addIsTask ? 'project' : nodeType,
      title: showName + (!nodeIndex ? '' : nodeIndex),
      pos,
      params: {},
      inputs: [],
      outputs: [],
      ...opt
    }
    if (nodeType === TASK_EDIT_TABS_TYPE.exportMysql) {
      setGraphInfo(
        immutateUpdates(
          graphInfo,
          'nodeType',
          obj => ({ ...obj, [newObj.id]: nodeType }),
          'graph',
          arr => [...(arr || []), newObj]
        ),
        true
      )
      return
    }
    setGraphInfo(
      immutateUpdate(graphInfo, 'graph', arr => [...(arr || []), newObj]),
      true
    )
  }

  function changeState(payload) {
    props.dispatch({
      type: `${namespace}/changeState`,
      payload: payload
    })
  }
  function onOpenChange(openKeysParam) {
    const latestOpenKey = openKeysParam.find(key => openKeys.indexOf(key) === -1)
    if (['task_group_default_node_1', 'task_group_default_node_2'].indexOf(latestOpenKey) === -1) {
      setOpenKeys(latestOpenKey)
    } else {
      latestOpenKey ? setOpenKeys([latestOpenKey]) : setOpenKeys([])
    }
  }
  function getCategoryInfoByType(type) {
    if (type === DISPLAY_TASK_MODEL.offLineTask) {
      return FLOW_NODE_TYPE
    }
    if (type === DISPLAY_TASK_MODEL.realTimeCalc) {
      return FLOW_NODE_TYPE_REAL_TIME_CALC
    }

    return realTimeNodeList
  }
  const canEdit = !disabled
  const taskGroupBaseNodes = FLOW_GROUP_BAS_NODE

  const TaskEditTopTools = isRealTimeCalcProject(editTaskInfo.id) ? TaskEditTopToolsForRealTimeCalcTask : TaskEditTopTool
  return (
    <Layout className='height-100'>
      <HorizontalSplitHelper className='width-100 height-100' collapseWidth={100}>
        <div
          className='height-100 task-left-panel pd1t pd1l bg-white borderr bordert overscroll-y always-display-scrollbar'
          defaultWeight={LEFT_PANEL_WIDTH}
          collapseTitle='任务选择'
        >
          <div className='bg-white'>
            {isTaskGroup ? (
              <Menu mode='inline' className='height-100' defaultOpenKeys={['task_group_default_node_1', 'task_group_default_node_2']}>
                <SubMenu title='工作流' key='task_group_default_node_1'>
                  <TasksTree
                    className='bg-white'
                    isFlowDes
                    isTaskGroup
                    treeData={categoryData}
                    taskList={taskList}
                    editTaskInfo={editTaskInfo}
                    graphInfo={graphInfo}
                    disabled={disabled || isGest}
                  />
                </SubMenu>
                <SubMenu title='基础节点' key='task_group_default_node_2'>
                  {taskGroupBaseNodes.map((p, i) => {
                    return (
                      <DraggableBtn key={`taskGroupBaseNode_${i}`} className='mg1l mg1b' nodeType={p.nodeType} options={{ disabled: disabled || isGest }}>
                        {p.showName}
                      </DraggableBtn>
                    )
                  })}
                </SubMenu>
              </Menu>
            ) : (
              <TaskNodeList canEdit={canEdit} categoryInfo={getCategoryInfoByType(tabInfo.type)} />
            )}
          </div>
        </div>
        <div className='height-100 task-right-panel pd1' defaultWeight={window.innerWidth - LEFT_PANEL_WIDTH}>
          <Content className='height-100'>
            <div className='mg1y' style={{ height: '32px' }}>
              <TaskEditTopTools
                id={id}
                editTaskInfo={editTaskInfo}
                taskProjectId={taskProjectId}
                disabled={disabled}
                setShowImportPanel={setShowImportPanel}
                setShowCopyModal={setShowCopyModal}
                TaskEditTopTool
                dispatch={props.dispatch}
                isTaskGroup={isTaskGroup}
                graphInfo={graphInfo}
                changeEditStatus={changeEditStatus}
                jobParams={jobParams}
                cacheJobParams={cacheJobParams}
                changeState={changeState}
                setShowVersionModal={setShowVersionModal}
                isGest={isGest}
              />
            </div>
            <VerticalSplitHelper {..._.pick(props, ['style', 'className'])} style={{ height: 'calc(100% - 9px)' }}>
              <div defaultWeight={65} key={`task-flow-${id}`}>
                <div id='task-edit-main' style={{ height: 'calc( 100% - 5px )' }}>
                  <SizeProvider>
                    {({ spWidth, spHeight }) => {
                      setFlowConsoleWidth(spWidth)
                      let value = graphInfo
                      if (_.isEmpty(graphInfo.transform)) {
                        const defaultTansform = [spWidth * 0.2, spHeight / 2]
                        value = {
                          ...graphInfo,
                          transform: defaultTansform,
                          defaultTansform
                        }
                      }
                      return (
                        <FlowDesignPanel
                          spWidth={spWidth}
                          spHeight={spHeight}
                          canEditNodeType={TASK_CAN_EDIT_NODE_TYPE} // 控制可否右键编辑 工作流组节点不允许编辑脚本
                          onChange={(obj, isChange) => {
                            setGraphInfo(obj)
                            if (isChange) {
                              changeEditStatus(id, true)
                            }
                          }}
                          onSelect={str => {
                            if (!str) {
                              setSelectJob(_.isEmpty(selectJob) ? { id: 'main', title: editTaskInfo.showName } : {})
                              return
                            }
                            const { id, title, type } = graphInfo.graph.find(p => p.id === str)
                            setSelectJob({ id, title, type })
                          }}
                          onEditNodeInfo={str => {
                            const nodeInfo = _.get(graphInfo, 'graph', []).find(p => p.id === str)
                            if (_.isEmpty(nodeInfo)) {
                              return
                            }
                            const { id, title, type } = nodeInfo
                            const taskGroupBaseNode = FLOW_GROUP_BAS_NODE.map(p => p.nodeType)
                            if (isTaskGroup && !_.includes(taskGroupBaseNode, type)) {
                              return
                            }
                            if (!editTaskInfo.id && str) {
                              message.error('请先保存流程信息')
                              return
                            }
                            if (!str) {
                              return
                            }
                            //打开新面板编辑
                            openNewTab(id.substring(id.lastIndexOf('_') + 1), title, type, editTaskInfo.id)
                          }}
                          onCopyNode={handleCopyNode}
                          onAddNodeJob={onAddNodeJob}
                          value={value}
                          selectedKey={_.get(selectJob, 'id', '')}
                        />
                      )
                    }}
                  </SizeProvider>
                </div>
              </div>
              <div defaultWeight={!_.isEmpty(selectJob) ? '50' : '0'} key={`task-console${id}`} collapseTitle='基础信息'>
                <SizeProvider>
                  {({ spWidth, spHeight }) => {
                    return (
                      <div style={{ bottom: '0px', width: flowConsoleWidth, height: '100%', minHeight: '50px' }}>
                        <FlowConsole
                          typeName={editTaskInfo.typeName}
                          display={selectJob.id === 'main'}
                          graphInfo={graphInfo}
                          taskId={editTaskInfo.id}
                          taskName={editTaskInfo.name}
                          taskShowName={editTaskInfo.showName}
                          taskProjectId={taskProjectId}
                          disabled={disabled}
                          executeParams={executeParams}
                          changeEditStatus={changeEditStatus}
                          isTaskGroup={isTaskGroup}
                          height={spHeight}
                        />
                        {selectJob.id === 'main' ? null : (
                          <JobConsole
                            taskId={editTaskInfo.id}
                            taskShowName={editTaskInfo.showName}
                            isTaskGroup={isTaskGroup}
                            nodeName={selectJob.title}
                            disabled={disabled}
                            selectJobId={selectJob.id}
                            nodeType={selectJob.type}
                            onDelete={jobName => {
                              const newInfo = immutateUpdate(graphInfo, 'graph', arr => {
                                return arr
                                  .filter(p => p.id !== jobName)
                                  .map(p => {
                                    return { ...p, inputs: _.pull(p.inputs, jobName), outputs: _.pull(p.outputs, jobName) }
                                  })
                              })
                              setGraphInfo(newInfo)
                            }}
                            changeJobName={(id, jobName) => {
                              const newInfo = immutateUpdate(graphInfo, 'graph', arr => {
                                return arr.map(p => {
                                  if (_.endsWith(p.id, id)) {
                                    return { ...p, title: jobName }
                                  }
                                  return p
                                })
                              })
                              setGraphInfo(newInfo)
                            }}
                          />
                        )}
                      </div>
                    )
                  }}
                </SizeProvider>
              </div>
            </VerticalSplitHelper>
            {showImportPanel ? (
              <ImportTask refresh={() => refresh(editTaskInfo.id)} projectId={editTaskInfo.id} showInportTask={showImportPanel} hideModal={() => setShowImportPanel(false)} />
            ) : null}
            {showCopyModal && (
              <Modal width={400} title={'复制工作流'} visible={showCopyModal} onCancel={() => setShowCopyModal(false)} onOk={() => onCopyTask()}>
                <Form>
                  <FItem {...FormItemLayout} label='任务名称'>
                    {getFieldDecorator('newProjectShowName', {
                      rules: [
                        {
                          required: true,
                          message: '请输入新任务名称'
                        },
                        {
                          pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9]+$/g,
                          message: '只能是数字、字母和中文组成!'
                        },
                        {
                          max: 50,
                          message: '不应超过50个字符'
                        }
                      ]
                    })(<Input placehold='请输入新任务名称' style={{ width: 250 }} />)}
                  </FItem>
                </Form>
              </Modal>
            )}
            {showVersionModal && (
              <Modal width={1000} title={'版本记录'} bodyStyle={{ minHeight: '600px' }} visible={showVersionModal} onCancel={() => setShowVersionModal(false)} footer={null}>
                <Button type='primary' className='mg2b' icon={<PlusOutlined />} onClick={() => setIsAddVersionModal(true)}>
                  增加一个版本
                </Button>
                <Table
                  rowKey='id'
                  columns={genColumns(isTaskGroup)}
                  dataSource={versionList}
                  bordered
                  pagination={{
                    total: versionList.length,
                    showSizeChanger: true,
                    defaultPageSize: 10,
                    showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`
                  }}
                />
              </Modal>
            )}
            {isAddVersionModal && (
              <Modal width={500} title={'添加版本'} visible={isAddVersionModal} onCancel={() => setIsAddVersionModal(false)} onOk={() => onAddVersion()} zIndex={1001}>
                <Form>
                  <FItem {...FormItemLayout} label='版本号'>
                    {getFieldDecorator('versionNo', {
                      rules: [
                        {
                          required: true,
                          message: '请输入新版本号'
                        },
                        {
                          max: 30,
                          message: '不应超过30个字符'
                        },
                        {
                          validator: (rule, value, callback) => {
                            if (versionList.map(o => o.versionNo).includes(value)) {
                              callback('该版本号已存在')
                            } else {
                              callback()
                            }
                          }
                        }
                      ]
                    })(<Input placehold='请输入版本号' style={{ width: 250 }} />)}
                  </FItem>
                  <FItem {...FormItemLayout} label='备注说明'>
                    {getFieldDecorator('remark', {
                      rules: [
                        {
                          required: true,
                          message: '请输入备注说明'
                        },
                        {
                          max: 150,
                          message: '不应超过150个字符'
                        }
                      ]
                    })(<Input.TextArea placehold='请输入备注' autoSize={{ minRows: 3, maxRows: 5 }} style={{ width: 300 }} />)}
                  </FItem>
                </Form>
              </Modal>
            )}
          </Content>
        </div>
      </HorizontalSplitHelper>
    </Layout>
  )
}

export default connect(props => props[namespace])(Form.create()(Edit))
