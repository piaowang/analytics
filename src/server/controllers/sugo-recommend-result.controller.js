import { SugoRecommendResultService }  from '../services/sugo-recommend-result.service'
import { SugoDataApiClientService } from '../services/sugo-data-api-clients.service'
import UserGroupService from '../services/usergroup-redis.service'
import { redisGet, getRedisClient } from '../utils/redis'
import conf from '../config'
import _ from 'lodash'

/**
 * @description 经传推荐接口API
 * @export
 * @class SugoRecommendResultController
 */
export default class SugoRecommendResultController {

  constructor() {
    this.clientServ = SugoDataApiClientService.getInstance()
    this.recommendServ = SugoRecommendResultService.getInstance()
  }

  async callRecommendAPIV1(ctx) {
    const isGET = ctx.method === 'get' || ctx.method === 'GET'
    // 左临的文档上叫 jwt，但实际上不是 jwt
    let {jwt, access_token = jwt, ...extraArgs} = isGET ? ctx.query : ctx.request.body
    if (!access_token) {
      ctx.status = 401
      ctx.body = { code: 401, description: '非法请求，客户端不存在' }
      return
    }

    // 从缓存获取access_token
    const client = await redisGet(access_token)
    // let client = await this.clientServ.findOne({ access_token }, {raw: true})

    if (!client) {
      ctx.status = 401
      ctx.body = { code: 401, description: '客户端不存在或访问标识码已过期' }
      return
    }
    const { uid } = extraArgs
    if (!uid) {
      ctx.status = 400
      ctx.body = { code: 400, description: '查询失败，请传入uid参数' }
      return
    }
 
    const redisClient = await getRedisClient()
    // 需要包含在指定分群才给推荐结果（如”活跃用户“分群）
    const { recommendApiConfig = {} } = conf
    const { usergroupSetKey, groupReadConfig: defaultGroupReadConfig, usergroupId, resultKeyPrefix } = recommendApiConfig
    // 从Redis获取活跃用户分群set集合
    const usergroupSets = await redisClient.exists(usergroupSetKey)
    if (!usergroupSets) { // 还未将分群读取存储为SET集合操作时
      const groupReadConfig = defaultGroupReadConfig || {
        pageIndex: 0,
        pageSize: 1000000 // 分群最大用户数
      }
      const res = await UserGroupService.read({
        groupReadConfig,
        dataConfig: {
          ...conf.dataConfig,
          groupId: usergroupId
        }
      })
      const userIds = _.get(res, 'result.ids') || []
      if (userIds.length) {
        //**  将分群id读取出来，存为redis的SET集合类型，方便后面判断
        await redisClient.sadd(usergroupSetKey, userIds)
      }
    }
    // 判断当前用户是否在SET集合中存在
    const exists = await redisClient.sismember(usergroupSetKey, uid)
    if (!exists) { // 未再活跃分群存在的用户不推荐内容
      ctx.body = {
        code: 200,
        result: null
      }
      return
    }
    // 根据用户ID查询推荐结果表的关联产品ID记录
    // const result = await this.recommendServ.findOne({
    //   uid
    // }, {
    //   raw: true
    // })
    const result = await redisGet(`${resultKeyPrefix}${uid}`)
    ctx.body = {
      code: 200,
      result
    }
  }
}
