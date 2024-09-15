import {BaseService} from './base.service'

export default class BusinessLineManagementService extends BaseService {

  static instance = null

  constructor() {
    super('BusinessLineManagement')
  }

  static getInstance() {
    if (BusinessLineManagementService.instance === null) {
      BusinessLineManagementService.instance = new BusinessLineManagementService()
    }
    return BusinessLineManagementService.instance
  }
}
