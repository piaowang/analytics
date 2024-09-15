// 导入单图和指标，主要给运维人员使用
// 重复运行多次脚本，不会导入名称相同的单图/指标
// *未编译过的话：将此文件编译后放到 analytic/app，在 analytic/ 执行:
// node app/import-slices-and-metrics.js 目标taskId

import { initDb } from './models'
import * as d3 from 'd3'
import _ from 'lodash'
import fs from 'fs'

(async function () {
  await initDb()
  let db = require('./models').default

  let slicesCsvContent = fs.readFileSync('./slices.csv').toString('utf8')
  let metricsCsvContent = fs.readFileSync('./metrics.csv').toString('utf8')
  let toTaskId = _.last(process.argv)

  await db.client.transaction(async t => {
    let toDataSource = await db.SugoDatasources.findOne({
      where: { name: toTaskId },
      raw: true,
      transaction: t
    })
    if (!toDataSource) {
      console.log('no such dataSource: ', toTaskId)
      return
    }

    let existedSliceNameSet = _(await db.Slices.findAll({
      where: { druid_datasource_id: toDataSource.id },
      raw: true,
      attributes: ['slice_name'],
      transaction: t
    }))
      .map(s => s.slice_name)
      .thru(arr => new Set(arr))
      .value()
    let slicesPreInsert = d3.csvParse(slicesCsvContent).filter(s => !existedSliceNameSet.has(s.slice_name))
    let slicesCreateRes = await db.Slices.bulkCreate(slicesPreInsert.map(s => ({
      ..._.omit(s, 'id'),
      druid_datasource_id: toDataSource.id,
      datasource_name: toDataSource.name,
      params: JSON.parse(s.params),
      created_at: JSON.parse(s.created_at),
      updated_at: JSON.parse(s.updated_at),
      created_by: toDataSource.created_by,
      updated_by: toDataSource.updated_by,
      company_id: toDataSource.company_id
    })), { transaction: t })
    console.log('insert slices success: ', slicesCreateRes.length)


    let existedMetricSet = _(await db.SugoMeasures.findAll({
      where: { parentId: toDataSource.id },
      raw: true,
      attributes: ['name'],
      transaction: t
    }))
      .map(m => m.name)
      .thru(arr => new Set(arr))
      .value()
    let metrics = d3.csvParse(metricsCsvContent).filter(m => !existedMetricSet.has(m.name))
    let metricsCreateRes = await db.SugoMeasures.bulkCreate(metrics.map(m => ({
      ..._.omit(m, 'id'),
      parentId: toDataSource.id,
      role_ids: toDataSource.role_ids,
      user_ids: JSON.parse(m.user_ids),
      params: JSON.parse(m.params),
      tags: JSON.parse(m.tags),
      createdAt: JSON.parse(m.createdAt),
      updatedAt: JSON.parse(m.updatedAt),
      type: m.type ? +m.type : null,
      created_by: toDataSource.created_by,
      updated_by: toDataSource.updated_by,
      company_id: toDataSource.company_id
    })), { transaction: t })
    console.log('insert metrics success: ', metricsCreateRes.length)
  })

  process.exit()
})().catch(e => {
  console.log(e)
})

