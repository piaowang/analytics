/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

const namespace = 'app'
import Resource from '../resource'

function maker(path) {
  return `/${namespace}/log-code${path}`
}

const $resource = {
  create: Resource.create(maker('/create')),
  bulkCreate: Resource.create(maker('/bulk-create')),
  findById: Resource.create(maker('/query-by-id')),
  findByCode: Resource.create(maker('/query-by-code')),
  findAllByPage: Resource.create(maker('/find-all-by-page')),
  findProjectLogCode: Resource.create(maker('/find-project-log-code')),
  update: Resource.create(maker('/update')),
  destroy: Resource.create(maker('/destroy'))
}

export default {
  /**
   *
   * @param {String} system_id
   * @param {String} module_id
   * @param {?String} interface_id
   * @param {String} code
   * @param {String} name
   * @return {Promise.<ServerResponseStructure<LogCodeLogCodeModel>>}
   */
  async create(system_id, module_id, interface_id, code, name) {
    return await $resource.create.post({}, { system_id, module_id, interface_id, code, name }).json()
  },

  /**
   * @param {String} project_id
   * @param {Array<{system:String, module:String, code:String, name:?String}>} models
   * @return {Promise.<ServerResponseStructure<{created:Array<LogCodeLogCodeModel>, success:number, failed:Array<String>}>>}
   */
  async bulkCreate(project_id, models) {
    return await $resource.bulkCreate.post({}, { project_id, models }).json()
  },

  /**
   * @param {String} id
   * @return {Promise.<ServerResponseStructure<LogCodeLogCodeModel>>}
   */
  async findById(id) {
    return await $resource.findById.get({}, { id }).json()
  },

  /**
   * @param {String} system_id
   * @param {String} code
   * @return {Promise.<ServerResponseStructure<LogCodeInterfaceCodeModel>>}
   */
  async findByCode(system_id, code) {
    return await $resource.findByCode.get({}, { system_id, code }).json()
  },

  /**
   * @param {?String} system_id
   * @param {?String} module_id
   * @param {?String} interface_id
   * @param {?String} like
   * @param {number} pageSize
   * @param {number} currentPage
   * @return {Promise.<ServerResponseStructure<LogCodeInterfaceCodeModel>>}
   */
  async findAllByPage(system_id, module_id, interface_id, like, pageSize, currentPage) {
    return await $resource.findAllByPage.get({}, {
      system_id,
      module_id,
      interface_id,
      like,
      pageSize,
      currentPage
    }).json()
  },

  /**
   * @param {String} project_id
   * @return {Promise.<ServerResponseStructure<Array<LogCodeInterfaceCodeModel>>>}
   */
  async findProjectLogCode(project_id) {
    return await $resource.findProjectLogCode.get({}, { project_id }).json()
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
