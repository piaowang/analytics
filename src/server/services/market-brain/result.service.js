import { BaseService } from '../base.service'
import { mapAwaitAll } from '../../../common/sugo-utils'
import { 
  getAccessTokenWithRedisCache, 
  pullNewsToAppChat,
  getGroupMsgResult, 
  getAppChat,
  messageSend
} from '../wechat.service'
import MarketBrainCustomService from './external-user.service'
import DruidQueryService from '../druid-query.service'
import { jwtSign } from '../../init/jwt-login-middleware'
import { err, log } from '../../utils/log'
import db, { quoteIdentifiers } from '../../models'
import conf from '../../config'
import _ from 'lodash'
import moment from 'moment'

let dayReportApiScopes = 'get#/console/market-brain-acts/result'

let dayReportPathScopes = '/console/market-brain-acts/result'

export default class MarketBrainResultsService extends BaseService {
  constructor() {
    super('MarketBrainResults')
    this.marketBrainCustomService = new MarketBrainCustomService()
  }

  async getGroupMsgResultSchedule() {

    let that = this

    let allCompany = await this.db.MarketBrainCooperate.findAll({
      raw: true
    })

    let pgCustomList = await that.marketBrainCustomService.findAll({}, { raw: true })
    let pgCustomListUseridIdDict = _.keyBy(pgCustomList, 'userid')
    await mapAwaitAll(allCompany, async (i) => {
      const { corpid, custom_contact_secret, store_id, company_id } = i

      let customContactAccessToken = await getAccessTokenWithRedisCache(corpid, custom_contact_secret)

      if (!customContactAccessToken) {
        err(new Date(), '营销大脑 结果统计失败', corpid)
        return
      }

      let pgStaffWhere = {}
      if (company_id && company_id !== 'null') pgStaffWhere.company_id = company_id
      if (store_id && store_id !== 'null') pgStaffWhere.store_id = store_id
      let pgStaffList = await that.db.MarketBrainStaff.findAll({
        where: pgStaffWhere,
        raw: true 
      })

      pgStaffList = _.keyBy(pgStaffList,'userid')


      let executeWhere = {}
      let eventWhere = {
        belongs: 1,
        status: 1,
        send_channel: 2
      }
      if (company_id) {
        executeWhere.company_id = company_id
        eventWhere.jwt_company_id = company_id
      }
      if (store_id) {
        executeWhere.store_id = store_id
        eventWhere.jwt_store_id = store_id
      }

      if (_.isEmpty(executeWhere)) return

      let targetEventWithTask = await that.db.MarketBrainTasks.findAll({
        raw: true,
        attributes: ['id'],
        include: [{
          model: db.MarketBrainEvents,
          where: eventWhere,
          attributes: ['id']
        }]
      })

      if (_.isEmpty(targetEventWithTask)) return

      // let targetExecutionsSqlWhere = `${executeWhere.company_id ? 'jwt_company_id=:company_id AND ' : ''}${executeWhere.store_id ? 'jwt_store_id=:store_id' : ''}`
      let targetExecutionsSqlWhereParams = ''
      targetEventWithTask.map( (i,idx) => {
        if (idx === targetEventWithTask.length - 1) return targetExecutionsSqlWhereParams += `'${i['id']}'`
        targetExecutionsSqlWhereParams += `'${i['id']}',`
      })
      let targetExecutionsSqlWhere = `task_id IN (${ targetExecutionsSqlWhereParams })`

      // 最新一条记录
      let targetExecutionsSql = `
      select a.id, a.usergroup_id  
      from sugo_market_brain_task_executions a  
      where ${quoteIdentifiers(`${targetExecutionsSqlWhere}`)} AND not exists(
        select 1  
        from sugo_market_brain_task_executions b  
        where b.task_id=a.task_id and   b.execute_time > a.execute_time
      )
      `
      let targetExecutions = await that.db.client.query(targetExecutionsSql, { 
        replacements: executeWhere,
        type: that.db.client.QueryTypes.SELECT
      })

      let usergroupDatasourceDict = {}
      await mapAwaitAll(targetExecutions, async (j) => {
        if (!j.usergroup_id) return
        let increaseActualTotal = 0
        let settingName = {}
        if (!usergroupDatasourceDict[j.usergroup_id]) {
          usergroupDatasourceDict[j.usergroup_id] = await that.db.Segment.findByPk(j.usergroup_id)
          let userGroup = usergroupDatasourceDict[j.usergroup_id]
          const { druid_datasource_id } = userGroup

          let datasource = await that.db.SugoDatasources.findOne({
            where: {
              id: druid_datasource_id
            },
            raw: true,
            attributes: ['params']
          })

          const marketBrainSetting = _.get(datasource, 'params.marketBrain', { })
      
          //场景设置中预设的值
          let { 
            wechat_openid 
          } = marketBrainSetting
  
          if (!wechat_openid) return
  
          settingName = await that.db.SugoDimensions.findOne({
            where: {
              id: wechat_openid
            }, raw: true
          })
          usergroupDatasourceDict[j.usergroup_id] = settingName
        }

        settingName = usergroupDatasourceDict[j.usergroup_id]

        const { title: settingOpenId_title } = settingName

        let customDictKey = 'descripe'
        if (settingOpenId_title.includes('open')) customDictKey = 'openid'
        if (settingOpenId_title.includes('union')) customDictKey = 'unionid'

        let targetMsgIdsSql = `
        select count(id), msgid from sugo_market_brain_task_details 
        where send_time is null AND msgid is not null AND msgid not like '%-%' AND execute_id=:execute_id group by msgid
        `
        let targetMsgIds = await that.db.client.query(targetMsgIdsSql, {
          replacements: { execute_id: j.id },
          type: that.db.client.QueryTypes.SELECT
        })

        await mapAwaitAll(targetMsgIds, async (targetMsgId) => {
          const detail_list = await getGroupMsgResult(customContactAccessToken, targetMsgId.msgid)
  
          await mapAwaitAll(detail_list, async (k) => {
            let staff = pgStaffList[k.userid].staff_id
            let status = k.status
            let custom = pgCustomListUseridIdDict[k.external_userid]
            let updateObj = {
              msgid: targetMsgId.msgid + '-' +  status
            }
  
            if (status === 1) updateObj.send_time = moment(k.send_time * 1000).format('YYYY-MM-DD HH:mm:ss')

            let updateRes = await that.db.MarketBrainTaskDetails.update(updateObj, {
              where: { 
                execute_id: j.id,
                openid: custom[customDictKey],
                msgid: { $notLike: '%-%' },
                who_claim: { $like: '%' + company_id + store_id + staff + '%'}
              }
            })

            if (!_.isEmpty(updateRes)) increaseActualTotal ++
          })
        })

        if (increaseActualTotal > 0) {
          await that.db.MarketBrainTaskExecutions.increment({
            actual_total: increaseActualTotal
          }, {
            where: {
              id: j.id
            }
          })
        }
        
      })
      // await that.delay()
    })

  }

