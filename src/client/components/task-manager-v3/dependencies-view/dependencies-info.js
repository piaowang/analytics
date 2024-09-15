import React, { useEffect, useState } from 'react'
import { Row, Tabs, Col, Card } from 'antd'
import _ from 'lodash'

const { TabPane } = Tabs

const FILED_TRANSLATE = {
  showName: '工作流名称',
  lastModifiedTimeString: '最近一次更新时间',
  createTimesString: '创建时间',
  created_by: '创建人',
  updated_by: '最近一次更新人',
  dependentGroupName: '依赖工作流组',
  dependentNodeName: '依赖工作流节点',
  dependentProjectName: '依赖工作流名称',
  timeout: '超时时间',
  executeTime: '执行时间',
  taskName: '项目名称'
}

const UNIT_TRANSLATE = {
  hour: '小时',
  day: '天'
}

export default function DependenciesInfo(props) {
  const { taskList = [], dependencies = [], selectJob, isTaskGroup, taskProjectName } = props
  const [state, setState] = useState({ baseInfo: {}, beforeInfo: [], afterInfo: [], selectTab: 'baseInfo' })

  useEffect(() => {
    if (!taskList.length || !selectJob) {
      return
    }
    // 获取基础信息
    const taskInfo = taskList.find(p => p.id.toString() === selectJob.toString())
    const baseInfo = {
      ..._.pick(taskInfo, ['showName', 'lastModifiedTimeString', 'createTimesString', 'created_by', 'updated_by'])
    }
    // 获取前置依赖信息 遍历waitNodeList
    let beforeInfo = dependencies.find(p => p.projectId.toString() === selectJob.toString())
    if (beforeInfo) {
      beforeInfo = (beforeInfo.waitNodeList || []).map(p => {
        // 判断工作流和工作流组
        return p.dependentList.filter(p => isTaskGroup ? p.dependentGroupId : !p.dependentGroupId)
      })
      beforeInfo = _.flatMap(beforeInfo)
    } else {
      beforeInfo = []
    }
    // 获取后置依赖信息
    let afterInfo = dependencies.map(p => {
      const objs = _.flatten(p.waitNodeList.map(item => item.dependentList))
        .filter(d => {
          if (isTaskGroup) {
            return d.dependentGroupId && d.dependentGroupId.toString() === selectJob.toString()
          }
          return d.dependentProjectId.toString() === selectJob.toString() && !d.dependentGroupId
        })
      return {
        ...p,
        dependentList: objs
      }
    }).filter(p => p.dependentList.length)
    afterInfo = afterInfo.map(p => {
      const res = p.dependentList.map(d => {
        return {
          ...d,
          taskName: p.projectName
        }
      })
      return _.flatten(res)
    })
    afterInfo = _.flatten(afterInfo)
    setState({
      baseInfo,
      beforeInfo,
      afterInfo,
      selectTab: 'baseInfo'
    })
    return () => {
      setState({
        baseInfo: [],
        beforeInfo: [],
        afterInfo: [],
        selectTab: 'baseInfo'
      })
    }
  }, [selectJob])


  const renderItem = (field, obj) => {
    let val = _.get(obj, field, '')
    if (!val) {
      return null
    }
    if (field === 'timeout') {
      val = `${val / 1000 / 60} 分`
    }
    if (field === 'executeTime') {
      const [num, unit] = val.split(',')
      val = `${num} ${_.get(UNIT_TRANSLATE, unit, unit)}`
    }

    return (<Row className='pd1b '>
      <Col span={10} className='alignright  font14 bold'>{FILED_TRANSLATE[field]}:</Col>
      <Col span={12} className='alignleft pd2l font14'>{val}</Col>
    </Row>)
  }
  const renderBaseInfo = () => {
    return (<div className='pd2b height-100 width500' >
      <Row className='pd1b '>
        <Col span={10} className='alignright  font14 bold'>所属项目:</Col>
        <Col span={12} className='alignleft pd2l font14'>{taskProjectName}</Col>
      </Row>
      {renderItem('showName', state.baseInfo)}
      {renderItem('createTimesString', state.baseInfo)}
      {renderItem('lastModifiedTimeString', state.baseInfo)}
      {renderItem('created_by', state.baseInfo)}
      {renderItem('updated_by', state.baseInfo)}
    </div>)
  }

  const renderBeforeInfo = (item) => {
    return (<Card
      className='mg2b width500'
      title={state.baseInfo?.showName}
    >
      {renderItem('dependentGroupName', item)}
      {renderItem('dependentProjectName', item)}
      {renderItem('dependentNodeName', item)}
      {renderItem('executeTime', item)}
      {renderItem('timeout', item)}
    </Card>)
  }

  const renderAfterInfo = (item) => {
    return (<Card
      className='mg2b width500'
      title={item?.taskName}
    >
      {renderItem('dependentGroupName', item)}
      {renderItem('dependentProjectName', item)}
      {renderItem('dependentNodeName', item)}
      {renderItem('executeTime', item)}
      {renderItem('timeout', item)}
    </Card>)
  }

  const tabStyle = { height: 'calc(100% - 65px)', overflow: 'auto' }
  return (
    <div className='bg-white height-100'>
      <Tabs className='height-100' activeKey={state.selectTab} onChange={v => setState({ ...state, selectTab: v })}>
        <TabPane tab='基础信息' className='pd2x' key='baseInfo' style={tabStyle}>
          {renderBaseInfo()}
        </TabPane>
        <TabPane tab='前置依赖任务' className='pd2x' key='before' style={tabStyle}>
          {state.beforeInfo.map(p => renderBeforeInfo(p))}
        </TabPane>
        <TabPane tab='后置依赖任务' className='pd2x' key='after' style={tabStyle}>
          {state.afterInfo.map(p => renderAfterInfo(p))}
        </TabPane>
      </Tabs>
    </div>
  )
}
