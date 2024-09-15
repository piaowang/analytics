import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoExamineConfig = sequelize.define('SugoExamineConfig',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(128),
        comment: '审核流程名称'
      },
      model_type: {
        type: dataTypes.INTEGER,
        comment: '审核流程类型'
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '审核流程状态: 0=待生效，1=失效，2=生效'
      },
      institution_id: {
        type: dataTypes.STRING(32),
        comment: '所属机构Id',
        references: {
          model: 'sugo_institutions',
          key: 'id'
        }
      },
      desc: {
        type: dataTypes.STRING,
        comment: '审核流程描述'
      },
      info: {
        type: dataTypes.JSONB,
        comment: '自定义审核流程信息'
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_examine_config',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoExamineConfig.belongsTo(models.SugoInstitutions, {foreignKey: 'institution_id'})
      }
    }
  )
  return SugoExamineConfig
}
