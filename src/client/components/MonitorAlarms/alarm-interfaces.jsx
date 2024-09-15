import React from 'react'
import _ from 'lodash'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Modal,
  Row,
  Col,
  Button,
  Input,
  Tooltip,
  message,
  Popconfirm,
  Select,
  Radio,
  notification,
} from 'antd';
import Icon from '../Common/sugo-icon'
import { validateFieldsAndScroll } from '../../common/decorators'
import HoverHelp from '../Common/hover-help'
import { withCommonFilter } from '../Common/common-filter'
import classnames from 'classnames'
import InterfaceParamsInput from './interface-params-input'
import {immutateUpdate} from 'common/sugo-utils'
import {SUGO_ALARMS_API_KEYS} from 'common/constants'
import FixWidthHelper from 'client/components/Common/fix-width-helper-no-hidden'
import Fetch from 'client/common/fetch-final'
import moment from 'moment'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 15 }
}

const formItemLayoutWithOutLabel = {
  wrapperCol: { span: 15, offset: 6 }
}

const initialParamsValue =  [
  { key: 'contacts', val: '${contacts}' },
  { key: 'content', val: '${content}' }
]


/**
 *  监控告警-编辑告警接口管理控件
 * @export
 * @class AlarmInterfaces
 * @extends {React.Component}
 */
@Form.create()
@withCommonFilter
@validateFieldsAndScroll
export default class AlarmInterfaces extends React.Component {

  state = {
    editingInterface: null,
    hideContentType: true,
    testingReceivers: [],
    testingContent: '',
    selectedApi: ''
  }

  componentDidMount() {
    this.reset()
  }

  setParams = (formData) => {
    formData.params = []
    _.each(formData, (val, key) => {
      if (_.startsWith(key, 'param-')) {
        formData.params.push(val)
        delete(formData[key])
      }
    })
    formData.params = _.uniqBy(formData.params.filter(p => p.key !== ''), 'key')
    return formData
  }

  onSave = async (e) => {
    e.preventDefault()
    const { editingInterface } = this.state
    const { modifyAlarmInterfaces, reloadAlarmInterfaces, alarmInterfaces } = this.props
    let formData = await this.validateFieldsAndScroll()
    if (!formData) return
    if (formData.method === 'POST' && !formData.content_type) {
      message.warn('请选择内容类型')
      return
    }
    // 解析params参数
    formData = this.setParams(formData)
    if (formData.params.length === 0) {
      message.warn('请填写方法参数')
      return
    }
    if (formData.method === 'GET') { // get 方式不设置此值
      formData.content_type = null
    }
    const id = _.get(editingInterface, 'id')
    if (id) {
      // 判断不能创建同样类型的接口
      if (_.some(alarmInterfaces, intf => intf.id !== id && +formData.type === intf.type)) {
        message.warning('操作失败：已经存在此类型的接口')
        return
      }
      let res = await modifyAlarmInterfaces('', arr => {
        let preModIdx = _.findIndex(arr, ai => ai.id === id)
        if (preModIdx < 0) {
          return arr
        }
        return immutateUpdate(arr, [preModIdx], prev => ({...prev, ...formData}))
      })
      if (!res || !res.resUpdate) {
        return
      }
      this.setState({editingInterface: null})
    } else {
      // 判断不能创建同样类型的接口
      if (_.some(alarmInterfaces, intf => +formData.type === intf.type)) {
        message.warning('操作失败：已经存在此类型的接口')
        return
      }
      // 判断不能创建同样类型的接口
      let res = await modifyAlarmInterfaces('', arr => {
        return [...(arr || []), formData]
      })
      if (!res || _(res.resCreate).compact().isEmpty()) {
        return
      }
    }
    message.success('操作成功')
    await reloadAlarmInterfaces()
    this.reset()
  }

  delete = async (c) => {
    const { modifyAlarmInterfaces, reloadAlarmInterfaces } = this.props
    let res = await modifyAlarmInterfaces('', arr => arr.filter(intf => intf.id !== c.id))
    if (res && res.resDelete) {
      message.success('删除成功!')
      await reloadAlarmInterfaces()
    }
  }

