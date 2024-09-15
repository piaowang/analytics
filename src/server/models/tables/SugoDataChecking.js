import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoDataChecking = sequelize.define(
    'SugoDataChecking',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      checkId: {
        type: dataTypes.STRING(32),
        comment: '审核角色id'
      },
      userDraftId: {
        type: dataTypes.STRING(32),
        comment: '审核用户id'
      },
      institutionsDraftId: {
        type: dataTypes.STRING(32),
        comment: '审核机构id'
      },
      operationType: {
        defaultValue: 1,
        type: dataTypes.INTEGER,
        comment: '操作类型(1=新增，2=修改，3=删除)'
      },
      type: {
        defaultValue: 1,
        type: dataTypes.INTEGER,
        comment: '类别(1=用户，2=角色，3=机构)'
      },
      applyId: {
        type: dataTypes.STRING(32),
        comment: '申请人id'
      },
      status: {
        defaultValue: -1,
        type: dataTypes.INTEGER,
        comment: '审核类型(-1=待提交 0=待审核，1=审核通过 2=已驳回)'
      },
      comment:{
        type: dataTypes.STRING(100),
        comment: '审核备注'
      },
      acceptanceTime: {
        type: dataTypes.DATE,
        comment: '审核时间'
      },
      checkUserId: {
        type: dataTypes.STRING(32),
        comment: '审核人id'
      }
    },
    {
      tableName: 'sugo_data_checking',
      timestamps: true,
      underscored: true,
      associate: function(models) {
        SugoDataChecking.belongsTo(models.SugoUser, {
          foreignKey: 'applyId',
          as: 'apply_user'
        })
        SugoDataChecking.belongsTo(models.SugoUser, {
          foreignKey: 'checkUserId',
          as: 'check_user'
        })
        SugoDataChecking.belongsTo(models.SugoRoleDraft, {
          foreignKey: 'checkId',
          as: 'SugoRole'
        })
        SugoDataChecking.belongsTo(models.SugoInstitutionsDraft, {
          foreignKey: 'institutionsDraftId',
          as: 'SugoInstitutions'
        })
        SugoDataChecking.belongsTo(models.SugoUserDraft, {
          foreignKey: 'userDraftId',
          as: 'SugoUser',
          onDelete: 'cascade', hooks: true
        })
      }
    }
  )
  return SugoDataChecking
}
