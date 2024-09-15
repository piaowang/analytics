import React from 'react'
import _ from 'lodash'
import classNames from 'classnames'
import { Select, Card, Col, Row, Input } from 'antd'
import Icon from '../Common/sugo-icon'
import {isDiffByPath} from '../../../common/sugo-utils'
import {enableSelectSearch} from 'client/common/antd-freq-use-props'
import {SUGO_ALARMS_API_KEYS} from 'common/constants'

/**
 * 监控告警--设定告警接口接收人控件
 * @export
 * @class AlarmTimeInput
 * @extends {React.Component}
 */
export default class AlarmInterfaceReceiver extends React.Component {

  constructor(props) {
    super(props)
    const value = this.props.value || {}
    this.state = {
      error_template: value.error_template,
      normal_template: value.normal_template,
      curTemplate: value.curTemplate || '',
      receivers: value.receivers || [],
      receiverDepartment: value.receiverDepartment || null,
      showTmpl: false
    }
  }

  componentWillReceiveProps(nextProps) {
    // Should be a controlled component.
    if ('value' in nextProps && isDiffByPath(this.props, nextProps, 'value')) {
      const value = nextProps.value
      this.setState(_.isEmpty(value) ? {curTemplate: '', receivers: [], receiverDepartment: null} : value)
    }
  }

  toggleTmpl = () => {
    const { showTmpl } = this.state
    this.setState({showTmpl: !showTmpl})
  }

