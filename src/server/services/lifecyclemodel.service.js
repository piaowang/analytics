import { BaseService } from './base.service'
import db from '../models'
import _ from 'lodash'
import moment from 'moment'

export default class LifeCycleModelService extends BaseService {
  constructor() {
    super('LifeCycleMarketingModel')
  }
}
