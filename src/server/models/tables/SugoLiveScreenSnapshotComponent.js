import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoLiveScreenSnapshotComponent = sequelize.define('SugoLiveScreenSnapshotComponent',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      screen_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_livescreen_snapshot',
          key: 'id'
        }
      },
      viz_type: {
        type:  dataTypes.STRING,
        comment: '图表类型',
        defaultValue: 'table'
      },
      style_config: {
        type: dataTypes.JSONB,
        comment: '组件的样式配置',
        defaultValue: {}
      },
      data_source_config: {
        type: dataTypes.JSONB,
        comment: '组件的数据源配置',
        defaultValue: {}  // { dataSourceId, filter, dimensions, metrics ... }
      },
      left: {
        type: dataTypes.INTEGER,
        defaultValue: 0
      },
      top: {
        type: dataTypes.INTEGER,
        defaultValue: 0
      },
      width: {
        type: dataTypes.INTEGER,
        defaultValue: 400
      },
      height: {
        type: dataTypes.INTEGER,
        defaultValue: 200
      },
      z_index: {
        type: dataTypes.INTEGER,
        defaultValue: 2
      },
      offset: {
        type: dataTypes.INTEGER
      }
    },
    {
      tableName: 'sugo_livescreen_snapshot_component',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoLiveScreenSnapshotComponent.belongsTo(models.SugoLiveScreenSnapshot, {foreignKey: 'screen_id'})
      }
    }
  )
  return SugoLiveScreenSnapshotComponent
}
