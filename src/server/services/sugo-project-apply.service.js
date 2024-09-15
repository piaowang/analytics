import ProjectController from '../controllers/project.controller'
import UserController from '../controllers/user.controller'
import RoleController from '../controllers/role.controller'
import ProjectService from './sugo-project.service'
import DatasourceService from './sugo-datasource.service'
import roleService from '../services/role.service'
import { hash } from '../controllers/user.controller'
import UindexDatasourceService from '../services/uindex-datasource.service'
import SupervisorService from './druid-supervisor.service'
import { appendSDKDefaultSlices, appendSDKDefaultDashboards, appendSDKDefaultMetrics } from './sugo-datasource.service'
import testPassword from '../../common/test-password'
import {  commonPermissions } from '../models/apis'
import {checkLimit} from '../utils/resouce-limit'
import CryptoJS from 'crypto-js'
import short_id from '../models/safe-id'
import config from '../config'
import {
  BaseService
} from './base.service'
import db from '../models'
import {
  AccessDataType,
  AccessDataTableType,
  AccessDataOriginalType,
  DataSourceType,
  ProjectStatus,
  ProjectState
} from '../../common/constants'
import { SDK_DEFAULT_DIMENSIONS} from '../../common/sdk-access-dimensions'
import {
  defineTypes,
  PropTypes
} from '../../common/checker'
import _ from 'lodash'

const { projectCapacity } = config

let funcPermissions = [
  'get#/console/slices',
  'get#/console/analytic',
  'get#/console/analytic/inspect-source-data',
  'post#/app/slices/create/slices/',
  'post#/app/slices/update/slices/',
  'post#/app/slices/delete/slices/',
  'post#/app/slices/share',
  'get#/console/',
  'get#/app/download/batch',
  'post#/app/behavior-analytics/models',
  'put#/app/behavior-analytics/models/:modelId',
  'delete#/app/behavior-analytics/models/:modelId',
  'get#/console/retention',
  'get#/console/funnel',
  'get#/console/usergroup',
  'get#/console/inspect-user/:id',
  'get#/console/segment-expand',
  'get#/console/segment-expand/new',
  'get#/console/segment-expand/:seId',
  'get#/console/loss-predict',
  'get#/console/loss-predict/file-histories',
  'get#/console/loss-predict/:modelId/predictions',
  'get#/console/loss-predict/:modelId/begin-predict',
  'get#/console/path-analysis',
  'get#/console/rfm',
  'get#/console/rfm/:projectId/:id/info',
  'get#/console/rfm/:id/new',
  'get#/console/app/rfm/delete',
  'get#/console/traffic-analytics',
  'get#/console/behavior-analytics',
  'get#/console/user-action-analytics',
  'get#/console/heat-map',
  'get#/app/gallery/delete/:id',
  'post#/app/loss-predict/models',
  'put#/app/loss-predict/models/:modelId',
  'delete#/app/loss-predict/models/:modelId',
  'post#/app/path-analysis/create',
  'post#/app/path-analysis/update',
  'post#/app/path-analysis/delete',
  'post#/app/retention/create',
  'post#/app/retention/update',
  'post#/app/retention/delete',
  'post#/app/segment-expand/delete',
  'post#/app/slices/userAction/',
  'put#/app/slices/userAction/:id',
  'delete#/app/slices/userAction/:id',
  'post#/app/funnel/create',
  'post#/app/funnel/update',
  'delete#/app/funnel/delete/:id',
  'post#/app/traffic-analytics/models',
  'put#/app/traffic-analytics/models/:modelId',
  'delete#/app/traffic-analytics/models/:modelId',
  'post#/app/usergroup/create',
  'post#/app/usergroup/update',
  'post#/app/usergroup/delete',
  'get#/app/usergroup/:id/users/download',
  'get#/app/usergroup/:id/recompute',
  'get#/console/overview',
  'get#/console/dimension',
  'get#/console/measure',
  'get#/console/dashboards',
  'get#/console/security/user',
  'get#/console/security/role',
  'get#/console/project',
  'get#/console/project/datasource-settings',
  'get#/console/scenes',
  'get#/console/scenes/financial',
  'get#/console/scenes/loan',
  'get#/console/scenes/use',
  'post#/app/dashboards/update',
  'post#/app/dashboards/delete',
  'post#/app/dashboards/create',
  'post#/app/dashboards/share',
  'post#/app/dimension/create/:id',
  'put#/app/dimension/update/:id',
  'post#/app/dimension/delete',
  'put#/app/dimension/authorize/:id',
  'post#/app/dimension/sync/:id',
  'post#/app/dimension/order-management',
  'post#/app/dimension/tags-management',
  'put#/app/measure/update/:id',
  'post#/app/measure/delete',
  'post#/app/measure/create/:id',
  'put#/app/measure/authorize/:id',
  'post#/app/measure/order-management',
  'post#/app/measure/tags-management'
]

