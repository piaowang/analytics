import React from 'react'
import { CheckCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Row, Col, Input, Button, message, InputNumber, Radio, Popconfirm, Card } from 'antd';
import _ from 'lodash'
import CronPicker from '../Common/cron-picker'
import {withPoster} from '../Fetcher/poster'
import {isDiffByPath, toQueryParams, tryJsonParse} from '../../../common/sugo-utils'
import {RELOAD_TREE} from './constants'
import {sendURLEncoded} from '../../common/fetch-utils'
import PubSub from 'pubsub-js'
import { validateFields } from '../../common/decorators'
import {generate} from 'shortid'
import TagPicker from './tag-picker'
import Fetch from '../../common/fetch-final'
import C2Q from 'cron-to-quartz'
import HoverHelp from '../Common/hover-help'
import {browserHistory} from 'react-router'
import moment from 'moment'
import { getNextTriggerDateByLater } from '../../common/cron-picker-kit'
import ExecutoreScript from './executore-script'
import Icon from '../Common/sugo-icon'

const FormItem = Form.Item
const { TextArea } = Input
const RadioGroup = Radio.Group
const defaultCronInfo = {
  info: {
    unitType: '0', 
    period: 'day', 
    cronExpression: '0 0 * * *'
    // taskStartTime: moment(new Date())
  }, 
  status: 'create'
}

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 6 },
    xxl: { span: 4 }
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 18 },
    xxl: { span: 20 }
  }
}

const overViewFormSchemeWhenCreating = [
  {
    key: 'showName',
    title: '任务名称',
    type: 'Input',
    required: true
  },
  {
    key: 'description',
    title: '描述',
    type: 'TextArea',
    required: false,
    span: 24,
    formItemLayout: {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 3 },
        xxl: { span: 2 }
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 9 },
        xxl: { span: 10 }
      }
    }
  },
  {
    key: 'relatedTags',
    title: '关联标签',
    type: 'TagPicker',
    colExtraProps: {
      style: {clear: 'left'}
    }
  }
]

const overViewFormSchemeWhenModify = [
  {
    key: 'createTimesString',
    title: '创建时间',
    type: 'Input',
    disabled: true
  },
  {
    key: 'lastModifiedTimeString',
    title: '修改时间',
    type: 'Input',
    disabled: true
  },
  {
    key: 'showName',
    title: '任务名称',
    type: 'Input',
    required: true
  },
  {
    key: 'relatedTags',
    title: '关联标签',
    type: 'TagPicker'
  },
  {
    key: 'description',
    title: '描述',
    type: 'TextArea',
    required: false,
    span: 24,
    formItemLayout: {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 3 },
        xxl: { span: 2 }
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 21 },
        xxl: { span: 22 }
      }
    }
  },{
    key: 'flowOverride',
    title: (<span>执行器<HoverHelp icon="question-circle-o" content="默认选择任意一台执行器,您也可以自定义多台执行器执行任务." className="mg1l" /></span>),
    type: 'flowOverride',
    required: false,
    defaultVal: {
      type: 0, 
      activeLists: [] // 执行器队列
    },
    span: 24,
    formItemLayout: {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 3 },
        xxl: { span: 2 }
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 21 },
        xxl: { span: 22 }
      }
    }
  },
  {
    key: 'failureEmails',
    title: '失败邮件通知',
    type: 'Input',
    disabled: false
  },
  {
    key: 'successEmails',
    title: '成功邮件通知',
    type: 'Input',
    disabled: false
  }
]

// TODO 未来将新增根据任务查询调度接口
@Form.create()
@validateFields
export default class TaskBasicSettings extends React.Component {
  static getDerivedStateFromProps(props, state) {
    if(props.value.id !== state.taskId) {
      return {
        taskId: props.value.id,
        taskStartTime: _.get(props.value, 'cronInfo.taskStartTime', moment().format('YYYY-MM-DD HH:mm')) 
      }
    }
    return null
  }

  state = {
    taskId: '',
    taskStartTime: moment().format('YYYY-MM-DD HH:mm'),
    scheduleArr: [],
    random: 0
  }