  render() {
    let {
      notifyTemplates, departments, dbContacts = [], wechatDepartments, wechatPersons,
      onChange, isFetchingDepartments, isFetchingContacts, isFetchingNotifyTemplates, isFetchingWechatDepartments,
      isFetchingWechatPersons,
      templateLayout, className, alarmInterfaces
    } = this.props
    let onChange0 = obj => onChange(_.omit(obj, 'showTmpl'))

    const { curTemplate, error_template, normal_template, receivers, showTmpl, receiverDepartment } = this.state

    const { sugoMonitorAlarmApis: sugoApis } = window.sugo

    // 监控告警判断是否显示系统短信接口、邮件接口
    const selectedTemplate = _.find(notifyTemplates, {id: curTemplate})
    let { interface_id, error_template: default_error_template, normal_template: default_normal_template } = selectedTemplate || {}

    // 过滤联系人填写了对应联系方式的记录
    // 接口类型 interface_id: sugo_email_alarm=邮件接口;sugo_sms_alarm=短信接口;sugo_wechat_alarm=微信接口，无需过滤

    let currInterfaceType = _.get(_.find([...alarmInterfaces, ..._.values(SUGO_ALARMS_API_KEYS)], intf => intf.id === interface_id), 'type', 0)
    if (currInterfaceType === SUGO_ALARMS_API_KEYS.EMAIL.type) {
      dbContacts = dbContacts.filter(o => !_.isEmpty(o.email))
    } else if (currInterfaceType === SUGO_ALARMS_API_KEYS.SMS.type) {
      dbContacts = dbContacts.filter(o => !_.isEmpty(o.phone))
    } else if (currInterfaceType === SUGO_ALARMS_API_KEYS.WECHAT.type) {
      isFetchingContacts = isFetchingWechatPersons
      isFetchingDepartments = isFetchingWechatDepartments
      dbContacts = [{id: '@all', name: '全部人', department: [0]}, ...(wechatPersons || []).map(wp => ({...wp, id: wp.userid}))]
      departments = wechatDepartments
    }
    let selectWidth = 300
    let contactIdDict = _.keyBy(dbContacts, 'id')
    let notifyTemplate = curTemplate && _.find(notifyTemplates, {id: curTemplate})
    return (
      <Row className={classNames('line-height32', className)}>
        <Col span={4} className="alignright bold mg2b">请选告警模版：</Col>
        <Col span={20} className="mg2b">
          <Select
            {...enableSelectSearch}
            value={curTemplate || undefined}
            className="mg2r"
            style={{ width: `${selectWidth}px` }}
            onChange={(v) => {
              this.setState({
                curTemplate: v,
                receiverDepartment: null,
                receivers: [],
                error_template: undefined,
                normal_template: undefined
              }, () => onChange0(this.state))
            }}
            placeholder={isFetchingNotifyTemplates ? '加载中' : '请选择告警模版'}
            notFoundContent={isFetchingNotifyTemplates ? '加载中' : '暂无内容'}
          >
            {notifyTemplates.map(m => <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>)}
          </Select>

          {notifyTemplate
            ? <span className={classNames({block: templateLayout === 'vertical'})}>
                告警类型：{_.get(_.find(_.values(SUGO_ALARMS_API_KEYS), {type: currInterfaceType}), 'name', '未知')}
            </span>
            : null}
        </Col>

        <Col span={4} className="alignright bold mg2b">接收人：</Col>
        <Col span={20} className="mg2b">
          <Select
            style={{ width: `calc(${selectWidth}px/2 - 8px)` }}
            dropdownMatchSelectWidth={false}
            {...enableSelectSearch}
            className="mg2r"
            placeholder={isFetchingDepartments ? '加载中' : '请选择部门'}
            notFoundContent={isFetchingDepartments ? '加载中' : '暂无内容'}
            value={receiverDepartment && `${receiverDepartment}` || undefined}
            onChange={(v) => {
              this.setState({receiverDepartment: v, receivers: []}, () => onChange0(this.state))
            }}
          >
            {_.take(departments, 100).map(dep => <Select.Option key={dep.id} value={`${dep.id}`}>{dep.name}</Select.Option>)}
          </Select>

          <Select
            style={{ width: `calc(${selectWidth}px/2 - 8px)` }}
            dropdownMatchSelectWidth={false}
            mode="multiple"
            placeholder={isFetchingContacts ? '加载中' : '请选择收件人'}
            notFoundContent={isFetchingContacts ? '加载中' : '暂无内容'}
            value={(receivers || []).filter(recvId => recvId in contactIdDict)}
            onChange={(v) => {
              if (!receiverDepartment && _.size(v) === 1) {
                let contact = _.find(dbContacts, {id: v[0]})
                if (contact) {
                  this.setState({
                    receiverDepartment: currInterfaceType === SUGO_ALARMS_API_KEYS.WECHAT.type
                      ? contact.department[0]
                      : contact.department_id,
                    receivers: v
                  }, () => onChange0(this.state))
                  return
                }
              }
              this.setState({receivers: v}, () => onChange0(this.state))
            }}
          >
            {_.take(dbContacts, 500)
              .filter(c => {
                if (receiverDepartment) {
                  if (currInterfaceType === SUGO_ALARMS_API_KEYS.WECHAT.type) {
                    return _.includes(c.department, +receiverDepartment)
                  }
                  return c.department_id === receiverDepartment
                } else {
                  return true
                }
              })
              .map(m => <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>)
            }
          </Select>

          <div
            className={classNames({itblock: templateLayout !== 'vertical'})}
            style={templateLayout === 'vertical' ? undefined : {
              width: `calc(100% - ${selectWidth}px)`,
              paddingLeft: '10px'
            }}
          >
            {receivers.map(recvId => {
              let c = contactIdDict[recvId]
              if (!c) {
                return null
              }
              let sendTo = currInterfaceType === SUGO_ALARMS_API_KEYS.EMAIL.type
                ? c.email
                : currInterfaceType === SUGO_ALARMS_API_KEYS.SMS.type
                  ? c.phone
                  : c.id
              let str = `${c && c.name || ''}：${sendTo}`
              return (
                <div key={recvId} className="elli" title={str}>
                  {str}
                </div>
              )
            })}
          </div>
        </Col>

        <div className="pointer mg1t" onClick={this.toggleTmpl}>
          设置告警通知信息模版
          <Icon className="mg1l" type={`caret-${!showTmpl ? 'down' : 'up'}`} />
        </div>
        <div className={classNames({'hide': !showTmpl})}>
          <Row gutter={16}>
            <Col
              span={templateLayout === 'vertical' ? 24 : 12}
              className={classNames({mg2b: templateLayout === 'vertical'})}
            >
              <Card bordered={false} className="bg-alarm-tmpl">
                <p className="color-tmpl-title">异常短信：</p>
                <Input.TextArea
                  rows={6}
                  value={error_template || default_error_template}
                  onChange={ev => {
                    let val = ev.target.value
                    this.setState({error_template: val === default_error_template ? null : val}, () => onChange0(this.state))
                  }}
                  placeholder="请先选择告警模版，再编辑模版内容"
                />
              </Card>
            </Col>
            <Col span={templateLayout === 'vertical' ? 24 : 12}>
              <Card bordered={false} className="bg-alarm-tmpl">
                <p className="color-tmpl-title">正常短信：</p>
                <Input.TextArea
                  rows={6}
                  value={normal_template || default_normal_template}
                  onChange={ev => {
                    let val = ev.target.value
                    this.setState({normal_template: val === default_normal_template ? null : val}, () => onChange0(this.state))
                  }}
                  placeholder="请先选择告警模版，再编辑模版内容"
                />
              </Card>
            </Col>
          </Row>
        </div>
      </Row>
    )
  }
}
