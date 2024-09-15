import React from 'react'
import { MinusCircleOutlined, PlusCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import { Input, Button, Row, Col, InputNumber } from 'antd'
import _ from 'lodash'
import SelectJobCol from './select-job-col'
import SelectTaskCol from './select-task-col'
import SelectUnitCol from './select-unit-col'
import { STEP_PARAMS_REMARK } from '../../constants'
import './job-params-edit.styl'
const { TextArea } = Input


class JobParamsEdit extends React.Component {
  state = {
    taskMap: {}
  }

  configCol () {
    const { onAppendParams, resetConfig } = this.props
    return (
      <div className="pd1t">
        <span
          className="pointer color-black font12"
          onClick={onAppendParams}
          title="增加一个参数"
        >
          <PlusCircleOutlined className="mg1r color-green font14" />
            增加一个参数
        </span>

        <Button
          size="small"
          className="pointer color-black font12"
          onClick={resetConfig}
          title="还原修改"
          icon={<ReloadOutlined />}
          type="primary"
          style={{height: 24,marginLeft: 20,color: '#fff'}}
        >
          还原修改
        </Button>
      </div>
    )
  }

  render() {
    let { params,
      defaultParamsKey,
      onChangeParams,
      onRemoveParams,
      omitKey,
      showAddButton = true,
      projectId
    } = this.props
    const { taskMap } = this.state
    params = _.cloneDeep(params)
    params = params.filter(p => !omitKey.includes(p.name))
    params = _.sortBy(params, p => {
      const order = defaultParamsKey.findIndex(k => k === p.name)
      return order >= 0 ? order : 999
    })
    return (
      <div className="modal-container">
        {
          params.map((k, i) => {
            const isDefaultParam = defaultParamsKey.includes(k.name)
            let Control
            if (k.type === 'selectTask') {
              Control = (<SelectTaskCol
                value={k.value}
                projectId={projectId}
                className="width300 inline mg1r"
                onChangeTask={(taskId) => {
                  onChangeParams({ ...k, value: taskId })
                }}
                onLoaded={data => {
                  let taskMap = _.get(data, '[0].tasks', [])
                  taskMap = _.keyBy(taskMap, 'id')
                  taskMap = _.mapValues(taskMap, p => p.name)
                  this.setState({ taskMap })
                }}
                         />)
            } else if (k.type === 'selectJob') {
              const taskId = params.find(p => p.name === 'projectId') || {}
              const taskName = taskMap[taskId.value] || ''
              Control = (<SelectJobCol
                value={k.value}
                className="width300 inline mg1r"
                projectId={projectId}
                taskName={taskName}
                onChangeJob={(jobId) => {
                  onChangeParams({ ...k, value: jobId })
                }}
                         />)
            } else if (k.type === 'selectUnit') {
              Control = (<SelectUnitCol
                className="width300 inline mg1r"
                item={k}
                onChange={(e) => onChangeParams({ ...k, value: e })}
                         />)
            } else if (k.type === 'textArea') {
              let str
              if(typeof k.value === 'string') {
                str = k.value
              } else {
                str = JSON.stringify(k.value, null, 2)
                  .replace(/(\}\s*$)/g, '')
                  .replace(/(^\s*\{\s*)/g, '')
                  .replace(/(,\s*\n\s*)/g, '\n')
              }
              Control = (<TextArea 
                // value={JSON.stringify(k.value, null , 4)} 
                value={str}
                rows={35}
                onChange={(e) => onChangeParams({ ...k, value: e.target.value})}
                         />)
            } else if (k.name === 'timeout') {
              Control = (<InputNumber  
                className="custom-timeout-input" 
                value={k.value}
                min={0}
                max={1000000}
                placeholder="请输入时间(单位:秒)" 
                onChange={(e) => onChangeParams({ ...k, value: e })}
                         />)
            } else {
              Control = (<Input
                className="inline mg1r"
                value={k.value}
                placeholder="请输入参数值"
                onChange={(e) => onChangeParams({ ...k, value: e.target.value }, i)}
                         />)
            }
            return (
              <Row key={`key_param_${i}`}>
                <div
                  className="mg1t aligncenter"
                >
                  {
                    omitKey.indexOf('showName') > 0 && params[0].name && params[0].name === 'gobblin' ?
                      <div>
                        <Col span={20} offset={2}>{Control}</Col>
                      </div>
                      :
                      <div>
                        <Col span={6}>
                          {
                            k.type === 'new'
                              ? <Input
                                // className="width180 inline mg1r"
                                placeholder="请输入参数名"
                                value={k.name}
                                readOnly={isDefaultParam}
                                onChange={(e) => onChangeParams({ ...k, name: e.target.value },i)}
                              />
                              // : <div className="width180 inline mg1r alignleft">
                              : <div>
                                {STEP_PARAMS_REMARK[k.name] || k.name}：
                              </div>
                          }
                        </Col>
                        <Col span={14} offset={1}>{Control}</Col>
                      </div>
                  }
                  
                  <div className="inline width30 aligncenter">
                    {
                      !isDefaultParam
                        ? <MinusCircleOutlined
                          title="移除这个参数"
                          className="color-grey font16 pointer line-height32 hover-color-red"
                          onClick={() => onRemoveParams(k.index)}
                        />
                        : null
                    }
                  </div>
                </div>
              </Row>
            )
          })
        }
        {
          showAddButton && this.configCol()
        }
      </div>
    )
  }
}

export default JobParamsEdit