  componentDidMount() {
    const { scheduleInfo } = this.props
    this.setState({
      scheduleArr: scheduleInfo
    })
  }

  componentDidUpdate(prevProp){
    if (isDiffByPath(this.props, prevProp, 'value.id')) {
      this.resetForm()
      // 切换任务更新调度
      this.setState({
        scheduleArr: this.props.scheduleInfo,
        random: this.props.scheduleInfo.length
      })
    }
    if(isDiffByPath(this.props, prevProp, 'scheduleInfo')) {
      // 调度信息发生变化及时进行更新
      this.setState({
        scheduleArr: this.props.scheduleInfo,
        random: this.props.scheduleInfo.length
      })
    }
  }
  
  _posterForManager = null
  
  resetForm = () => {
    this.props.form.resetFields()
  }

  disabledDate = (current) => {
    // Can not select days before today and today
    return current && current < moment().startOf('day')
  }
  
  renderControl = (fs, finalVal) => {
    let { value, dataSource, tagsAlreadyBinded, executors } = this.props
    const compProps = {
      disabled: _.isFunction(fs.disabled) ? fs.disabled(finalVal) : fs.disabled,
      ...(fs.componentExtraProps || {})
    }
    const { metadata } = value

    switch (fs.type) {
      case 'TagPicker':
        return (<TagPicker 
          {...compProps} 
          allowClear 
          dataSource={dataSource} 
          disabledOptions={tagsAlreadyBinded}
                />)
      case 'flowOverride':
        return (<ExecutoreScript 
          {...compProps} 
          executors={executors} 
          taskExecutor={metadata.idealExecutors} 
          taskId={this.state.taskId}
                />)
      case 'Radio':
        return <RadioGroup {...compProps} />
      case 'TextArea':
        return <TextArea {...compProps} rows={4} />
      case 'InputNumber':
        return <InputNumber {...compProps} />
      default :
        return <Input {...compProps} />
    }
  }

  toggleSchedule = async index => {
    // TODO 开关调度调整
    const { form, value } = this.props
    const { scheduleArr } = this.state
    const { info, status, scheduleId } = scheduleArr[index]
    const { cronExpression } = info

    let fieldVals = form.getFieldsValue()
    let finalObj = {
      ...value,
      ...fieldVals,
      cronInfo: info,
      cronExpression
    }

    let setScheduleRes = await this.setScheduleTask(finalObj, status, scheduleId)
    if (setScheduleRes.status === 'success') {
      message.success(`${scheduleId ? '停止' : '启动'}调度成功`)
    } else {
      message.warn(`${scheduleId ? '停止' : '启动'}调度失败`)
    }
  }

  getFormField = async () => {
    // 暴露给父级ref 待优化
    let fieldVals = await this.validateFields()
    return fieldVals
  }

  doSaveBasicSettings = async (poster, quite) => {
    let {value, projectId, taskExtraInfo, onExtraInfoChange} = this.props
    let isCreating = !(value && value.id)
    let fieldVals = await this.validateFields()
    if (!fieldVals) {
      return
    }
    
    let finalObj = {
      ...value,
      ...fieldVals
    }

    // TODO 保存执行器
    let toPost = isCreating ? {
      action: 'create',
      name: generate(),
      showName: finalObj.showName,
      description: finalObj.description || '',
      typeId: finalObj.typeId || 0,
      refProjectId: projectId
    } : {
      ajax: 'saveProjectBaseInfo',
      project: finalObj.name,
      refProjectId: projectId,
      projectData: JSON.stringify(_.pick(finalObj, ['id', 'showName', 'description', 'failureEmails', 'successEmails' /*, 'cronInfo', 'cronExpression'*/]))
    }

    if(!isCreating) {
      const { flowOverride } = fieldVals
      let executorList = (flowOverride && flowOverride.type === 1) ? flowOverride.activeLists : []
      toPost.executorIds = JSON.stringify(executorList)
    }

    let res = await poster.fetch(null, {
      ...sendURLEncoded,
      body: toQueryParams(toPost)
    })

    res = tryJsonParse(res)
    if ('error' in res || res.status === 'error') {
      message.warn(`保存任务分类失败：${res.error || res.message}`)
      return
    }
    // 保存 relatedTags 和 cronInfo
    let taskId = isCreating ? _.get(res, 'newProject.id') : value.id
    await onExtraInfoChange({
      ...(taskExtraInfo || {}),
      project_id: projectId,
      task_id: taskId,
      related_tags: fieldVals.relatedTags
    })

    this.setState({pendingObject: undefined})
    if (!quite) {
      message.success('保存任务成功')
      // TODO data tree
      this.props.reloadTreeInfos()
    }
    PubSub.publish(RELOAD_TREE)
    if (isCreating) {
      browserHistory.push(`/console/task-schedule-manager/${taskId}?activeKey=overview`)
    }
  }

