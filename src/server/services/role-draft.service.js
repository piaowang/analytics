import { BaseService } from './base.service'
import SugoDataChecking from './data-checking.service'
export default class RoleDraftService extends BaseService {
  static instance = null;

  constructor() {
    super('SugoRoleDraft')
    this.dataChecking = null
    this.instance = null
  }
  getCheckingService = () => {
    if (!this.dataChecking) {
      this.dataChecking = SugoDataChecking.getInstance()
    }
    return this.dataChecking
  };

  static getInstance() {
    if (!this.instance) {
      this.instance = new RoleDraftService()
    }
    return this.instance
  }

  //添加草稿角色
  async addRoleCheck({ where, role }) {
    let res = await this.db.client.transaction(async transaction => {
      //创建角色
      let [result, isCreate] = await this.findOrCreate(where, role, {
        transaction
      })
      if (result && isCreate === false) {
        throw new Error('角色名称重复了，换一个吧')
      }

      let roleId = result.id

      //更新审核权限
      await this.getCheckingService().addCheckData(
        {
          checkId: roleId,
          type: 2,
          applyId: role.createdByFk,
          status: role.isCommit ? 0 : -1
        },
        transaction
      )
    })

    return res
  }
  //获取草稿角色列表
  async getRoleDraft(where = {}, limit = 30, pageNum,searchStatus='') {
    let childWhere = 1
    if(searchStatus !==''){
      switch (searchStatus) {
        case 'add':
          childWhere = {
            status:0,
            operationType:1
          }
          break
        case 'edit':
          childWhere = {
            status:0,
            operationType:2
          }
          break
        case 'del':
          childWhere = {
            status:0,
            operationType:3
          }
          break
        default:
          childWhere = {
            status:searchStatus
          }
          break
      }
    }
    const res = await this.findAndCountAll(where, {
      limit,
      offset: limit * pageNum,
      raw: false,
      include: [
        {
          model: this.db.SugoUser,
          as: 'created_user',
          attributes: ['username']
        },
        {
          model: this.db.SugoUser,
          as: 'change_user',
          attributes: ['username']
        },
        {
          model: this.db.SugoDataChecking,
          as: 'check_detail',
          where: childWhere
        },
        {
          model: this.db.SugoUserRole,
          as: 'userRole',
          include:[{
            model: this.db.SugoUser,
            attributes: ['username']
          }]

        }
      ]
    })
    return res
  }
  // 获取机构信息
  async findInstitutions(where) {
    return await this.db.SugoInstitutions.findAll({
      where,
      attributes: ['name', 'id'],
      raw: true
    })
  }
  async getDetail(where) {
    const other={
      include: [
        {
          model: this.db.SugoDataChecking,
          as:'check_detail'
        }
      ]
    }
    return await this.findOne(where, other)
  }
  //更新草稿角色
  async updateRole(data, where, other = {}) {
    const res = this.db.client.transaction(async transaction => {
      await this.update(data, where, { transaction })
      const checkData = await this.getCheckingService().findCheckData(
        { checkId: data.id },
        { transaction }
      )
      if (checkData.status === 1) checkData.operationType = 2
      if (data.isCommit) {
        checkData.status = 0
      } else {
        checkData.status = -1
      }
      await checkData.save()
    })
    return res
  }
  async deleteRole(id) {
    const res = await this.findOne(
      { id },
      { 
        include: [
          {
            model: this.db.SugoDataChecking,
            as: 'check_detail'
          }
        ]
      }
    )
    if (res.check_detail.status === 1) {
      const bindUser = await this.db.SugoUserRole.findOne({
        where:{
          role_id:id
        }
      })
      if(bindUser) throw new Error('该角色存在绑定的用户不能删除！')
      res.check_detail.status = 0
      res.check_detail.operationType = 3
      const reSave = await res.check_detail.save()
      return reSave
    }
    return await res.destroy()
  }
}
