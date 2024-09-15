import { generate } from 'shortid'
import { RFMState } from '../../../common/constants'

export default (sequelize, dataTypes) => {
  const SugoRFM = sequelize.define('SugoRFM',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      project_id: {
        type: dataTypes.STRING(32)
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      name: {
        type: dataTypes.STRING(32)
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {}
      },
      state: {
        type: dataTypes.INTEGER,
        defaultValue: RFMState.Normal
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_rfm',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoRFM.belongsTo(models.SugoProjects, { foreignKey: 'project_id' })
      }
    }
  )
  return SugoRFM
}
