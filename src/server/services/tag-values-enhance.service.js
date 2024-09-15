
/**
 * 价值提升服务
 */
import conf from '../config'
import fetch from '../utils/fetch-kit'
import { BaseService } from './base.service'
import {EMPTY_VALUE_OR_NULL} from '../../common/constants'

let { tagAIUrl } = conf
const url = tagAIUrl + '/pio/tag-rec'

export default class SugoTagValueEnhanceService extends BaseService {
  constructor() {
    super('SugoTagValueEnhance')
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoTagValueEnhanceService()
    }
    return this._instance
  }

  /**
   const codeMap = {
    0: '正常',
    1000: '计算出错了',
    1001: '当前分群无法查询到数据，请尝试其他分群',
    1002: '获取数据超时了',
    1003: '当前分群覆盖了所有用户，无法对比'
  }
  */

  /**
   * 创建或者更新id为id的画像
   *

  url: /create?id={id}
  type: application/json
  method: post
  body: {
   usergroup_id: 'xxxxx',
   dataConfig: {
      hostAndPorts: '192.168.0.202:6379',
      clusterMode: false,
      password: 'xxxxx',
      type: 'redis'
   }
  }
  返回结果 status 状态 0:未计算， 1:计算中, 2:计算完成, 3: 计算失败
  
  {
    message: '',
    status: 1,
    code: 0/1000/1001/1002 错误代码
  }
   */

  createTagRec = async (id, options) => {
    if (options.tag_from === EMPTY_VALUE_OR_NULL) {
      options.tag_from = null
    }
    if (options.tag_to === EMPTY_VALUE_OR_NULL) {
      options.tag_to = null
    }
    let link = `${url}/create?id=${id}`
    debug('id:', id)
    debug('url:', link)
    debug(options)
    let res = await fetch.post(link, options)
    debug(res)
    return res
  }

  /**
   * 查询画像状态
  
  url: /status?id={id}
  method: get
  type: application/json
  返回结果 status 状态 0:未计算， 1:计算中, 2:计算完成, 3: 计算失败
  
  {
    status: 2，
    code: 0/1000/1001/1002 错误代码
  }
   */

  getTagRecStatus = async (id) => {
    let link = `${url}/status?id=${id}`
    debug('id:', id)
    debug('url:', link)
    let res = await fetch.get(link)
    debug(res)
    return res
  }

  /**
   * 查询画像结果
  
  url: /query?id={id}
  method: get
  type: application/json
  返回结果
  
  {
    result: [
      {
        dimension: 'age', //维度名
        tagName: '老年', //标签名称
        value: '60`70', //标签取值
        f: 0.42, //基尼系数
        ratio: 0.35, //整体比例
        ratioCompare: 0.62, //非目标群体比例
        ratioUsergroup: 0.23 //目标群体比例
      }
    ]
  }
   */

  getTagRec = async (id) => {
    let link = `${url}/query?id=${id}`
    debug('id:', id)
    debug('url:', link)
    let res = await fetch.get(link)
    debug(res)
    return res
  }
}
