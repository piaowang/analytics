/* eslint-disable react/prop-types */
import React from 'react'
import { PlusCircleOutlined } from '@ant-design/icons';
import { Row, Col, InputNumber } from 'antd';
import _ from 'lodash'
import SelectJobCol from './select-job-col'
import SelectTaskCol from './select-task-col'
import SelectUnitCol from './select-unit-col'
import { synchronizer } from '../../Fetcher/synchronizer'
import { makeTreeNode } from '../constants'
import { isDiffByPath, tryJsonParse } from '../../../../common/sugo-utils'
import './job-params-edit.styl'

@synchronizer(props => ({
  onLoaded: props.onLoaded,
  url: '/app/new-task-schedule/manager',
  modelName: 'treeInfos',
  resultExtractor: data => {
    if (!data) return {}
    return {
      types: data.projectTypes,
      tasks: data.projects.map(p => ({ ...p, cronInfo: tryJsonParse(p.cronInfo) })),
      order: data.projectTypeSort
    }
  }
}))
export default class JobWaitNode extends React.Component {
  state = {
    treeData: []
  }

  componentWillReceiveProps(nextProps) {
    if (isDiffByPath(this.props, nextProps, 'treeInfos')) {
      let treeInfo = nextProps.treeInfos || {}
      let treeData = makeTreeNode(treeInfo)
      this.setState({ treeData: treeData })
    }
  }

  configCol() {
    const { onchangeCode, code } = this.props
    return (
      <div className="pd1t alignright">
        <span
          className="pointer color-black font12"
          onClick={() => {
            if (_.some(code, p => !p.projectId || !p.nodeId || !p.executeTime || !p.timeout)) {
              return
            }
            onchangeCode([...code, {}])
          }}
          title="增加一个等待节点"
        >
          <PlusCircleOutlined className="mg1r color-green font14 " />
          增加一个等待节点
        </span>
      </div>
    );
  }

  renderParams = (code, item, index) => {
    if (_.isEmpty(item)) {
      item = { executeTime: '1,day', timeout: 7200 }
      _.set(code, [index], item)
    } else {
      item = _.cloneDeep(item)
    }
    let { onchangeCode, treeInfos } = this.props
    const { treeData } = this.state
    if (!treeInfos.tasks) {
      return
    }
    const taskName = (treeInfos.tasks.find(p => p.id.toString() === _.get(item, 'projectId', '')) || {}).name
    return (
      <div className="modal-container">
        <Row className="mg1t">
          <Col span={4} className="alignright" style={{ lineHeight: '33px' }}>依赖任务：</Col>
          <Col span={8}>
            <SelectTaskCol
              value={_.get(item, 'projectId', '')}
              className="width300 inline mg1r"
              onChangeTask={(taskId) => {
                _.set(code, [index, 'projectId'], taskId)
                onchangeCode(code)
              }}
              treeData={treeData}
            />
          </Col>
          <Col span={4} className="alignright" style={{ lineHeight: '33px' }}>任务节点：</Col>
          <Col span={8}>
            <SelectJobCol
              value={_.get(item, 'nodeId', '')}
              className="width300 inline mg1r"
              taskName={taskName}
              onChangeJob={(jobId) => {
                _.set(code, [index, 'nodeId'], jobId)
                onchangeCode(code)
              }}
            />
          </Col>
        </Row>
        <Row className="mg1t mg2b">
          <Col span={4} className="alignright" style={{ lineHeight: '33px' }}>执行时间：</Col>
          <Col span={8}>
            <SelectUnitCol
              className="width300 inline mg1r"
              executeTime={_.get(item, 'executeTime', '1,day')}
              onChange={(e) => {
                _.set(code, [index, 'executeTime'], e)
                onchangeCode(code)
              }}
            />
          </Col>
          <Col span={4} className="alignright" style={{ lineHeight: '33px' }}>超时时间：</Col>
          <Col span={8}>
            <InputNumber
              className="custom-timeout-input"
              value={_.get(item, 'timeout', 7200)}
              min={1}
              placeholder="请输入时间(单位: 毫秒)"
              onChange={(e) => {
                _.set(code, [index, 'timeout'], e)
                onchangeCode(code)
              }}
            />
          </Col>
        </Row>
      </div>
    )
  }

  render() {
    let { code = [] } = this.props
    code = _.cloneDeep(code)
    return (
      <div className="modal-container">
        {code.length === 0
          ? this.renderParams([{}], {}, 0)
          : code.map((p, i) => this.renderParams(code, p, i))
        }
        {this.configCol()}
      </div>
    )
  }
}
