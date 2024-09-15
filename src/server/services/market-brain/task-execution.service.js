import { BaseService } from '../base.service'
import { 
  getJssdkTicket,
  getCorpid
} from './wechat.service'


export default class MarketBrainTaskExecutionsService extends BaseService {
  constructor() {
    super('MarketBrainTaskExecutions')
  }

  async getJssdkTicket(query) {
    return await getJssdkTicket(query)
  }

  async getCorpid(query) {
    return await getCorpid(query)
  }
}
