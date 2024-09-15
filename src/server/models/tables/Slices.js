import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const slices = sequelize.define('Slices',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      slice_name: {
        type: dataTypes.STRING(255)
      },
      druid_datasource_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_datasources',
          key: 'id'
        }
      },
      child_project_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_child_projects',
          key: 'id'
        }
      },
      datasource_name: {
        type: dataTypes.STRING(50)
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {}
      },
      created_by: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_user',
          key: 'id'
        }
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      description: {
        type: dataTypes.STRING(500)
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      tags: {
        type: dataTypes.JSONB,
        defaultValue: []
      },
      notes: {
        type: dataTypes.STRING(255)
      },
      author: {
        type: dataTypes.STRING(50)
      },
      copy_from_project_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'slices',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        slices.belongsTo(models.SugoUser, {foreignKey: 'created_by'})
        slices.belongsTo(models.SugoDatasources, {foreignKey: 'druid_datasource_id'})
        slices.hasMany(models.DashboardSlices, {foreignKey: 'slice_id'})
        slices.belongsTo(models.SugoChildProjects, {foreignKey: 'child_project_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return slices
}
