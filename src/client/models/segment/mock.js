/**
 * @Author sugo.io<asd>
 * @Date 17-9-27
 */

import generate from 'shortid'
import _ from 'lodash'

// 标签存储方式与维度一致，并以前缀为分组标识
// 如：system_name, system_version同为system组

const Tags = [
  {
    group: '年龄',
    tags: ['1-10岁', '10-20岁', '2-30岁', '30-40岁']
  },
  {
    group: '性别',
    tags: ['男', '女']
  },
  {
    group: '是否有小孩',
    tags: ['是', '否']
  },
  {
    group: '是否留有手机号码',
    tags: ['是', '否']
  },
  {
    group: '注册时长',
    tags: new Array(10).fill(1).map(() => `${_.random(1, 300)}`)
  },
  {
    group: '注册系统',
    tags: ['官网', '第三方']
  },
  {
    group: '舱位等级',
    tags: new Array(10).fill(1).map(() => `${_.random(1, 10)}`)
  },
  {
    group: '平均客单价',
    tags: new Array(10).fill(1).map(() => `${_.random(300, 3000)}`)
  },
  {
    group: '订单数',
    tags: new Array(10).fill(1).map(() => `${_.random(1, 100)}`)
  },
  {
    group: '交易频次',
    tags: new Array(10).fill(1).map(() => `${_.random(1, 100)}`)
  }
]

/**
 * 随机取total个tag
 * @param {number} [total]
 * @return {Array<*>}
 */
function get_random_tags (total = 10) {
  const tags = Tags.reduce((p, c) => {
    p = p.concat(c.tags)
    return p
  }, [])

  if (total > tags.length - 1) {
    total = tags.length - 1
  }

  const index_arr = tags.map((v, i) => i)
  const ignore = []

  return new Array(total).fill(1).map(() => {
    const arr = index_arr.filter(i => !ignore.includes(i))
    const i = _.random(0, arr.length)
    ignore.push(i)
    return tags[i]
  })
}

/**
 * 随机取total条标签详细记录
 * @param {Array<string>} [groups]
 * @param {number} [total]
 * @return {TagDetailsCollectionState}
 */
export function tag_details (groups = Tags.map(r => r.group), total = 10) {
  return {
    fields: groups,
    total: 300,
    list: new Array(total).fill(1).map(() => {
      const arr = groups.map(group => {
        const tags = Tags.find(r => r.group === group).tags
        return tags[_.random(0, tags.length - 1)]
      })
      // 第一位为member_uuid
      return [generate()].concat(arr)
    })
  }
}

/**
 * 随机生成total标签用户组
 * @param {number} [total]
 * {Array<SegmentModel>}
 */
export function tag_segments (total = 10) {
  return new Array(total).fill(1).map((v, i) => ({
    id: generate(),
    created_by: `user_${i}`,
    updated_by: `user_${i}`,
    title: `title_${i}`,
    druid_datasource_id: generate(),
    datasource_name: `datasource_name_${i}`,
    params: {
      tags: get_random_tags(_.random(1, 10))
    },
    description: `备注${i}`,
    company_id: generate()
  }))
}

/**
 * 画像mock数据
 * @param {Array<string>} tags
 * @param {number} [total]
 * @return {Array<TagGalleryGroups>}
 */
export function tag_gallery (tags, total = 10) {
  tags = Tags.map(t => t.group)
  return tags.reduce((array, tag) => {
    const group = Tags.find(r => r.group === tag)
    const values = group.tags
    array = array.concat({
      tag,
      groups: values.map(value => ({
        value,
        total: _.random(100, 1000000)
      }))
    })
    return array
  }, [])
}
