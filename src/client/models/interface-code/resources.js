/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

const namespace = 'app'
import Resource from '../resource'

function maker(path) {
  return `/${namespace}/interface-code${path}`
}

const $resource = {
  create: Resource.create(maker('/create')),
  findById: Resource.create(maker('/query-by-id')),
  findByCode: Resource.create(maker('/query-by-code')),
  findSystemInterfaces: Resource.create(maker('/find-systems-interface')),
  findProjectInterfaces: Resource.create(maker('/find-project-interface')),
  update: Resource.create(maker('/update')),
  destroy: Resource.create(maker('/destroy'))
}

export default {
  /**
   * @param {String} code
   * @param {String} name
   * @param {String} system_id
   * @param {String} module_id
   * @return {Promise.<ServerResponseStructure<LogCodeInterfaceCodeModel>>}
   */
  async create(code, name, system_id, module_id) {
    return await $resource.create.post({}, { code, name, system_id, module_id }).json()
  },

  /**
   * @param {String} id
   * @return {Promise.<ServerResponseStructure<LogCodeModuleCode>>}
   */
  async findById(id) {
    return await $resource.findById.get({}, { id }).json()
  },

  /**
   * @param {String} module_id
   * @param {String} code
   * @return {Promise.<ServerResponseStructure<LogCodeInterfaceCodeModel>>}
   */
  async findByCode(module_id, code) {
    return await $resource.findByCode.get({}, { module_id, code }).json()
  },

  /**
   * @param {Array<String>} models - system ids array
   * @return {Promise.<ServerResponseStructure<Array<LogCodeInterfaceCodeModel>>>}
   */
  async findSystemInterfaces(models) {
    return await $resource.findSystemInterfaces.get({}, { models }).json()
  },

  /**
   * @param {String} project_id
   * @return {Promise.<ServerResponseStructure<Array<LogCodeInterfaceCodeModel>>>}
   */
  async findProjectInterfaces(project_id) {
    return await $resource.findProjectInterfaces.get({}, { project_id }).json()
  },

  /**
   * @param {String} id
   * @param {String} code
   * @param {String} name
   * @return {Promise.<ServerResponseStructure<Object>>}
   */
  async update(id, code, name) {
    return await $resource.update.post({}, { id, code, name }).json()
  },

  /**
   * @param {String} id
   * @return {Promise.<ServerResponseStructure<Object>>}
   */
  async destroy(id) {
    return await $resource.destroy.post({}, { id }).json()
  }
}
