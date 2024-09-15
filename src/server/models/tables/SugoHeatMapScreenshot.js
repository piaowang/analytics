import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const HeatmapScreenshot = sequelize.define('HeatmapScreenshot',
    {
      id: {
        type: dataTypes.STRING(50),
        primaryKey: true,
        defaultValue: generate
      },
      screenshot: {
        type: dataTypes.BLOB
      }
    },
    {
      tableName: 'sugo_heatmap_screenshot',
      timestamps: false,
      underscored: true
    }
  )
  return HeatmapScreenshot
}
