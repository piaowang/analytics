/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2018/03/07
 * @description resources
 */

import Resource from '../resource'

const $resource = {
  findAllValid: Resource.create('/app/tag-dict/find-all-valid'),
  findAllValidByName: Resource.create('/app/tag-dict/find-all-valid-by-name')
}

export default {
  /**
   * 查询一个字典表中所有有效记录
   * 【有效记录】：tag_value 不为空，tag_name 不为空
   *
   * @param {string} project_id
   * @param {number} [limit=999]
   * @return {Promise.<ResponseStruct>}
   */
  async findAllValid(project_id, limit = 999) {
    return await $resource.findAllValid.post({}, {project_id, limit}).json()
  },

  /**
   * 查询某一字典表中某一标签所有有效记录
   * @param {string} project_id
   * @param {string[]} tag_names
   * @return {Promise.<ResponseStruct>}
   */
  async findAllValidByName(project_id, tag_names) {
    return await $resource.findAllValidByName.post({}, {project_id, tag_names}).json()
  }
}

