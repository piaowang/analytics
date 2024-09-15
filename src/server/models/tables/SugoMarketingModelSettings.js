import {generate} from 'shortid'

/**
 * 营销智能中台模型设置表
 */
export default (sequelize, dataTypes) => {
  const sugoMarktingModelSettings = sequelize.define('SugoMarktingModelSettings',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      type: {
        type: dataTypes.INTEGER,
        comment: '0=RFM模型，1=生命周期模型，2=价值分层模型'
      },
      projectId: {
        //field: 'project_id',
        type: dataTypes.STRING(32),
        comment: '项目ID'
      },
      datasets: {
        type: dataTypes.JSON,
        defaultValue: {
          tindex: [],
          uindex: []
        },
        comment: '模型数据集设置'
      },
      dimensions: {
        type: dataTypes.JSON,
        defaultValue: {},
        comment: '模型维度映射配置'
      },
      params: {
        type: dataTypes.JSON,
        defaultValue: {},
        comment: '模型参数'
      },
      timers: {
        type: dataTypes.JSON,
        defaultValue: {},
        comment: '模型计算调度配置信息'
      },
      result: {
        type: dataTypes.JSON,
        defaultValue: {},
        comment: '模型计算结果'
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '0=未开始,1=计算中,2=计算完成，3=计算失败'
      },
      createdBy: {
        type: dataTypes.STRING(32)
      },
      updatedBy: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_marketing_model_settings',
      timestamps: true,
      underscored: true
    }
  )
  return sugoMarktingModelSettings
}
