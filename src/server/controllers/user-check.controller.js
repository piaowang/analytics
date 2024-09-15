import db from '../models'
import hasher from 'sugo-pbkdf2-hasher'
import _ from 'lodash'
import { returnError, returnResult } from '../utils/helper'
import testPassword from '../../common/test-password'
import { checkLimit } from '../utils/resouce-limit'
import dataCheckingServiceCreator from '../services/data-checking.service'
import userDraftServiceCreator from '../services/user-draft-service'
import { UserService } from '../services/user.service'
import Sequelize from 'sequelize'
const { Op } = Sequelize

export default class UserCheckController {
  constructor() {
    this.dataCheckingService = new dataCheckingServiceCreator()
    this.userDraftService = userDraftServiceCreator.getInstance()
    this.userService = UserService.getInstance()
  }

  async findOneUser (ctx) {
    let body = ctx.q || {}
    body.where = body.where || {}
    body.include = [{
      model: db.SugoRole
    }]
    body.attributes = ['id', 'email', 'first_name', 'username', 'type', 'cellphone', 'departments', 'institutions_id', 'status', 'efficacy_at', 'loss_efficacy_at', 'updated_at', 'changed_by_fk']
    let row = await db.SugoUser.findOne(body)
    ctx.body = {
      result: row
    }
  }

  async findOnerUserDraft (ctx) {
    let { id } = ctx.q || {}
    // body.attributes = ['id', 'email', 'first_name', 'username', 'type', 'cellphone', 'departments', 'institutions_id', 'status', 'efficacy_at', 'loss_efficacy_at']
    let row = await this.userDraftService.findOne({ id })
    const res = await db.SugoDepartments.findAll({
      where: {
        id: ['id', row.departments]
      },
      attributes: ['id', 'name'],
      raw: true
    })
    row.departments = res
    ctx.body = {
      result: row
    }
  }

