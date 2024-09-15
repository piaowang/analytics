import { BaseService } from './base.service'
import { UserService } from './user.service'
import DataCheckService from './data-checking.service'
import _ from 'lodash'
import db from '../models'
import * as Redis  from '../utils/redis'

export default class UserDraftService extends BaseService {
  static instance = null

  constructor () {
    super('SugoUserDraft')
    this.instance = null
    this.userService = UserService.getInstance()
  }

  static getInstance () {
    if(this.instance === null) {
      this.instance = new UserDraftService()
    }
    return this.instance
  }

  async auditUser(id,userId,company_id,isPassed,comment,checkUserId,transaction){

    let dataCheckService = DataCheckService.getInstance()

    let include = [{
      model:db.SugoDataChecking
    }]
    let inDb = await this.findOne({id},{include,transaction})
    if(!inDb){
      return {
        success:false,
        message:'未找到该用户'
      }
    }

    let checkInfo = _.get(inDb,'SugoDataCheckings[0]')
    if(checkInfo.status !== 0){
      return {
        success:false,
        message:'该用户未在审核状态'
      }
    }
    if(!isPassed){
      if(checkInfo.operationType === 1){
        await dataCheckService.updateCheckData({status:2,checkUserId,comment,acceptanceTime:new Date()},{userDraftId:id},transaction)
      }
      if(checkInfo.operationType === 2){
        let include = [{
          model:db.SugoUserRole
        }]
        let data = await this.userService.findUser({id},{include,transaction,raw:true})
        data = data.get({plain: true})
        data.roles = data.SugoUserRoles.map(i=>{
          return {
            id:i.role_id
          }
        })
        delete data.id
        await dataCheckService.updateCheckData({status:2,checkUserId,comment,acceptanceTime:new Date()},{userDraftId:id},transaction)
        await this.update(data,{id},{transaction})
      }
      if(checkInfo.operationType === 3){
        await dataCheckService.updateCheckData({status:2,checkUserId,comment,acceptanceTime:new Date()},{userDraftId:id},transaction)
      }

      return
    }

    if(checkInfo.operationType === 1){
      await dataCheckService.updateCheckData({status:1,checkUserId,comment,acceptanceTime:new Date()},{userDraftId:id},transaction)
      let data = await this.findOne({id},{transaction})
      data = data.get({ plain: true })
      let res1 = await this.userService.create(data,{transaction})
      let { roles } = data
      for(let role of roles) {
        let q = {
          user_id: res1.id,
          role_id: role.id
        }
        await db.SugoUserRole.findOrCreate({
          where: q,
          defaults: q,
          transaction: transaction
        })
      }
    }

    if(checkInfo.operationType === 2){
      await dataCheckService.updateCheckData({status:1,checkUserId,comment,acceptanceTime:new Date()},{userDraftId:id},transaction)
      let data = await this.findOne({id},{transaction})
      data = data.get({ plain: true })
      delete data.id

      let res1 = await this.userService.update(data,{id},{transaction})
      let { roles } = data
      
      let query2 = {
        where: {
          user_id: id
        }
      }

      await db.SugoUserRole.destroy(query2, {transaction})
        .then(() => {
          let arr = roles.map(p => {
            return db.SugoUserRole.create({
              user_id: id,
              role_id: p.id
            }, {transaction})
          })
          return Promise.all(arr)
        })

    }

    if(checkInfo.operationType === 3){

      let target = {
        transaction
      }

      let q4 = {
        where: {
          user_id: id
        }
      }

      let query1 = {
        where: {
          id,
          company_id
        }
      }

      let rootUser = await db.SugoUser.findOne({
        where: {
          type: 'built-in',
          company_id
        }
      })

      await dataCheckService.deleteCheckData({userDraftId:id},transaction)

      await this.remove({id},{transaction})

      //删除订阅
      await db.SugoSubscribe.destroy(q4, target)

      //删除自定义顺序
      await db.SugoCustomOrders.destroy(q4, target)

      //书签
      await db.SugoPivotMarks.destroy(q4, target)

      //邮件验证
      await db.EmailValidate.destroy(q4, target)

      //重置密码
      await db.ResetPassword.destroy(q4, target)

      //删除概览
      await db.SugoOverview.destroy({
        where: {
          created_by: id
        }
      }, target)

      //删除看板
      let q3 = {
        where: {
          created_by: id,
          company_id
        }
      }

      let dids = await db.Dashboards.findAll({
        ...q3,
        ...target
      })
      dids = dids.map(s => s.id)
      await db.DashboardSlices.destroy({
        where: {
          dashboard_id: {
            $in: dids
          }
        }
      }, target)
      await db.Dashboards.destroy(q3, target)

      //角色关联
      await db.SugoUserRole.destroy(q4, target)
      
      //单图转交给root用户
      await db.Slices.update({
        created_by: rootUser.id
      }, {
        where: {
          created_by: id,
          company_id
        },
        ...target
      })

      //最后删除用户
      let res = await db.SugoUser.destroy(query1, target)
      // 把用户踢下线，删除session
      const redisCli = await Redis.getRedisClient()
      redisCli.keys(`${inDb.username}-*`)
        .then(keys => {
          keys.map(k => redisCli.del(k))
        })

    }

    return '进来了'
  }
}
