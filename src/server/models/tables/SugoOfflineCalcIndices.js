import {generate} from 'shortid'
import moment from 'moment'
import {genIndicesId} from '../../services/sugo-offline-calc-indices.service'

export default (sequelize, dataTypes) => {
  const SugoOfflineCalcIndices = sequelize.define('SugoOfflineCalcIndices',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: genIndicesId, // 实际生成规则参看 OfflineCalc/indices-edit.jsx 里的 genIndicesId
        comment: '唯一标识'
      },
      belongs_id: {
        type: dataTypes.STRING(32),
        comment: '归属哪个公有版本'
      },
      data_source_id: {
        type: dataTypes.STRING(32),
        comment: '所属数据源ID，如果是复合指标则可以不属于某个数据源',
        allowNull: true,
        references: {
          model: 'sugo_offline_calc_datasources',
          key: 'id'
        }
      },
      name: {
        type: dataTypes.STRING(64),
        comment: '指标英文名',
        allowNull: false
      },
      title: {
        type: dataTypes.STRING(32),
        comment: '指标别名',
        allowNull: true
      },
      formula_info: {
        type: dataTypes.JSONB,
        defaultValue: {},
        comment: '指标公式的信息，包括抽象语法树和依赖',
        allowNull: false
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {},
        comment: '额外设置，例如格式、有效期和间接关系',
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

      start_time: {
        type: dataTypes.DATE,
        allowNull: false,
        comment: '启用时间',
        defaultValue: moment(1000).toDate()
      },

      end_time: {
        type: dataTypes.DATE,
        allowNull: false,
        comment: '禁用时间',
        defaultValue: moment(3000).toDate()
      },

      statistical_type: {
        type: dataTypes.INTEGER,
        allowNull: false,
        comment: '统计类型',
        defaultValue: 0
      },

      is_summary: {
        type: dataTypes.INTEGER,
        allowNull: false,
        comment: '是否汇总(1=是,0=否)',
        defaultValue: 0
      },

      generation_cycle: {
        type: dataTypes.INTEGER,
        allowNull: false,
        comment: '生成周期',
        defaultValue: 0
      },

      data_format: {
        type: dataTypes.INTEGER,
        allowNull: false,
        comment: '数据格式',
        defaultValue: 0
      },

      // data_unit: {
      //   type: dataTypes.INTEGER,
      //   allowNull: false,
      //   comment: '数据单位'
      // },

      is_landing: {
        type: dataTypes.INTEGER,
        allowNull: false,
        comment: '是否落地(1=是,0=否)',
        defaultValue: 0
      },

      is_publish: {
        type: dataTypes.INTEGER,
        allowNull: false,
        comment: '是否发布(1=是,0=否)',
        defaultValue: 0
      },

      business_line: {
        type: dataTypes.STRING(32),
        allowNull: false,
        comment: '业务线条',
        defaultValue: ''
      },

      business_definition: {
        type: dataTypes.STRING,
        allowNull: true,
        comment: '业务定义'
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
      tableName: 'sugo_offline_calc_indices',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoOfflineCalcIndices.belongsTo(models.SugoOfflineCalcDataSources, {foreignKey: 'data_source_id'})
      }
    }
  )
  return SugoOfflineCalcIndices
}
