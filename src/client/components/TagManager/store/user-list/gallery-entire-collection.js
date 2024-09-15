/**
 * @Author sugo.io<asd>
 * @Date 17-10-17
 * @desc 单个标签全部画像 Collection
 * @see {TagGalleryModel}
 */

import Resources  from '../../../../models/segment/resources'
import { Action as MsgAction } from './message'

/**
 * @param {string} mark
 * @return {string}
 */
function creator (mark) {
  return `collection-tag-entire-gallery-${mark}`
}

const Action = {
  fetch: creator('fetch')
}

const Actions = {

  /**
   * 请求某个分群下的用户详细信息列表
   * @param {Store} store
   * @param {string} project_id
   * @param {string} reference_tag_name
   * @param {string} datasource_id
   * @param {Array<string>} tags
   * @param {Collection<TagGalleryGroups>} col
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async fetch(store, project_id, reference_tag_name, datasource_id, tags, col, done){

    // 缓存，已经请求过的标签不再请求
    const f_tags = tags.filter(tag => !col.find({ tag }))

    if (f_tags.length === 0) {
      return done()
    }

    const { result, success, message } = await Resources.queryTagGalleryByDruidQuery(
      project_id,
      reference_tag_name,
      datasource_id,
      f_tags,
      []
    )

    // 异常提示
    if (!success) {
      done()
      return store.dispatch({
        type: MsgAction.error,
        payload: message
      })
    }

    const { tags: tags_arr, tag_groups } = result
    const _tags = { ...(store.state.TagGalleryCollection.tags || {}) }

    tags_arr.forEach(t => (_tags[t.name] || (_tags[t.name] = [])).push(t))

    let tagValues
    let tagKey
    let tagValueKey
    let groups

    for (tagKey in tag_groups) {
      if (!tag_groups.hasOwnProperty(tagKey)) continue

      tagValues = tag_groups[tagKey]
      groups = []

      for (tagValueKey in tagValues) {
        if (!tagValues.hasOwnProperty(tagValueKey)) continue
        groups.push({ value: tagValueKey, total: tagValues[tagValueKey] })
      }

      col.add({ tag: tagKey, groups })
    }

    done({ tags: _tags })
  }
}

/**
 * @param {Object} action
 * @param {Collection<TagGalleryGroups>} collect
 * @param {Function} done
 * @this {Store}
 */
function scheduler (action, collect, done) {
  const { type, payload } = action

  switch (type) {

    case Action.fetch:
      Actions.fetch(this,
        payload.project_id,
        payload.reference_tag_name,
        payload.datasource_id,
        payload.tags,
        collect,
        done
      )
      break

    default:
      done()
  }
}

export default {
  name: 'TagEntireGalleryCollection',
  primaryKey: 'tag',
  scheduler
}

export {
  Action
}