  edit = (editingInterface) => {
    this.reset()
    this.setState({ selectedApi: _.get(editingInterface, 'type', 0) + '' })
    // 编辑的时候回绑状态
    const hideContentType = editingInterface.method === 'GET'
    this.setState({ editingInterface, hideContentType })
  }

  reset = () => {
    const { selectedApi } = this.state
    this.setState({ selectedApi })
    this.props.form.resetFields()
  }

  onChangeMethod = (v) => {
    this.setState({hideContentType: v === 'GET'})
  }

  searchFilter(data, keys, search) {
    const str = 'return ' + keys.map(k => {
      const val = data[k]
      const flag = val && val.indexOf(search) !== -1
      return !!flag
    }).join('||')
    return new Function(str)()
  }

  removeParam = (curIdx) => {
    const { form } = this.props
    let params = form.getFieldValue('params')
    params = _.cloneDeep(params)
    params.splice(curIdx, 1)
    form.setFieldsValue({ params })
  }

  addParam = () => {
    const { form } = this.props
    const params = form.getFieldValue('params')
    const nextParms = params.concat({key: '', val: ''})
    form.setFieldsValue({
      params: nextParms
    })
  }

  resetParams = () => {
    const { form } = this.props
    const { editingInterface } = this.state
    let editParams = _.get(editingInterface, 'params')
    if (!editParams || editParams.length === 0) {
      editParams = initialParamsValue
    }
    this.reset()
    form.setFieldsValue({
      params: editParams
    })
  }

  checkParamInput = (rule, value, callback) => {
    const { form } = this.props
    const { key, val } = value
    if (_.isEmpty(key) || _.isEmpty(val)) {
      callback('请填填写完整的参数内容')
      return
    }
    // 验证key是否有重复
    const formData = form.getFieldsValue()
    let params = []
    _.each(formData, (val, key) => {
      if (_.startsWith(key, 'param-')) {
        if (formData[key]) {
          params.push(formData[key])
        }
      }
    })
    const keys = _.map(params, p => p['key'])
    if (_.get(_.countBy(keys, k => k), key) > 1) {
      callback('key已存在，请重新输入')
      return
    }
    callback()
  }


  // 渲染方法参数
  renderParams = () => {
    const { getFieldDecorator, getFieldValue } = this.props.form
    const { editingInterface } = this.state
    const editParams = _.get(editingInterface, 'params')
    getFieldDecorator('params', { initialValue: editParams || initialParamsValue })
    const params = getFieldValue('params')
    return params.map((obj, idx) => {
      if (!obj) return null
      return (
        <Form.Item
          {...(idx === 0 ? formItemLayout : formItemLayoutWithOutLabel)}
          label={idx === 0 ? '方法参数' : ''}
          required={false}
          key={`${obj.key}-${idx}`}
        >
          {getFieldDecorator(`param-${idx}`, {
            rules: [{ validator: this.checkParamInput }],
            initialValue: obj
          }) ( <InterfaceParamsInput /> )}
          <Icon
            title="删除参数"
            className="dynamic-delete-button iblock font16 pointer color-red line-height32"
            type="minus-circle"
            onClick={() => this.removeParam(idx)}
          />
        </Form.Item>
      )
    })
  }

  testInterface = async () => {
    let { testingReceivers, testingContent, selectedApi } = this.state

    if (!selectedApi) return message.warn('请先选择接口类型')
    if (_.isEmpty(testingReceivers)) {
      message.warn('请先设置接收者')
      return
    }
    if (!testingContent) {
      message.warn('请设置发送内容')
      return
    }

    let {projectCurrent, form} = this.props
    let formData = form.getFieldsValue()
    //测试post参数(params)格式： { dbThreshold, metric_rules: { title, rules }, query_params, alarm_types, project_name, name}
    const metric_rules = {
      title: '总记录数-接口测试',
      rules: [{
        operator: 'greaterThan',
        threshold: 0
      }]
    }
    const alarm_types = [{
      curInterface: 'temp',
      tempInterface: formData,
      receivers: testingReceivers,
      error_template: testingContent
    }]
    const query_params = { filters: [{col: '__time', op: 'in', eq: '-900 second'}] }
    const params = {
      dbThreshold: 100,
      query_params,
      metric_rules,
      alarm_types,
      project_name: projectCurrent && projectCurrent.name || '(项目名称)',
      name: '测试接口',
      project_id: projectCurrent && projectCurrent.id
    }
    // 告警
    // res: {"result":{"time":"2017-08-30T02:49:13.292Z","state":true,"notify_mode":"短信告警"},"code":0}
    const res = await Fetch.post('/app/monitor-alarms/interface-test', params)
    const { result: [{ notify_mode, time, state }] } = res
    let mode = {}
    _.keys(SUGO_ALARMS_API_KEYS).map( i => {
      mode[SUGO_ALARMS_API_KEYS[i].type] = i
    })
    notification[state ? 'success' : 'warn']({
      message: <p className="font16">测试接口通知</p>,
      description: <div className="font11">
        <p>接口类型：{mode[notify_mode]}</p>
        <p>接口发送状态：{state ? '已通知' : '未通知'}</p>
        <p>接口发送时间：{moment(time).format('YYYY年MM月DD日 HH时mm分ss秒')}</p>
      </div>,
      duration: 15
    })
  }

