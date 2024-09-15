import { BaseService } from './base.service'

export default class SugoAutoTrackEventService extends BaseService {

  static instance = null

  constructor() {
    super('AutoTrackEvent')
  }

  static getInstance() {
    if (SugoAutoTrackEventService.instance === null) {
      SugoAutoTrackEventService.instance = new SugoAutoTrackEventService()
    }
    return SugoAutoTrackEventService.instance
  }
}
