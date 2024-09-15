import {log} from '../utils/log'
import _ from 'lodash'

export default async db => {

  await db.client.transaction(async transaction => {

    //所有sdk项目加入
    log('update 13.0, 所有sdk项目加入params.isSDKProject: true')

    let arr = await db.SugoDataAnalysis.findAll({
      where: {
        access_type: {
          $in: [
            0, 1, 2
          ]
        }
      },
      transaction
    })

    let projectIds = _.uniq(arr.map(j => j.project_id))

    if (!projectIds.length) {
      log('没有sdk项目')
    } else {
      for (let id of projectIds) {
        let proj = await db.SugoProjects.findOne({
          where: {
            id
          },
          transaction
        })
        if (!proj) continue

        let ds = await db.SugoDatasources.findOne({
          where: {
            id: proj.datasource_id
          },
          transaction
        })
        if (!ds) continue

        let params = _.cloneDeep(ds.params)
        params.isSDKProject = true

        await db.SugoDatasources.update({
          params
        }, {
          where: {
            id: ds.id
          },
          transaction
        })

        log('数据源', ds.title, '更新完毕')
      }
    }

    await db.Meta.create({
      name: 'update-log',
      value: '0.13.0'
    }, transaction)

    await db.Meta.update({
      value: '0.13.0'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.13.0 done')
}
