import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoOfflineCalcTables = sequelize.define('SugoOfflineCalcTables',
    {
      id: {
        type: dataTypes.STRING(128),
        primaryKey: true,
        defaultValue: generate,
        comment: '唯一标识'
      },
      data_source_id: {
        type: dataTypes.STRING(32),
        comment: '所属数据源ID',
        references: {
          model: 'sugo_offline_calc_datasources',
          key: 'id'
        }
      },
      name: {
        type: dataTypes.STRING(128),
        comment: '维表英文名',
        allowNull: false
      },
      title: {
        type: dataTypes.STRING(32),
        comment: '维表别名',
        allowNull: true
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {},
        comment: '额外参数',
        allowNull: false
      },
      tags: {
        type: dataTypes.JSONB,
        defaultValue: [],
        comment: '分类信息',
        allowNull: false
      },
      supervisor_id: {
        type: dataTypes.STRING(32),
        comment: '负责人',
        allowNull: true,
        references: {
          model: 'sugo_user',
          key: 'id'
        }
      },
      description: {
        type: dataTypes.STRING,
        comment: '业务口径'
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
      tableName: 'sugo_offline_calc_tables',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoOfflineCalcTables.belongsTo(models.SugoOfflineCalcDataSources, {foreignKey: 'data_source_id'})
      }
    }
  )
  return SugoOfflineCalcTables
}
