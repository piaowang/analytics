import React, { useEffect } from 'react'
import ReactDOM from 'react-dom'
import PropTypes from 'prop-types'
import { registerMicroApps, start } from 'qiankun'
import { unloadApplication } from 'single-spa'
import _ from 'lodash'
import classNames from 'classnames'

let set = []
import { getJwtSign } from '../../common/jwt-helper'
import './index.styl'
import { fetch as fetchPolyfill } from 'whatwg-fetch'
import Fetch from '../../common/fetch-final'
import { remoteUrl } from '../../constants/interface'
import { withExtraQuery } from '../../common/fetch-utils'


const { microFrontendUrlMap, menus, dataServiceUrlPrefix, keyComp1, kitPrefix } = window.sugo
const MICRO_APPS_BASE_DICT = _.isEmpty(microFrontendUrlMap)
  ? {}
  : _.keys(microFrontendUrlMap).reduce((res, key) => {
    res[microFrontendUrlMap[key].base] = key
    return res
  }, {})

function App(props) {
  const { appContent } = props
  return <div dangerouslySetInnerHTML={{ __html: appContent }} className='height-100' />
}

function renderSubApp({ appContent, loading }) {
  let container = document.querySelector('.micro-frontend-container')
  if (!container) {
    return
  }
  ReactDOM.render(<App appContent={appContent} loading={loading} />, container)
}

const _fetch = window.fetch || fetchPolyfill

const customFetch = (url, opts = {}) => {
  let headers = {}
  const key = _.keys(MICRO_APPS_BASE_DICT).find(base => _.includes(url, base))
  if (key) {
    // 匹配如果是微前端入口路径则自动添加headers标识, 以便代理静态资源
    headers = {
      'micro-apps': MICRO_APPS_BASE_DICT[key]
    }
  }
  const resUrl = withExtraQuery(url, { v: window.sugo.version })
  return _fetch(resUrl, {
    ...opts,
    headers
  })
}

async function init() {
  //TODO 当前角色权限
  const token = _.isEmpty(window.sugo.user)
    ? null
    : await getJwtSign({
      apiScopes: ['*'],
      pathScopes: ['*'],
      expiresIn: '1y'
    })
  // 请求机构列表传递到微服务
  const res = await Fetch.get(remoteUrl.GET_INSTITUTIONS_LIST, {})
  const institutionData = _.get(res, 'result.data', [])

  const getMicroApps = menus => {
    let objs = (menus || []).map(m => {
      let institutions = []
      if (m.microFrontend) {
        if (m.microFrontend === 'sugo-data-service') {
          // 请求机构列表传递到微服务
          institutions = institutionData
        }
        const appConfig = _.get(microFrontendUrlMap, m.microFrontend)
        if (!appConfig) {
          return []
        }
        const { host } = location
        const { base, publicPath } = appConfig
        if (set.includes(m.microFrontend)) return
        set.push(m.microFrontend)
        return {
          name: m.microFrontend,
          entry: `//${host}${base}`,
          base,
          publicPath,
          render: renderSubApp,
          activeRule: location => {
            // if (location.pathname.startsWith(base)) {
            //   headers['micro-apps'] = m.microFrontend
            //   window.publicPath = publicPath
            //   window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ = publicPath
            // }
            return location.pathname.startsWith(base)
          },
          props: {
            jwt: token,
            sugoHost: window.sugo.host,
            showModelType: 'standard',
            dataServiceUrlPrefix,
            institutionData: institutions,
            userInfo: _.get(window, 'sugo.user', {}),
            sm4Config: { keyComp1, kitPrefix }
          }
        }
      }
      if (m.children) {
        return getMicroApps(m.children)
      }
    })
    return _.flatten(objs).filter(_.identity)
  }

  const microApps = _.uniqBy(getMicroApps(menus || []), 'name')

  registerMicroApps(
    microApps,
    {
      beforeLoad: app => {
        if (app.publicPath) {
          // 动态改变子应用的静态资源
          window.publicPath = app.publicPath
          window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ = app.publicPath
        }
      },
      /*
    beforeLoad: app => console.log('before load', app.name),
    beforeMount: app => console.log('before mount', app.name),
    afterMount: app => {
      console.log('after mount', app.name)
    },
    beforeUnmount: app => {
      console.log('before unmount', app.name)
    },
    */
      afterUnmount: app => {
        // headers = {}
        unloadApplication(app.name) // 避免 dva model 重复注册冲突报错，需要先卸载之前的
      }
    },
    {
      fetch: customFetch
    }
  )
}

// 这样写导致在根路由文件引用此组件时马上执行init方法，但是预期是微应用才执行，因此放到组件中执行	let initPromised = init()
// let initPromised = init()

let started = false

export default function MicroFrontendAdapter(props) {
  // const {appName} = props
  useEffect(() => {
    if (!started) {
      // TODO 兼容 IE：关闭 jsSandbox，完全代理请求，加载资源时根据 header 自动转发至子应用的服务；或者 fetch 时重定向至子服务
      init().then(() =>
        start({
          //** 1.4.x乾坤版本如果集成多个子应用 必须禁用预加载，否则会出错 */
          prefetch: false
        })
      )
      started = true
    }
  }, [])

  return <div className={classNames('micro-frontend-container', props.className)}>Loading...</div>
}

MicroFrontendAdapter.propTypes = {
  appName: PropTypes.string
}
