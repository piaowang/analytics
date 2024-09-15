import React, { Component } from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, Button, Tabs, Card } from 'antd'
import { immutateUpdate } from 'common/sugo-utils'
import _ from 'lodash'
import ImmediateTaskConfig from './immediate-task-config'
import ImmediateMonitorConfig from './immediate-monitor-config'
import ImmediateExecHistory from './excutive-history'
import { TASK_EDIT_TABS_TYPE } from '../../constants'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 16 }
}

export default class ImmediateTaskEdit extends Component {
  changeState = obj => {
    const { changeState } = this.props
    changeState(obj)
  }

  onChangeQualityParams = (obj, type) => {
    const { scriptInfo = {} } = this.props
    let newScriptInfo = _.cloneDeep(scriptInfo)
    if (obj.type === 'default') {
      _.set(newScriptInfo, [`${type}.content`], [])
    } else if (obj.type) {
      _.set(newScriptInfo, [`${type}.content`], '')
    }
    this.changeState({
      scriptInfo: {
        ...newScriptInfo,
        param: { ...newScriptInfo.param, ..._.mapKeys(obj, (v, k) => `clean.${type}.${k}`) }
      }
    })
  }

  renderCleanPanel = () => {
    const { paramsMap, scriptInfo = {} } = this.props
    const beforeType = _.get(scriptInfo, ['param', 'clean.before.type'], 'default')
    const beforeContent = _.get(scriptInfo, ['before.content'])
    const afterType = _.get(scriptInfo, ['param', 'clean.after.type'], 'default')
    const afterContent = _.get(scriptInfo, ['after.content'])
    return (
      <div>
        <Tabs>
          <Tabs.TabPane tab='前置' key='beforePanel'>
            <ImmediateMonitorConfig
              value={beforeType === 'default' ? beforeContent || [] : beforeContent}
              params={{ type: beforeType, intercept: _.get(scriptInfo, ['param', 'clean.before.intercept'], false) }}
              onChangeParams={obj => this.onChangeQualityParams(obj, 'before')}
              nodeStructure={_.get(paramsMap, `${TASK_EDIT_TABS_TYPE.groovy}.quality.items.default`, {})}
              onChange={obj =>
                this.changeState({
                  scriptInfo: { ...scriptInfo, ['before.content']: obj }
                })
              }
            />
          </Tabs.TabPane>
          <Tabs.TabPane tab='后置' key='afterPanel'>
            <ImmediateMonitorConfig
              value={afterType === 'default' ? afterContent || [] : afterContent}
              params={{ type: afterType, intercept: _.get(scriptInfo, ['param', 'clean.after.intercept'], false) }}
              onChangeParams={obj => this.onChangeQualityParams(obj, 'after')}
              nodeStructure={_.get(paramsMap, `${TASK_EDIT_TABS_TYPE.groovy}.quality.items.default`, {})}
              onChange={obj =>
                this.changeState({
                  scriptInfo: { ...scriptInfo, ['after.content']: obj }
                })
              }
            />
          </Tabs.TabPane>
        </Tabs>
      </div>
    )
  }

  renderLinePanel = () => {
    const { selectJob, lineData } = this.props
    return (
      <Card title={_.get(selectJob, 'title', '')} className='height-100' bodyStyle={{ height: 'calc(100% - 65px)' }}>
        <div className='scroll-content always-display-scrollbar' style={{ height: 'calc(100% - 5px)' }}>
          <Form.Item {...formItemLayout} label='key'>
            <Input
              value={_.get(lineData, [selectJob.id, 'key'], '')}
              onChange={v =>
                this.changeState({
                  lineData: immutateUpdate(lineData, selectJob.id, obj => ({ point: _.get(obj, 'point', selectJob.id.split('|')[1]), key: v.target.value }))
                })
              }
            />
          </Form.Item>
        </div>
      </Card>
    )
  }

  renderTaskPanel = () => {
    const { id } = this.props
    return (
      <div className='bg-white height-100'>
        <Tabs className='height-100 bottom-task-panel'>
          <Tabs.TabPane forceRender={false} tab={'执行历史'} key={'history'} className='height-100'>
            <ImmediateExecHistory id={id} />
          </Tabs.TabPane>
        </Tabs>
      </div>
    )
  }

  renderJobPanel = type => {
    const { onRef, selectJob, dataSourceList, editNodeParams, paramsMap, currentType, removeJobNode, saveNodeConfig } = this.props
    return (
      <Card
        title={_.get(selectJob, 'title', '')}
        className='height-100'
        bodyStyle={{ height: 'calc(100% - 65px)' }}
        extra={
          <div className='alignright'>
            <Button className='mg2r' onClick={removeJobNode}>
              删除节点
            </Button>
            <Button onClick={() => saveNodeConfig()}>保存配置</Button>
          </div>
        }
      >
        <div className='scroll-content always-display-scrollbar' style={{ height: 'calc(100% - 5px)' }}>
          {
            // groovy清洗节点单独渲染
            type !== TASK_EDIT_TABS_TYPE.groovy ? (
              <ImmediateTaskConfig
                id={_.get(selectJob, 'id', '')}
                typeList={_.get(paramsMap, type, [])}
                dataInfo={editNodeParams}
                onRef={onRef}
                dataSourceList={dataSourceList.filter(item => item.dbType === currentType)}
              />
            ) : (
              this.renderCleanPanel()
            )
          }
        </div>
      </Card>
    )
  }

  render() {
    const { selectJob } = this.props
    if (_.isEmpty(selectJob)) {
      return null
    }
    if (selectJob.type === 'line') {
      return this.renderLinePanel()
    }
    if (selectJob.id === 'main') {
      return this.renderTaskPanel()
    }
    return this.renderJobPanel(selectJob.type)
  }
}
