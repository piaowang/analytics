/**
 * @Author sugo.io<asd>
 * @Date 17-11-24
 * @desc RealUserTableModel sequelize,接口,客户端用户输入字段验证
 * @see {RealUserTableModel}
 */

import { Validator, Validates } from 'sugo-store'

const { DataTypes, DataType, Required, RangeLen, Pattern } = Validates

class RealUserTable extends Validator {
  @RangeLen(2, 32)
  @DataType(DataTypes.PRIM_STR)
  @Required()
  id = null

  @RangeLen(2, 32, '表名长度为2~32个字节')
  @DataType(DataTypes.PRIM_STR)
  @Required('表名称必填并且不能重复')
  name = null

  /** @see {UserModel.id} */
  @RangeLen(2, 32)
  @DataType(DataTypes.PRIM_STR)
  @Required()
  company_id = null

  @Pattern(/[\d]/, '必须包含数字')
  @Pattern(/[a-zA-Z]/, '必须包含字母')
  @Pattern(/^[\da-zA-Z]{6,20}$/, '只能以数字、大小写字母开头，长度为6~20位')
  @Required()
  password = null
}

/**
 * 单例模式
 *
 * 不同地地方输入可能不同:
 * 1. 数据库定义
 *    @see {RealUserTableModel}
 * 2. 客户端用户只需要输入 name
 * ```js
 * import real from './RealUserTable'
 * const message = real.validOne('name', 'name values')
 * if(message === null) {
 *   throw new Error(message)
 * }
 * ```
 */

export default new RealUserTable()
export {
  RealUserTable
}
