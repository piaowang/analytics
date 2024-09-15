/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   09/12/2017
 * @description
 */

import db from '../models'
import listener from '../listener'
import {Validates, Validator} from 'sugo-store'
import {Structure} from '../utils/service-result-structure'
import _ from 'lodash'
import {operatorsAliases} from '../models/_db'
import {immutateUpdate, tryJsonParse} from '../../common/sugo-utils'


/**
 * 检测验证是否通过
 * @param {object} obj
 */
export function passValid(obj) {
  let pass = true
  for (let propKey in obj) {
    if (obj.hasOwnProperty(propKey) && obj[propKey] !== null) {
      pass = false
      break
    }
  }
  return pass
}

/**
 * @param {object} obj
 * @param {function} [iterator]
 * @return {Array}
 */
export function mapValues(obj, iterator) {
  const values = []
  for (let propKey in obj) {
    if (obj.hasOwnProperty(propKey) && obj[propKey] !== null) {
      values.push(iterator ? iterator.call(propKey, obj[propKey], obj) : obj[propKey])
    }
  }
  return values
}

/**
 * 参数验证类
 */
class BaseServiceParams extends Validator {
  @Validates.DataType(Validates.DataTypes.PRIM_STR)
  @Validates.Required()
  id = null

  @Validates.DataType(Validates.DataTypes.OBJ_O)
  @Validates.Required()
  where = null

  @Validates.DataType(Validates.DataType.OBJ_A)
  @Validates.Required()
  list = null

  @Validates.DataType(Validates.DataTypes.OBJ_O)
  @Validates.Required()
  props = null

  @Validates.DataType(Validates.DataTypes.OBJ_O)
  @Validates.Required()
  defaults = null

  @Validates.DataType(Validates.DataTypes.PRIM_NUM)
  @Validates.Required()
  limit = null

  @Validates.DataType(Validates.DataTypes.PRIM_NUM)
  @Validates.Required()
  offset = null

  reset() {
    return this.set({
      id: null,
      where: null,
      list: null,
      props: null,
      defaults: null
    })
  }
}

const Params = new BaseServiceParams()


/**
 * service层父类 提供基础通用的增、删、改、查方法
 * @export
 * @class BaseService
 */
export class BaseService {

  /**
   * @param {string} name 定义的数据库Model实例名称
   */
  constructor(name) {
    /**
     * 兼容旧代码，不能删除this.dbInstance
     * @type {Sequelize.Model}
     * @protected
     */
    this.dbInstance = this.__model = db[name]
    this.client = db.client
    this.db = db

    /**
     * @type {String}
     * @protected
     */
    this.__name = name || ''

    // 在扩展包中可能更新db对象上的属性，比如扩展了数据库字段
    listener.subscribe(() => this.dbInstance = db[name])
  }
  
  /**
   * 移除 where 中无关的信息
   * @param where
   * @returns {{}|{}}
   */
  trimWhere(where) {
    let {tableAttributes} = this.dbInstance
    return _.pickBy(where, (v, k) => {
      return k in tableAttributes || k in operatorsAliases || _.isSymbol(k)
    })
  }

  getClient() {
    return this.client
  }

  getDBInstance() {
    return this.dbInstance
  }

  /**
   * @description 原始SQL查询
   * @param {any} sql
   * @param {any} [replacements={}] 
   * @returns 
   *
   * @memberOf BaseService
   */
  async findBySQL(sql, replacements = {}) {
    return await db.client.query(sql, {
      replacements,
      type: db.client.QueryTypes.SELECT
    })
  }

  /**
   * @description 查询单条记录
   * @param {Object} where 查找条件
   * @param {Object} other 其他参数
   * @returns {Promise.<*>}
   */
  async findOne(where, other = {}) {
    return await this.dbInstance.findOne({ where, ...other })
  }

  /**
   * @description 根据主键查询记录
   * @param {any} pk 主键
   * @param {any} pk
   * @param {boolean} [other={ raw: true }]
   * @returns
   * @memberOf BaseService
   */
  async findByPk(pk, other = { raw: true }) {
    return await this.dbInstance.findByPk(pk, {...other})
  }

  /**
   * @description 查询所有记录
   * @param {Object} where 查找条件
   * @param {Object} other 其他参数
   * @returns {Promise.<*>}
   */
  async findAll(where, other = {}) {
    return await this.dbInstance.findAll({
      where,
      ...other
    })
  }

  /**
   * @description 分页查询带总记录数
   * @param {Object} where 查找条件
   * @param {Object} other 其他参数
   * @return {Promise.<{ rows, count }>}
   */
  async findAndCountAll(where, other = {}) {
    return await this.dbInstance.findAndCountAll({
      where,
      ...other
    })
  }
  
