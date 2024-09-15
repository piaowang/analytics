/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

/**
 * @param {LogCodeLogCode} model
 * @return {{id, system_id, module_id, interface_id, code, name, message}}
 */
export default function (model) {
  return {
    id: model.id,
    system_id: model.system_id,
    module_id: model.module_id,
    interface_id: model.interface_id,
    code: model.code,
    name: model.name,
    message: model.message || model.getValid()
  }
}
