/**
 * 组合标签实现授权功能
 */
import { log } from '../utils/log'
import safeId from '../models/safe-id'
import { AccessDataType } from '../../common/constants'

export default async db => {

  const version = '0.19.12'

  await db.client.transaction(async t => {

    const transaction = { transaction: t }

    // 复制数据源权限
    let hasClickPointProject = await db.SugoDimensions.findAll({
      attributes: ['parentId'],
      raw: true,
      where: {
        name: 'onclick_point'
      }
    })

    let project = await db.SugoProjects.findAll({
      attributes: ['datasource_id'],
      raw: true,
      where: {
        access_type: AccessDataType.SDK,
        datasource_id: {
          $notIn: hasClickPointProject.map(p => p.parentId)
        }
      }
    })

    let datasources = await db.SugoDatasources.findAll({
      attributes: ['id', 'created_by', 'role_ids', 'company_id'],
      raw: true,
      where: {
        id: {
          $in: project.map(p => p.datasource_id)
        }
      }
    })
    for (const item of datasources) {
      let { id: parentId, created_by, role_ids, company_id } = item
      await db.SugoDimensions.create({
        id: safeId(),
        parentId,
        name: 'onclick_point',
        title: '点击位置',
        type: '2',
        is_druid_dimension: true,
        datasource_type: 'default',
        created_by,
        role_ids,
        company_id
      },
      transaction
      )
    }

    await db.Meta.create({
      name: 'update-log',
      value: version
    }, transaction)

    await db.Meta.update({
      value: version
    }, {
      where: { name: 'version' },
      ...transaction
    })

    log(`update ${version} done`)
  })
}
