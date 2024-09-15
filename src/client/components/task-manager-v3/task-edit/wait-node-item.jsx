import React, { useState, useEffect } from 'react'
import { CloseOutlined } from '@ant-design/icons';
import { Row, Col, InputNumber, Select, Popconfirm } from 'antd';
import _ from 'lodash'
import SelectUnitCol from '../../TaskScheduleManager2/flow/select-unit-col'
import './index.styl'
import shortid from 'shortid'

const textStyle = { style: { lineHeight: '32px', textAlign: 'right' } }
export default function WaitNodeItem(props) {
  const { item = {}, index, disabled, taskList = [], offLineTaskGroupList = [], isTaskGroup = false, changgeInfo, deleteNode, nodeId, taskId } = props

  let groupId = _.get(item, 'other.groupId')
  let projectId = _.get(item, 'other.projectId') || _.get(item, 'projectId')
  let jobId = _.get(item, 'other.nodeId') || _.get(item, 'nodeId')

  let selectFlow = _.get(offLineTaskGroupList.find(p => p.id === groupId), 'flows.0.nodes', []).find(item => item.id === projectId)
  let selectTaskIsProject = !selectFlow || _.get(selectFlow, 'type') === 'project'
  let taskData = isTaskGroup
    ? _.get(offLineTaskGroupList.find(p => p.id === groupId), 'flows.0.nodes', []).filter(item => item.id !== nodeId)
    : taskList.filter(p => p.id !== taskId)

  let data = []
  if (projectId && selectTaskIsProject) {
    data = _.get(taskList.find(p => p.id === projectId), 'flows.0.nodes', []).filter(item => item.id !== nodeId)
  } else if (projectId) {
    data = [selectFlow]
  }
  return (
    <React.Fragment>
      <div className='wait-node-card'>
        {!disabled && (<div style={{ marginTop: '5px' }}>
          <Popconfirm
            title='确定删除该等待节点？'
            onConfirm={() => deleteNode(index)}
            okText='确定'
            cancelText='取消'
          >
            <CloseOutlined className='close-icon' />
          </Popconfirm>
        </div>)}
        {
          isTaskGroup
            ? <Row className='mg1t pd2x' key={`row_task_group_${index}`} justify='center' align='middle'>
              <Col span={8} {...textStyle}>依赖工作流组：</Col>
              <Col span={16} >
                <Select onChange={v => {
                  changgeInfo(index, 'groupId', v)
                }}
                showSearch
                optionFilterProp='children'
                value={groupId}
                defaultValue={groupId}
                className='width200 inline mg1x'
                disabled={disabled}
                >
                  {
                    offLineTaskGroupList.map(p => {
                      if (p.id === taskId) {
                        return
                      }
                      return <Select.Option value={p.id} key={p.id}>{p.showName}</Select.Option>
                    })
                  }
                </Select>
              </Col>

            </Row>
            : null
        }
        <Row className='mg1t pd2x' key={`row_task_${index}`} justify='center' align='middle'>
          <Col span={8} {...textStyle}>依赖工作流：</Col>
          <Col span={16} >
            <Select onChange={v => {
              changgeInfo(index, 'projectId', v)
            }}
            showSearch
            optionFilterProp='children'
            value={projectId}
            defaultValue={projectId}
            className='width200 inline mg1x'
            disabled={disabled}
            >
              {
                taskData.map(p => {
                  return <Select.Option value={p.id} key={p.id}>{p.showName}</Select.Option>
                })
              }
            </Select>
          </Col>
        </Row>
        <Row className='mg1t pd2x' key={`row_${shortid()}`} justify='center' align='middle'>
          <Col span={8} {...textStyle} >工作流节点：</Col>
          <Col span={16} >
            <Select
              showSearch
              optionFilterProp='children'
              className='width200 inline mg1x'
              onChange={v => {
                changgeInfo(index, 'nodeId', v)
              }}
              value={jobId}
              defaultValue={jobId}
              disabled={disabled}
            >
              {
                data.map(p => {
                  return <Select.Option value={p.id} key={p.id}>{p.showName}</Select.Option>
                })
              }
            </Select>
          </Col>
        </Row>
        <Row className='mg1t pd2x' key={`row_exec_${index}`} justify='center' align='middle' >
          <Col span={8} {...textStyle}> 执行时间：</Col>
          <Col span={16} >
            <SelectUnitCol
              className='inline mg1x'
              executeTime={_.get(item, 'executeTime', '1,day')}
              onChange={v => {
                changgeInfo(index, 'executeTime', v)
              }}
              style={{ width: 200 }}
              disabled={disabled}
            />
          </Col>
        </Row>

        <Row className='mg1t pd2x' key={`row_exectime_${index}`} justify='center' align='middle' >
          <Col span={8} {...textStyle}> 超时时间(分钟)：</Col>
          <Col span={16} >
            <InputNumber
              className='width200 inline mg1x'
              value={_.get(item, 'timeout', 3600 * 1000) / 60000}
              min={1}
              onChange={v => {
                changgeInfo(index, 'timeout', v)
              }}
              disabled={disabled}
            />
          </Col>
        </Row>
      </div>
    </React.Fragment>
  );

}
