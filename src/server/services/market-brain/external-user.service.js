import { BaseService } from '../base.service'
import { externalcontact } from '../wechat.service'
import { mapAwaitAll } from '../../../common/sugo-utils'
import _ from 'lodash'

export default class MarketBrainCustomService extends BaseService {
  constructor() {
    super('MarketBrainCustom')
  }

  async checkExisted(where) {
    let result = await this.findOne(where)
    if (_.isEmpty(result)) return false
    return result
  }

  async bulkCreateOrUpdateOrDelete(external_user, staff, customContactAccessToken) {
    let that = this

    //企微返回的该员工的客户列表
    let external_userid = external_user.map( i => i.userid)
    //pg里 该员工的客户列表
    let allStaffOwnExternalUser = await this.findAll({
      sa_id: staff.userid
    }, { raw: true })
    //pg有 企微没有 删pg记录
    await mapAwaitAll(allStaffOwnExternalUser, async (i) => {
      if (!external_userid.includes(i.userid)) {
        that.remove({ id: i.id })
      }
    })

    // 企微有 pg没有 加记录  都有 更新 sa_id uni_id descripe
    await mapAwaitAll(external_user, async (i) => {
      let existed = await that.checkExisted({'userid': i.userid, sa_id: staff.userid})

      let detail = await externalcontact(customContactAccessToken, i.userid)

      const { external_contact, follow_user } = detail
      const follow_user_useridDict = _.keyBy(follow_user,'userid') 
      //pg没有
      if (!existed) {
        await that.create({
          openid: i.openid,
          userid: i.userid,
          sa_id: staff.userid,
          unionid: external_contact.unionid || null,
          descripe: _.get(follow_user_useridDict[staff.userid],'description') || null
        })
        return
      }

      //都有
      // if (existed.sa_id !== staff.userid) {
      //   await that.update({ sa_id: staff.userid }, { id: existed.id })
      // }

      //都有
      await that.update({
        unionid: external_contact.unionid || null,
        descripe: _.get(follow_user_useridDict[staff.userid],'description') || null
      }, { id: existed.id })
    })
  }
}
