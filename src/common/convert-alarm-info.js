import _ from 'lodash'

export const ALARM_API_TYPE = {
  execStateAlarm: 'execStateAlarm',
  execTimeoutAlarm: 'execTimeoutAlarm',
  execStateAlarmStandard: 'execStateAlarmStandard',
  execStateAlarmCustom: 'execStateAlarmCustom',
  custom: 'custom'
}

// 告警参数生成
export function convertAlertConfig(apiAlertInfos) {
  return apiAlertInfos.map(p => {
    let senders = []
    if (_.includes(p.alarmWay, 'email')) {
      senders.push({
        type: 'mail',
        mailCreator: 'text',
        toAddresses: p.emails.split(',').filter(_.identity),
        template: _.get(p.paramMap, 'text.content', '')
      })
    }
    if (_.includes(p.alarmWay, 'api')) {
      senders.push({
        type: 'api',
        url: p.url,
        method: p.method,
        paramMap: p.paramMap
      })
    }
    const type = p.alarmType === ALARM_API_TYPE.execTimeoutAlarm ? 'timeout' : 'execution'
    return {
      type,
      condition: {
        type,
        ...(p.alarmType === ALARM_API_TYPE.execTimeoutAlarm
          ? { timeoutMills: p.timeoutMills * 60 * 1000, intervalMills: p.intervalMills * 60 * 1000 }
          : { alertOn: p.alterType })
      },
      senders
    }
  })
}
