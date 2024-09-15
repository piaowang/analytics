import { BaseService } from './base.service'

export default class SugoTrackEventService extends BaseService {

  static instance = null

  constructor() {
    super('TrackEvent')
  }

  static getInstance() {
    if (SugoTrackEventService.instance === null) {
      SugoTrackEventService.instance = new SugoTrackEventService()
    }
    return SugoTrackEventService.instance
  }

}
