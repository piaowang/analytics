/**
 * Created on 14/03/2017.
 */

/**
 * @typedef {Object} SceneData
 * @property {string} id
 * @property {string} project_id
 * @property {number} type
 * @property {object} params
 * @property {string} created_by
 * @property {string} updated_by
 */

/**
 * @typedef {object} RFM
 * @property {string} id
 * @property {string} project_id
 * @property {string} company_id
 * @property {string} name
 * @property {object} params
 * @property {number} state
 * @property {string} created_by
 * @property {string} updated_by
 */

/** ------------------------- 接口 ------------------------- **/

const Scene = {
  create: '/app/scene/create',
  update: '/app/scene/update',
  del: '/app/scene/delete',
  query: '/app/scene/query',
  getSceneOfProjects: '/app/scene/collection/projects'
}
const RFM = {
  // post
  // {project_id, name, params, [state]}
  create: '/app/rfm/create',
  // post
  // {id, [project_id, name, params, state]}
  update: '/app/rfm/update',
  // get
  // {id}
  del: '/app/rfm/delete',
  // get
  // {id}
  query: '/app/rfm/query',
  // get
  // {projects: [id:string, ...]}
  RFMOfProjects: '/app/rfm/collection/projects',

  /**
   * @typedef {object} RFMParams
   * @property {Array<number> | number} R
   * @property {Array<number> | number} F
   * @property {Array<number> | number} M
   */

  /**
   * @typedef {object} Scene
   * @property {string} UserID
   * @property {string} Price
   * @property {string} Date
   */


  /**
   * @typedef {object} RFMQueryParams
   * @property {string} datasource
   * @property {string} startDate
   * @property {string} endDate
   * @property {Scene} scene
   * @property {RFMParams} params
   */
  // post
  // {RFMQueryParams}
  RFMSliceDefault: `${window.sugo.pioUrl}/pio/process/rfm/slice/default`,
  // post
  // {RFMQueryParams}
  REMSliceCustomized: `${window.sugo.pioUrl}/pio/process/rfm/slice/customized`

  /**
   * 服务器响应数据
   * @typedef {object} RFMSlice
   * @property {Array<number> | number} R
   * @property {Array<number> | number} F
   * @property {Array<number> | number} M
   * @property {number} userCount
   * @property {number} userPercent
   * @property {Array<number>} userIdList
   */

}

export { Scene, RFM }


