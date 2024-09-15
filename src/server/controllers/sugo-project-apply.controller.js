import ProjectApply from '../services/sugo-project-apply.service'
import { Response } from '../utils/Response'
import { defineTypes, PropTypes } from '../../common/checker'
import { DEFAULT_COMPANY_EMAIL } from '../constants/index'
import { AccessDataType, AccessDataOriginalType } from '../../common/constants'
import db from '../models'
import _ from 'lodash'

const projectTypeArr = ['0','1','2','3']//['IOS','ANDROID','WEB','WECHART']
const typeMap = [AccessDataOriginalType.Ios,AccessDataOriginalType.Android,AccessDataOriginalType.Web,AccessDataOriginalType.WxMini]

const $checker = {
  create: defineTypes({
    name: PropTypes.string.isRequired,
    type: PropTypes.oneOf(_.values(projectTypeArr)).isRequired
  }),
  createUser: defineTypes({
    name: PropTypes.string.isRequired,
    userName: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    projectName: PropTypes.string.isRequired
  })
}

export default class ProjectApplyController {

  constructor() {
    this.projectApplyService = new ProjectApply()
  }

  async create(ctx) {
    const { body } = ctx.request
    const checked = $checker.create(body)
    if (!checked.success) {
      return ctx.body = Response.fail(checked.message)
    }
    const { name, type } = body
    if (name === 'admin') {
      return ctx.body = Response.error('非法项目名')
    }
    if (!projectTypeArr || !projectTypeArr.includes(type)) {
      return ctx.body = Response.error('项目类型错误')
    }

    let res = await db.client.transaction( async transaction => {
      const { company_id, company_type, user_id  } = await this.findAdminInfo()

      let query = { user_id, company_id }
  
      let ProjectRes = await this.projectApplyService.createProject({name,company_id,company_type,user_id}, transaction)

      if (!ProjectRes.success) {
  
        if (ProjectRes.message === '名称已存在') {
          let dRes = await db.SugoProjects.findOne({
            where: {
              name,
              company_id
            },attributes: ['id', 'access_type', 'datasource_name', 'datasource_id']
          })
  
          const { id: project_id, access_type, datasource_name, datasource_id} = _.get(dRes,'dataValues',{})
          //存在同名记录 且该记录类型不是SDK 则报错
          if (access_type !== AccessDataType.SDK) return { success: false }
  
          const dARes = await db.SugoDataAnalysis.findOne({
            where:{
              project_id,
              access_type: typeMap[Number(type)]
            },attributes:['id']
          })
          if (!_.get(dARes,'dataValues.id')) await this.projectApplyService.createDataAnalysis({...query, project_id, project: _.get(dRes,'dataValues',{})}, transaction)
          
          await this.projectApplyService.addRole({ name,  datasource_id, company_type, company_id, user_id }, transaction)

          return { success: true, result:  _.get(dRes,'dataValues',{}) }
        } 
        
        return { success: false }
      }
  
      const { id: project_id, datasource_name, datasource_id } = _.get(ProjectRes,'result')
      await this.projectApplyService.createDataAnalysis({...query, project_id, project: _.get(ProjectRes,'result')}, transaction)
      await this.projectApplyService.addRole({ name, datasource_id,company_type, company_id, user_id }, transaction)
      return { success: true, result:  _.get(ProjectRes,'result') }
    })

    if (!res.success) ctx.body = Response.fail('创建项目失败')
    const { id: project_id, datasource_name, datasource_id } = res.result
    return ctx.body = await this.generateCreateResult(project_id, type, datasource_name)
  }

  async generateCreateResult(project_id, type, datasource_name ) {

    const dARes = await db.SugoDataAnalysis.findOne({
      where:{
        project_id,
        access_type: typeMap[Number(type)]
      },attributes:['id']
    })
    let prejectToken = _.get(dARes,'dataValues.id')
    return Response.ok({
      projectId: datasource_name,
      prejectToken
    })
  }

  async findAdminInfo() {
    const company_result = await db.SugoCompany.findOne({
      where: { 
        email: DEFAULT_COMPANY_EMAIL,
        is_root: true,
        active: true,
        type: 'payed'
      },
      attributes: ['id', 'type']
    })

    const user_result = await db.SugoUser.findOne({
      where: { 
        email: DEFAULT_COMPANY_EMAIL,
        type: 'built-in'
      },
      attributes: ['id']
    })

    const company_id = _.get(company_result, 'dataValues.id')

    const company_type = _.get(company_result, 'dataValues.type')

    const user_id  = _.get(user_result,'dataValues.id')

    return { company_id, company_type, user_id  }
  }
  
  async createUser(ctx) {
    const { body } = ctx.request
    const checked = $checker.createUser(body)
    if (!checked.success) {
      return ctx.body = Response.fail(checked.message)
    }
    const {  name, userName: username, email, projectName } = body

    if (!/^[\w.@]{5,24}$/.test(username)) {
      return ctx.body = Response.fail('用户名必须为5~24位字母或数字')
    }

    let existedProjectName = await db.SugoProjects.findOne({
      where: {
        name: projectName
      },
      attributes:['datasource_id']
    })
    if (!existedProjectName) {
      return ctx.body = Response.fail('不存在该项目')
    }
    let datasource_id = _.get(existedProjectName,'dataValues.datasource_id')

    const { company_id, user_id, company_type } = await this.findAdminInfo()


    let res = await db.client.transaction( async transaction => {
      //创建新用户 没关联到用户组
      let userRes = await this.projectApplyService.addUser(username, email, name, company_id, company_type, user_id, transaction)

      let newUserId

      if (userRes.error) {
        if (userRes.error === '用户名被占用，换一个吧' || userRes.error ==='邮件地址被占用，换一个吧') {

          let where = {
            username,
            first_name: name
          }

          if (!_.isEmpty(email)) where.email = email

          let inDb = await db.SugoUser.findOne({
            where, transaction
          })

          if (!inDb) {
            return { success: false, msg: `${userRes.error}且其他信息错误,无法关联,如需申请,请修改信息` }
          }
          
          inDb = inDb.get({plain:true})
          userRes.id = inDb.id
        } else {
          return { success: false, msg: userRes }
        }
      }

      newUserId = userRes.id

      let existedRole = await db.SugoRole.findOne({
        where: {
          name: projectName
        }, transaction
      })

      let role_id = _.get(existedRole,'dataValues.id')
      if (!existedRole) {
        //不存在项目名称同名用户组 创建一个
        existedRole = await this.projectApplyService.addRole({
          name:projectName, company_id, company_type, user_id, datasource_id, transaction
        })
        role_id = _.get(existedRole,'dataValues.id')
        await this.projectApplyService.contactRoleAndProject(datasource_id, projectName, company_id, transaction)
      } else {
        //已存在,按项目名和项目关联
        await this.projectApplyService.contactRoleAndProject(datasource_id, projectName, company_id, transaction)
      }
  
  
      //关联用户和用户组
      await this.projectApplyService.contactUserAndRole(newUserId, role_id, transaction)
      return ctx.body = Response.ok({
        info: 'success'
      })

    })

    if (!res.success) return ctx.body = Response.fail(res.msg)
  }
}
