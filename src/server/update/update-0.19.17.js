/**
 * @author heganjie
 * @date   2019/03/25
 * @description 补充编辑个人信息、编辑企业信息、访问企业列表、新增企业 权限，但是只有 编辑个人信息 需要写入数据库，其他三个一般是管理员才有的权限
 */
import {log} from '../utils/log'
import _ from 'lodash'

/**
 * 为已有的角色，设置多个新权限
 * @param from 角色的筛选条件
 * @param tos
 * @param db
 * @param transaction
 * @returns {Promise.<*>}
 */
export async function createPermissionByRole(from, tos, db, transaction) {
  let roles = await db.SugoRole.findAll({
    where: from,
    transaction,
    raw: true
  })
  
  if (_.isString(tos)) {
    tos = _.compact([tos])
  }
  if (!_.isEmpty(roles) && !_.isEmpty(tos)) {
    let toCreate = _(roles).flatMap(role => {
      let {id: role_id} = role
      
      return tos.map(to => ({ role_id, route_id: to }))
    }).value()
    return await db.SugoRoleRoute.bulkCreate(toCreate, {transaction})
  }
}

export default async db => {

  const version = '0.19.17'

  await db.client.transaction(async t => {
    const transaction = {transaction: t}
  
    // 只有非管理员才需要加入编辑个人信息权限
    await createPermissionByRole({name: {$ne: 'admin'}}, [ 'get#/console/profile' ], db, t)
    
    await db.Meta.create({
      name: 'update-log',
      value: version
    }, transaction)
  
    await db.Meta.update(
      { value: version },
      {
        where: {name: 'version'},
        ...transaction
      }
    )
  
    log(`update ${version} done`)
  })
}