  async dayReportSchedule() {
    let that = this

    let allCompany = await this.db.MarketBrainCooperate.findAll({
      raw: true
    })

    await mapAwaitAll(allCompany, async (i) => {
      const { corpid, marketing_secret, store_id, company_id } = i

      let accessToken = await getAccessTokenWithRedisCache(corpid, marketing_secret)

      if (!accessToken) {
        err(new Date(), '营销大脑 日报失败 corpid===>  ', corpid)
        return
      }

      let pgStaffWhere = {}
      if (company_id && company_id !== 'null') pgStaffWhere.company_id = company_id
      if (store_id && store_id !== 'null') pgStaffWhere.store_id = store_id
      let pgStaffList = await that.db.MarketBrainStaff.findAll({
        where: pgStaffWhere,
        raw: true 
      })

      pgStaffList = _.keyBy(pgStaffList,'userid')


      // 找所有 微信渠道 开启的 执行过的 store_id company_id 活动
      let allRunningActiveWhere = {
        belongs: 1,  //活动
        status: 1,  //开启
        send_channel: 2 //微信渠道
      }
      if (company_id && company_id !== 'null') allRunningActiveWhere.jwt_company_id = company_id
      if (store_id && store_id !== 'null') allRunningActiveWhere.jwt_store_id = store_id

      const allRunningActive = await this.db.MarketBrainTasks.findAll({
        where: {
          first_execute_time: { $ne: null }   //执行过的
        },
        raw: true,
        attributes: ['id'],
        include: [{
          model: db.MarketBrainEvents,
          attributes: ['id', 'params', 'jwt_store_name'],
          where: allRunningActiveWhere
        }]
      })

      await mapAwaitAll(allRunningActive, async (i) => {
        const active_id = i['MarketBrainEvent.id']
        const ResultPreSetParams = i['MarketBrainEvent.params']

        for (let k in ResultPreSetParams) {
          if (!ResultPreSetParams[k]) return
        }
        //单点登录token
        let user = await db.SugoUser.findOne({
          where: {
            username: 'admin'
          },
          raw: true
        })
        let token = jwtSign(user, {apiScopes: dayReportApiScopes.split(','), pathScopes: dayReportPathScopes.split(','), expiresIn: '24h', setCookie: true}, {})

        const { externalAddress } = conf
        let resultUrl = `${externalAddress}/console/market-brain-acts/result?id=${active_id}&jwtSign=${token}&hideTopNavigatorInThisSession=1&hideLeftNavigatorInThisSession=1`

        const existedAppChat = getAppChat({accessToken, chatid: active_id})
        if (!existedAppChat) return
        await pullNewsToAppChat({
          accessToken,
          chatid: active_id,
          msgtype: 'news',
          news: {
            'articles': [
              {
                'title' : '活动排行榜',
                'description' : i['MarketBrainEvent.jwt_store_name'] || '',
                url: resultUrl,
                picurl: `${externalAddress}/_bc/sugo-analytics-static/assets/images/logo.png`,
              }
            ]
          }
        })
      })
      // await that.delay()
    })
  }

