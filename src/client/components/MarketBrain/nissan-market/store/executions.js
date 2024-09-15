import _ from 'lodash'
import moment from 'moment'
import * as nissanExecutionService from 'client/services/market-brain/nissan'
import { doQueryDruidData } from '../../../../common/slice-data-transform'

export const namespace = 'nissanMarketH5Executions'

export const parseUrl = () => {
  const url = decodeURI(window.location.href)
  const paramJson = {}
  const url_data = _.split(url, '?').length > 1 ? _.split(url, '?')[1] : null 
  if (!url_data) {
    return
  }
  const params_arr = _.split(url_data, '&')
  _.forEach(params_arr, function(item) {
    const key = _.split(item, '=')[0]
    const value = _.split(item, '=')[1]
    paramJson[key] = value
  })
  return paramJson
}

/**
 * 获取线下、线上足迹数据
 * type 1：线下  2：线上
 */
const getOffOnlineData = async (type=1, unionid='') => {
  let typeName = '浏览屏幕车辆详情'
  if (type === 2) {
    typeName = '浏览车辆详情'
  }
  const res = await doQueryDruidData({
    'druid_datasource_id': 'GHMq9QlGIB',
    params: {
      'timezone': 'Asia/Shanghai',
      'dimensions': [
        'car_title',
        '__time',
        'duration'
      ],
      'metrics': [
        'tindex_9_MpxgIJm_project_w7ZLfGGyo_IDvCaoLQ5'
      ],
      'granularity': 'PT1M',
      'filters': [
        {
          'col': 'unionid',
          'op': 'in',
          'eq': [
            unionid
          ],
          'type': 'string'
        },
        {
          'col': 'car_title',
          'op': 'not in',
          'eq': [
            '空字符串 / NULL'
          ],
          'type': 'string',
          'containsNull': true
        },
        {
          'col': 'event_name',
          'op': 'in',
          'eq': [
            typeName
          ],
          'type': 'string'
        }
      ],
      'dimensionExtraSettings': [
        {
          'limit': 50,
          'sortDirect': 'desc',
          'sortCol': 'tindex_9_MpxgIJm_project_w7ZLfGGyo_IDvCaoLQ5'
        },
        {
          'sortCol': '__time',
          'sortDirect': 'asc',
          'limit': 10,
          'granularity': 'PT1M'
        },
        {
          'limit': 10,
          'sortDirect': 'desc',
          'sortCol': 'tindex_9_MpxgIJm_project_w7ZLfGGyo_IDvCaoLQ5',
          'numberSplitType': 'value'
        }
      ],
      'splitType': 'groupBy',
      'queryEngine': 'tindex',
      dimensionExtraSettingDict: {}
    }
  })
  console.log(`${typeName}tindex-res: `, res)
  if (!res.length) return []
  const set = res[0].resultSet
  const sortArr = set.sort((a, b) => moment(b.__time).valueOf() - moment(a.__time).valueOf())
  const result = sortArr.map(item => ({
    ...item,
    __date: moment(item.__time).format('YYYY-MM-DD'),
    __time: moment(item.__time).format('hh:mm:ss')
  }))
  console.log(`${typeName} 最终结果: `, result)
  return result
}

/**
 * 从tindex获取姓名等基本信息
 */
