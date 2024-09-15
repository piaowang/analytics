import sid from '../safe-id'

export default (sequelize, dataTypes) => {
  const SegmentExpand = sequelize.define('SegmentExpand', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: sid
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
    message: {
      type: dataTypes.STRING(500),
      defaultValue: ''
    },
    datasource_id: {
      type: dataTypes.STRING(32),
      references: {
        model: 'sugo_datasources',
        key: 'id'
      }
    },
    count: {
      type: dataTypes.DOUBLE
    },
    usergroup_id: {
      type: dataTypes.STRING(32)
    },
    status: {
      type: dataTypes.INTEGER,
      comment: '状态 0:未计算， 1:计算中, 2:计算完成, 3: 计算失败'
    },
    params: {
      type: dataTypes.JSONB,
      defaultValue: {}
    },
    description: {
      type: dataTypes.STRING(500)
    },
    company_id: {
      type: dataTypes.STRING(32)
    }
  }, {
    tableName: 'segment_expand',
    timestamps: true,
    underscored: true,
    associate (models) {
      SegmentExpand.belongsTo(
        models.SugoDatasources,
        { foreignKey: 'datasource_id' }
      )
    }
  })
  return SegmentExpand
}