  async hurryStaff() {
    let that = this

    let allCompany = await this.db.MarketBrainCooperate.findAll({
      raw: true
    })

    await mapAwaitAll(allCompany, async (i) => {
      const { corpid, marketing_secret, store_id, company_id, enterprise_app_id } = i

      let accessToken = await getAccessTokenWithRedisCache(corpid, marketing_secret)

      if (!accessToken) {
        err(new Date(), '营销大脑 日报失败 corpid===>  ', corpid)
        return
      }

      let pgStaffWhere = {}
      if (company_id && company_id !== 'null') pgStaffWhere.company_id = company_id
      if (store_id && store_id !== 'null') pgStaffWhere.store_id = store_id
      let pgStaffList = await that.db.MarketBrainStaff.findAll({
        where: pgStaffWhere,
        raw: true 
      })

      let shopKeeperAndBoss = pgStaffList.filter( i => i.staff_position === '店长' || i.staff_position === '老板')
      shopKeeperAndBoss = shopKeeperAndBoss.map( i => i.userid)
      pgStaffList = _.keyBy(pgStaffList,'shareid')


      // 找所有 微信渠道 开启的 执行过的 store_id company_id 活动
      let allRunningActiveWhere = {
        belongs: 1,  //活动
        status: 1,  //开启
        send_channel: 2 //微信渠道
      }
      if (company_id && company_id !== 'null') allRunningActiveWhere.jwt_company_id = company_id
      if (store_id && store_id !== 'null') allRunningActiveWhere.jwt_store_id = store_id

      const allRunningActive = await this.db.MarketBrainTasks.findAll({
        where: {
          first_execute_time: { $ne: null }   //执行过的
        },
        raw: true,
        attributes: ['id','updated_at'],
        include: [{
          model: db.MarketBrainEvents,
          attributes: ['id', 'name', 'params', 'copywriting'],
          where: allRunningActiveWhere
        }]
      })

      await mapAwaitAll(allRunningActive, async (i) => {
        const active_id = i['MarketBrainEvent.id']
        const ResultPreSetParams = i['MarketBrainEvent.params']
        const copywriting = i['MarketBrainEvent.copywriting']
        const { url } = copywriting
        const updated_at = i.updated_at
        const eventName = i['MarketBrainEvent.name']

        for (let k in ResultPreSetParams) {
          if (!ResultPreSetParams[k]) return
        }

        const { 
          dealEffectProject,
          dealLinkField,
          dealStaffIdField
        } = ResultPreSetParams

        let dealMeasures = await db.SugoMeasures.findAll({
          where: {
            parentId: dealEffectProject
          },
          raw: true
        })

        let dealDimensions = await db.SugoDimensions.findAll({
          where: {
            parentId: dealEffectProject
          },
          raw: true
        })

        dealMeasures = _.keyBy(dealMeasures,'title')
        dealDimensions = _.keyBy(dealDimensions,'title')
        if (!dealDimensions['商品购买金额']) return
        let deal = await DruidQueryService.queryByExpression({
          druid_datasource_id: dealEffectProject,
          'dimensions': [dealStaffIdField],
          'metrics': [
            dealMeasures['总记录数'].name
          ],
          'customMetrics': [
            {
              'name': 'buySum',
              'formula': `$main.filter($${dealDimensions['商品购买金额'].name}.isnt(null)).sum($${dealDimensions['商品购买金额'].name})`,
              'dimName': dealDimensions['商品购买金额'].name,
              'dimParams': {}
            }
          ],
          'filters': [
            {
              'col': '__time',
              'op': 'in',
              'eq': [
                moment(updated_at).format('YYYY-MM-DD HH:mm:ss'),
                moment().format('YYYY-MM-DD HH:mm:ss')
              ],
              'dateStringComparingFormat': null
            },
            {
              'col': dealStaffIdField,
              'op': 'not in',
              'eq': [
                '空字符串 / NULL'
              ],
              'type': 'string',
              'containsNull': true
            },
            {
              'col': 'event_name',
              'op': 'in',
              'eq': [ '商城订单明细事件' ],
              'type': 'string'
            },
            {
              'col': dealLinkField,
              'op': 'contains',
              'eq': [url],
              'type': 'string'
            }
          ],
          'timezone': 'Asia/Shanghai',
          'granularity': 'P1D',
          'splitType': 'groupBy',
          'queryEngine': 'tindex'
        })
        deal = _.get(deal[0], 'resultSet')

        let shouldHurry = []
        let shouldHurryName = []
        deal.map( i => {
          if (i[dealMeasures['总记录数'].name] > 0) return
          if (!_.get(pgStaffList[i[dealStaffIdField]], 'userid')) return
          shouldHurry.push(pgStaffList[i[dealStaffIdField]].userid)
          shouldHurryName.push(pgStaffList[i[dealStaffIdField]].name)
        })

        const staff_params =   {
          'touser': shouldHurry.join('|'),
          'msgtype' : 'text',
          'agentid' : +enterprise_app_id,
          'text' : {
            'content' : `${eventName}：本次活动你还未成交哦，请继续加油！！！`
          },
          'enable_id_trans': 0,
          'enable_duplicate_check': 0
        }
        await messageSend(accessToken, staff_params)

        if (_.isEmpty(shopKeeperAndBoss)) return
        const boss_params =   {
          'touser': shopKeeperAndBoss.join('|'),
          'msgtype' : 'text',
          'agentid' : +enterprise_app_id,
          'text' : {
            'content' : `${eventName}：本次活动如下员工【${shouldHurryName.join('、')}】还未成交，请保持关注哦！！！`
          },
          'enable_id_trans': 0,
          'enable_duplicate_check': 0
        }
        await messageSend(accessToken, boss_params)
      })
      // await that.delay()
    })
  }


  delay() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve()
      }, 1 * 60 * 1000)
    })
  }
}