const getBasicInfo = async (unionid) => {
  // 1. 先用unionid查询faceID，按时间排序找到最新的
  const faceIdResArr = await doQueryDruidData({
    'druid_datasource_id': 'GHMq9QlGIB',
    params: {
      'timezone': 'Asia/Shanghai',
      'dimensions': [
        '__time',
        'fid'
      ],
      'granularity': 'PT1M',
      'filters': [
        {
          'col': 'unionid',
          'op': 'in',
          'eq': [
            unionid
          ],
          'type': 'string',
          'containsNull': false
        },
        {
          'col': 'fid',
          'op': 'not in',
          'eq': [
            '空字符串 / NULL'
          ],
          'type': 'string',
          'containsNull': true
        }
      ],
      'dimensionExtraSettings': [
        {
          'sortCol': '__time',
          'sortDirect': 'desc',
          'limit': 1,
          'granularity': 'PT1M'
        },
        {
          'limit': 10,
          'sortDirect': 'desc',
          'sortCol': 'tindex_9_MpxgIJm_project_w7ZLfGGyo_IDvCaoLQ5'
        }
      ],
      'select': [
        '__time',
        'fid'
      ],
      'selectLimit': 1,
      'selectOrderDirection': 'asc',
      'selectOrderBy': '__time',
      'splitType': 'groupBy',
      'queryEngine': 'tindex',
      dimensionExtraSettingDict: {}
    }
  }) || []
  if (!faceIdResArr.length) {
    return {}
  }
  const fid = faceIdResArr[0].fid

  // 2. 根据得到的最新faceID去查基本信息数据
  const basicResArr = await doQueryDruidData({
    'druid_datasource_id': 'GHMq9QlGIB',
    params: {
      'timezone': 'Asia/Shanghai',
      'dimensions': [
        'fid',
        'fimg',
        '__time',
        'nickname',
        'sugo_province',
        'sugo_city',
        'try_car'
      ],
      'granularity': 'PT1M',
      'filters': [
        {
          'col': 'fid',
          'op': 'in',
          'eq': [
            fid
          ],
          'type': 'string'
        }
      ],
      'dimensionExtraSettings': [
        {
          'limit': 10,
          'sortDirect': 'desc'
        },
        {
          'limit': 10,
          'sortDirect': 'desc'
        },
        {
          'sortCol': '__time',
          'sortDirect': 'asc',
          'limit': 10,
          'granularity': 'PT1M'
        },
        {
          'limit': 10,
          'sortDirect': 'desc',
          'sortCol': 'tindex_9_MpxgIJm_project_w7ZLfGGyo_IDvCaoLQ5'
        },
        {
          'limit': 10,
          'sortDirect': 'desc',
          'sortCol': 'tindex_9_MpxgIJm_project_w7ZLfGGyo_IDvCaoLQ5'
        },
        {
          'limit': 10,
          'sortDirect': 'desc',
          'sortCol': 'tindex_9_MpxgIJm_project_w7ZLfGGyo_IDvCaoLQ5'
        },
        {
          'limit': 10,
          'sortDirect': 'desc',
          'sortCol': 'tindex_9_MpxgIJm_project_w7ZLfGGyo_IDvCaoLQ5'
        }
      ],
      'select': [
        'fid',
        'fimg',
        '__time',
        'nickname',
        'sugo_province',
        'sugo_city',
        'try_car'
      ],
      'selectLimit': 10,
      'selectOrderDirection': 'desc',
      'splitType': 'groupBy',
      'queryEngine': 'tindex',
      dimensionExtraSettingDict: {}
    }
  }) || []
  const basicResult = basicResArr.sort((a, b) => moment(b.__time).valueOf() - moment(a.__time).valueOf())
  const dealRes = basicResult.length ? basicResult[0] : {}
  if (dealRes.__time) {
    dealRes.__time = moment(dealRes.__time).format('YYYY-MM-DD hh:mm')
  }
  console.log('基本信息tindex-res过滤后: ', dealRes)
  return dealRes
}

/**
 * 从uindex获取感兴趣车辆信息
 */
const getTryCarData = async (unionid) => {
  const res = await doQueryDruidData({
    'druid_datasource_id': '7Xo4lNC92Wl',
    params: {
      'timezone': 'Asia/Shanghai',
      'dimensions': [
        'ms_car_interested_top1',
        'ms_car_interested_top2',
        'ms_car_interested_top3',
        's_union_id'
      ],
      'granularity': 'P1D',
      'filters': [
        {
          'col': 's_union_id',
          'op': 'in',
          'eq': [
            unionid
          ],
          'type': 'string'
        }
      ],
      'dimensionExtraSettings': [
        {
          'limit': 100,
          'sortDirect': 'desc'
        },
        {
          'limit': 10,
          'sortDirect': 'desc'
        },
        {
          'limit': 10,
          'sortDirect': 'desc'
        },
        {
          'limit': 10,
          'sortDirect': 'desc'
        }
      ],
      'select': [
        'ms_car_interested_top1',
        'ms_car_interested_top2',
        'ms_car_interested_top3',
        's_union_id'
      ],
      'selectLimit': 100,
      'selectOrderDirection': 'desc',
      'splitType': 'groupBy',
      'queryEngine': 'tindex',
      dimensionExtraSettingDict: {}
    }
  })
  console.log('感兴趣车辆tindex-res: ', res)
  const resultSet = res[0]&&res[0].resultSet || []
  const resSort = resultSet.length ? resultSet[0] : {}
  return resSort
}

