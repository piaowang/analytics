/**
 * 创建了 lookup 的临时分群记录表，数据格式跟分群大致相同，需要隔一段时间后删除 lookup 并删除记录
 */
import sid from '../safe-id'

export default (sequelize, dataTypes) => {
  const TempLookups = sequelize.define('TempLookups',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: sid
      },
      title: {
        type: dataTypes.STRING(200)
      },
      druid_datasource_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_datasources',
          key: 'id'
        }
      },
      datasource_name: {
        type: dataTypes.STRING(200)
      },
      params: { // 创建分群的条件
        type: dataTypes.JSONB,
        defaultValue: {}
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
      tableName: 'temp_lookups',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        TempLookups.belongsTo(models.SugoDatasources, { foreignKey: 'druid_datasource_id' })
      }
    }
  )
  return TempLookups
}
