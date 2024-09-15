import { log } from '../utils/log'
import filterTransform from '../../common/project-filter2slice-filter'

export default async db => {

  const version = '0.14.0'
  await db.client.transaction(async t => {
    const transaction = { transaction: t }
    let projects = await db.SugoProjects.findAll({
      where: { parent_id: { $ne: null } },
      ...transaction
    })
    let projectIds = projects.map(p => p.datasource_id)
    let datasources = await db.SugoDatasources.findAll(
      {
        where: { id: { $in: projectIds } },
        ...transaction
      })

    datasources.map(async p => {
      return await db.SugoDatasources.update({
        filter: { filters: filterTransform(p.filter)}
      }, {
        where: { id: p.id },
        ...transaction,
        raw: true
      })
    })

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
  })

  log(`update ${version} done`)
}
