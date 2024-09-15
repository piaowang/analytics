/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   09/12/2017
 * @description
 */

import { Validates, Validator } from 'sugo-store'

const { DataType, DataTypes, Required, MaxLen, Pattern } = Validates

// 错误码格式：(接口方：字母，可能有)(错误码：数字)
const CodeReg = /(?:^([a-zA-Z]{1,2})?([0-9]{1,7})$)/

class LogCodeLogCode extends Validator {

  @MaxLen(32, '{{key}} 最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '{{key}} 为字符串类型')
  @Required('{{key}} 为必填项')
  id = null

  @MaxLen(32, '系统ID最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '{{key}} 为字符串类型')
  @Required('所属系统为必填项')
  system_id = null

  @MaxLen(32, '产品线ID最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '产品线为字符串类型')
  @Required('所属产品线为必填项')
  module_id = null

  @MaxLen(32, '接口方ID最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '{{key}} 为字符串类型')
  interface_id = null

  @Pattern(CodeReg, '错误码格式为:0-2位英文(可选) + 1-7位数字')
  @MaxLen(32, '错误码代码最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '错误码代码为字符串类型')
  @Required('错误码代码为必填项')
  code = null

  @MaxLen(32, '错误码描述最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '错误码描述为字符串类型')
  @Required('错误码描述为必填项')
  name = null

  message = null

  reset() {
    return this.set({
      id: null,
      system_id: null,
      module_id: null,
      interface_id: null,
      code: null,
      name: null,
      message: null
    })
  }
}

export default new LogCodeLogCode()
export {
  LogCodeLogCode,
  CodeReg
}