  setScheduleTask = async (finalObj, nextStatus, scheduleId) => {
    let { projectId, reloadSchedules} = this.props
    try {
      if (scheduleId) {
        return await Fetch.post('/app/task-schedule/schedule', null, {
          headers: sendURLEncoded.headers,
          body: toQueryParams({
            action: 'removeSched',
            scheduleId: scheduleId
          })
        })
      }

      // 查询 flowId 并启用调度
      let flowsInfo = await Fetch.get(`/app/task-schedule/manager?${toQueryParams({
        ajax: 'fetchprojectflows',
        project: finalObj.name,
        refProjectId: projectId
      })}`)
      if (_.isEmpty(flowsInfo.flows)) {
        message.warn('没有配置任务流程，无法启动调度。')
        return { status: 'fail' }
      }
      
      let startDate = moment(finalObj.cronInfo.taskStartTime)
      startDate = getNextTriggerDateByLater(finalObj.cronExpression, startDate)
      startDate= moment(startDate[0])

      const scheduleTime = startDate.locale('en').format('hh,mm,A,Z')
      const scheduleDate = startDate.format('MM/DD/YYYY')
      const { cronInfo } = finalObj

      let scheduleParam = {
        ajax: 'scheduleCronFlow',
        projectName: finalObj.name,
        projectId: finalObj.id,
        refProjectId: projectId,
        flow: _.get(flowsInfo, 'flows[0].flowId'),
        cronExpression: C2Q.getQuartz(finalObj.cronExpression)[0].join(' '),
        scheduleTime,
        scheduleDate
      }

      scheduleParam.info = JSON.stringify(cronInfo)

      return await Fetch.post('/app/task-schedule/schedule', {} ,{
        ...sendURLEncoded,
        body: toQueryParams(scheduleParam)
      })
    } catch (e) {
      console.log(e)
    } finally {
      reloadSchedules()
    }
  }

  renderSaveTaskBtn = withPoster(_.identity)(poster => {
    this._posterForManager = poster
    return (
      <Button
        type="success"
        icon={<CheckCircleOutlined />}
        loading={poster.isFetching}
        onClick={() => this.doSaveBasicSettings(poster)}
      >保存任务</Button>
    );
  })

  renderCronComponent = () => {
    const { scheduleArr, taskStartTime } = this.state // 保存在state中，渲染state不修改props
    let children = []
    if(scheduleArr && scheduleArr.length) {
      children = scheduleArr.map((item, i) => {
        const disabled = (item.status === 'READY')
        const { info, scheduleId } = item
        return (
          <Card hoverable className="schedule-item" key={scheduleId+`${i}`}>
            <CronPicker 
              disabled={disabled} 
              value={info} 
              currentDate={taskStartTime} 
              onChange={(a) => {
                this.changeCronInfo(a,i)
              }
            }></CronPicker>
            {
              /* flowOverride && <div>
                当前指定执行器： 
                <Tag>{flowOverride.toString()}</Tag>
              </div> */
            }
            <Popconfirm
              title={`是否${disabled ? '停止调度' : '启用调度'}`}
              okType="primery"
              onConfirm={() => this.toggleSchedule(i)}
            >
              <div className="btn-container">
                <Button>
                  {`${disabled ? '关闭': '启动'}调度`}
                </Button>
              </div>
            </Popconfirm>
            {
              !disabled && <span className="close-btn">
                <Button type="danger" shape="circle" icon={<CloseOutlined />} size="small"
                  onClick={() => this.deleteSchedule(i)} 
                />
              </span>
            }
          </Card>
        );
      })
    }

    if(children.length<3) {
      children.push((
        <div className="schedule-item" key="add-btn">
          {this.renderAddCronInfoBox()}
        </div>
      ))
    }

    return children
  }
  
