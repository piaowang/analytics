import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoOfflineCalcImportTables = sequelize.define('SugoOfflineCalcImportTables',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate,
        comment: '唯一标识'
      },
      datasource_id: {
        type: dataTypes.STRING(32),
        comment: '数据源id',
        allowNull: false
      },
      table_name: {
        type: dataTypes.STRING(128),
        comment: '表名',
        allowNull: false
      },
      dimension_type: {
        type: dataTypes.JSON,
        comment: '数据类型',
        allowNull: false
      },
      created_by: {
        type: dataTypes.STRING(32),
        allowNull: false
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_offline_calc_import_tables',
      timestamps: true,
      underscored: true
    }
  )
  return SugoOfflineCalcImportTables
}
