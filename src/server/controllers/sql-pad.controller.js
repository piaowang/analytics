import config from '../config'
import moment from 'moment'
import _ from 'lodash'
import {immutateUpdate, escapeForRegex} from '../../common/sugo-utils'

const {serviceUrl, defaultUserName, defaultPassword} = config.sqlPad

// sql pad:
// 下载：git clone --depth 1 https://github.com/rickbergfalk/sqlpad.git
// build 命令：PUBLIC_URL=/sql-pad/ npm run build
// 运行命令：node ./server/server.js --port 3000 --ip localhost --base-url /sql-pad/

let loginInfo = { }

async function login() {
  let resp = await fetch(`${serviceUrl}/sql-pad/api/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: defaultUserName,
      password: defaultPassword + '',
      redirect: false
    })
  })
  let cookie = resp.headers.get('set-cookie')
  let [cookieKv, path, expireKv] = cookie.match(/(.+?)=(.+?);\s?/g)
  let [, cookieName, cookieVal] = cookieKv.match(/(.+?)=(.+?);\s?/)
  let expireAt = expireKv.match(/(.+?)=(.+?);\s?/)[2]
  loginInfo[cookieName] = cookieVal
  loginInfo.expire = expireAt
  return [cookieName, cookieVal]
}

async function getLoginCookie() {
  if (!loginInfo.expire || moment().isAfter(loginInfo.expire)) {
    return await login()
  }
  return _(loginInfo).omit('expire').toPairs().flatten().value()
}

async function redirect(ctx) {
  let [sessionCookieName, sessionCookieVal] = await getLoginCookie()
  ctx.forward(ctx.originalUrl, {
    baseUrl: serviceUrl,
    headers: immutateUpdate(ctx.header, 'cookie', originalCookies => {
      // 替换或插入 cookie
      if (_.includes(originalCookies, sessionCookieName)) {
        let re = new RegExp(`(${escapeForRegex(sessionCookieName)}=).+?(;\\s|$)`)
        return originalCookies.replace(re, (ma, p1, p2) => {
          return `${p1}${sessionCookieVal}${p2 || ''}`
        })
      }
      return `${sessionCookieName}=${sessionCookieVal}; ${originalCookies}`
    })
  })
}


export default { redirect }
