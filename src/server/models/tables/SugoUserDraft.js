
import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoUserDraft = sequelize.define('SugoUserDraft',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate,
        comment:'主键'
      },
      first_name: {
        type: dataTypes.STRING(200),
        validate: {
          len: [1, 200]
        },
        comment:'姓'
      },
      last_name: {
        type: dataTypes.STRING(200),
        comment:'名'
      },  
      username: {
        type: dataTypes.STRING(100),
        comment:'用户名'
      },
      cellphone: {
        type: dataTypes.STRING(24),
        validate: {
          is: /^1[0-9]{10}$/
        },
        comment:'联系电话'
      },
      password: {
        type: dataTypes.STRING(100),
        validate: {
          len: [1, 100]
        },
        comment:'密码'
      },
      active: {
        type: dataTypes.BOOLEAN,
        defaultValue: true,
        comment:'启用标识'
      },
      status: {
        type: dataTypes.INTEGER,
        defaultValue: 1,
        comment:'状态'
      },

      efficacy_at: {
        type: dataTypes.DATE,
        comment: '有效时间',
        allowNull: true
      },

      loss_efficacy_at: {
        type: dataTypes.DATE,
        comment: '失效时间',
        allowNull: true
      },

      type: {
        type: dataTypes.ENUM('built-in', 'user-created'),
        comment: '用户类型，build-in用户组不可删除, 用户建立的用户组为user-created',
        defaultValue: 'user-created'
      },
      email: {
        type: dataTypes.STRING(200),
        validate: {
          isEmail: true
        },
        comment:'电子邮箱'
      },
      created_by_fk: {
        type: dataTypes.STRING(32),
        comment:'创建人'
      },
      changed_by_fk: {
        type: dataTypes.STRING(32),
        comment:'修改人'
      },
      reset_password: {
        type: dataTypes.STRING(32),
        comment: 'reset_password表id， 为空则无需重置密码',
        defaultValue: ''
      },
      email_validate: {
        type: dataTypes.STRING(32),
        comment: 'email_validate表id， 为空则已经验证邮件',
        defaultValue: ''
      },
      departments: {
        type: dataTypes.JSONB,
        defaultValue: [],
        comment: '用户所属部门'
      },
      institutions_id: {
        type: dataTypes.STRING(32),
        comment:'机构ID'
      },
      company_id: {
        type: dataTypes.STRING(32),
        comment:'企业ID'
      },
      roles:{
        type: dataTypes.JSONB,
        comment:'关联角色信息'
      }
    },
    {
      tableName: 'sugo_user_draft',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoUserDraft.hasMany(models.SugoDataChecking, {foreignKey: 'user_draft_id', targetKey: 'id',onDelete: 'cascade'})
        // SugoUserDraft.hasMany(models.SugoDataChecking, {foreignKey: 'check_id', targetKey: 'id'})
      }
    }
  )
  return SugoUserDraft
}
