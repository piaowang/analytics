import { BaseService } from '../base.service'
import { mapAwaitAll } from '../../../common/sugo-utils'
import { 
  getAccessTokenWithRedisCache, 
  getFollowUserList, 
  getUserDetailInfo,
  externalcontactList,
  externalcontactConvertToOpenid,
  getUserContactMe
} from '../wechat.service'
import MarketBrainCustomService from './external-user.service'
import RedisScheduleService from '../redis-schedule.service'
import { err, log } from '../../utils/log'
import sequelize from 'sequelize'
import _ from 'lodash'

export default class MarketBrainStaffService extends BaseService {
  constructor() {
    super('MarketBrainStaff')
    this.marketBrainCustomService = new MarketBrainCustomService()

    this.redisSchedule = new RedisScheduleService({prefix: 'sugo:market-brain-events:scheduler'})
    this.prefix_key = 'market-brain-staff-result'
  }

  async updateAllStaffAndExternalUser() {
    let that = this

    let allCompany = await this.db.MarketBrainCooperate.findAll({
      attributes: [[sequelize.fn('COUNT', sequelize.col('id')), 'count_id'],'corpid', 'custom_contact_secret', 'address_book_secret'],
      group: ['corpid', 'custom_contact_secret', 'address_book_secret'],
      raw: true
    })

    //pg表 所有公司 门店的员工
    let pgStaffList = await this.findAll({
    }, { raw: true })
    let pgStaffListMobileDict = _.keyBy(pgStaffList, d => d.mobile)

    let allFllowUserids = []
    await mapAwaitAll(allCompany, async (i) => {
      const { 
        corpid, address_book_secret, custom_contact_secret 
      } = i



      let addressBookAccessToken = await getAccessTokenWithRedisCache(corpid, address_book_secret)

      let customContactAccessToken = await getAccessTokenWithRedisCache(corpid, custom_contact_secret)

      if (!addressBookAccessToken || !customContactAccessToken) {
        err(new Date(), '更新员工表记录失败', corpid)
        return
      }


      //该公司 门店 开通了客户联系功能的员工userid set
      let followUserList = await getFollowUserList(customContactAccessToken)

      allFllowUserids = allFllowUserids.concat(followUserList)

      await mapAwaitAll(followUserList, async (j) => {

        //该员工的客户 userid 列表
        let external_user = await externalcontactList(customContactAccessToken, j)

        //该员工的客户 userid openid 列表
        external_user = await mapAwaitAll(external_user, async (k) => {
          let result = {}
          result.openid = await externalcontactConvertToOpenid(customContactAccessToken, k)
          result.userid = k
          return result
        })

        //该员工的详细信息
        j = await getUserDetailInfo(addressBookAccessToken, j)
        
        // 该员工的其他信息 已经在pg里 且匹配上了
        if (_.get(pgStaffListMobileDict[j.mobile + ''], 'name') === j.name) {
          if (!_.get(pgStaffListMobileDict[j.mobile + ''], 'userid')) {
            //初始化staff表的 userid position
            await that.update({ userid: j.userid, staff_position: j.position }, { id: pgStaffListMobileDict[j.mobile + ''].id })
          }
          //维护客户表
          await that.marketBrainCustomService.bulkCreateOrUpdateOrDelete(external_user, j, customContactAccessToken)
        }
      })
    })

    pgStaffList = await this.findAll({}, { raw: true })
    await mapAwaitAll(pgStaffList, async(j) => {
      //pg有 企微没有 删掉 连着客户记录一起
      if (!j.userid) return
      if (!allFllowUserids.includes(j.userid)) {
        await that.marketBrainCustomService.update({ sa_id: null }, { sa_id: j.userid})
        await that.update({ userid: null }, { id: j.id })
      }
    })
  }

  async updateAllStaffContactMe() {

    let allCompany = await this.db.MarketBrainCooperate.findAll({
      attributes: [[sequelize.fn('COUNT', sequelize.col('id')), 'count_id'],'corpid', 'custom_contact_secret', 'address_book_secret', 'store_id', 'company_id'],
      group: ['corpid', 'custom_contact_secret', 'address_book_secret', 'store_id', 'company_id'],
      raw: true
    })

    //pg表 所有公司 门店的员工
    let pgStaffList = await this.findAll({
    }, { raw: true })
    let pgStaffListMobileDict = _.keyBy(pgStaffList, d => d.mobile)

    let allFllowUserids = []
    await mapAwaitAll(allCompany, async (i) => {
      const { 
        corpid, custom_contact_secret, store_id, company_id
      } = i

      const allStaffWithoutContactMe = await this.findAll({
        store_id,
        company_id,
        userid: { $ne: null },
        contact_me: { $eq: null }
      }, {
        raw: true
      })
  
      let customContactAccessToken = await getAccessTokenWithRedisCache(corpid, custom_contact_secret)
  
      await mapAwaitAll(allStaffWithoutContactMe, async j => {
        const contactMe = await getUserContactMe(customContactAccessToken, j.userid)
        await this.update({
          contact_me: contactMe.contact_me,
          contact_me_config: contactMe.contact_me_config
        }, {
          id: j.id
        })
      })
    })

  }

  getJobKey(suffix) {
    return `${this.prefix_key}:${suffix}`
  }

  async marketBrainSchedule() {
    const staffKey = this.getJobKey('staff')
    const resultKey = this.getJobKey('result')
    const dayReportKey = this.getJobKey('day-report')
    const hurryKey = this.getJobKey('hurry')
    await this.redisSchedule.addJob(staffKey, {
      cron: '1 0 2 * * *',
      path: './market-brain/staff.service',
      func: 'updateAllStaffAndExternalUser',
      data: {},
      counter: 0
    })

    await this.redisSchedule.addJob(resultKey, {
      cron: '1 0 3 * * *',
      path: './market-brain/result.service',
      func: 'getGroupMsgResultSchedule',
      data: {},
      counter: 0
    })

    await this.redisSchedule.addJob(dayReportKey, {
      cron: '1 0 20 * * *',
      path: './market-brain/result.service',
      func: 'dayReportSchedule',
      data: {},
      counter: 0
    })

    await this.redisSchedule.addJob(hurryKey, {
      cron: '1 0 9 * * *',
      path: './market-brain/result.service',
      func: 'hurryStaff',
      data: {},
      counter: 0
    })
  }
}
