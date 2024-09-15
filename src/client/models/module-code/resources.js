/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

const namespace = 'app'
import Resource from '../resource'

function maker(path) {
  return `/${namespace}/module-code${path}`
}

const $resource = {
  create: Resource.create(maker('/create')),
  findById: Resource.create(maker('/query-by-id')),
  findByCode: Resource.create(maker('/query-by-code')),
  findSystemsModules: Resource.create(maker('/find-systems-modules')),
  findProjectModules: Resource.create(maker('/find-project-modules')),
  update: Resource.create(maker('/update')),
  destroy: Resource.create(maker('/destroy'))
}

export default {
  /**
   * @param {String} code
   * @param {String} system_id
   * @return {Promise.<ServerResponseStructure<LogCodeModuleCode>>}
   */
  async create(code, system_id) {
    return await $resource.create.post({}, { code, system_id }).json()
  },

  /**
   * @param {String} id
   * @return {Promise.<ServerResponseStructure<LogCodeModuleCode>>}
   */
  async findById(id) {
    return await $resource.findById.get({}, { id }).json()
  },

  /**
   * @param {String} system_id
   * @param {String} code
   * @return {Promise.<ServerResponseStructure<LogCodeModuleCode>>}
   */
  async findByCode(system_id, code) {
    return await $resource.findByCode.get({}, { system_id, code }).json()
  },

  /**
   * @param {Array<String>} models - system ids array
   * @return {Promise.<ServerResponseStructure<Array<LogCodeModuleCode>>>}
   */
  async findSystemsModules(models) {
    return await $resource.findSystemsModules.get({}, { models }).json()
  },

  /**
   * @param {String} project_id
   * @return {Promise.<ServerResponseStructure<Array<LogCodeModuleCode>>>}
   */
  async findProjectModules(project_id) {
    return await $resource.findProjectModules.get({}, { project_id }).json()
  },

  /**
   * @param {String} id
   * @param {String} code
   * @return {Promise.<ServerResponseStructure<Object>>}
   */
  async update(id, code) {
    return await $resource.update.post({}, { id, code }).json()
  },

  /**
   * @param {String} id
   * @return {Promise.<ServerResponseStructure<Object>>}
   */
  async destroy(id) {
    return await $resource.destroy.post({}, { id }).json()
  }
}
