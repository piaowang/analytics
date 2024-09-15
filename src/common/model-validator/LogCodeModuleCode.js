/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   09/12/2017
 * @description
 */

import { Validator, Validates } from 'sugo-store'

const { DataType, DataTypes, Required, RangeLen, MaxLen, Pattern } = Validates

class LogCodeModuleCode extends Validator {

  @MaxLen(32, '{{key}} 最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '{{key}} 为字符串类型')
  @Required('{{key}} 为必填项')
  id = null

  // 2E80-A4CF: 20902个基本汉字
  // 2F00-2FD5: 康熙部首
  // 2E80-2EF3: 首部扩展
  // 31C0-31E3: 汉字笔画
  // 2FF0-2FFB: 汉字结构
  @Pattern(/^[\u2E80-\uA4CF\u2F00-\u2FD5\u2E80-\u2EF3\u31C0-\u31E3\u2FF0-\u2FFB]{1,10}$/, '产品线格式为1-10个中文')
  @DataType(DataTypes.PRIM_STR, '产品线为字符串类型')
  @Required('产品线为必填项')
  code = null

  @MaxLen(32, '所属系统最大长度为32个字符')
  @DataType(DataTypes.PRIM_STR, '所属系统为字符串类型')
  @Required('所属系统为必填项')
  system_id = null

  message = null

  reset() {
    return this.set({
      id: null,
      system_id: null,
      code: null,
      message: null
    })
  }
}

export default new LogCodeModuleCode()
export {
  LogCodeModuleCode
}
