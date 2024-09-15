/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

const namespace = 'app'
import Resource from '../resource'

function maker(path) {
  return `/${namespace}/system-code${path}`
}

const $resource = {
  create: Resource.create(maker('/create')),
  findProjectSystems: Resource.create(maker('/find-project-systems')),
  findById: Resource.create(maker('/query-by-id')),
  findByCode: Resource.create(maker('/query-by-code')),
  update: Resource.create(maker('/update')),
  destroy: Resource.create(maker('/destroy'))
}

export default {
  /**
   * @param {String} code
   * @param {String} name
   * @param {String} project_id
   * @param {?String} description
   * @return {Promise.<ServerResponseStructure<LogCodeSystemCodeModel>>}
   */
  async create(code, name, project_id, description) {
    return await $resource.create.post({}, { code, name, project_id, description }).json()
  },

  /**
   * @param project_id
   * @return {Promise.<ServerResponseStructure<Array<LogCodeSystemCodeModel>>>}
   */
  async findProjectSystems(project_id) {
    return await $resource.findProjectSystems.get({}, { project_id }).json()
  },

  /**
   * @param {String} id
   * @return {Promise.<ServerResponseStructure<LogCodeSystemCodeModel>>}
   */
  async findById(id) {
    return await $resource.findById.get({}, { id }).json()
  },

  /**
   * @param {String} project_id
   * @param {String} code
   * @return {Promise.<ServerResponseStructure<LogCodeSystemCodeModel>>}
   */
  async findByCode(project_id, code) {
    return await $resource.findByCode.get({}, { project_id, code }).json()
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
