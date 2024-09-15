import { BaseService } from './base.service'

export default class SugoTrackEventMobileH5Service extends BaseService {

  static instance = null

  constructor() {
    super('TrackEventMobileH5')
  }

  static getInstance() {
    if (SugoTrackEventMobileH5Service.instance === null) {
      SugoTrackEventMobileH5Service.instance = new SugoTrackEventMobileH5Service()
    }
    return SugoTrackEventMobileH5Service.instance
  }

}
