/**
 * @description 因创建项目方式变化，所以修改表结构以适应业务
 * 1. sugo_projects表增加access_type字段
 * 2. 查询所有项目的所有分析表，根据分析表类型判断access_type字段值并更新
 */
import { log } from '../utils/log'
import { AccessDataOriginalType, AccessDataType } from '../../common/constants'
import { notEqual } from 'assert'

export default async db => {

  const version = '0.16.9'

  // 文件接入类型
  const FILE_TYPES = [
    AccessDataOriginalType.Csv,
    AccessDataOriginalType.Text,
    AccessDataOriginalType.Excel
  ]

  /**
   * 获取接入类型
   * 1. 如果项目来自于数据源，则配置为sdk
   * 2. 如果没有分析表，设置为SDK接入
   * 3. 依据分析表类型判定
   * @param {ProjectModel} project
   * @param {Array<DataAnalysisModel>} analysisArr
   * @return {Number}
   */
  function getAccessType (project, analysisArr) {
    if (project.from_datasource === 1 || analysisArr.length === 0) return AccessDataType.SDK

    // 如果所有的分析表都是文件接入类型，则判定为文件接入
    if (analysisArr.every(r => FILE_TYPES.includes(r.access_type))) {
      return AccessDataType.File
    }

    // 否则为SDK
    return AccessDataType.SDK
  }

  //  ALTER TABLE sugo_projects ALTER COLUMN access_type SET NOT NULL;

  await db.client.transaction(async transaction => {

    // 新增access_type字段
    await db.client.query('ALTER TABLE IF EXISTS sugo_projects ADD COLUMN access_type INTEGER', {
      transaction
    })

    // 更新已存在项目字段
    const projects = await db.client.query('SELECT * FROM sugo_projects', {
      type: db.client.QueryTypes.SELECT,
      transaction
    })

    for (let project of projects) {
      const [analysisArr] = await db.client.query('SELECT * FROM sugo_data_analysis WHERE project_id = ?', {
        replacements: [project.id],
        transaction
      })

      await db.client.query('UPDATE sugo_projects SET access_type = ? WHERE id = ?', {
        type: db.client.QueryTypes.RAW,
        replacements: [getAccessType(project, analysisArr), project.id],
        transaction
      })
    }

    // 设置access_type not allow null
    await db.client.query('ALTER TABLE sugo_projects ALTER COLUMN access_type SET NOT NULL', {
      type: db.client.QueryTypes.RAW,
      transaction
    })

    // 验证结果，不通过的话抛错并放弃修改
    const results = await db.client.query('SELECT * FROM sugo_projects', {
      type: db.client.QueryTypes.SELECT,
      transaction
    })
    results.forEach(r => {
      notEqual(r.access_type, void 0)
      notEqual(r.access_type, null)
    })

    // 更新版本
    await db.Meta.create(
      {
        name: 'update-log',
        value: version
      },
      { transaction }
    )

    await db.Meta.update(
      {
        value: version
      },
      {
        where: { name: 'version' },
        transaction
      }
    )
  })

  log(`update ${version} done`)
}