  renderShellForm({formItemLayout, editingInterface, interfaceTypeDict, hideContentType, testingContent, testingReceivers, formItemLayoutWithOutLabel, persons}) {
    const { getFieldDecorator } = this.props.form
    const { selectedApi } = this.state
    return (
      <Form>
        <Form.Item
          {...formItemLayout}
          label="接口名称"
        >
          {getFieldDecorator('name',  {
            rules: [{ required: true, message: '请输入告警接口名称', max: 25, whitespace: true }],
            initialValue: _.get(editingInterface, 'name', null)
          }) ( <Input className="width-100" placeholder="请输入告警接口名称" /> )}
        </Form.Item>
        <Form.Item
          {...formItemLayout}
          label={<HoverHelp addonBefore="PATH" content="shell文件路径" />}
        >
          {getFieldDecorator('url',  {
            rules: [
              { required: true, message: '请输入绝对路径' },
              { validator: (rule, value, callback) => {
                let reg = /(.sh)$/
                if (reg.test(value)) return callback()
                callback('非法路径')
              }}
            ],
            initialValue: _.get(editingInterface, 'url')
          }) ( <Input className="width-100" placeholder="请输入绝对路径" /> )}
        </Form.Item>
        <Form.Item
          {...formItemLayout}
          label="接口类型"
          hasFeedback
        >
          {getFieldDecorator('type',  { // 接口类型：0=邮件;1=短信
            // initialValue: _.get(editingInterface, 'type', 0) + ''
            initialValue: selectedApi || _.get(editingInterface, 'type', 0) + '',
            rules:[{ required: true }]
          }) (
            <Select onChange={(val) => this.setState({testingReceivers: [], selectedApi: val})} >
              {_.keys(interfaceTypeDict).map(type => {
                return (
                  <Select.Option
                    key={type}
                    value={type}
                  >
                    {`${interfaceTypeDict[type]}接口`}
                  </Select.Option>
                )
              })}
            </Select>
          )}
        </Form.Item>
        {this.renderParams()}
        <Form.Item {...formItemLayoutWithOutLabel}>
          <span
            className="pointer"
            onClick={this.addParam}
            title="增加一个条件"
          >
            <Icon className="mg1r" type="plus-circle-o" />
            增加一个参数
          </span>
          <span
            className="pointer mg3l"
            onClick={this.resetParams}
            title="重置参数模板"
          >
            <Icon className="mg1r" type="sync" />
            重置参数模板
          </span>
        </Form.Item>
        <Form.Item
          {...formItemLayout}
          label="测试"
          hasFeedback
        >
          <FixWidthHelper
            toFix="last"
            toFixWidth="80px"
          >
            <Input.TextArea
              placeholder="请输入 content 变量模版，可插入告警模版变量"
              autosize
              className="mg1b"
              value={testingContent}
              onChange={ev => this.setState({testingContent: ev.target.value})}
            />
            <Select
              placeholder="请选择接收人"
              mode="multiple"
              value={testingReceivers}
              onChange={vals => {
                this.setState({testingReceivers: vals})
              }}
            >
              {persons.map(person => {
                return (
                  <Select.Option value={person.id} key={person.id}>{person.name}</Select.Option>
                )
              })}
            </Select>
            <Button className="mg2l" onClick={this.testInterface}>测试</Button>
          </FixWidthHelper>
        </Form.Item>
        <Form.Item {...formItemLayoutWithOutLabel}>
          <Button
            type="primary"
            icon={<LegacyIcon type={editingInterface ? 'edit' : 'plus-circle-o'} />}
            onClick={this.onSave}
          >
            {editingInterface ? '更新接口' : '添加新的接口'}
          </Button>
        </Form.Item>
      </Form>
    );
  }

