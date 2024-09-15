/**
 * 表名  ： sugo_company
 * 实例名： SugoCompany
 * @description 用户表
 */

/**
 * @typedef {Object} CompanyModel
 * @property {string} id
 * @property {string} name
 * @property {boolean} active
 * @property {string} type
 * @property {boolean} is_root
 * @property {string} email
 * @property {string} cellphone
 * @property {string} created_by
 * @property {string} updated_by
 * @property {boolean} deleted
 */

import sid from '../safe-id'
export default (sequelize, dataTypes) => {
  const SugoCompany = sequelize.define('SugoCompany',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: sid
      },
      name: {
        type: dataTypes.STRING(200)
      },
      description: {
        type: dataTypes.STRING(500),
        defaultValue: ''
      },
      active: {
        type: dataTypes.BOOLEAN,
        defaultValue: true
      },
      type: {
        type: dataTypes.ENUM('trial', 'payed'),
        comment: '用户类型，trial试用用户, payed付款用户',
        defaultValue: 'trial'
      },
      is_root: {
        type: dataTypes.BOOLEAN,
        defaultValue: false
      },
      email: {
        type: dataTypes.STRING(50),
        validate: {
          isEmail: true
        }
      },
      cellphone: {
        type: dataTypes.STRING(50)
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      deleted: {
        type: dataTypes.BOOLEAN,
        defaultValue: false
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_company',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
  )
  return SugoCompany
}
