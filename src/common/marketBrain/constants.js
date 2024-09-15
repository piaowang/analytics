
export const NISSANCHANNELENUM = {
  appPush: '应用消息发送',
  arriveAppPush: '到店应用消息发送',
  contactPush: '客户联系人发送'
}

export const WXJTYJCHANNELENUM = {
  jPush: '极光推送'
}

export const DEFAULTCHANNELENUM = {
  SMS: '短信',
  jPush: '极光推送',
  mobile: '手机',
  wechat: '微信'
}

export const SENDCHANNELENUM = {
  //这里作为表单项 保存的是index 
  common: [[DEFAULTCHANNELENUM['SMS'],DEFAULTCHANNELENUM['jPush']], [DEFAULTCHANNELENUM['mobile'], DEFAULTCHANNELENUM['wechat']]],
  czbbb: [['短信'], ['短信','电话', '微信']],
  nissan: [['短信'], [NISSANCHANNELENUM['appPush'], NISSANCHANNELENUM['contactPush'], NISSANCHANNELENUM['arriveAppPush']]],
  wxjTyj: [['极光推送'], ['无']]
}

export const JPUSH_TARGET =  ['registration_id', 'alias']
