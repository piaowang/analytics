// 导出单图和指标，主要给运维人员使用
// *未编译过的话：将此文件编译后放到 analytic/app，在 analytic/ 执行:
// node app/export-slices-and-metrics.js 源taskId

import {initDb} from './models'
import * as d3 from 'd3'
import _ from 'lodash'
import fs from 'fs'

(async function () {
  await initDb()
  let db = require('./models').default

  let fromTaskId = _.last(process.argv)
  let fromDataSource = await db.SugoDatasources.findOne({
    where: { name: fromTaskId },
    raw: true
  })
  if (!fromDataSource) {
    console.log('no such dataSource: ', fromTaskId)
    return
  }
  let slices = await db.Slices.findAll({
    where: { druid_datasource_id: fromDataSource.id },
    raw: true
  })

  if (_.isEmpty(slices)) {
    console.log('no slices for dataSource: ', fromTaskId)
    return
  }

  let sliceColNames = _.keys(slices[0])
  let sliceRows = slices.map(d => sliceColNames.map(k => (_.isObject(d[k]) || _.isArray(d[k])) ? JSON.stringify(d[k]) : d[k]))
  let slicesCsvContent = d3.csvFormatRows([sliceColNames, ...sliceRows])
  fs.writeFileSync('./slices.csv', slicesCsvContent)
  console.log('slice.csv saved!')


  let metrics = await db.SugoMeasures.findAll({
    where: { parentId: fromDataSource.id },
    raw: true
  })
  if (_.isEmpty(metrics)) {
    console.log('no metrics for dataSource: ', fromTaskId)
    return
  }

  let metricColNames = _.keys(metrics[0])
  let metricRows = metrics.map(d => metricColNames.map(k => (_.isObject(d[k]) || _.isArray(d[k])) ? JSON.stringify(d[k]) : d[k]))
  let metricsCsvContent = d3.csvFormatRows([metricColNames, ...metricRows])
  fs.writeFileSync('./metrics.csv', metricsCsvContent)
  console.log('metrics.csv saved!')

  process.exit()
})().catch(e => {
  console.log(e)
})