/**
 * 从tindex获取优惠券信息
 */
const getDiscountInfo = async (unionid) => {
  const res = await doQueryDruidData({
    'druid_datasource_id': 'GHMq9QlGIB',
    params: {
      'timezone': 'Asia/Shanghai',
      'dimensions': [
        'card_deadline'
      ],
      'granularity': 'P1D',
      'filters': [
        {
          'col': 'event_name',
          'op': 'in',
          'eq': [
            '点击领券'
          ],
          'type': 'string'
        },
        {
          'col': 'unionid',
          'op': 'in',
          'eq': [
            unionid
          ],
          'type': 'string'
        }
      ],
      'dimensionExtraSettings': [
        {
          'sortCol': 'card_deadline',
          'sortDirect': 'asc',
          'limit': 50,
          'granularity': 'PT1M'
        }
      ],
      'select': [
        'card_deadline'
      ],
      'selectLimit': 50,
      'selectOrderDirection': 'asc',
      'selectOrderBy': 'card_deadline',
      'splitType': 'groupBy',
      'queryEngine': 'tindex',
      dimensionExtraSettingDict: {}
    }
  }) || []
  const filterRes = res.filter(item => item)
  return filterRes.map(item => ({time: moment(item).format('YYYY-MM-DD hh:mm'), overdue: moment(item).valueOf() - new Date().valueOf() < 0}))
}

export default {
  namespace,
  state: {
    userList: [],
    customerList: [],
    offlineData: [],
    onlineData: [],
    basicInfo: {},
    tryCarData: {},
    staffInfo: {},
    discountData: []
  },
  reducers: {
    change(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    // 获取用户列表
    * getUserList({ payload }, {call, select, put }) {
      if (!payload.execute_id) {
        alert('URL无execute_id参数')
        return
      }
      const res = yield call(nissanExecutionService.getUserListByExecutionId, payload.execute_id)
      yield put({
        type: 'change',
        payload: {
          userList: res.result || []
        }
      })
    },
    // 获取外部联系人表 - 判断是否添加好友
    * getCustomerList({ payload }, {call, select, put }) {
      const res = yield call(nissanExecutionService.getCustomerListAll, payload.userid)
      yield put({
        type: 'change',
        payload: {
          customerList: res.result || []
        }
      })
    },
    // 从员工表请求职位、二维码信息
    * getStaffInfo({ payload }, {call, select, put }) {
      const res = yield call(nissanExecutionService.getStaffById, payload.userid)
      yield put({
        type: 'change',
        payload: {
          staffInfo: res.result || {}
        }
      })
    },
    // 从 tindex / uindex 获取详情信息
    * getDetailData({ payload }, {call, select, put }) {

      const basicInfo = yield getBasicInfo(payload.unionid)
      const onlineData = yield getOffOnlineData(2, payload.unionid)
      const offlineData = yield getOffOnlineData(1, payload.unionid)
      const tryCarData = yield getTryCarData(payload.unionid)
      const discountData = yield getDiscountInfo(payload.unionid)

      yield put({
        type: 'change',
        payload: { offlineData }
      })
      yield put({
        type: 'change',
        payload: { onlineData }
      })
      yield put({
        type: 'change',
        payload: { basicInfo }
      })
      yield put({
        type: 'change',
        payload: { tryCarData }
      })
      yield put({
        type: 'change',
        payload: { discountData }
      })
    }
  },
  subscriptions: {}
}
