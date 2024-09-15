import _ from 'lodash'


/**
 * 组件大小排序 统一格式
 * @param {anrray[]} objs 组件集合
 */
export const paring = (objs, activity) => {
  // const controls = objs.filter(p => _.startsWith(p.sugo_autotrack_page_path, activity))
  return _.orderBy(objs, p => _.toNumber(p.width) + _.toNumber(p.height), ['desc'])
}
