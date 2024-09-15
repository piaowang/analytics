import { BaseService } from './base.service'
export default class SugoTaskProjectDatasourceService extends BaseService {

  static instance = null

  constructor() {
    super('SugoTaskProjectDatasource')
  }

  static getInstance() {
    if (SugoTaskProjectDatasourceService.instance === null) {
      SugoTaskProjectDatasourceService.instance = new SugoTaskProjectDatasourceService()
    }
    return SugoTaskProjectDatasourceService.instance
  }

}
