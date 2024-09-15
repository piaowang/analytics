/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

/**
 * @param {LogCodeSystemCode} model
 * @return {{id, code, name, project_id, description}}
 */
export default function (model) {
  return {
    id: model.id,
    code: model.code,
    name: model.name,
    project_id: model.project_id,
    description: model.description,
    message: model.message || model.getValid()
  }
}
