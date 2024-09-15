/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   09/12/2017
 * @description 接口方定义表
 */

import { generate } from 'shortid'

/**
 * @typedef {object} LogCodeInterfaceCodeModel
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} project_id
 * @property {string} description
 * @property {string} created_at
 * @property {string} updated_at
 */

const INTERFACE_CODE_UNIQUE = 'interface_code_unique'

/**
 * @param sequelize
 * @param DataTypes
 */
export default function (sequelize, DataTypes) {
  return sequelize.define('LogCodeInterfaceCode', {
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
      unique: INTERFACE_CODE_UNIQUE
    },
    name: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '描述信息'
    },
    system_id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '所属项目',
      unique: INTERFACE_CODE_UNIQUE      
    },
    module_id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      comment: '所属产品线',
      unique: INTERFACE_CODE_UNIQUE      
    }
  }, {
    tableName: 'log_code_interface_code',
    freezeTableName: true,
    underscored: true,
    timestamps: true
  })
}
