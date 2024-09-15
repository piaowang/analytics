/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   09/12/2017
 * @description 子系统定义表
 */

import { generate } from 'shortid'

/**
 * @typedef {object} LogCodeSystemCodeModel
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} project_id
 * @property {string} description
 * @property {string} created_at
 * @property {string} updated_at
 */

const SYSTEM_CODE_UNIQUE = 'system_code_unique'

/**
 * @param sequelize
 * @param DataTypes
 */
export default function (sequelize, DataTypes) {
  return sequelize.define('LogCodeSystemCode', {
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
      unique: SYSTEM_CODE_UNIQUE
    },
    name: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: '描述信息'
    },
    project_id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '所属项目',
      unique: SYSTEM_CODE_UNIQUE
    },
    description: {
      type: DataTypes.STRING(32),
      allowNull: true,
      comment: '描述信息'
    }
  }, {
    tableName: 'log_code_system_code',
    freezeTableName: true,
    underscored: true,
    timestamps: true
  })
}
