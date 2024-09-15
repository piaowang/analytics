/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   09/12/2017
 * @description
 * @see {LogCodeSystemCodeModel}
 */

import { Validates, Validator } from 'sugo-store'

const { DataType, DataTypes, Required, MaxLen, Pattern } = Validates

class LogCodeSystemCode extends Validator {

  @MaxLen(32, '{{key}} 最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '{{key}} 为字符串类型')
  @Required('{{key}} 为必填项')
  id = null

  @Pattern(/^[a-zA-Z_]\w{0,15}$/, '系统码格式为1-16个英文字符、数字或下划线，首字符不能为数字')
  @DataType(DataTypes.PRIM_STR, '系统码为字符串类型')
  @Required('系统码为必填项')
  code = null

  @MaxLen(32, '系统码名称最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '系统码名称为字符串类型')
  @Required('系统码名称为必填项')
  name = null

  @MaxLen(32, '所属项目最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '所属项目为字符串类型')
  @Required('所属项目为必填项')
  project_id = null

  @MaxLen(32, '描述最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '描述为字符串类型')
  description = null

  message = null

  reset() {
    return this.set({
      id: null,
      code: null,
      name: null,
      project_id: null,
      description: null,
      message: null
    })
  }
}

export default new LogCodeSystemCode()
export {
  LogCodeSystemCode
}
