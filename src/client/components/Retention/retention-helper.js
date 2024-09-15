import moment from 'moment'
import _ from 'lodash'
import {convertDateType, isRelative} from '../../../common/param-transform'

export const retentionChangeProjLSId = 'retention_change_project'

export function findSuitableRetentionGranularity(timeRange) {
  let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
  let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)

  let mSince = moment(since), mUntil = moment(until)
  if (181 <= mUntil.diff(mSince, 'day')) {
    return ['P1M']
  } else if (30 <= mUntil.diff(mSince, 'day')) {
    return ['P1W', 'P1M']
  } else if (14 <= mUntil.diff(mSince, 'day')) {
    return ['P1D', 'P1W']
  } else {
    return ['P1D']
  }
}

// {startStep, endStep, startStep_1, endStep_2} => [{startStep, endStep}, ...]
export function getStepPairs(retention) {
  return _(retention.params).keys()
    .filter(k => _.startsWith(k, 'startStep') || _.startsWith(k, 'endStep'))
    .groupBy(k => k.split('_')[1] || '0')
    .mapValues(arr => {
      arr = _.orderBy(arr, k => _.startsWith(k, 'startStep') ? 0 : 1)
      return {
        startStep: retention.params[arr[0]],
        endStep: retention.params[arr[1]]
      }
    })
    .thru(dict => _(dict).keys().sort().map(kIdx => dict[kIdx]).value())
    .value()
}

export function transformData(nameAndDataArr, granularityType, since, until) {
  let duration, startDay, granularity
  switch (granularityType) {
    case 'P1D':
      granularity = 'days'
      duration = moment.duration(moment(until).diff(since)).asDays()
      startDay = moment(since).format('YYYY-MM-DD') //取时daterange[0]
      break
    case 'P1W':
      granularity = 'weeks'
      duration = moment.duration(moment(until).diff(since)).asWeeks()
      startDay = moment(since).day(1).format('YYYY-MM-DD') //取时daterange[0]的周一
      break
    case 'P1M':
      granularity = 'months'
      duration = moment.duration(moment(until).diff(since)).asMonths()
      startDay = moment(since).format('YYYY-MM-01') //取时daterange[0]的月份第一天
      break
    default:
      console.error('data error')
  }

  const retentionList = nameAndDataArr.map(nameAndData => {
    // retention = Object {name: "概况", data: Array[7]}
    // array child Object {timestamp: "2017-01-05T00:00:00.000+08:00", result: Object}
    // result object {'2017-01-05T00:00:00.000+08:00': 33, '2017-01-06T00:00:00.000+08:00': 34, total: 181 }
    let dataList = {
      name: nameAndData.name,
      key: nameAndData.name,
      stepIndex: nameAndData.stepIndex,
      groupName: nameAndData.groupName,
      total: 0,
      data: []
    }
    let children = []
    let mNow = moment()

    for (let i = 0; i < duration; i++) {
      let retentionData = { parentKey: dataList.key }
      let date = moment(startDay).add(i, granularity)

      // 日期超过不能超过今日
      if (date.isAfter(mNow)) {
        continue
      }

      retentionData.name = date.format('YYYY-MM-DD')
      let currentDate = _.find(nameAndData.data, seg => moment(seg.timestamp).isSame(date))
      retentionData.total = currentDate ? currentDate.result.total : 0
      dataList.total += Math.floor(retentionData.total) || 0
      retentionData.key = `${nameAndData.name}_${retentionData.name}`
      retentionData.data = []

      for (let j = 0; j < duration; j++) {
        let _date = moment(date).add(j, granularity)

        // 日期超过不能超过今日
        if (_date.isAfter(mNow)) {
          continue
        }

        retentionData.data[j] = retentionData.data[j] || {}
        retentionData.data[j].date = _date.format('YYYY-MM-DD')

        if (currentDate) {
          let v = _.find(currentDate.result, (v, k) => moment(k).isSame(_date))
          retentionData.data[j].value = v || 0
        }

        //根据每天数据计算概况数据（第一行概率（黄色））
        dataList.data[j] = dataList.data[j] || {}
        dataList.data[j].value = (dataList.data[j].value || 0) + (retentionData.data[j].value || 0)
        dataList.data[j].total = (dataList.data[j].total || 0) + ( nameAndData.data[i] ? nameAndData.data[i].result.total : 0)
      }
      children[i] = retentionData
    }

    dataList.children = children
    return dataList
  })
  return retentionList
}

