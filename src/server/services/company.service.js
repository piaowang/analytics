/*
 * 用户企业服务
 */
import db from '../models'
import conf from '../config'
import _ from 'lodash'
import {
  generate
} from 'shortid'
import {
  hash
} from '../controllers/user.controller'
import testPassword from '../../common/test-password'
const omitedProps = ['created_at', 'updated_at', 'id']

//检查用户是否有权限操作企业
const checkPermission = ctx => {
  let {
    company: {
      is_root
    },
    SugoRoles
  } = ctx.session.user
  if (!conf.site.companyManage ||
    !is_root ||
    !_.find(SugoRoles, sr => sr.type === 'built-in')
  ) throw new Error('您无权操作')
}

/*
 * 查询企业
 * @param {object} 查询条件
 * @return {array}
 */
const find = async query => {
  if (!_.isPlainObject(query.where)) {
    query.where = {}
  }
  query.where.deleted = {
    $ne: true
  }
  query.where.is_root = {
    $ne: true
  }
  query.order = [ ['updatedAt', 'DESC'] ]
  return db.SugoCompany.findAll(query)
}

/*
 * 创建企业
 * @param {string} datasource_id 数据源id
 * @param {object} params 企业条件
 * @return {object} 如果出错，抛出错误, 正确返回 SugoCompany实例
 */
const create = async({
  name,
  description,
  type,
  email,
  cellphone,
  password,
  seedProjectId,
  created_by
}) => {

  let def = {
    updated_by: created_by,
    name,
    description,
    type,
    email,
    cellphone,
    active: true,
    is_root: false,
    deleted: false,
    created_by
  }

  let query = {
    where: {
      name
    }
  }

  return await db.client.transaction(async transaction => {

    if (!testPassword(password)) {
      throw new Error('密码不符合格式')
    }

    let hashedPassword = await hash(password)

    //创建企业
    let results = await db.SugoCompany.findOrCreate({
      ...query,
      defaults: def,
      transaction
    })
    let [company, flag] = results
    if (!flag) {
      throw new Error('名字已经存在，请换一个名称')
    }
    let {
      id: company_id
    } = company
    let user_id = generate()
    let role_id = generate()

    //创建root用户组
    await db.SugoRole.create({
      id: role_id,
      name: 'admin',
      description: '超级管理员',
      type: 'built-in',
      company_id
    }, {
      transaction
    })

    //创建root用户
    await db.SugoUser.create({
      id: user_id,
      username: email,
      first_name: name + '的超级管理员',
      type: 'built-in',
      email,
      password: hashedPassword,
      company_id
    }, {
      transaction
    })

    //创建用户*用户组关联
    await db.SugoUserRole.create({
      user_id,
      role_id
    }, {transaction})

    //创建项目
    if (!seedProjectId) return company
    let datasource_id = generate()
    let parentId = datasource_id
    let projectSeed = await db.SugoProjects.findOne({
      where: {
        id: seedProjectId
      },
      transaction
    })
    let proj = _.omit(projectSeed.get({
      plain: true
    }), omitedProps)
    proj.company_id = company_id
    proj.created_by = user_id
    proj.updated_by = user_id
    proj.type = 'built-in'
    proj.datasource_id = datasource_id
    await db.SugoProjects.create(proj, {transaction})

    //数据源
    let role_ids = [role_id]
    let ds = await db.SugoDatasources.findOne({
      where: {
        id: projectSeed.datasource_id
      },
      transaction
    })
    let ds0 = _.omit(ds.get({
      plain: true
    }), omitedProps)
    ds0.id = datasource_id
    ds0.company_id = company_id
    ds0.created_by = user_id
    ds0.updated_by = user_id
    ds0.role_ids = role_ids
    await db.SugoDatasources.create(ds0, {transaction})

    //维度
    let dims = await db.SugoDimensions.findAll({
      where: {
        parentId: projectSeed.datasource_id
      },
      transaction
    })

    let dims0 = dims.map(dim => {
      let dim0 = dim.get({
        plain: true
      })
      return {
        ...dim0,
        id: generate(),
        created_by: user_id,
        updated_by: user_id,
        company_id,
        role_ids,
        parentId
      }
    })

    await db.SugoDimensions.bulkCreate(dims0, {transaction})

    //指标
    let measureName = ds0.name + '_total'
    let mea = {
      id: generate(),
      parentId,
      name: measureName,
      title: '总记录数',
      formula: '$main.count()',
      created_by,
      role_ids,
      company_id
    }
    await db.SugoMeasures.create(mea, {transaction})

    //创建1个单图
    let slice = {
      id: generate(),
      slice_name: '今年的总记录数',
      datasource_name: ds0.name,
      druid_datasource_id: datasource_id,
      created_by: user_id,
      updated_by: user_id,
      company_id,
      params: {
        filters: [
          {
            eq: ['startOf year', 'endOf year'],
            op: 'in',
            col: '__time',
            type: 'datestring',
            dateStringComparingFormat: null
          }
        ],
        metrics: [measureName],
        vizType: 'number',
        timezone: 'Asia/Shanghai',
        dimensions: [],
        tempMetricDict: {},
        autoReloadInterval: 0,
        dimensionExtraSettingDict: {}
      }
    }
    await db.Slices.create(slice, {transaction})

    //加入概览
    await db.SugoOverview.create({
      user_id,
      slice_id: slice.id,
      company_id
    }, {transaction})

    //最终返回
    return company
  })

}

/*
 * 删除企业
 * @param {string} id 企业id
 * @return {object} 删除结果
 */
const del = async({
  id
}) => {
  return await db.SugoCompany.update({
    deleted: true
  }, {
    where: {
      id
    }
  })
}

/*
 * 更新企业
 * @param {string} id 企业id
 * @return {string} 结果
 */
const update = async({
  id,
  updated_by,
  updateObj
}) => {
  let q = {
    where: {
      id
    }
  }

  updateObj.updated_by = updated_by

  //重名检测
  if (updateObj.name) {
    let eg = await db.SugoCompany.findOne({
      where: {
        name: updateObj.name,
        id: {
          $ne: id
        }
      }
    })
    if (eg) {
      throw new Error('名字已经存在，请换一个名称')
    }
  }

  await db.SugoCompany.update(
    updateObj,
    q
  )

  return 'ok'
}

export default {
  create,
  del,
  find,
  update,
  checkPermission
}
