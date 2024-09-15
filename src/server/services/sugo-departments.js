import {BaseService} from './base.service'

export default class SugoDepartments extends BaseService {

  /** @type {SugoDepartments} */
  static instance = null

  constructor() {
    super('SugoDepartments')
  }

  /**
   * @return {SugoDepartments}
   */
  static getInstance() {
    if (SugoDepartments.instance === null) {
      SugoDepartments.instance = new SugoDepartments()
    }
    return SugoDepartments.instance
  }
}

