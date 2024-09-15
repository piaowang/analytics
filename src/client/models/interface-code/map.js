/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

/**
 * @param {LogCodeInterfaceCode} model
 */
export default function (model) {
  return {
    id: model.id,
    code: model.code,
    name: model.name,
    system_id: model.system_id,
    module_id: model.module_id,
    message: model.message || model.getValid()
  }
}