const $checker = {
  create: defineTypes({
    name: PropTypes.string.isRequired,
    type: PropTypes.oneOf(_.values(AccessDataType))
  })
}

export default class ProjectApply extends BaseService {

  constructor() {
    super()
  }

  async createProject(query, transaction) {
    const {
      name,
      company_id,
      company_type,
      user_id
    } = query

    let ctx = {
      q: {
        name,
        type: AccessDataType.SDK
      },
      session: {
        user: {
          id: user_id,
          company_id,
          company: {
            id: company_id,
            type: company_type
          },
          SugoRoles: []
        }
      }
    }

    const checked = $checker.create(ctx.q)
    if (!checked.success) {
      return { success: false }
    }

    const {
      type
    } = ctx.q
    const res = await ProjectService.findOneByName(name, company_id)

    if (res.success) {
      return { success: false, message: '名称已存在' }
    }

    let datasType = DataSourceType.Tindex

    const dataSource = ProjectService.generateProjectName(company_id, datasType)

    // 1. 插入数据源记录，并在数据源中记录接入类型，留待后用
    let resDs = await DatasourceService.createDataSource(
      ctx,
      dataSource,
      name, {},
      transaction,
      datasType,
      // type === AccessDataType.Tag ? dataSource : undefined
    )

    if (!resDs.success) {
      return { success: false }
    }

    const { result: DataSource } = resDs
    if (AccessDataType.SDK === type) {
      await db.client.queryInterface.createTable(`sugo_${DataSource.name}`, {
        device_id: {
          type: DataTypes.STRING(100),
          allowNull: false,
          primaryKey: true
        },
        app_type: {
          type: DataTypes.STRING(20),
          unique: true
        },
        app_version: {
          type: DataTypes.STRING(50),
          unique: true
        },
        channel: {
          type: DataTypes.STRING(50)
        },
        start_time: {
          type: DataTypes.TIME,
          allowNull: false
        }
      }, { transaction })
    }

    // 2. 插入项目记录
    return await ProjectService.create(
      company_id,
      name,
      DataSource.id,
      DataSource.name, {
        company_id,
        status: ProjectStatus.Show,
        state: ProjectState.Disable,
        access_type: type,
        created_by: user_id,
        updated_by: user_id,
        tag_datasource_name: type === AccessDataType.Tag ? DataSource.name : undefined
      },
      transaction
    )

  }

