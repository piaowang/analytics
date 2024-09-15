import Sequelize, {DataTypes} from 'sequelize'
import config from '../config'
import _ from 'lodash'
import { getSM4Result } from '../utils/db-utils'

// 兼容旧版本调用方式
export const Op = Sequelize.Op
export const operatorsAliases = _.mapKeys(Op, (v, k) => `$${k}`)

const model = config.db
let logging = !!model.verbose || config.site.env !== 'production'
if (model.verbose === false) {
  logging = false
}
const pwd = getSM4Result(model.password + '') // 自动转换为字符串
const options = {
  dialect: model.dialect,
  host: model.host,
  port: model.port,
  pool: model.pool,
  define: {
    charset: 'utf8',
    timestamps: false, // true by default
    freezeTableName: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  logging: logging ? console.log : false,
  operatorsAliases
}

const sequelize = new Sequelize(
  model.database,
  model.username,
  pwd,
  options
)

let tagsSequelize = null
// 标签相关的数据库
if(config.tagsDb !== null) {
  const tagsDb = config.tagsDb
  const tagsOptions = {
    dialect: tagsDb.dialect,
    host: tagsDb.host,
    port: tagsDb.port,
    pool: tagsDb.pool,
    define: {
      charset: 'utf8',
      timestamps: false, // true by default
      freezeTableName: true
    },
    logging: config.site.env === 'development' ? console.log : false,
    operatorsAliases
  }

  const pwd = getSM4Result(tagsDb.password + '' ) // 自动转换为字符串
  tagsSequelize = new Sequelize(
    tagsDb.database,
    tagsDb.username,
    pwd,
    tagsOptions
  )
}

// 因为某些字段可能还不存在于旧数据库，所以同步前不能写入 comment，但是同步完成后可以写入 comment
// TODO 同步完成后写入 comment
const {
  omitComment = true
} = model || {}

const originalDefine = sequelize.define
// 创建模型时删除comment属性 修改JSONB类型
if (omitComment) {
  sequelize.define = function defineOverwrite(modelName, attributes, options) {
    let nextAttrs = _.mapValues(attributes, v => {
      let val = v
      if (v.type === DataTypes.JSONB && model.dialect === 'mysql') {
        val = { ...val, type: DataTypes.JSON }
      }
      if ('comment' in v) {
        val = _.omit(val, 'comment')
      }
      return val
    })
    return originalDefine.bind(sequelize)(modelName, nextAttrs, options)
  }
  
  // 增加字段 修改JSONB类型
  const originalAddColumn = sequelize.queryInterface.addColumn
  sequelize.queryInterface.addColumn = function (tableName, cloumnName, attributes, options) {
    let val = attributes
    if (attributes.type === DataTypes.JSONB && model.dialect === 'mysql') {
      val = { ...val, type: DataTypes.JSON }
    }
    return originalAddColumn.bind(sequelize.queryInterface)(tableName, cloumnName, val, options)
  }
}

export { sequelize as client }
export { Sequelize as Seq }
export { tagsSequelize as tagsClient }
