import { BaseService } from './base.service'
import RoleService from './role.service'
import _ from 'lodash'
import institutionsRole from './institutionsRole.service'
import RoleDraftService from './role-draft.service'
import UserDraftService from './user-draft-service'
import InstitutionsDraftService from './institutions-draft.service'

export default class SugoDataCheckingService extends BaseService {
  static instance = null;

  constructor() {
    super('SugoDataChecking')
    this.instance = null
    this.RoleDraftService = RoleDraftService.getInstance()
    this.institutionsRole = institutionsRole.getInstance()
    this.userDraftService = UserDraftService.getInstance()
    this.institutionsDraft = InstitutionsDraftService.getInstance()
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new SugoDataCheckingService()
    }
    return this.instance
  }

  //获取审核列表
  async getList(query = {}, limit, page) {
    let { status, type, keyWord } = query
    let where = {
      // operationType,
      status
    }

    if (!_.isUndefined(status) && !_.isNull(status)) {
      where.status = { $eq: status }
    } else {
      where.status = { $ne: -1 }
    }

    if (!_.isUndefined(type) && !_.isNull(type)) {
      where.type = { $eq: type }
    }
    //不是admin的用户不能审核自己
    if(query.unAdmin){
      where.applyId = { $ne: query.userId }
    }

    let searchKeyWord = false

    if (!_.isUndefined(keyWord) && !_.isNull(keyWord) && keyWord !== '') {
      searchKeyWord = true
    }

    let include = [
      {
        model: this.db.SugoUser,
        as: 'apply_user',
        attributes: ['username']
      },
      {
        model: this.db.SugoUser,
        as: 'check_user',
        attributes: ['username']
      },
      {
        model: this.db.SugoRoleDraft,
        as: 'SugoRole'
      },
      {
        model: this.db.SugoInstitutionsDraft,
        as: 'SugoInstitutions'
      },
      {
        model: this.db.SugoUserDraft,
        as: 'SugoUser'
      }
    ]

    if (searchKeyWord) {
      where = {
        ...where,
        $or: [
          { '$apply_user.username$': { $like: `%${keyWord}%` } },
          { '$check_user.username$': { $like: `%${keyWord}%` } },
          { '$SugoRole.name$': { $like: `%${keyWord}%` } },
          { '$SugoInstitutions.name$': { $like: `%${keyWord}%` } },
          { '$SugoUser.first_name$': { $like: `%${keyWord}%` } },
          { '$SugoUser.username$': { $like: `%${keyWord}%` } }
        ]
      }
    }

    const res = await this.findAndCountAll(where, {
      limit,
      offset: limit * (page - 1),
      include,
      order:[['updated_at','DESC']]
    })
    return res
  }

  async getDetail({id}){
    let include = [
      {
        model: this.db.SugoUser,
        as: 'apply_user',
        attributes: ['username']
      },
      {
        model: this.db.SugoUser,
        as: 'check_user',
        attributes: ['username']
      },
      {
        model: this.db.SugoRoleDraft,
        as: 'SugoRole'
      },
      {
        model: this.db.SugoInstitutionsDraft,
        as: 'SugoInstitutions'
      },
      {
        model: this.db.SugoUserDraft,
        as: 'SugoUser'
      }
    ]
    const res = await this.findOne({id}, {
      include
    })
    return res
  }

  /**
   *
   * @param {}
   * param1 = {
   *  checkId:草稿id
   *  type: 复核类别(1=用户，2=角色，3=机构)
   *  applyId:申请人id（没有可以不传）
   *  operationType:操作类型(1=新增，2=修改，3=删除)
   *  status:'复核类型(-1 = 待提交 0=待复核，1=复核通过 2=复核驳回，3=已撤销)',
   * }
   * param2 = 事务
   */
  async addCheckData(param = {}, transaction) {
    let { type } = param

    let idName

    switch (type) {
      case 1:
        idName = 'userDraftId'
        break
      case 2:
        idName = 'checkId'
        break
      case 3:
        idName = 'institutionsDraftId'
    }

    let [result, isCreate] = await this.findOrCreate(
      {
        [idName]: param[idName]
      },
      param,
      { transaction }
    )
    if (result && isCreate === false) {
      throw new Error('草稿已经存在')
    }
    return result
  }
  /**
   * where 查找条件
   * transaction 事务
   */
  async findCheckData(where = {}, other = {}) {
    const res = await this.findOne(where, other)
    return res
  }
  /**
   * data 更新数据
   * where 更新条件
   * transaction 事务
   *
   */
  async updateCheckData(data, where, transaction = false) {
    const res = await this.update(data, where, { transaction })
    return res
  }

  /**
   * where 删除条件
   * transaction 事务
   */

  async deleteCheckData(where, transaction) {
    const res = await this.remove(where, { transaction })
    return res
  }

  //审核角色
  async roleCheck(detail, ctrStatus, transaction) {
    if (ctrStatus) {
      //审核通过

      const id = detail.checkId
      const Roledetail = await this.db.SugoRoleDraft.findByPk(id)
      if (detail.operationType === 3) {
        //删除功能权限
        await this.db.SugoRoleRoute.destroy({
          where: {
            role_id: id
          },
          transaction
        })

        //删除所属机构
        await this.db.SugoInstitutionsRole.destroy({
          where:{role_id: id},
          transaction
        })

        //删除关联角色数据源
        await this.getDataByUserId(id, this.db.SugoDatasources,transaction)
        //删除关联角色子项目
        await this.getDataByUserId(id, this.db.SugoChildProjects,transaction)
        //删除关联角色维度
        await this.getDataByUserId(id, this.db.SugoDimensions,transaction)
        //删除关联角色指标
        await this.getDataByUserId(id, this.db.SugoMeasures,transaction)
        await this.getDataByUserId(id, this.db.TagGroup,transaction)
        const re = await Roledetail.destroy({transaction})
        return re
      }
      const {
        id: roleId,
        funcPermissions: permissionList,
        dataPermissions,
        companyId: company_id
      } = Roledetail

      const Institutions = Roledetail.institutionsIds.map(val => {
        return {
          institutions_id: val,
          role_id: id
        }
      })
      const newData = Roledetail.get({ plain: true })
      newData.created_by_fk = newData.createdByFk
      newData.changed_by_fk = newData.changedByFk
      newData.company_id = newData.companyId
      //更新角色
      if(detail.operationType === 2){
        await this.db.SugoRole.update(newData, {where:{id:Roledetail.id}, transaction })
      }else{
        await this.db.SugoRole.create(newData, { transaction })
      }
      //更新所属机构
      await this.institutionsRole.updataFun(
        Institutions,
        {
          role_id: id
        },
        transaction
      )
      //更新功能权限
      await RoleService.funcAuth({
        roleId,
        transaction,
        permissionList
      })
      //更新数据权限
      await RoleService.dataAuth({
        ...dataPermissions,
        company_id,
        roleId,
        transaction
      })

      detail.status = 1
      detail.acceptanceTime = new Date()
      const res = await this.updateCheckData(
        detail,
        { id: detail.id },
        transaction
      )
      return res
    } else {
      //拒绝
      //修改状态回复权限
      if (detail.operationType === 2) {
        //恢复角色
        await this.resetFun(detail.checkId, transaction)
        detail.status = 1
      } else {
        //拒接
        detail.status = -1
      }
    }
    //更新审核表
    const res = await this.updateCheckData(
      detail,
      { id: detail.id },
      transaction
    )
    return res
  }
  //审核
  async checkFun(detail, ctrStatus) {
    const res = this.db.client.transaction(async transaction => {
      if (detail.type === 1) {
        //审核用户
        let { userDraftId, userId, company_id,comment, checkUserId } = detail
        let isPassed = !!ctrStatus
        await this.userDraftService.auditUser(
          userDraftId,
          userId,
          company_id,
          isPassed,
          comment,
          checkUserId,
          transaction
        )
      }
      if (detail.type === 2) {
        await this.roleCheck(detail, ctrStatus, transaction)
      }
      if (detail.type === 3) {
        //审核机构
        let { comment,checkUserId } = detail
        await this.institutionsDraft.updateCheckWithTrans({
          id: detail.institutionsDraftId,
          ctrStatus,
          operationType: detail.operationType,
          acceptanceTime:new Date(),
          comment,
          checkUserId
        },transaction)
      }
    })
    return res
  }
  //获取角色数据id
  async getDataByUserId(id, model, transaction) {
    const list = await model.findAll({
      where: this.db.Sequelize.where(
        this.db.Sequelize.cast(this.db.Sequelize.col('role_ids'), 'text'),
        { $like: '%"' + id + '"%' }
      )
    })
    //如果有事物
    if(transaction) {
      const listArr = list.map((item)=>{
        item.role_ids = _.without(item.role_ids,id)
        return item
      })
      if(listArr.length){
        return await model.bulkCreate(listArr,{transaction})
      }
      return true
    }
    return list.map(item => {
      return item.id
    })
  }
  //恢复角色旧权限
  async resetFun(id) {
    const detail = await this.db.SugoRole.findOne({ where: { id }, raw: true })
    detail.companyId = detail.company_id
    //功能权限
    const fp = await this.db.SugoRoleRoute.findAll({
      where: {
        role_id: id
      }
    })
    detail.funcPermissions = fp.map(val => {
      return val.route_id
    })
    //恢复所属机构
    const getIns = await this.institutionsRole.getRoleInstitutions({
      role_id: id
    })
    detail.institutionsIds = getIns.map(item => {
      return item.institutions_id
    })

    //获取数据源
    const dss = await this.getDataByUserId(id, this.db.SugoDatasources)
    //获取子项目
    const cps = await this.getDataByUserId(id, this.db.SugoChildProjects)
    //维度id
    const ds = await this.getDataByUserId(id, this.db.SugoDimensions)
    //指标
    const ms = await this.getDataByUserId(id, this.db.SugoMeasures)
    const tp = await this.getDataByUserId(id, this.db.TagGroup)
    const dataArr = dss.concat(cps)
    detail.dataPermissions = {
      measureIds: ms,
      tagGroupIds: tp,
      dimensionIds: ds,
      datasourceIds: _.uniq(dataArr)
    }
    return await this.RoleDraftService.updateRole(detail, { id })
  }
}
