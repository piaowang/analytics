import React from 'react'
import { CheckOutlined, MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { message } from 'antd'
import _ from 'lodash'
import AlarmForm from './alarm-Form'
import Fetch from 'client/common/fetch-final'
import { recvJSON } from '../../../../common/fetch-utils'
import { validateFieldsAndScrollByForm } from '../../../../common/decorators'
import { ALARM_API_TEMPLATE_CONTENT } from './alarm-api-template'
import { immutateUpdate } from '../../../../../common/sugo-utils'
import { ALARM_API_TYPE, convertAlertConfig } from '../../../../../common/convert-alarm-info'

const addAlarmForm = (props) => {
  const { apiAlertInfos = [], changeState } = props
  const maxId = _.maxBy(apiAlertInfos, p => p.id)
  changeState({ apiAlertInfos: [...apiAlertInfos, { id: maxId !== undefined ? maxId.id + 1 : 0 }] })
}

const delAlarmForm = (props, id) => {
  const { apiAlertInfos = [], validForm = {}, changeState } = props
  changeState({ apiAlertInfos: apiAlertInfos.filter(p => p.id !== id), validForm: _.omit(validForm, [id]) })
}

const changeAlarmInfo = (props, idx, obj) => {
  const { apiAlertInfos = [], changeState } = props
  let newAlarmInfos = _.cloneDeep(apiAlertInfos)
  _.set(newAlarmInfos, `${idx}`, obj)
  changeState({ apiAlertInfos: newAlarmInfos })
}

const testAlarm = async (props, form) => {
  const { taskId, taskName } = props
  const item = form
  if (!taskId || !taskName) {
    message.error('请先保存工作流信息')
    return
  }
  const val = await validateFieldsAndScrollByForm(item)
  if (!val) {
    return false
  }
  if (val.url) {
    const template = _.get(ALARM_API_TEMPLATE_CONTENT, val.templateType || val.alarmType, {})
    let paramMap = template.paramMap
    if (val.templateType !== ALARM_API_TYPE.custom) {
      paramMap = immutateUpdate(paramMap, 'text.content', () => val.content)
      if (val.alterUsers && val.alterUsers.length) {
        paramMap = immutateUpdate(paramMap, 'at.atMobiles', () => val.alterUsers)
      }
    } else {
      try {
        paramMap = eval(`(${val.customContent})`)
      } catch (error) {
        item.setFields({ customContent: { value: val.customContent, errors: [new Error('不是有效的json格式')] } })
        this.changeState({ selectedKey: 'apiWarn' })
        return false
      }
    }

    const data = {
      alerter: 'api',
      projectId: taskId,
      flowId: taskName,
      alertConfig: convertAlertConfig([{...val, paramMap}])
    }
    await Fetch.post('/app/task-schedule-v3/schedule?action=testAlert', null, {
      ...recvJSON,
      body: JSON.stringify(data)
    })
    message.success('测试发送成功')
  }
}

export default function renderApiForm(props) {
  const { apiAlertInfos = [], validForm, changeState, disabled, userList = [] } = props
  const showDel = apiAlertInfos.length !== 1 && !disabled
  return (
    <div>
      {
        apiAlertInfos.map((p, i) => {
          return (
            <div key={`tenple-${i}`} className="alarm-api-group mg2b pd1y">
              <AlarmForm
                changeAlarmInfo={obj=> changeAlarmInfo(props, i, obj)}
                userList={userList} key={`alarm-from-${i}`}
                apiAlertInfo={p}
                validForm={validForm}
                changeState={(obj, isMount) => changeState(obj, isMount)}
              />
              <div className="delete-api-group">
                {
                  showDel ?
                    <a className="color-disable pointer" onClick={() => delAlarmForm(props, p.id)}>
                      <MinusCircleOutlined className="color-disable mg1r" />
                      删除API告警
                    </a>
                    : null
                }
                {
                  <a className="color-main mg3l pointer" onClick={() => testAlarm(props, validForm[p.id])}>
                    <CheckOutlined className="color-main mg1r" />
                    测试告警
                  </a>
                }
              </div>
            </div>
          );
        })
      }
      {
        disabled
          ? null
          : <div className="alignright">
            <a
              className="pointer"
              onClick={() => addAlarmForm(props)}
              title="添加一个API告警"
            >
              <PlusCircleOutlined className="mg1r" />
              添加一个API告警
            </a>
          </div>}
    </div>
  );
}
