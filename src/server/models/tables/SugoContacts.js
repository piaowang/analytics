/**
 * 通讯联系人表（暂时是监控告警在使用）
 */
import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoContacts = sequelize.define('SugoContacts',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      department_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_departments',
          key: 'id'
        }
      },
      name: {
        type: dataTypes.STRING(255)
      },
      email: {
        type: dataTypes.STRING(255)
      },
      phone: {
        type: dataTypes.STRING(32)
      },
      address: {
        type: dataTypes.STRING(255)
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      company_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_contacts',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoContacts.belongsTo(models.SugoDepartments, { foreignKey: 'department_id', onDelete: 'cascade', hooks: true })
      }
    }
  )
  return SugoContacts
}
