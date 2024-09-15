import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoTagHqlImportFile = sequelize.define('SugoTagHqlImportFile', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    file_name: {
      type: dataTypes.STRING(50)
    },
    file_path: {
      type: dataTypes.STRING(50)
    },
    file_memo: {
      type: dataTypes.STRING(500)
    },
    state: {
      type: dataTypes.INTEGER
    },
    file_size: {
      type: dataTypes.INTEGER
    },
    line_count: {
      type: dataTypes.INTEGER
    },
    column_count: {
      type: dataTypes.INTEGER
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    },
    project_id: {
      type: dataTypes.STRING(50)
    },
    company_id: {
      type: dataTypes.STRING(32)
    }
  }, {
    tableName: 'sugo_tag_hql_import_file',
    timestamps: true,
    underscored: true
  })
  return SugoTagHqlImportFile
}