  async getUsersDraft (ctx) {
    let {
      current = 1,
      pageSize = 10,
      search = '',
      audit_status = '',
      filterRoleId = '',
      institutionsId = ''
    } = ctx.q
    let body = ctx.q || {}
    //let count = await db.SugoUser.count({})
    let u = ctx.session.user
    let { company_id, SugoRoles } = u
    body.where = {
      [Op.or]: [
        { first_name: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
        { cellphone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ]
    }

    body.order = [
      ['updated_at', 'DESC']
    ]

    if (institutionsId) {
      body.where.institutions_id = institutionsId
    }

    if (filterRoleId) {
      body.where.roles = {}
    }

    if (filterRoleId) {
      body.where = {
        $and: [
          { ...body.where },
          Sequelize.where(
            Sequelize.cast(Sequelize.col('roles'), 'text'),
            { $or: [{ $like: `%${filterRoleId}%` }] }
          )
        ]
      }
    }

    body.where.company_id = company_id

    body.offset = (current - 1) * pageSize
    body.limit = pageSize
    body.attributes = [
      'id',
      'email',
      'first_name',
      'username',
      'type',
      'cellphone',
      'departments',
      'institutions_id',
      'status',
      'efficacy_at',
      'loss_efficacy_at',
      'roles',
      'updated_at',
      'changed_by_fk'
    ]
    body.include = [{
      model: db.SugoDataChecking
      // required:false,
    }]
    let audit_status_arr = audit_status ? audit_status.split('_') : []
    if (audit_status_arr.length >= 2) {
      if (audit_status_arr[0] === '*') {
        body.include[0].where = {
          status: parseInt(audit_status_arr[1])
        }
      } else {
        body.include[0].where = {
          operationType: parseInt(audit_status_arr[0]),
          status: parseInt(audit_status_arr[1])
        }
      }
    }

    let rows = await db.SugoUserDraft.findAll(body)
    let isAdmin = !!_.find(SugoRoles, { type: 'built-in' })
    if (body.canShare && !isAdmin) {
      let ids = u.SugoRoles.map(r => r.id)
      rows = rows.map(row => row.get({ plain: true }))
        .filter(uu => {
          let rids = uu.SugoRoles.map(s => s.id)
          return rids.reduce((prev, curr) => {
            return prev || _.indexOf(ids, curr) > -1
          }, false)
        })
    }
    let count = await db.SugoUserDraft.count({ where: body.where })
    ctx.body = {
      result: {
        rows,
        count
      }
    }
  }

  async addUserDraft (ctx) {
    let {
      user = {}
    } = ctx.q
    let u = ctx.session.user
    let { company_id } = u
    let userId = u.id
    let { username, roles, email, password, isGoAudit = false } = user

    await checkLimit(ctx, 'user')

    let checkResult = await addUserChecker(username, email, password, db.SugoUser, db.SugoUserDraft)

    if (!checkResult.success) {
      return returnError(ctx, checkResult.message)
    }

    user.created_by_fk = userId
    user.changed_by_fk = userId
    user.company_id = company_id
    // user.audit_status = _.get(user,'audit_status') || 0
    // user.audit_type = 0
    // user.identity_type = 0
    // user.apply_at = new Date()
    // user.applicant = userId
    user.roles = roles
    delete user.id
    user.type = 'user-created'

    password = await hash(password)
    user.password = password

    const res = await db.client.transaction(async transaction => {
      let res1 = await db.SugoUserDraft.create(user, { transaction })
      res1 = res1.get({ plain: true })

      const record = {
        userDraftId: res1.id,
        operationType: 1, // 操作类型(1=新增，2=修改，3=删除)
        type: 1, // 类别(1=用户，2=角色，3=机构)
        applyId: userId, // 申请人id
        status: isGoAudit ? 0 : -1 // 审核类型(-1=待提交 0=待审核，1=审核通过 2=已驳回)
      }
      const res2 = await this.dataCheckingService.addCheckData(record, transaction)
      res1.checkInfo = res2.get({ plain: true })
      return res1
    })
    delete res.password
    return returnResult(ctx, res)
  }

  async submitOrRecallApplication (ctx) {
    let { id } = ctx.q
    if (!id) {
      return returnError(ctx, 'id不能为空', 404)
    }
    let u = ctx.session.user
    let { company_id } = u
    let userId = u.id
    let query1 = {
      where: {
        id,
        company_id
      }
    }

    let inDb = await this.userDraftService.findOne(query1.where)
    if (!inDb) {
      return returnError(ctx, '找不到用户', 404)
    }
    if (inDb.type === 'built-in') {
      // delete user.username
      // delete user.active
      if (userId !== inDb.id) {
        return returnError(ctx, '您无权更改超级管理员')
      }
    }

    let inDb2 = await this.dataCheckingService.findCheckData({ userDraftId: id })
    if (!inDb2) {
      return returnError(ctx, '找不到用户审核记录', 404)
    }
    let futureStatus
    switch (inDb2.status) {
      case -1:
        futureStatus = 0
        break
      case 0:
        if (inDb2.operationType === 1) { // 操作类型(1=新增，2=修改，3=删除)
          futureStatus = -1
        } else {
          futureStatus = 1
        }
        break
      default:
        return returnError(ctx, '当前状态不可撤销或提交审核', 404)
    }
    let res
    if (futureStatus === 0) {
      res = await this.dataCheckingService.updateCheckData({
        applyId: userId,
        status: futureStatus
      }, {
        userDraftId: id
      })
    }

    if (futureStatus === -1) {
      res = await this.dataCheckingService.updateCheckData({
        applyId: userId,
        status: futureStatus
      }, {
        userDraftId: id
      })
    }

    if (futureStatus === 1) {
      let include = [{
        model: db.SugoUserRole
      }]
      res = await db.client.transaction(async transaction => {
        let user = await this.userService.findUser({ id }, { raw: true, include, transaction })
        if (!user) return false
        user = user.get({ plain: true })
        user.changed_by_fk = userId
        delete user.id
        user.roles = user.SugoUserRoles.map(i => {
          return {
            id: i.role_id
          }
        })
        await this.userDraftService.update(user, query1.where, { transaction })
        let res3 = await this.dataCheckingService.findCheckData({ userDraftId: id }, transaction)
        res3 = res3.get({ plain: true })
        if (!res3) return false
        let record = {
          applyId: userId,
          status: futureStatus
        }
        await this.dataCheckingService.updateCheckData(record, { userDraftId: id }, transaction)
      })
    }

    if (!res && futureStatus === 0) return returnError(ctx, '提交审核失败')
    if (!res && (futureStatus === -1 || futureStatus === 1)) return returnError(ctx, '撤销审核失败')
    if (res && futureStatus === 0) return returnResult(ctx, '提交审核成功')
    if (res && (futureStatus === -1 || futureStatus === 1)) return returnResult(ctx, '撤销审核成功')
    return returnResult(ctx, '未知错误')
  }

  async editUserDraft (ctx) {

    let {
      user = {}
    } = ctx.q

    let { roles, id, isGoAudit = false } = user

    if (!id) {
      return returnError(ctx, 'id不能为空', 404)
    }

    let u = ctx.session.user
    let { company_id } = u
    let userId = u.id

    let query1 = {
      where: {
        id,
        company_id
      }
    }

    let inDb = await db.SugoUserDraft.findOne(query1)

    //判断是否存在
    if (!inDb) {
      return returnError(ctx, '找不到用户', 404)
    }

    //判断是否重名
    else if (
      !_.isUndefined(user.username) &&
      user.username !== inDb.username) {
      let inDb1 = await db.SugoUserDraft.findOne({
        where: {
          username: user.username
        }
      })

      let inDb2 = await db.SugoUser.findOne({
        where: {
          username: user.username
        }
      })

      if (inDb1 || inDb2) return returnError(ctx, '用户名被占用, 换一个吧')
    } else if (_.trim(user.email) && user.email !== inDb.email) {
      let inDb3 = await db.SugoUser.findOne({
        where: {
          email: user.email
        }
      })
      let inDb4 = await db.SugoUserDraft.findOne({
        where: {
          email: user.email
        }
      })
      if (inDb3 || inDb4) return returnError(ctx, '邮件地址被占用, 换一个吧')
    }

    //创建
    user = _.pick(user, ['username', 'first_name', 'password', 'active', 'email', 'last_name', 'cellphone', 'institutions_id', 'departments', 'status', 'efficacy_at', 'loss_efficacy_at'])
    user.changed_by_fk = userId
    user.roles = roles

    //built-in user name not change able
    if (inDb.type === 'built-in') {
      delete user.username
      delete user.active
      if (userId !== inDb.id) {
        return returnError(ctx, '您无权更改超级管理员')
      }
    }


    if (user.password) {
      let { password } = user
      if (!testPassword(password)) {
        return returnError(ctx, '密码必须为6~20位字母和数字组合')
      }

      password = await hash(password)
      user.password = password
    }

    let res

    res = await db.client.transaction(async transaction => {
      await db.SugoUserDraft.update(user, { ...query1, transaction })
      let res3 = await this.dataCheckingService.findCheckData({ userDraftId: id }, transaction)
      res3 = res3.get({ plain: true })
      if (!res3) return false
      let record = {
        // 操作类型(1=新增，2=修改，3=删除)
        operationType: res3.operationType === 1 && (res3.status === -1 || res3.status === 2) ? res3.operationType : 2,
        type: 1,
        applyId: userId,
        status: isGoAudit ? 0 : res3.status
      }
      await this.dataCheckingService.updateCheckData(record, { userDraftId: id }, transaction)
      return true
    })

    if (!res) {
      returnError(ctx, '编辑失败')
    }

    returnResult(ctx, res)
  }

  async deleteUserDraft (ctx) {

    let {
      id
    } = ctx.q

    if (!id) {
      return returnError(ctx, 'id不能为空', 404)
    }
    let u = ctx.session.user
    let { company_id, id: userId } = u

    let query1 = {
      where: {
        id,
        company_id
      }
    }

    let inDb2 = await db.SugoUserDraft.findOne(query1.where)
    let inDb3 = await this.dataCheckingService.findCheckData({ userDraftId: id })
    let res

    if (!inDb2 || !inDb3) return returnError(ctx, '找不到该用户')

    if (inDb3.status === 0) return returnError(ctx, '待审核状态不得删除')

    if (inDb3.operationType === 1 && inDb3.status === -1) {
      res = await db.client.transaction(async transaction => {
        await this.dataCheckingService.deleteCheckData({ userDraftId: id }, transaction)
        await db.SugoUserDraft.destroy({ where: { id }, transaction })
        return true
      })
      return returnResult(ctx, res)
    }

    // if(!inDb||!inDb2||!inDb3) return returnError(ctx,'找不到该用户');

    res = await this.dataCheckingService.updateCheckData({
      applyId: userId,
      operationType: 3,
      status: 0
    }, { userDraftId: id })

    if (!res) return returnError(ctx, '提交删除失败')

    return returnResult(ctx, res)
  }

  async userAudit (ctx) {
    const userDraftService = new userDraftServiceCreator()
    const { user, isPassed } = ctx.q
    const { id } = user
    let u = ctx.session.user
    let { company_id, id: userId } = u
    let res
    res = await db.client.transaction(async transaction => {
      let res = await userDraftService.auditUser(id, userId, company_id, isPassed, transaction)
      return res
    })
    return returnResult(ctx, res)
  }
}

export function hash (password) {
  return new Promise((resolve, reject) => {
    hasher.generate(password, (err, str) => {
      if (err) {
        reject(err)
      } else {
        resolve(str)
      }
    })
  })
}

export function verifyPass (pass, passEnc) {
  return new Promise((resolve, reject) => {
    hasher.verify(pass, passEnc, (err, verified) => {
      if (err) {
        reject(err)
      } else {
        resolve(verified)
      }
    })
  })
}

const addUserChecker = async (username, email, password, ...rest) => {
  for (let tb of rest) {
    let inDb = await tb.findOne({
      where: {
        username
      }
    })

    //判断是否重复
    if (inDb) {
      return {
        success: false,
        message: '用户名被占用，换一个吧'
      }
    }

    inDb = email && await tb.findOne({
      where: {
        email
      }
    })

    debug('email', email, inDb)

    if (inDb) {
      return {
        success: false,
        message: '邮件地址被占用，换一个吧'
      }
    }
  }

  if (!testPassword(password)) {
    return {
      success: false,
      message: '密码必须为6~20位字母和数字组合'
    }
  }

  return {
    success: true,
    message: ''
  }
}
