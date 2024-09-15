import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoGallery = sequelize.define('SugoGallery',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      parent_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_projects',
          key: 'id'
        }
      },
      name: {
        type: dataTypes.STRING(32)
      },
      // 冗余一个字段，减少查询次数
      company_id: {
        type: dataTypes.STRING,
        allowNull: true
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_gallery',
      freezeTableName: true,
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoGallery.belongsTo(models.SugoProjects, {foreignKey: 'parent_id'})
      }
    }
  )
  return SugoGallery
}