  async createDataAnalysis({
    project,
    project_id,
    user_id,
    company_id
  }, transaction) {
    // 创建维表记录
    // + 如果是SDK，默认创建四条SDK记录，分别为Android、Ios、Web,wxmini
    let dataAnalysisType = [{
      name: 'iOS接入',
      access_type: AccessDataOriginalType.Ios
    }, {
      name: 'Android接入',
      access_type: AccessDataOriginalType.Android
    }, {
      name: 'Web接入',
      access_type: AccessDataOriginalType.Web
    }, {
      name: '微信小程序',
      access_type: AccessDataOriginalType.WxMini
    }]

    for (let i = dataAnalysisType.length - 1; i >= 0; i--) {
      let ctx = {
        q: {
          name: dataAnalysisType[i].name,
          access_type: dataAnalysisType[i].access_type,
          type: AccessDataTableType.Main
        }
      }
      const {
        name,
        type,
        package_name = null,
        access_type,
        params = {}
      } = ctx.q


      // const {
      //   result: project
      // } = await ProjectService.info(project_id)
  
      if (!project || !project.id) {
        throw Error('项目不存在')
      }
  
      if (project.company_id !== company_id) {
        throw Error('无操作权限')
      }

      let dataAnalysis = {
        name,
        type,
        package_name,
        access_type,
        project_id,
        status: ProjectState.Disable,
        params,
        created_by: user_id,
        updated_by: user_id
      }

      // 创建
      // 改为md5加长的字符串
      dataAnalysis.id = CryptoJS.MD5(short_id()).toString()
      const ins = await db.SugoDataAnalysis.create(dataAnalysis, { transaction })
      dataAnalysis = ins.get({ plain: true })

      // 如果是SDK接入，在此初始化维度与数据源
      if (
        access_type === AccessDataOriginalType.Android ||
        access_type === AccessDataOriginalType.Ios ||
        access_type === AccessDataOriginalType.Web ||
        access_type === AccessDataOriginalType.WxMini
      ) {

        // 创建数据源之前，先判断是否已创建该项目的数据源
        let dRes = await db.SugoDatasources.findOne({ where: { id: project.datasource_id }, transaction } )
        dRes = dRes ? dRes.get({ plain: true }) : {}


        if (_.isEmpty(dRes)) {
          throw Error('创建失败')
        }

        const dataSource = dRes

        if (_.isEmpty(dataSource.params)) {
          // 初始化维度、配置参数
          const res = await DatasourceService.processForAccessSDK(project.datasource_id, company_id, transaction)
          if (!res.success) {
            throw Error('创建sdk失败')
          }
        }

        // 激活数据源
        if (project.state !== ProjectState.Activate) {
          await ProjectService.checkProjectCapacity()
          
          let pRes = await db.SugoProjects.findOne({ where: { id: project_id }, transaction })
          pRes = pRes ? pRes.get({plain: true}) : {}
          if (_.isEmpty(pRes)) throw Error('激活数据源失败')
      
          const project = pRes
          if (project.state === ProjectState.Activate) continue

          let scheduler = async (record) => {
            return await DatasourceService.runSupervisor(record)
          }
      
          const sRes = await scheduler(project)
          if (!sRes.success) throw Error('激活数据源失败')
      
          try {
            await db.SugoProjects.update({ state: ProjectState.Activate }, {
              where: {
                id: project_id
              }, transaction
            })
          } catch (e) {
            throw Error(e.message)
          }
        }
      }
    }
  }

