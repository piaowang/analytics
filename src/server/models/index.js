import fs from 'fs'
import path from 'path'
import { client, Seq, tagsClient, Op } from './_db'
import {err} from '../utils/log'
import init from './init-db'
import _ from 'lodash'

// read all models and import them into the 'db' object
const modelsRoot = __dirname + '/tables'
const db = _(fs.readdirSync(modelsRoot))
  .flatMap(fileName => {
    if (fileName.indexOf('.map') !== -1 || fileName === '_db.js') {
      return null
    }
    if (fileName.indexOf('.') === -1 && fs.statSync(path.join(modelsRoot, fileName)).isDirectory()) {
      return fs.readdirSync(path.join(modelsRoot, fileName)).map(innerFileName => {
        return innerFileName.indexOf('.') !== 0 && innerFileName.indexOf('.map') === -1
          ? path.join(fileName, innerFileName)
          : null
      })
    }
    return fileName.indexOf('.') !== 0 ? fileName : null
  })
  .filter(_.identity)
  .map(file => {
    try {
      return client.import(path.join(modelsRoot, file))
    } catch (e) {
      err('加载DB Model错误',file, e.message)
    }
  })
  .keyBy(model => model.name)
  .value()

Object.keys(db).forEach(modelName => {
  if ('associate' in db[modelName].options) {
    try {
      db[modelName].options.associate(db)
    } catch(e) {
      err('设置DB关联关系错误', modelName, e.stack)
    }
  }
})

export async function initDb() {

  await client.authenticate()

  // 同步操作已迁移到checkUpdate脚本之后执行
  try {
    await client.sync()
  } catch (error) {
    console.log('sequelize sync error => ', error)
  }

  if (tagsClient !== null) {
    await tagsClient.authenticate()
    await tagsClient.sync()
  }

  exports.default = {
    ...db,
    client,
    tagsClient,
    Sequelize: Seq
  }

  // 初始化用户数据
  await init(exports.default)
}

/** 根不同数据库dialect自动补全引号 */
export const quoteIdentifiers = (identifiers) => client.queryInterface.QueryGenerator.quoteIdentifiers(identifiers)
export { Op }
