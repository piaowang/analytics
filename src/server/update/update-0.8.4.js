import { log } from '../utils/log'
import {doMigration} from '../../common/data-migration'
import _ from 'lodash'

export default async db => {

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    let bookMarks = await db.SugoPivotMarks.findAll(transaction)

    let preUpdateStringBookmarks = bookMarks.filter(bm => _.isString(bm.queryParams)).map(bm => {
      let parsed = JSON.parse(bm.queryParams)
      let nextParams = 'relativeTime' in parsed.params ? doMigration(parsed.params) : parsed.params

      return db.SugoPivotMarks.update({
        queryParams: {...parsed, params: nextParams}
        // 没有效果
        // updatedAt: moment(bm.updatedAt).add(1, 'ms').toISOString()
      }, {
        where: {
          id: bm.id
        },
        ...transaction,
        raw: true
      })
    })

    debug(preUpdateStringBookmarks.length, 'str bookMarks to migrate')

    let preUpdateObjBookMarks = bookMarks.filter(bm => !_.isString(bm.queryParams) && 'relativeTime' in bm.queryParams.params).map(bm => {

      return db.SugoPivotMarks.update({
        queryParams: {...bm.queryParams, params: doMigration(bm.queryParams.params)}
        // 没有效果：
        // updatedAt: moment(bm.updatedAt).add(1, 'ms').toISOString(),
      }, {
        where: {
          id: bm.id
        },
        ...transaction,
        raw: true
      })
    })

    debug(preUpdateObjBookMarks.length, 'str bookMarks to migrate')

    await Promise.all([...preUpdateStringBookmarks, ...preUpdateObjBookMarks])

    // 临时解决方案：还原修改时间至创建时间
    await db.client.query('update sugo_pivot_marks set "updatedAt" = "createdAt"', transaction)

    await db.Meta.create({
      name: 'update-log',
      value: '0.8.4'
    }, transaction)

    await db.Meta.update({
      value: '0.8.4'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.8.4 done')
}