  async addRole({
    name,
    company_id,
    company_type,
    user_id,
    datasource_id
  }, transaction) {

    let dimensionRes = await db.SugoDimensions.findAll({
      where: {
        parentId: datasource_id,
        company_id
      },
      transaction,
      attributes: ['id', 'role_ids']
    })
    let measureRes = await db.SugoMeasures.findAll({
      where: {
        parentId: datasource_id,
        company_id
      },
      transaction,
      attributes: ['id', 'role_ids']
    })
    let dimensionIds = dimensionRes.map(i => _.get(i, 'dataValues.id'))
    let measureIds = measureRes.map(i => _.get(i, 'dataValues.id'))
    try {
      let ctx = {
        session: {
          user: {
            company: {
              id: company_id,
              type: company_type
            },
            company_id,
            id: user_id
          }
        }
      }

      let role = {
        name,
        funcPermissions,
        dataPermissions: {
          datasourceIds: [
            datasource_id
          ],
          measureIds,
          dimensionIds
        }
      }
      let { dataPermissions } = role
      if (!name) {
        throw Error('用户组名称为空')
      }

      await checkLimit(ctx, 'role')

      let permissionList = funcPermissions.concat(
        commonPermissions.map(p => p.id)
      )
      permissionList = _.uniq(permissionList)
      //创建
      role.created_by_fk = user_id
      role.changed_by_fk = user_id
      role.company_id = company_id
      delete role.id
      role.type = 'user-created'
      let where = {
        company_id,
        name
      }

      let res = await roleService.addRole({ where, role, permissionList, dataPermissions, company_id, transaction})


      let dataSoucrceRes = await db.SugoDatasources.findOne({
        where: {
          id: datasource_id
        },
        transaction,
        attributes: ['role_ids']
      })
      let dataSoucrceRoleArr = _.get(dataSoucrceRes, 'dataValues.role_ids')

      let dimensionRolesArr = dimensionRes.map(i => i.get({
        plain: true
      }))

      let measureArr = measureRes.map(i => i.get({
        plain: true
      }))

      let existedRole = await db.SugoRole.findOne({
        where: {
          name
        }, transaction
      })
      let role_id = _.get(existedRole, 'dataValues.id')

      dataSoucrceRoleArr.push(role_id)

      dataSoucrceRoleArr = _.uniq(dataSoucrceRoleArr)

      await db.SugoDatasources.update({
        role_ids: dataSoucrceRoleArr
      }, {
        where: {
          id: datasource_id
        },
        transaction
      })

      for (let i = dimensionRolesArr.length - 1; i >= 0; i--) {
        dimensionRolesArr[i].role_ids.push(role_id)
        await db.SugoDimensions.update({
          role_ids: _.uniq(dimensionRolesArr[i].role_ids)
        }, {
          where: {
            id: dimensionRolesArr[i].id,
            parentId: datasource_id,
            company_id
          },
          transaction
        })
      }

      for (let i = measureArr.length - 1; i >= 0; i--) {
        measureArr[i].role_ids.push(role_id)
        await db.SugoMeasures.update({
          role_ids: _.uniq(measureArr[i].role_ids)
        }, {
          where: {
            id: measureArr[i].id,
            parentId: datasource_id,
            company_id
          },
          transaction
        })
      }
      return res
    } catch (e) {
      if (e.message === '角色名称重复了，换一个吧') {
        //存在同名角色 只做关联 更新角色并更新数据源记录 维度记录 
        let dataSoucrceRes = await db.SugoDatasources.findOne({
          where: {
            id: datasource_id
          },
          transaction,
          attributes: ['role_ids']
        })
        let dataSoucrceRoleArr = _.get(dataSoucrceRes, 'dataValues.role_ids')

        let dimensionRolesArr = dimensionRes.map(i => i.get({
          plain: true
        }))

        let measureArr = measureRes.map(i => i.get({
          plain: true
        }))

        let existedRole = await db.SugoRole.findOne({
          where: {
            name
          }
        })
        let role_id = _.get(existedRole, 'dataValues.id')

        dataSoucrceRoleArr.push(role_id)

        dataSoucrceRoleArr = _.uniq(dataSoucrceRoleArr)

        await db.SugoDatasources.update({
          role_ids: dataSoucrceRoleArr
        }, {
          where: {
            id: datasource_id
          },
          transaction
        })

        for (let i = dimensionRolesArr.length - 1; i >= 0; i--) {
          dimensionRolesArr[i].role_ids.push(role_id)
          await db.SugoDimensions.update({
            role_ids: _.uniq(dimensionRolesArr[i].role_ids)
          }, {
            where: {
              id: dimensionRolesArr[i].id,
              parentId: datasource_id,
              company_id
            },
            transaction
          })
        }

        for (let i = measureArr.length - 1; i >= 0; i--) {
          measureArr[i].role_ids.push(role_id)
          await db.SugoMeasures.update({
            role_ids: _.uniq(measureArr[i].role_ids)
          }, {
            where: {
              id: measureArr[i].id,
              parentId: datasource_id,
              company_id
            },
            transaction
          })
        }
        return
      }
      console.log(e,`${new Date()}api创建项目失败`)
      throw Error('创建角色失败')
    }
  }

