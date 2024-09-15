/**
 * 所有的项目增加 first_visit_time 与 first_login_time 维度
 */
import { log } from '../utils/log'
import { SDK_DEFAULT_DIMENSIONS } from '../../common/sdk-access-dimensions'

export default async db => {

  const version = '0.17.3'
  const first_visit_time = SDK_DEFAULT_DIMENSIONS.find(r => r[0] === 'first_visit_time')
  const first_login_time = SDK_DEFAULT_DIMENSIONS.find(r => r[0] === 'first_login_time')

  await db.client.transaction(async t => {

    const transaction = { transaction: t }

    // 查询所有的项目
    const projects = await db.SugoProjects.findAll()

    for (let project of projects) {
      // 查看项目的dataSource
      project = project.get({ plain: true })
      const dataSources = await db.SugoDatasources.findAll({
        where: {
          name: project.datasource_name
        }
      })

      for (let dataSource of dataSources) {
        // 查找数据源的维度
        dataSource = dataSource.get({ plain: true })

        const { created_by, company_id, user_ids, role_ids } = dataSource
        const dimensionsIns = await db.SugoDimensions.findAll({
          where: {
            parentId: dataSource.id
          }
        })

        // 添加 first_visit_time 与 first_login_time
        // 由于两个维度是在同一个update更新的
        // 所以如果一个不存在，则两个都不存在
        const dimensions = dimensionsIns.map(dim => dim.get({ plain: true }))
        if (!dimensions.find(dim => dim.name === first_visit_time[0])) {
          await db.SugoDimensions.bulkCreate(
            [
              {
                name: first_visit_time[0],
                title: first_visit_time[1],
                type: first_visit_time[2],
                parentId: dataSource.id,
                company_id,
                user_ids,
                role_ids,
                created_by
              },
              {
                name: first_login_time[0],
                title: first_login_time[1],
                type: first_login_time[2],
                parentId: dataSource.id,
                company_id,
                user_ids,
                role_ids,
                created_by
              }
            ],
            transaction
          )
        }

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
