import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoDashboardCategoryMap = sequelize.define('SugoDashboardCategoryMap',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      category_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_dashboard_category',
          key: 'id'
        }
      },
      dashboard_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'dashboards',
          key: 'id'
        }
      },
      order:{
        type: dataTypes.INTEGER
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      copy_from_project_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_dashboard_category_map',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoDashboardCategoryMap.belongsTo(models.SugoDashboardCategory, {foreignKey: 'category_id', onDelete: 'cascade', hooks: true})
        SugoDashboardCategoryMap.belongsTo(models.Dashboards, {foreignKey: 'dashboard_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return SugoDashboardCategoryMap
}
