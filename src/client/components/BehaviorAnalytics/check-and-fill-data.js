/**
 * 提供几个工具函数,供 ./chart-panel.jsx和../TrafficAnalytics/data-box.jsx使用
 * 用于检查和填充主线和对比线的数据
 */
import moment from 'moment'
import _ from 'lodash'

const dayInterval = 24 * 60 * 60 * 1000

export default function checkAndFillData(druidData, granObj, selectMetric, since, until) {
  if(druidData[0] && druidData[1]) {//把对比结果集向主结果集对齐
    let set0 = druidData[0].concat()
    let set1 = druidData[1].concat()
    if(set0.length > 1) {
      let f = set0[0]
      let l = set0[set0.length - 1]
      let timeInterval = moment(l.__time).toDate() - moment(f.__time).toDate()
      let timeInterval1 = 0
      if(set1.length) {
        let f1 = set1[0]
        let l1 = set1[set1.length - 1]
        timeInterval1 = moment(l1.__time).toDate() - moment(f1.__time).toDate()        
      }
      
      if(timeInterval < dayInterval) {//如果是一天之内,按小时对齐
        druidData[0] = fillDataByDay(set0, granObj, selectMetric, since, until)
        druidData[1] = fillDataByDay(set1, granObj, selectMetric, since, until)
      } else if(timeInterval > timeInterval1) { //如果结果的时间范围大于一天,并且对比结果集时间范围小于主结果集
        //把开头对齐,对比结果集补齐
        if(!set1.length) {//如果一个结果都没有
          set1.push(getFakeData(since, 0, selectMetric, granObj))
        }
        let timeStr = moment(since).add(timeInterval).toISOString()
        set1.push(getFakeData(timeStr, 0, selectMetric, granObj))
        let set = []
        set1.forEach((d, i) => fillData(d, i, granObj, set, selectMetric))
        druidData[1] = set
      } else { //主结果集时间范围大于一天,但是主结果集的数量小于对比结果集的数量
        //把多余的切掉
        druidData[1] = set1.slice(0, set1.length)
      }

    }
  } else if(druidData[0] && !_.isEmpty(druidData[0])) {
    let set0 = druidData[0].concat()
    let f = set0[0]
    let l = set0[set0.length - 1]
    let timeInterval = moment(l.__time).toDate() - moment(f.__time).toDate()
    if(timeInterval < dayInterval) {
      druidData[0] = fillDataByDay(set0, granObj, selectMetric, since, until)
    }
  }
}

export const granularitys = [
  {
    value: 'PT1H',
    title: '小时',
    format: str => moment(str).format('HH') + '时',
    str: 'hours',
    setFun: 'hour',
    interval: 1000 * 60 * 60
  },
  {
    value: 'P1D',
    title: '日',
    format: str => moment(str).format('DD') + '日',
    str: 'days',
    setFun: 'date',
    interval: 1000 * 60 * 60 * 24
  },
  {
    value: 'P1W',
    title: '周',
    format: str => {
      let m = moment(str)
      return m.format('MM/DD') + ' ~ ' + m.clone().add(7, 'days').format('MM/DD')
    },
    str: 'weeks',
    setFun: 'date',
    interval: 1000 * 60 * 60 * 24 * 7
  },
  {
    value: 'P1M',
    title: '月',
    format: str => moment(str).format('MM') + '月',
    str: 'months',
    setFun: 'month',
    interval: 1000 * 60 * 60 * 24 * 30
  }
]

export function fillData(d, i, granObj, set1, selectMetric) {//补充需要的字段和补充缺失的结果
  let format = granObj.format
  let time = format(d['__time'])
  let number = _.toNumber(time.match(/\d+/)[0])
  let value = isFuture(d['__time']) ? null : d[selectMetric]

  set1.push(Object.assign({}, d, {
    time, number,
    [selectMetric]: value ? _.round(value) : value
  }))
  if(!i) return

  let last = set1[set1.length - 2]
  let num = Math.round((moment(d.__time) - moment(last.__time)) / granObj.interval)
  if(num > 1) {
    //需要填补数据
    num --
    let arr = []
    for(let j = 0; j < num; j++) {
      arr.push(getFakeData(last['__time'], j + 1, selectMetric, granObj))
    }
    set1.splice(set1.length - 1, 0, ...arr)
  }
  
}

function isFuture(timeStr) {
  let now = new Date()
  let t = moment(timeStr).toDate()
  return t > now
}

function getFakeData(timeStr, i, metric, granObj) {
  let __time = moment(timeStr).add(i, granObj.str).toISOString()
  let time = granObj.format(__time)
  let number = _.toNumber(time.match(/\d+/)[0])
  let value = isFuture(__time) ? null : 0
  return {
    __time,
    time,
    number,
    [metric]: value
  }
}

function getFakeTime(data, number, granObj) {
  return moment(data.__time)[granObj.setFun](number).toISOString()
}

//按一天24小时补齐结果集
function fillDataByDay(set, granObj, selectMetric, since, until) {
  const f = set[0]
  const l = set[set.length - 1]
  let needFill = false
  if(!f || f.number !== 0) {
    let timeStr = f ? getFakeTime(f, 0, granObj) : since
    set.unshift(getFakeData(timeStr, 0, selectMetric, granObj))
    needFill = true
  }

  if(!l || l.number !== 23) {
    let timeStr = l ? getFakeTime(l, 23, granObj) : until
    set.push(getFakeData(timeStr, 0, selectMetric, granObj))
    needFill = true
  }

  if(needFill) {
    let _set = []
    set.forEach((d, i) => fillData(d, i, granObj, _set, selectMetric))
    return _set
  } else {
    return set
  }
}

