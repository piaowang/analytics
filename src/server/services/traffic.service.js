/**
 * 流量分析的自动刷新服务
 */
import _ from 'lodash'
import CryptoJS from 'crypto-js'
import SocketServiceBase from '../websocket/service.interface'
import {redisGet, redisSetExpire} from '../utils/redis'
import DruidQueryService from '../services/druid-query.service'



const events = {
  query: 'query', //前端需要查询druid,把参数传递进来
  unmount: 'unmount' //卸载刷新
}

const intervalTime = 60 * 1000


class TrafficWebsocketService extends SocketServiceBase {
  constructor() {
    super()
    this.ws = null
    this.lastTime = new Date()
    this.querys = {}
    this._timeId = setTimeout(this.timeout, intervalTime)
    this.keyMap = {} //每个id注册的key和tag
  }

  register(id, data, ws) {//新连接注册进来请求服务
    this.ws = this.ws || ws
    this.keyMap[id] = {}
    return true
  }

  cancel(id) {//前端注销服务,本服务已无法再发送信息给前端,清理数据
    let needToDel = []
    let needToRemoveTags = []
    for(let tag in this.querys) {
      let ids = _.get(this.querys, `${tag}.ids`, [])
      let i = ids.indexOf(id)
      if(i !== -1) {
        ids.splice(i, 1)
        needToRemoveTags.push(tag)
      }
      if(!ids.length) needToDel.push(tag) //已经没有用户拥有该标签了,不需要再查询了
    }
    delete this.keyMap[id]
    needToDel.forEach(tag => delete this.querys[tag]) //删除该query
    return needToRemoveTags
  }

  request(data, id) { //处理request,类似一个ajax,前端期待短时间内会返回一个结果,只是请求和返回都是通过socket
    const {method} = data
    let res = null
    switch (method) {
      case 'getTime': //传递倒计时
        res = this.getTime()
        break
      default: 
        res = '无效方法'
        break
    }
    return res
  }

  getTime() {
    return Math.round(60 - (new Date() - this.lastTime) / 1000)
  }

  timeout = async () => {
    //执行查询
    //如果很多查询的情况下,可能会延时几秒才返回,如果延时太长,可以把querys分成几个队列,同时进行
    for(let tag in this.querys) {
      let q = this.querys[tag]
      if(!q.ids.length) {
        delete this.querys[tag]
        continue
      }
      let res = await this.getData(q.query, q.tag)
      this.ws.pushByTag(tag, events.query, {
        key: q.key,
        tag,
        result: res
      })
    }
    this._timeId = setTimeout(this.timeout, intervalTime)
    this.lastTime = new Date()
  }

  async getfirstData(id, querys) {
    for(let q of querys) {
      let data = await this.getData(q.query, q.tag)
      data ? this.ws.pushById(id, events.query, {
        key: q.key,
        tag: q.tag,
        result: data
      }) : null
    }
  }

  async getData(queryObj, tag) {
    let data = await redisGet(tag)
    if(!data) {
      data = await DruidQueryService.queryByExpression(queryObj)
      await redisSetExpire(tag, intervalTime / 2000, data)
    }
    return data
  }

  getTag(query) {
    return CryptoJS.MD5(JSON.stringify(query)).toString()
  }

  /**
   * 清理同一个key产生的query,所以前端应该保证每一个key都独一无二
   * 如果查询参数发生了变化,依靠key来识别上一次传递进来的查询参数,然后清理,不再重复查询
   * 参考/home/asd/asd/sugo-analytics/src/client/components/Common/socket-fetch.jsx
   * @param {String} key 
   */
  clearByKey(id, key) {
    let keyMap = this.keyMap[id]
    let tag = keyMap[key]
    if(tag) {
      this.querys[tag]
      let ids = _.get(this.querys, `${tag}.ids`, [])
      let i = ids.indexOf(id)
      if(i !== -1) {
        ids.splice(i, 1)
      }
      if(!ids.length) delete this.querys[tag] //删除该query
      delete keyMap[key]
    }
  }
}

const trafficWebsocketService = new TrafficWebsocketService()

trafficWebsocketService.on(events.query, function(id, fetcherDict) {
  let tags = []
  let querys = []
  Object.keys(fetcherDict).forEach(key => {
    const query = fetcherDict[key]
    let tag = this.getTag(query)
    let ids = _.get(this.querys, `${tag}.ids`, [])
    let keyMap = this.keyMap[id]
    if(ids.includes(id)) return

    this.clearByKey(id, key)

    tags.push(tag)
    ids.push(id)
    querys.push({key, query, tag, ids})
    this.querys[tag] = {key, query, tag, ids}
    keyMap[key] = tag
  })

  this.ws.addTag(id, tags)
  this.getfirstData(id, querys)
})

trafficWebsocketService.on(events.unmount, function(id, key) {
  this.clearByKey(id, key)
})

export default trafficWebsocketService
