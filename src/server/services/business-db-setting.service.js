import {
  Response
} from '../utils/Response'
import db from '../models'
import _ from 'lodash'
import Sequelize from 'sequelize'
import xor from '../../common/xor-utils'

const services = {
  /**
   * 修改或新增数据库设置
   * 
   * @param {any} data 数据
   */
  async save(data, transaction) {
    data = { ...data }
    let {
      id,
      db_pwd,
      encrypted
    } = data
    if (!encrypted && data.db_pwd) {
      data.db_pwd = xor.encrypt(db_pwd)
    }
    if (id) {
      let businessInfo = await db.SugoBusinessDbSetting.findOne({
        where: {
          table_title: data.table_title,
          project_id: data.project_id,
          company_id: data.company_id,
          id: {
            $ne: id
          }
        }
      })
      if (businessInfo) return Response.fail('业务表名称已存在')
      await db.SugoBusinessDbSetting.update(_.omit(data, 'id'), {
        where: {
          id
        }
      }, transaction)
      return Response.ok(data)
    } else {
      let [result, isCreate] = await db.SugoBusinessDbSetting.findOrCreate({
        where: {
          table_title: data.table_title,
          project_id: data.project_id,
          company_id: data.company_id
        },
        defaults: _.omit(data, 'id')
      })
      if (result && isCreate === false) {
        return Response.fail('业务表名称已存在')
      }
      return Response.ok(result)
    }
  },

  /**
   *获取设置列表
   *
   * @param {any} company_id 企业ID
   */
  async getList(company_id) {
    let res = await db.SugoBusinessDbSetting.findAll({
      where: {
        company_id
      }
    })
    return Response.ok(res)
  },

  /**
   * 删除信息
   *
   * @param {any} id 数据id
   */
  async delete(id) {
    let res = await db.SugoBusinessDbSetting.destroy({
      where: {
        id
      }
    })
    return Response.ok(res)
  },

  /**
   * 测试连接
   *
   * @param {any} conn 连接信息
   */
  async testConnection(conn) {
    let {
      db_type,
      table_name
    } = conn
    let dbcon = await this.createConnection(conn)
    try {
      let sql = ''
      if (db_type === 'mysql') sql = `describe \`${table_name}\``
      else if (db_type === 'postgresql') {
        sql = `SELECT column_name as Field,udt_name as Type
        FROM information_schema."columns"
        WHERE "table_name"='${table_name}'`
      }
      let res = await dbcon.query(sql)
      res = _.map(res[0], p => ({ field_name:p.Field || p.field, field_type: p.Type || p.type}))
      return Response.ok(res)
    } catch (error) {
      return Response.fail(error.message || '链接失败，检查链接数据库或库表填写是否正确！')
    }
  },

  /**
   * 创建连接
   * 
   * @param {any} conn 
   * @returns 
   */
  createConnection(conn) {
    let {
      db_type,
      db_jdbc,
      db_user,
      db_pwd,
      encrypted
    } = conn
    if (encrypted) db_pwd = xor.decrypt(db_pwd)
    let connString = `${db_type}://${db_user}:${encodeURIComponent(db_pwd)}@${db_jdbc}`
    let dbcon = new Sequelize(connString, {
      pool: {
        max: 5, // 连接池中最大连接数量
        min: 0, // 连接池中最小连接数量
        idle: 10000 // 如果一个线程 10 秒钟内没有被使用过的话，那么就释放线程
      }
    })
    return dbcon
  },
  async checkSql(params) {
    let {
      sql
    } = params
    let dbcon = this.createConnection(params)
    try {
      if (sql.toLowerCase().indexOf('limit') < 0) sql += ' limit 1'
      let res = await dbcon.query(sql)
      return Response.ok(res)
    } catch (error) {
      return Response.fail(error.message || '连接失败')
    }
  },
  /**
   * 检测是否引用
   * 
   * @param {any} id 
   * @returns 
   */
  async check(id) {
    let res = await db.SugoDimensions.findOne({
      where: {
        'params.table_id': id
      }
    })
    return Response.ok(!!res)
  },

  async findOne(where) {
    return await db.SugoBusinessDbSetting.findOne({
      where
    })
  }
}

export default services
