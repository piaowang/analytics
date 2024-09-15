import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoMeasures = sequelize.define('SugoMeasures',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      parentId: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_datasources',
          key: 'id'
        }
      },
      name: {
        type: dataTypes.STRING(50),
        validate: {
          is: /^[_A-Za-z][\w]{1,49}$/i // 可用字母、数字、下划线，但必须以字母或下划线开头，长度为2至50位
        }
      },
      title: {
        type: dataTypes.STRING(50)
      },
      type: {
        type: dataTypes.INTEGER,
        comment: '数据类型0=long,1=float,2=double,3=string,4=datestring',
        defaultValue: 0
      },

      aggregate: {
        type: dataTypes.STRING(1),
        comment: '聚合类型：0=sum,1=max,2=min,3=avg'
      },
      formula: {
        type: dataTypes.TEXT,
        comment: '自定义表达式'
      },
      user_ids: {
        type: dataTypes.JSONB,
        defaultValue: []
      },
      role_ids: {
        type: dataTypes.JSONB,
        defaultValue: []
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      pattern: {
        type: dataTypes.STRING(32)
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {}
      },
      tags: {
        type: dataTypes.JSONB,
        defaultValue: []
      }
    },
    {
      tableName: 'sugo_measures',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      associate: function (models) {
        SugoMeasures.belongsTo(models.SugoDatasources, { foreignKey: 'parentId', targetKey: 'id'})
      }
    }
  )
  return SugoMeasures
}
