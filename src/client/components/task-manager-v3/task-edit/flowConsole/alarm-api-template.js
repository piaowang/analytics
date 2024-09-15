export const ALARM_API_TEMPLATE = {
  execStateAlarm: {
    title: '任务执行成功或失败',
    children: [
      { key: 'execStateAlarmStandard', title: '标准模板' },
      { key: 'execStateAlarmCustom', title: 'API自定义' }
    ]
  },
  execTimeoutAlarm:{ title: '任务超时预警'}
}

export const ALARM_API_TEMPLATE_CONTENT = {
  execStateAlarmStandard: {
    paramMap: {
      msgtype: "text",
      text: { content: "\"${name}\" has ${status} on ${azkabanName}\n任务开始时间：${startTime}\n任务结束时间：${endTime}\n任务耗时:${duration}\n" }
    },
    templatePath: 'dingding',
    title: '标准模板'
  },
  execStateAlarmCustom: {
    paramMap: {
      msgtype: "text",
      text: { content: '' }
    },
    templatePath: 'dingding',
    title: '自定义'
  },
  execTimeoutAlarm: {
    paramMap: {
      msgtype: "text",
      text: { content: '\"${name}\" 执行时长超过30分钟，触发了告警，请及时处理  ${azkabanName}\n任务开始时间：${startTime}\n提交时间:${submitTime}\n已用时间:${usedTime}\n' }
    },
    templatePath: 'dingding',
    title: '任务超时预警'
  }
}

export const ALARM_WAY = {
  api: 'api',
  email: 'email'
}