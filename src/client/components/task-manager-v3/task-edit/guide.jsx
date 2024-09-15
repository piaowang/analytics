import { PlusOutlined } from '@ant-design/icons'
import { Button, Steps, Tooltip, Card, Row, Col } from 'antd'
import React from 'react'
import { DISPLAY_TASK_MODEL } from '../constants'

const Step = Steps.Step

export default function GuidePage(props) {
  const { onAddTask } = props
  const handleAddTask = type => {
    onAddTask(type)
  }

  // 指引界面配置信息
  const guideConfig = [
    {
      imageUrl: '/_bc/sugo-analytics-static/assets/images/task/task.png',
      btnText: '创建离线工作流',
      handleClick: () => handleAddTask(DISPLAY_TASK_MODEL.offLineTask),
      steps: [
        { title: '创建工作流', description: '填写名称' },
        {
          title: '拖拽组件形成工作流',
          description: (
            <div className='width-100 aligncenter mg1t'>
              <img className='maxw-100 maxh150' src='/_bc/sugo-analytics-static/assets/images/task/task-flow.png' />
            </div>
          )
        },
        { title: '右键组件选择编辑脚本', description: '' },
        { title: '配置工作流信息', description: '定期调度、任务优先级、API告警...' }
      ]
    },
    {
      imageUrl: '/_bc/sugo-analytics-static/assets/images/task/task-group.png',
      btnText: '创建离线工作流组',
      handleClick: () => handleAddTask(DISPLAY_TASK_MODEL.offLineTaskGroup),
      steps: [
        { title: '创建离线工作流组', description: '填写名称' },
        {
          title: '拖拽组件形成工作流 形成任务依赖管理',
          description: (
            <div className='width-100 aligncenter mg1t'>
              <img className='maxw-100 maxh150' src='/_bc/sugo-analytics-static/assets/images/task/task-group-flow.png' />
            </div>
          )
        },
        { title: '配置工作流组信息', description: '定期调度、API告警....' }
      ]
    },
    {
      imageUrl: '/_bc/sugo-analytics-static/assets/images/task/realtime.png',
      btnText: '创建实时工作流',
      handleClick: () => handleAddTask(DISPLAY_TASK_MODEL.realTimeTask),
      steps: [
        { title: '创建实时工作流组', description: '填写名称' },
        {
          title: '拖拽组件形成工作流 形成任务依赖管理',
          description: (
            <div className='width-100 aligncenter mg1t'>
              <img className='maxw-100 maxh150' src='/_bc/sugo-analytics-static/assets/images/task/realtime-flow.png' />
            </div>
          )
        },
        { title: '可视化配置工作流信息' },
        { title: '常驻执行' }
      ]
    }
  ]

  /**
   * 遍历生成指引界面的选项
   * @param {*} param0
   */
  const renderItem = ({ imageUrl, btnText, handleClick, steps }) => {
    return (
      <Col span={6} offset={1}>
        <div className='height-100 aligncenter bg-white border pd3x width-100 iblock radius'>
          <div>
            <img className='height150 mg1t mg2t' src={imageUrl} />
          </div>
          <div>
            <Button className='mg2b mg2t' type='primary' onClick={handleClick} icon={<PlusOutlined />}>
              {btnText}
            </Button>
          </div>
          <div>
            <Steps direction='vertical' current={-1}>
              {steps.map((p, i) => {
                return (
                  <Step
                    key={`step_${i}`}
                    description={
                      <Card className='mg3r alignleft relative step-item' bodyStyle={{ padding: '8px' }}>
                        <div>{p.title}</div>
                        <div className='color-999 mg1t'>{p.description}</div>
                        <div className='border-triangle' />
                      </Card>
                    }
                  />
                )
              })}
            </Steps>
          </div>
        </div>
      </Col>
    )
  }

  return (
    <div className='guide-home bg-main pd3y'>
      <Row className='height-100'>
        <Col span={1} />
        {guideConfig.map(p => {
          return renderItem(p)
        })}
      </Row>
    </div>
  )
}