  /**
   * 将高级的筛选条件转为 where，例如：
   * tags__text$or: JSON.stringify( [{$like: '"xxx"'}, ...] ) -> tags: {$or: [{$like: '"xxx"'}, ...]}
   * tags__text$or 则表示先进行类型转换，再筛选
   * @param query url query
   */
  resolveAdvanceQuery(query) {
    if (!_.isPlainObject(query)) {
      return {}
    }
    return _.keys(query).reduce((acc, currKey) => {
      if (_.includes(currKey, '$')) {
        let [dimName, op] = currKey.split('$')
        if (_.includes(dimName, '__')) {
          let [dim, castTo] = dimName.split('__')
          acc[db.Sequelize.Op.and] = [
            db.Sequelize.where(
              db.Sequelize.cast(db.Sequelize.col(dim), castTo),
              {[`$${op}`]: tryJsonParse(query[currKey])}
            )
          ]
        } else {
          acc[dimName] = {[`$${op}`]: tryJsonParse(query[currKey])}
        }
      } else {
        acc[currKey] = query[currKey]
      }
      return acc
    }, {})
  }
  
  /**
   * 分页查询，参考接口规范：https://docs.qq.com/doc/DWlhBQUNRTmpQc3Nm
   * @param query
   * @returns {Promise<{rows, count}|{count: number, rows: Model[]}|<{rows: Model[]; count: number}>|*>}
   */
  async listAndCount(query, opts = {_autoRemoveSnakeCase: true}) {
    const {page = 1, pageSize = 10, sortBy = 'updated_at', sortType = 'desc', ...rest} = query
    const pageIndex = page - 1
    const whereFromQuery = this.resolveAdvanceQuery(rest)
    const finalWhere = this.trimWhere(whereFromQuery)
    
    let res = await this.dbInstance.findAndCountAll({
      where: finalWhere,
      offset: pageIndex * pageSize,
      limit: +pageSize,
      order: sortBy ? [[sortBy, sortType || 'asc']] : undefined,
      raw: true,
      ...opts
    })
    if (opts && opts._autoRemoveSnakeCase) {
      // sequelize 会同时返回驼峰和下划线形式的数据，这里做简化处理
      return immutateUpdate(res, 'rows', rows => {
        return _.map(rows, d => {
          return _.omitBy(d, (v, k) => {
            const camelCase = _.camelCase(k)
            return k !== camelCase && camelCase in d
          })
        })
      })
    }
    return res
  }
  
  /**
   * 客户端分页查询，带总记录数
   * 有时候想用 js 的 filter 来替代 where 来实现复杂的筛选功能，这时候只能先全部查出来，筛选，然后再按照分页的格式返回
   * 但是由于全部查询出来可能会造成内存问题，所以需要分批进行
   * @param where
   * @param other
   * @param filterPredicate
   * @returns {Promise<{rows, count}|*>}
   */
  async findAndCountAllClientSide(where, other = {}, filterPredicate) {
    const {offset, limit, ...rest} = other
    // 先全部查出来，再在前端分页
    const batchSize = 512

    const batchFindAll = async (query, batchIdx = 0, subsetOffset = 0, pageExtractor = _.identity) => {
      let rowsOfThisBatch = await this.dbInstance.findAll({ ...query, offset: batchIdx * batchSize, limit: batchSize })
      let subset = rowsOfThisBatch.filter(filterPredicate)
      let rowsInPage = pageExtractor(subset, subsetOffset)

      if (rowsOfThisBatch.length < batchSize) {
        return {
          count: subset.length,
          rows: rowsInPage
        }
      }
      let next = await batchFindAll(query, batchIdx + 1, subsetOffset + subset.length, pageExtractor)
      return {
        count: subset.length + next.count,
        rows: [...rowsInPage, ...next.rows]
      }
    }

    const [takeStart, takeEnd] = [offset, offset + limit]
    return await batchFindAll({ where, ...rest }, 0, 0, (subset, subsetOffset) => {
      // 判断此批次的数据进行筛选后，是否位于分页的位置内，返回属于此次分页的部分
      let [dataStart, dataEnd] = [subsetOffset, subsetOffset + subset.length]
      let [finalTakeStart, finalTakeEnd] = [Math.max(takeStart, dataStart), Math.min(takeEnd, dataEnd)]
      if (finalTakeEnd <= finalTakeStart) {
        return []
      }
      let [finalTakeStartOffseted, finalTakeEndOffseted] = [finalTakeStart, finalTakeEnd].map(v => v - subsetOffset)
      return _(subset).drop(finalTakeStartOffseted).take(finalTakeEndOffseted - finalTakeStartOffseted).value()
    })
  }

  /**
   * @description 查找或创建
   * @param {Object} where 查找条件
   * @param {Object} defaults 默认对象
   * @param {Object} other 其他参数
   * @returns {Promise.<{ object, created }>}
   */
  async findOrCreate(where, defaults, other = {}) {
    return await this.dbInstance.findOrCreate({
      where,
      defaults,
      ...other
    })
  }

  /**
   * @description 创建
   * @param {Object} obj 创建对象
   * @param {Object} other 其他参数
   * @returns {Promise.<{ object, created }>}
   */
  async create(obj, other = {}) {
    return await this.dbInstance.create(obj, { ...other })
  }