  async addUser(
    username,
    email,
    name,
    company_id,
    company_type,
    user_id,
    transaction) {
    let ctx = {
      session: {
        user: {
          company: {
            id: user_id,
            type: company_type
          },
          company_id,
          id: user_id
        }
      }
    }

    let user = {
      username,
      first_name: name,
      roles: [],
      password: username
    }

    if (!_.isEmpty(email)) user.email = email

    try {
      let userId = user_id
      await checkLimit(ctx, 'user')

      let inDb = await db.SugoUser.findOne({
        where: {
          username
        }
      })
  
      //判断是否重复
      if (inDb) {
        return { error: '用户名被占用，换一个吧' }
      }

      if (!_.isEmpty(email)) {
        inDb = email && await db.SugoUser.findOne({
          where: {
            email
          }
        })
  
        if (inDb) {
          return { error: '邮件地址被占用，换一个吧' }
        }
      }

      //创建
      user.created_by_fk = userId
      user.changed_by_fk = userId
      user.company_id = company_id

      delete user.id
      user.type = 'user-created'

      let res1 = await db.SugoUser.create(user, { transaction })

      let res = res1.get({plain: true}) || {}
      delete res.password
      return res

    } catch (e) {
      return { error: e }
    }
  }

  async contactUserAndRole(user_id, role_id, transaction) {
    let q = {
      user_id,
      role_id
    }
    await db.SugoUserRole.findOrCreate({
      where: q,
      defaults: q,
      transaction
    })
  }

  async contactRoleAndProject(datasource_id, projectName, company_id, transaction) {
    //更新数据权限
    let dimensionRes = await db.SugoDimensions.findAll({
      where: {
        parentId: datasource_id,
        company_id
      },
      transaction,
      attributes: ['id', 'role_ids']
    })
    let measureRes = await db.SugoMeasures.findAll({
      where: {
        parentId: datasource_id,
        company_id
      },
      transaction,
      attributes: ['id', 'role_ids']
    })
    let dataSoucrceRes = await db.SugoDatasources.findOne({
      where: {
        id: datasource_id
      },
      transaction,
      attributes: ['role_ids']
    })
    let dataSoucrceRoleArr = _.get(dataSoucrceRes, 'dataValues.role_ids')

    let dimensionRolesArr = dimensionRes.map(i => i.get({
      plain: true
    }))

    let measureArr = measureRes.map(i => i.get({
      plain: true
    }))

    let existedRole = await db.SugoRole.findOne({
      where: {
        name: projectName
      }, transaction
    })
    let role_id = _.get(existedRole, 'dataValues.id')

    dataSoucrceRoleArr.push(role_id)

    dataSoucrceRoleArr = _.uniq(dataSoucrceRoleArr)
    //关联用户组和项目
    await db.SugoDatasources.update({
      role_ids: dataSoucrceRoleArr
    }, {
      where: {
        id: datasource_id
      }, transaction
    })
    //更新维度信息
    for (let i = dimensionRolesArr.length - 1; i >= 0; i--) {
      dimensionRolesArr[i].role_ids.push(role_id)
      await db.SugoDimensions.update({
        role_ids: _.uniq(dimensionRolesArr[i].role_ids)
      }, {
        where: {
          id: dimensionRolesArr[i].id,
          parentId: datasource_id,
          company_id
        }, transaction
      })
    }
    //更新指标信息
    for (let i = measureArr.length - 1; i >= 0; i--) {
      measureArr[i].role_ids.push(role_id)
      await db.SugoMeasures.update({
        role_ids: _.uniq(measureArr[i].role_ids)
      }, {
        where: {
          id: measureArr[i].id,
          parentId: datasource_id,
          company_id
        }, transaction
      })
    }
  }
}
