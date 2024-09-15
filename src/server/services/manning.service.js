/*
 * @Author: your name
 * @Date: 2020-06-22 10:22:41
 * @LastEditTime: 2020-06-30 17:27:03
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \sugo-analytics\src\server\services\manning.service.js
 */ 
import { BaseService } from './base.service'
export default class ManningService extends BaseService {
  static instance = null;
  constructor() {
    super('SugoManningReport')
  }
  async getData(where = {}, limit = 30, pageNum) {
    if(pageNum === -1){
      return await this.db.SugoManningReport.findAll({order: [['sortNumber']]})
    }
    const res = await this.findAndCountAll(where, {
      limit,
      offset: limit * pageNum,
      order: [['sortNumber']],
      raw: false
    })
    return res
  }
  async getDetail(where) {
    return await this.findOne(where, {})
  }
  
  async create(data) {
    return await this.findOrCreate({title:data.title},data)
  }

  async del(where) {
    return await this.remove(where, {})
  }
  async save(data,where){
    return await this.update(data, where)
  }

}
