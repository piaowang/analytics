/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   09/12/2017
 * @description 功能模块（产品线）定义表，产品线与系统码的关系为多对一
 */

import { generate } from 'shortid'

/**
 * @typedef {object} LogCodeModuleCode
 * @property {string} id
 * @property {string} code
 * @property {string} system_id
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @see {LogCodeSystemCodeModel}
 */

const MODULE_CODE_UNIQUE = 'module_code_unique'

/**
 * @param sequelize
 * @param DataTypes
 */
export default function (sequelize, DataTypes) {
  return sequelize.define('LogCodeModuleCode', {
    id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      primaryKey: true,
      defaultValue: generate
    },
    code: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '标识码',
      unique: MODULE_CODE_UNIQUE
    },
    system_id: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: '所属系统',
      unique: MODULE_CODE_UNIQUE      
    }
  }, {
    tableName: 'log_code_module_code',
    freezeTableName: true,
    underscored: true,
    timestamps: true
  })
}
