/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/15
 * @description
 */

const http = require('http')
const Url = require('url')

const host = 'http://idstest.csair.com'
const path = '/ids/service?idsServiceType=httpssoservice&serviceName=findUserBySSOID'
const url = host + path

const data = 'coAppName=ELOG&type=json&data=20941be2d642450ac5f75383a6a8f60a%26e4c11422bd5d3a7503488b4df71ee933f0fa1a10b1c8e830763a428e657831ab4331095ad0672d3b8623573f423b917e4bcd843f7a82713790097f407d66b5c0673de0c80121a896ebac8d710c8b1bca1f25cee5c348703ccf0500968029af4add19455b6615abc6f0f066bc152eb3d4422c14e70173252c52507460c3df940bbd8caf2dc480fdaa'
const formatter = Url.parse(url)
const req = http.request({
  method: 'POST',
  protocol: formatter.protocol,
  host: formatter.host,
  hostname: formatter.hostname,
  port: formatter.port,
  path: formatter.path,
  timeout: 3000
})

req.write(data)
req.on('data', function (d) {
  console.log(d.toString())
})

req.on('error', function (err) {
  console.log(err)
})

req.on('timeout', function () {
  console.log('timeout')
})
