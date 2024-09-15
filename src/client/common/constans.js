
/**
 * 下载原始数据分页条数/批量下载原始数据选择条数
 * @export [100, 500, 1000,...]
 * @param {String} [key='downloadLimit'] - 查看原始数据源限制
 * @return {Array<Number>}
 */
export function getDownloadLimit(key) {
  let res, defaultVal = [100, 500, 1000]
  try {
    res = window.sugo[key || 'downloadLimit'].split(/\s*\,\s*/g).map(v => Number(v)) || defaultVal
  } catch (e) {
    res = defaultVal
  }
  return res
}

//指标统计结果类型
export const statisticsTypeTextMap = {
  count: '数量',
  countDistinct: '去重数量',
  max: '最大',
  min: '最小',
  sum: '求和',
  average: '平均值',
  last: '最新'
}

//字符统计类型
export const statisticsTypeList = {
  string: ['count', 'countDistinct'],
  number: ['count', 'countDistinct', 'max', 'min', 'sum', 'average', 'last'],
  date: ['count', 'countDistinct', 'max', 'min', 'last'],
  datestring: ['count', 'countDistinct'],
  stringArray: ['count', 'countDistinct']
}

