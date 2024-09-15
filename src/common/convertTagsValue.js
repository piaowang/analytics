import _ from 'lodash'
import moment from 'moment'
import { TagType, DIMENSION_TYPES, EMPTY_TAG_NUMBER } from './constants'

//标签tags_value 转换为 tag_name
export function convertTagsValue(value, tags, dimensions = []) {
  let dimMap = _.keyBy(dimensions, p => p.name)
  let tagGroup = _.groupBy(tags, p => p.name)
  return value.map(val => {
    return _.mapValues(val, (v, k) => {
      const nullDisplayText = _.get(dimMap, [k, 'tag_extra', 'null_display_text'], '--')
      let tag = _.get(tagGroup, k)
      if (k === '__time') {
        return moment(v).format('YYYY-MM-DD HH:mm:ss')
      }
      if (!tag) {
        if (_.get(dimMap, [k, 'type']) === DIMENSION_TYPES.date && v) {
          return moment(v).format(_.get(dimMap, [k, 'tag_extra', 'date_display_format'], 'YYYY-MM-DD HH:mm:ss'))
        }
        return v || nullDisplayText
      }
      let tagType = _.get(tag, '[0].type')
      if (!tagType) return nullDisplayText
      if (tagType === TagType.String) {
        let tagVal = _.filter(tag, p => {
          const tvs = p.tag_value.split(',')
          return _.isArray(v)
            ? _.some(v, v0 => _.includes(tvs, v0)) // String 多值列
            : tvs.includes(v)
        }).map(p => p.tag_name)
        return tagVal.length ? tagVal.join(',') : '其他'
      } else if (tagType === TagType.Range) {
        if (_.isNull(v)) {
          return nullDisplayText
        }
        if (v === EMPTY_TAG_NUMBER) {
          return nullDisplayText
        }
        let tagVal = _.filter(tag, p => {
          const value = p.tag_value.split('`').map(v => _.trim(v))
          let [min, max] = value
          min = min ? _.toNumber(min) : min
          max = max ? _.toNumber(max) : max
          if (_.isNumber(min) && _.isNumber(max)) {                      // (start, end]
            return v > min && v <= max
          } else if (_.isEmpty(max) && value.length === 1) {             // [start, start]
            return min === v
          } else if (_.isEmpty(min) && _.isNumber(max)) {                // (, end]
            return v <= max
          } else if (_.isNumber(min) && _.isEmpty(max)) {                // (start, ]
            return v > min
          }
        })
        return tagVal.length ? tagVal.map(p => p.tag_name).join(',') : '其他'
      } else if (tagType === TagType.Time) {
        if (_.isNull(v)) {
          return nullDisplayText
        }
        let tagVal = _.filter(tag, p => {
          const value = p.tag_value.split('`').map(v => _.trim(v))
          let [min, max] = value
          min = min ? moment(min).startOf('d') : min
          max = max ? moment(max).endOf('d') : max
          if (min && max) {               // (start, end]
            return moment(v).isBetween(min, max)
          } else if (!max && value.length === 1) {            // [start, start]
            return moment(v).isSame(min)
          } else if (!min && max) {                 // (, end]
            return moment(max).isSameOrAfter(v)
          } else if (min && !max) {                 // (start, ]
            return moment(v).isAfter(min)
          }
        })
        return tagVal.length ? tagVal.map(p => p.tag_name).join(',') : '其他'
      }
    })
  })
}

//构建标签字典表数据
export const buildTagItems = (tag_value = '', name, proj, sub_type, company_id, user_id) => {
  return tag_value
    .split(/\n+/g)
    .filter(s => s.trim())
    .map((v, i) => {
      let str = v.includes('=') ? v : v + '=' + v
      let [title, tag_value] = str.split('=').map(s => _.trim(s))
      return {
        tag_value,
        name,
        title,
        sub_type,
        project_id: proj.id,
        tag_datasource_name: proj.tag_datasource_name,
        company_id,
        created_by: user_id,
        updated_by: user_id,
        tag_order: i
      }
    })
}
