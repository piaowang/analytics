import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoBusinessDimension = sequelize.define('SugoBusinessDimension',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(50),
        comment: '名称'
      },
      alias: {
        type: dataTypes.STRING(50),
        comment: '别名'
      },
      create_mode: {
        type: dataTypes.INTEGER,
        comment: '创建方式'
      },
      type: {
        type: dataTypes.INTEGER,
        comment: '类型'
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '状态 1表示启用'
      },
      role_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_role',
          key: 'id'
        }
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
      tableName: 'sugo_business_dimension',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoBusinessDimension.hasMany(models.SugoBusinessDimensionRole, {foreignKey: 'business_dimension_id'})
      }
    }
  )
  return SugoBusinessDimension
}