  changeCronInfo(cron, index) {
    const { scheduleArr } = this.state // cronExpression
    scheduleArr[index] = {info:{...cron}}
    // scheduleArr[index] = { cronExpression, period, unitType }
    this.setState({
      scheduleArr
    })
  }

  pushChildIntoSchedule = () => {
    const { scheduleArr } = this.state 

    if(scheduleArr.length > 0) {
      // 防止开启多个调度编辑却不启动
      let isok = scheduleArr.filter(item => item.status === 'create')
      if(isok.length) return message.info('请先启动编辑中的任务调度')
    }

    scheduleArr.push(defaultCronInfo)
    this.setState({
      scheduleArr
    })
  }

  deleteSchedule = index => {
    const { scheduleArr } = this.state

    let arr = scheduleArr.filter((item, i) => i !== index)
    this.setState({
      scheduleArr: arr
    })
  }
 
  renderAddCronInfoBox = () => {
    return(<div className="add-cron" onClick={this.pushChildIntoSchedule}>
      <Icon type="sugo-switcher" />
    </div>)
  }

  render() {
    let {form, value, taskExtraInfo, scheduleInfo} = this.props
    let {getFieldDecorator} = form
    let isCreating = !(value && value.id)
    const { metadata } = value
    // merge extra info
    if (taskExtraInfo) {
      value = {...value, relatedTags: taskExtraInfo.related_tags}
    }
    if (scheduleInfo) {
      value = {...value, scheduleStatus: '1'}
    }

    return (
      <Form>
        <Row gutter={10}>
          {(isCreating ? overViewFormSchemeWhenCreating : overViewFormSchemeWhenModify).map((fs,i) => {
            let visible = _.isFunction(fs.visible) ? fs.visible(value, form.getFieldsValue()) : fs.visible
            if (visible === false) {
              return null
            }
            let initVal = value[fs.key]
            if(initVal === 'undefined' && fs.key === 'cronInfo') {
              initVal = fs.defaultVal
            } 
            if(initVal === undefined && fs.key === 'flowOverride') {
              initVal = (metadata.idealExecutors && metadata.idealExecutors.length)
                ? { ...fs.defaultVal, type:1, activeLists: metadata.idealExecutors.map(item => item.id)}
                : fs.defaultVal
            }

            return (
              <Col xl={fs.span || 12} lg={fs.span || 12} key={fs.key} {...(fs.colExtraProps || {})}>
                <FormItem
                  label={fs.title}
                  {...(fs.formItemLayout || formItemLayout)}
                >
                  {getFieldDecorator(fs.key, {
                    initialValue: initVal,
                    rules: [fs.required
                      ? {
                        required: fs.required,
                        message: '此项必填'
                      } : null].filter(_.identity)
                  })(
                    this.renderControl(fs, value, form.getFieldsValue())
                  )}
                </FormItem>
              </Col>
            )
          })}
        </Row>
        {!isCreating && <Row className="carousel-box">
          <Col className="item-rol-title ant-col-xs-24 ant-col-sm-3 ant-col-xxl-2">
            <span className="text-box">任务多调度
              <HoverHelp 
                className="mg1l" 
                icon="question-circle-o" 
                content="新增一个任务调度，您可已启用它来周期性执行任务。调度允许存在多个(最多3个)。当然，执行周期也将由您自定义" 
              />:
            </span> 
          </Col>



          <Col className="ant-col-xs-24 ant-col-sm-21 ant-col-xxl-22">
            <div className="schedule-list-container">
              { this.renderCronComponent() }
            </div>
            {/* (scheduleArr.length<3) && this.renderAddCronInfoBox()*/}
          </Col>
        </Row>}
        <div className="aligncenter">
          {this.renderSaveTaskBtn({
            url: '/app/task-schedule/manager',
            doFetch: false
          })}
        </div>
      </Form>
    )
  }
}