  /**
   * @description 更新
   * @param {Object} obj 更新对象
   * @param {Object} where 更新条件
   * @param {Object} other 其他参数
   * @returns {Promise.<*>}
   */
  async update(obj, where, other = {}) {
    return await this.dbInstance.update(obj, { where, ...other })
  }

  /**
   * @description 查询记录数
   * @param {Object} where
   * @returns {Promise.<*>}
   * @memberOf BaseService
   */
  async count(where) {
    return await this.dbInstance.count({ where })
  }

  /**
   * @description 删除
   * @param {Object} where 删除条件
   * @param {Object} other 其他参数
   * @returns {Promise.<*>}
   */
  async remove(where, other = {}) {
    return await this.dbInstance.destroy({ where, ...other })
  }

  /* =====================================================
   *  新增api，多用于继承类，所以标识为@protected
   * =====================================================
   */

  /**
   * @param {object} props
   * @param {Transaction} [transaction]
   * @return {Promise.<ServiceStruct>}
   * @protected
   */
  async __create(props, transaction) {
    const valid = Params.validOne('props', props)
    Params.reset()
    if (valid !== null) {
      return Structure.fail(valid)
    }

    const ins = await this.__model.create(props, { transaction })
    return Structure.ok(ins.get({ plain: true }))
  }


  /**
   * @param {Array} list
   * @param {Transaction} [transaction]
   * @return {Promise.<ServiceStruct<Array>>}
   * @protected
   */
  async __bulkCreate(list, transaction) {
    const valid = Params.validOne('list', list)
    Params.reset()
    if (!valid) {
      return Structure.fail(valid)
    }
    const ins = await this.__model.bulkCreate(list, { transaction })
    return Structure.ok(ins.map(r => r.get({ plain: true })))
  }

  /**
   * @return {Sequelize.Model}
   * @public
   */
  getModel() {
    return this.__model
  }

  /**
   * @param {String} id
   * @return {Promise.<ServiceStruct>}
   */
  async findById(id) {
    return this.__findOne({ id })
  }

  /**
   * @param {object} where
   * @param {object} defaults
   * @param {Transaction} [transaction]
   * @return {Promise.<ServiceStruct>}
   * @protected
   */
  async __findOrCreate(where, defaults, transaction) {
    const valid = Params.valid({ where, defaults })
    Params.reset()

    if (!passValid(valid)) {
      return Structure.fail(mapValues(valid).join('\n'))
    }
    const [ins] = await this.__model.findOrCreate({ where, defaults, transaction })
    return Structure.ok(ins.get({ plain: true }))
  }

  /**
   * @param {object} where
   * @return {Promise.<ServiceStruct>}
   * @protected
   */
  async __findOne(where) {
    const valid = Params.validOne('where', where)
    Params.reset()

    if (valid !== null) {
      return Structure.fail(valid)
    }

    const ins = await this.__model.findOne({ where })
    return ins ? Structure.ok(ins.get({ plain: true })) : Structure.fail('未找到记录')
  }

  /**
   * @param {object} where
   * @return {Promise.<ServiceStruct<Array>>}
   * @protected
   */
  async __findAll(where, opts = {}) {
    const valid = Params.validOne('where', where)
    Params.reset()

    if (valid !== null) {
      return Structure.fail(valid)
    }

    const list = await this.__model.findAll({ where, raw: true, ...opts })
    return Structure.ok(list)
  }

  /**
   * @param {object} where
   * @param {number} limit
   * @param {number} offset
   * @return {Promise.<ServiceStruct<{count:number, rows: Array<T>}>>}
   */
  async __findAndCountAll(where, limit, offset) {
    const valid = Params.valid({ where, limit, offset })
    Params.reset()

    if (!passValid(valid)) {
      return Structure.fail(mapValues(valid).join('\n'))
    }

    const ins = await this.__model.findAndCountAll({
      where,
      offset,
      limit,
      order: [
        ['updated_at', 'DESC']
      ]
    })
    return Structure.ok(ins)
  }

  /**
   * @param {object} where
   * @param {object} props
   * @param {Transaction} [transaction]
   * @return {Promise.<ServiceStruct<object>>}
   * @protected
   */
  async __update(where, props, transaction) {
    const valid = Params.valid({ where, props })
    Params.reset()

    if (!passValid(valid)) {
      return Structure.fail(mapValues(valid).join('\n'))
    }

    const [affectedCount] = await this.__model.update(props, { where }, { transaction })
    return affectedCount > 0 ? Structure.ok(props) : Structure.fail('更新失败')
  }

  /**
   * @param {Object} where
   * @param {Transaction} [transaction]
   * @return {Promise.<ServiceStruct<Object>>}
   * @protected
   */
  async __destroy(where, transaction) {
    const valid = Params.validOne('where', where)
    Params.reset()

    if (valid !== null) {
      return Structure.fail(valid)
    }

    const affectedCount = await this.__model.destroy({
      where,
      transaction
    })

    return affectedCount > 0 ? Structure.ok(where) : Structure.fail('删除失败')
  }

  /* =====================================================
   *  新增api结束
   * =====================================================
   */
}
