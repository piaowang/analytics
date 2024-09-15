/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

/**
 * @param {LogCodeModuleCode} model
 * @return {{id, code, name, project_id, description}}
 */
export default function (model) {
  return {
    id: model.id,
    code: model.code,
    system_id: model.system_id,
    message: model.message || model.getValid()
  }
}
