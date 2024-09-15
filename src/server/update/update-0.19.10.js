/**
 * @author heganjie
 * @date   2018/12/27
 * @description 拆分标签权限
 */
import {log} from '../utils/log'
import {createByPermission, modPermission} from './update-0.17.7'

export default async db => {

  const version = '0.19.10'

  await db.client.transaction(async t => {
    const transaction = {transaction: t}
  
    // put#/app/dimension/use-tag 权限改为 put#/app/tag-dict/use-tag/:id
    await modPermission('put#/app/dimension/use-tag', 'put#/app/tag-dict/use-tag/:id', db, t)
    
    // 如果已有维度增加，修改，删除，同步，排序和授权权限，则为标签也加上对应的权限
    await createByPermission('post#/app/dimension/create/:id', ['post#/app/tag-dict/create/:id'], db, t)
    await createByPermission('put#/app/dimension/update/:id', ['put#/app/tag-dict/update/:id'], db, t)
    await createByPermission('post#/app/dimension/delete', ['post#/app/tag-dict/delete'], db, t)
    await createByPermission('put#/app/dimension/authorize/:id', ['put#/app/tag-dict/authorize/:id'], db, t)
    await createByPermission('post#/app/dimension/sync/:id', ['post#/app/tag-dict/sync/:id'], db, t)
    await createByPermission('post#/app/dimension/order-management', ['post#/app/tag-dict/order-management'], db, t)

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
