import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoExamine = sequelize.define('SugoExamine',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      model_type: {
        type: dataTypes.INTEGER,
        comment: '审核模块类型'
      },
      model_id: {
        type: dataTypes.STRING(32),
        comment: '审核编号'
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '当前审核状态(冗余): 0: 取消审核 1: 正在等待审核， 2: 审核已经通过， 3: 审核没有通过',
        defaultValue: 1
      },
      examine_user: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_user',
          key: 'id'
        },
        comment: '当前审核人(冗余)'
      },
      examine_step: {
        type: dataTypes.INTEGER,
        comment: '当前审核步骤(冗余)'
      },
      examine_info: {
        type: dataTypes.JSON,
        comment: '审核信息'
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
      config_id: {
        type: dataTypes.STRING(50),
        comment: '关联的审核配置id'
      }
    },
    {
      tableName: 'sugo_examine',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoExamine.belongsTo(models.SugoUser, {foreignKey: 'examine_user'})
      }
    }
  )
  return SugoExamine
}
