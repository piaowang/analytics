/**
 * 数据开发中心里面，数据建模中用到的模型表
 */
import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoDataDevVisualModels = sequelize.define('SugoDataDevVisualModels',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate,
        comment: '唯一标识'
      },
      type_id: {
        type: dataTypes.STRING(32),
        comment: '归属哪个数据目录分类（catalogTypes）',
        allowNull: false
      },
      name: {
        type: dataTypes.STRING(64),
        comment: '模型英文名',
        allowNull: false
      },
      title: {
        type: dataTypes.STRING(32),
        comment: '模型别名',
        allowNull: true
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {},
        comment: '额外设置',
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
      },
      company_id: {
        type: dataTypes.STRING(32),
        allowNull: false,
        references: {
          model: 'sugo_company',
          key: 'id'
        }
      }
    },
    {
      tableName: 'sugo_data_dev_visual_models',
      timestamps: true,
      underscored: true,
      associate: function (models) {
      }
    }
  )
  return SugoDataDevVisualModels
}
