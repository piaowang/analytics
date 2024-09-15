/**
 * 删除0.17.3版本中对非SDK项目新增的first_visit_time
 */
import { log } from '../utils/log'
import { AccessDataType } from '../../common/constants'

export default async db => {

  const version = '0.17.4'

  await db.client.transaction(async t => {

    const transaction = { transaction: t }

    // 查询所有的项目
    const projects = await db.SugoProjects.findAll()

    for (let project of projects) {
      // 跳过SDK的项目
      if (project.access_type === AccessDataType.SDK) continue

      // 查看项目的dataSource
      project = project.get({ plain: true })
      const dataSources = await db.SugoDatasources.findAll({
        where: {
          name: project.datasource_name
        }
      })

      for (let dataSource of dataSources) {
        // 删除 'first_visit_time', 'first_login_time' 维度
        dataSource = dataSource.get({ plain: true })
        await db.SugoDimensions.destroy({
          where: {
            parentId: dataSource.id,
            name: {
              $in: [
                'first_visit_time',
                'first_login_time'
              ]
            }
          }
        })
      }
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
