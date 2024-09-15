/**
 * Created on 23/03/2017.
 * @file 提供画像相关的数据库操作函数
 */

import db from '../models'
import { defineTypes, PropTypes } from '../../common/checker'
import { Response } from '../utils/Response'

const Checker = {
  deleteOne: defineTypes({
    id: PropTypes.string.isRequired,
    company_id: PropTypes.string.isRequired
  })
}

/** @class 用户画像服务类 */
class SugoGalleryService {
  
  /**
   * 删除单个画像
   *
   * @param {string} id - sugo_gallery.id
   * @param {string} company_id
   * @param {object} [transaction]
   * @return {Promise.<ResponseStruct>}
   */
  static async deleteGallery (id, company_id, transaction) {
    const check = Checker.deleteOne({ id, company_id })
    const resp = new Response()
    
    if (!check.success) {
      resp.message = check.message
      return resp.serialize()
    }
    
    const ret = await SugoGalleryService._deleteGallery([id], company_id, transaction)
    resp.result = ret.result[0]
    return resp.serialize()
  }
  
  /**
   * 删除一个项目下的画像
   *
   * @param id - project_id
   * @param {string} company_id
   * @param {object} [transaction]
   * @return {Promise.<ResponseStruct>}
   * @static
   */
  static async deleteProjectGalleries (id, company_id, transaction) {
    const check = Checker.deleteOne({ id, company_id })
    const resp = new Response()
    if (!check.success) {
      resp.message = check.message
      return resp.serialize()
    }
    
    const project = db.SugoProjects.findOne({ where: { id, company_id } })
    
    if (!project) {
      resp.message = '未找到项目记录'
      return resp.serialize()
    }
    
    const galleries = db.SugoGallery.findAll({ where: { parent_id: id } })
    
    if (galleries.length > 0) {
      const ret = await SugoGalleryService._deleteGallery(galleries.map(g => g.id), company_id, transaction)
      resp.result = ret.result
    } else {
      resp.result = []
    }
    
    return resp.serialize()
  }
  
  /**
   * 删除画像，方法内不做调用权限判断，由 controller 判断是否有权限调用该接口。
   * 该接函数接可以接收一个`transaction`，如果`transaction`由外部传入。
   * 那么由外部处理结果，比如`rollback`或`commit`。
   * 忽略`in`查询性能...
   *
   * @param {Array<string>} ids - sugo_gallery.id[]
   * @param {string} company_id
   * @param {object} [transaction]
   *
   * @return {Promise.<ResponseStruct>}
   *
   * @private
   * @static
   */
  static async _deleteGallery (ids, company_id, transaction) {
    
    const resp = new Response()
    const galleries = await db.SugoGallery.findAll({ where: { id: { $in: ids }, company_id } })
    
    if (galleries.length === 0) {
      resp.message = '未找到画像记录'
      return resp.serialize()
    }
    
    const isPassTransaction = !!transaction
    
    transaction = isPassTransaction
      ? transaction
      : await db.client.transaction({ autocommit: false }).then(t => t)
    
    try {
      // 删除画框
      await db.SugoGalleryFrame.destroy({ where: { parent_id: { $in: ids } }, transaction })
      
      // 删除预览
      await db.SugoOverview.destroy({
        where: {
          gallery_id: { $in: ids },
          company_id
        },
        transaction
      })
      
      // 删除已订阅的画像
      await db.SugoSubscribe.destroy({
        where: {
          gallery_id: { $in: ids }
        },
        transaction
      })
      
      // 删除分享的画像
      await db.SugoRoleGalleries.destroy({
        where: {
          gallery_id: { $in: ids },
          company_id
        },
        transaction
      })
      
      // 删除画像
      await db.SugoGallery.destroy({
        where: { id: { $in: ids }, company_id },
        transaction
      })
    } catch (e) {
      resp.message = e.message
    } finally {
      if (!isPassTransaction) {
        if (resp.success)
          transaction.commit()
        else
          transaction.rollback()
      }
    }
    resp.result = galleries.map(g => g.get({ plain: true }))
    return resp.serialize()
  }
}

export { SugoGalleryService }
