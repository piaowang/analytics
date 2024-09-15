import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoOfflineCalcDimensions = sequelize.define('SugoOfflineCalcDimensions',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate,
        comment: '唯一标识'
      },
      belongs_id: {
        type: dataTypes.STRING(32),
        comment: '归属哪个公有版本'
      },
      data_source_id: {
        type: dataTypes.STRING(32),
        comment: '所属数据源ID，如果是衍生维度则可以不属于某个数据源',
        allowNull: true,
        references: {
          model: 'sugo_offline_calc_datasources',
          key: 'id'
        }
      },
      name: {
        type: dataTypes.STRING(32),
        comment: '维度英文名',
        allowNull: false
      },
      title: {
        type: dataTypes.STRING(32),
        comment: '维度别名',
        allowNull: true
      },
      type: {
        type: dataTypes.INTEGER,
        comment: '维度数据类型', // 跟 DruidColumnType 使用同样的枚举
        defaultValue: 0,
        allowNull: false
      },
      formula_info: {
        type: dataTypes.JSONB,
        defaultValue: {},
        comment: '衍生维公式信息，包括抽象语法树和依赖',
        allowNull: false
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {},
        comment: '额外参数，记录了格式化、间接关系维度等信息',
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
      tableName: 'sugo_offline_calc_dimensions',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoOfflineCalcDimensions.belongsTo(models.SugoOfflineCalcDataSources, {foreignKey: 'data_source_id'})
      }
    }
  )
  return SugoOfflineCalcDimensions
}