  render() {
    let {
      alarmInterfaces: dbInterfaces = [],
      onCancel,
      visible,
      keywordInput: KeywordInput,
      searching,
      form,
      persons
    } = this.props
    
    const { getFieldDecorator, getFieldValue, resetFields } = form
    let { editingInterface = {}, hideContentType, testingReceivers, testingContent, selectedApi } = this.state
    let notUseShellForm = true
    if (~~selectedApi === SUGO_ALARMS_API_KEYS.SHELL.type) notUseShellForm = false
    const limitedInterfaces = searching
      ? dbInterfaces.filter(c => this.searchFilter(c, ['url', 'name'], searching))
      : dbInterfaces

    let interfaceTypeDict = _(SUGO_ALARMS_API_KEYS).mapKeys(a => `${a.type}`).mapValues(a => a.name).value()

    let curInterfaceType = Number(getFieldValue('type') || '0')
    if (curInterfaceType === SUGO_ALARMS_API_KEYS.SMS.type) {
      persons = persons.filter(p => p.phone)
    } else if (curInterfaceType === SUGO_ALARMS_API_KEYS.EMAIL.type) {
      persons = persons.filter(p => p.email)
    }
    return (
      <Modal
        width="800px"
        visible={visible}
        title="自定义告警接口"
        onCancel={() => {
          this.setState({
            editingInterface: null,
            hideContentType: true,
            testingReceivers: [],
            testingContent: '',
            selectedApi: ''
          })
          resetFields()
          onCancel()
        }}
        destroyOnClose
        footer={[
          <Button
            key="back"
            size="large"
            onClick={() => {
              this.setState({
                editingInterface: null,
                hideContentType: true,
                testingReceivers: [],
                testingContent: '',
                selectedApi: ''
              })
              resetFields()
              onCancel()
            }}
          >关闭</Button>
        ]}
      >
        {
          notUseShellForm ? 
            <Form>
              <Form.Item
                {...formItemLayout}
                label="接口名称"
              >
                {getFieldDecorator('name',  {
                  rules: [{ required: true, message: '请输入告警接口名称', max: 25, whitespace: true }],
                  initialValue: _.get(editingInterface, 'name', null)
                }) ( <Input className="width-100" placeholder="请输入告警接口名称" /> )}
              </Form.Item>
              <Form.Item
                {...formItemLayout}
                label={<HoverHelp addonBefore="URL" content="接口地址" />}
              >
                {getFieldDecorator('url',  {
                  rules: [{ required: true, message: '请输入合法的接口地址', type: 'url', whitespace: true }],
                  initialValue: _.get(editingInterface, 'url', 'http://')
                }) ( <Input className="width-100" placeholder="请输入合法的接口地址(http://api-url/send)" /> )}
              </Form.Item>
              <Form.Item
                {...formItemLayout}
                label="接口类型"
                hasFeedback
              >
                {getFieldDecorator('type',  { // 接口类型：0=邮件;1=短信
                // initialValue: _.get(editingInterface, 'type', 0) + ''
                  initialValue: selectedApi,
                  rules:[{ required: true }]
                }) (
                  <Select onChange={(val) => this.setState({testingReceivers: [], selectedApi: val})} >
                    {_.keys(interfaceTypeDict).map(type => {
                      return (
                        <Select.Option
                          key={type}
                          value={type}
                        >
                          {`${interfaceTypeDict[type]}接口`}
                        </Select.Option>
                      )
                    })}
                  </Select>
                )}
              </Form.Item>
              <Form.Item
                {...formItemLayout}
                label={<HoverHelp addonBefore="调用方法" content="设置后将会使用该设置作为method" />}
                hasFeedback
              >
                {getFieldDecorator('method',  {
                  initialValue: _.get(editingInterface, 'method', 'GET')
                }) (
                  <Select onChange={this.onChangeMethod}>
                    <Select.Option value="GET">GET</Select.Option>
                    <Select.Option value="POST">POST</Select.Option>
                  </Select>
                )}
              </Form.Item>
              <Form.Item
                label="内容类型"
                {...formItemLayout}
                className={classnames({'hide': hideContentType})}
              >
                {getFieldDecorator('content_type',  {
                  initialValue: _.get(editingInterface, 'content_type', 'json')
                }) (
                  <Radio.Group>
                    <Radio value="json">json</Radio>
                    <Radio value="x-www-form-urlencoded">x-www-form-urlencoded</Radio>
                  </Radio.Group>
                )}
              </Form.Item>
              {this.renderParams()}
              <Form.Item {...formItemLayoutWithOutLabel}>
                <span
                  className="pointer"
                  onClick={this.addParam}
                  title="增加一个条件"
                >
                  <Icon className="mg1r" type="plus-circle-o" />
                增加一个参数
                </span>
                <span
                  className="pointer mg3l"
                  onClick={this.resetParams}
                  title="重置参数模板"
                >
                  <Icon className="mg1r" type="sync" />
                重置参数模板
                </span>
              </Form.Item>

              <Form.Item
                {...formItemLayout}
                label="测试"
                hasFeedback
              >
                <FixWidthHelper
                  toFix="last"
                  toFixWidth="80px"
                >
                  <Input.TextArea
                    placeholder="请输入 content 变量模版，可插入告警模版变量"
                    autosize
                    className="mg1b"
                    value={testingContent}
                    onChange={ev => this.setState({testingContent: ev.target.value})}
                  />
                  <Select
                    placeholder="请选择接收人"
                    mode="multiple"
                    value={testingReceivers}
                    onChange={vals => {
                      this.setState({testingReceivers: vals})
                    }}
                  >
                    {persons.map(person => {
                      return (
                        <Select.Option value={person.id} key={person.id}>{person.name}</Select.Option>
                      )
                    })}
                  </Select>
                  <Button className="mg2l" onClick={this.testInterface}>测试</Button>
                </FixWidthHelper>
              </Form.Item>

              <Form.Item {...formItemLayoutWithOutLabel}>
                <Button
                  type="primary"
                  icon={<LegacyIcon type={editingInterface ? 'edit' : 'plus-circle-o'} />}
                  onClick={this.onSave}
                >
                  {editingInterface ? '更新接口' : '添加新的接口'}
                </Button>
              </Form.Item>
            </Form>
            : 
            this.renderShellForm({formItemLayout, editingInterface, interfaceTypeDict, hideContentType, testingContent, testingReceivers, formItemLayoutWithOutLabel, persons})
        }

        <Row gutter={10}>
          <Col span={24} className="mg2t pd2t font16 bordert dashed mg1b">已创建的告警接口列表</Col>
          <Col span={18}>
            <KeywordInput icon="search" className="width-100" placeholder="搜索告警接口URL" />
          </Col>
        </Row>

        <Row className="bordert dashed mg2t height100 overscroll-y" gutter={10}>
          {dbInterfaces.length === 0 ? (<div className="color-999 pd3 aligncenter">暂无内容</div>) : null}

          {dbInterfaces.length !== 0 && limitedInterfaces.length === 0
            ? (<div className="color-999 pd3 aligncenter">没有符合条件的内容</div>)
            : null}

          {limitedInterfaces.map(c => {
            return [
              <Col
                span={14}
                key={`L${c.id}`}
                className="mg1t"
              >
                <Input
                  disabled
                  value={c.name || undefined}
                  suffix={(
                    <Icon
                      type="edit"
                      className="pointer mg1r"
                      onClick={() => this.edit(c)}
                    />
                  )}
                />
              </Col>,
              <Col
                span={8}
                key={`R${c.id}`}
                className="mg1t"
              >
                <Tooltip placement="right" title={'删除该联系人'}>
                  <Popconfirm
                    placement="left" title="确定要删除该联系人吗？"
                    okText="确定"
                    cancelText="取消"
                    onConfirm={() => this.delete(c)}
                  >
                    <Icon type="delete" className="pointer font14 line-height28" />
                  </Popconfirm>
                </Tooltip>
              </Col>
            ]
          })}
        </Row>
      </Modal>
    );
  }
}
