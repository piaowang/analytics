import Resource from './resource'
import { utils } from 'next-reader'
import { BUSINESS_SETTING_MESSAGE_TYPE as messageType } from './constants'

let action = {
  create: utils.short_id(),
  update: utils.short_id(),
  list: utils.short_id(),
  del: utils.short_id(),
  default: utils.short_id(),
  test: utils.short_id(),
  // 被改变，与update的区别在于:
  // change场景一般发生在缓存中，而不通知服务器
  // 比如用户输入name时，需要更新model，但并马上服务器
  // 而是在用户执行保存操作时，才上报服务器
  change: utils.short_id()
}

//业务数据库设置
let actions = {

  /**
   * 创建
   * @param {Object} model
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async create(model, projectid, isUindex, done) {
    model = { ...model, project_id: projectid }
    const ret = await Resource.create(model, isUindex)
    if (ret.success && ret.result.message) {
      ret.result.message = { type: messageType.notice, message: ret.result.message }
    }
    done(ret.success ? ret.result : { message: { type: messageType.error, message: ret.message } })
  },

  /**
   * 更新
   * @param {Object} model
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async update(model, done) {
    const ret = await Resource.update(model)
    if (ret.success && ret.result.message) {
      ret.result.message = { type: messageType.notice, message: ret.result.message }
    }
    done(ret.success ? ret.result : { message: { type: messageType.error, message: ret.message } })
  },

  /**
   * 删除
   * @param {Object} model
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async del(model, done) {
    const ret = await Resource.delete(model.id)
    done(ret.success ? {} : { message: { type: messageType.error, message: ret.message } })
  },

  /**
   * 获取列表
   * @param {String} companyid
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async list(companyid, done) {
    const ret = await Resource.list(companyid)
    done({ list: ret.success ? ret.result : [] })
  },

  /**
   * 测试连接
   * @param {Object} model
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async test(model, done) {
    const ret = await Resource.test(model)
    done({ list: ret.success ? ret.result : [] })
  }
}

export { actions, action }
