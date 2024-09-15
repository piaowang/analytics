import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoDashboardCategory = sequelize.define('SugoDashboardCategory', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    },
    title: {
      type: dataTypes.STRING(200)
    },
    order:{
      type: dataTypes.INTEGER
    },
    company_id: {
      type: dataTypes.STRING(32)
    },
    parent_id: {
      type: dataTypes.STRING(32)
    },
    type: {
      type: dataTypes.INTEGER
    },
    project_id: {
      type: dataTypes.STRING(32)
    },
    copy_from_project_id: {
      type: dataTypes.STRING(32)
    }
  }, {
    tableName: 'sugo_dashboard_category',
    timestamps: true,
    underscored: true
  })
  return SugoDashboardCategory
}
