import sid from '../safe-id'

export default (sequelize, dataTypes) => {
  const Segment = sequelize.define('SegmentVersion', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: sid
    },
    segment_id: {
      type: dataTypes.STRING(32)
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
    params: {
      type: dataTypes.JSONB,
      defaultValue: {}
    },
    tags: {
      type: dataTypes.JSONB,
      defaultValue: []
    },
    description: {
      type: dataTypes.STRING(500)
    },
    company_id: {
      type: dataTypes.STRING(32)
    },
    compute_time: {
      type: dataTypes.DATE
    }
  }, {
    tableName: 'segment_version',
    timestamps: true,
    underscored: true,
    associate (models) {
      Segment.belongsTo(models.Segment, {
        foreignKey: 'segment_id'
      })
    }
  })
  return Segment
}
