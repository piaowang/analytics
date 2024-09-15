export const ALARM_API_TEMPLATE = {
  dingding: {
    params: {
      msgtype: "text",
      text: { content: "${msg}" }
    },
    templatePath: ['text', 'content'],
    title: '钉钉API'
  }
}