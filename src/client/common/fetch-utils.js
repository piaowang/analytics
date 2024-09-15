/**
 * Created by heganjie on 16/9/12.
 */

// import fetch from 'node-fetch'
import _ from 'lodash'
import {IE_VERSION} from './compatible-utils'
import {toQueryParams} from '../../common/sugo-utils'

export function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  } else {
    let error = new Error(response.statusText)
    error.response = response
    throw error
  }
}

export function parseJSON(response) {
  return response.json()
}

export const includeCookie = {
  credentials: 'include'
}

export const sendURLEncoded = {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
  }
}

export const sendJSON = {
  headers: {
    'Content-Type': 'application/json'
  }
}

export const sendFormData = {
  headers: {}
}

export const recvJSON = {
  headers: {
    Accept: 'application/json'
  }
}

export const noCache = IE_VERSION === -1
  ? {
    headers: {
      'cache-control': 'no-cache'
    }
  } : {
    headers: {
      'Cache-control': 'no-cache,no-store',
      'Pragma': 'no-cache',
      'Expires': 0
    }
  }

const {redisExpire, druidCacheTime} = window.sugo
export const DefaultDruidQueryCacheOpts = {
  sCache: redisExpire || 'PT1M',
  cCache: _.isNumber(redisExpire) && 60 <= redisExpire ? 'PT30S' : '0'
}
export const DefaultDruidQueryCacheOptsForDashboard = {
  sCache: druidCacheTime || 'PT1H',
  cCache: _.isNumber(redisExpire) && 60 * 60 <= redisExpire ? 'PT1M' : '0'
}

/**
 * 为 url 加入额外的参数，不支持带 hash 的 url
 * @param url
 * @param extraQuery
 * @returns {string}
 */
export function withExtraQuery(url, extraQuery = {}) {
  return _.isEmpty(extraQuery)
    ? url
    : `${url}${_.includes(url, '?') ? '&' : '?'}${toQueryParams(extraQuery)}`
}
