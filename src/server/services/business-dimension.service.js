import { BaseService } from './base.service'
import db from '../models'


export default class BusinessDimensionService extends BaseService {
  constructor() {
    super('SugoBusinessDimension')
  }

  static instance = null
  
  static getInstance() {
    if (!BusinessDimensionService.instance) {
      BusinessDimensionService.instance = new BusinessDimensionService()
    }
    return BusinessDimensionService.instance
  }

  async findAndCountAll(where, other) {
    const include = [{
      required: false,
      model: db['SugoBusinessDimensionRole']
    }]
    return await this.dbInstance.findAndCountAll({
      where,
      include,
      order: [['updated_at', 'DESC']],
      ...other
    })
  }

  async create(data, roleIds) {
    const dbInstance = this.dbInstance
    const dbBusinessDimensionRole = db['SugoBusinessDimensionRole']

    return await this.client.transaction(async (transaction) => {
      const {id: business_dimension_id} = await dbInstance.create(data, {transaction})
      const records = roleIds.map(id => ({business_dimension_id, role_id: id}))
      await dbBusinessDimensionRole.bulkCreate(records, {transaction})
    })
  }

  async update(data, business_dimension_id, roleIds) {
    const dbInstance = this.dbInstance
    const dbBusinessDimensionRole = db['SugoBusinessDimensionRole']

    return await this.client.transaction(async (transaction) => {
      await dbInstance.update(data, {where: {id: business_dimension_id}}, {transaction})
      await dbBusinessDimensionRole.destroy({where: {business_dimension_id}}, {transaction})
      const records = roleIds.map(id => ({business_dimension_id, role_id: id}))
      await dbBusinessDimensionRole.bulkCreate(records, {transaction})
    })
  }

  async delete (business_dimension_id) {
    const dbInstance = this.dbInstance
    const dbBusinessDimensionRole = db['SugoBusinessDimensionRole']

    return await this.client.transaction(async (transaction) => {
      await dbInstance.destroy({where: {id: business_dimension_id}}, {transaction})
      await dbBusinessDimensionRole.destroy({where: {business_dimension_id}}, {transaction})
    })
  }
}
