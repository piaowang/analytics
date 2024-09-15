/**
 * 单图，看板 公共分享（发布）记录表
 */
import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoSharings = sequelize.define('SugoSharings',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      content_type: {
        type: dataTypes.INTEGER,
        defaultValue: 0,
        comment: '内容类别，详见 src/common/constants SharingTypeEnum'
      },
      content_id: {
        type: dataTypes.STRING(32),
        comment: '单图或看板的 id'
      },
      content_datasource_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_datasources',
          key: 'id'
        }
      },
      max_age: {
        type: dataTypes.STRING(32),
        defaultValue: 'P1D',
        comment: '分享有效期，null/"" 表示不设有效期'
      },
      deadline: {
        type: dataTypes.DATE,
        comment: '失效日期'
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {}
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      tags: {
        type: dataTypes.JSONB,
        defaultValue: []
      }
    },
    {
      tableName: 'sugo_sharings',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoSharings.belongsTo(models.SugoDatasources, {foreignKey: 'content_datasource_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return SugoSharings
}
