/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   09/12/2017
 * @description
 */

import { Validates, Validator } from 'sugo-store'

const { DataType, DataTypes, Required, MaxLen, Pattern } = Validates

class LogCodeInterfaceCode extends Validator {

  @MaxLen(32, '{{key}} 最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '{{key}} 为字符串类型')
  @Required('{{key}} 为必填项')
  id = null

  @Pattern(/^[a-zA-Z]{1,2}$/, '接口方代码格式为1-2位英文')
  @DataType(DataTypes.PRIM_STR, '代码只能为字符串类型')
  @Required('代码为必填项')
  code = null

  @MaxLen(32, '接口方名称最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '接口方名称只能为字符串类型')
  @Required('接口方名称为必填项')
  name = null

  @MaxLen(32, '系统名称最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '系统只能为字符串类型')
  @Required('系统为必填项')
  system_id = null

  @MaxLen(32, '产品线名称最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '产品线只能为字符串类型')
  @Required('产品线为必填项')
  module_id = null

  message = null

  reset() {
    return this.set({
      id: null,
      code: null,
      name: null,
      system_id: null,
      module_id: null,
      message: null
    })
  }
}

export default new LogCodeInterfaceCode()
export {
  LogCodeInterfaceCode
}
