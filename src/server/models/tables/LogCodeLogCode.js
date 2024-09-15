/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   09/12/2017
 * @description 日志异常码
 *
 * 其中，code以特定的形式组成：产品线+接口方+错误码
 * 表中添加产品线、接口方字段以便查询
 */

import { generate } from 'shortid'

/**
 * @typedef {object} LogCodeLogCodeModel
 * @property {string} id
 * @property {string} project_id
 * @property {string} system_id        - 所属系统
 * @property {string} module_id        - 所属产品线
 * @property {string} interface_id     - 所属接口方
 * @property {string} code             - 错误码，如AcBcs1230
 * @property {string} [name]           - 错误码描述信息
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @see {LogCodeSystemCodeModel} system_id
 * @see {LogCodeModuleCode} module_id
 * @see {LogCodeInterfaceCodeModel} interface_id
 */

const LOG_CODE_UNIQUE = 'log_code_unique'

/**
 * @param sequelize
 * @param DataTypes
 */
export default function (sequelize, DataTypes) {
  return sequelize.define('LogCodeLogCode', {
    id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      primaryKey: true,
      defaultValue: generate
    },
    system_id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '所属系统',
      unique: LOG_CODE_UNIQUE
    },
    module_id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '所属产品线',
      unique: LOG_CODE_UNIQUE
    },
    interface_id: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: '所属接口方',
      unique: LOG_CODE_UNIQUE
    },
    code: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '错误码',
      unique: LOG_CODE_UNIQUE
    },
    name: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: '描述'
    }
  }, {
    tableName: 'log_code_log_code',
    freezeTableName: true,
    underscored: true,
    timestamps: true
  })
}
