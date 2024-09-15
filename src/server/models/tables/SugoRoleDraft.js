import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoRoleDraft = sequelize.define('SugoRoleDraft',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate,
        comment:'id'
      },
      name: {
        type: dataTypes.STRING(200),
        validate: {
          len: [1, 200],
          notEmpty: true
        },
        comment:'角色名称'
      },
      description: {
        type: dataTypes.STRING(500),
        comment:'描述'
      },
      status: {
        type: dataTypes.INTEGER,
        defaultValue: 1,
        comment:'状态'
      },
      type: {
        type: dataTypes.ENUM('built-in', 'user-created'),
        comment: '用户组类型，build-in用户组不可删除, 用户建立的用户组为user-created',
        defaultValue: 'user-created'
      },
      createdByFk: {
        type: dataTypes.STRING(32),
        comment:'创建人id'
      },
      changedByFk: {
        type: dataTypes.STRING(32),
        comment:'修改人id'
      },
      companyId: {
        type: dataTypes.STRING(32),
        comment:'企业id'
      },
      dataPermissions:{
        type: dataTypes.JSONB,
        defaultValue: {},
        comment:'数据权限'
      },
      funcPermissions:{
        type: dataTypes.JSONB,
        defaultValue: [],
        comment:'功能权限'
      },
      institutionsIds:{
        type: dataTypes.JSONB,
        comment:'所属机构'
      }
    },
    {
      tableName: 'sugo_role_draft',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoRoleDraft.belongsTo(models.SugoUser, {foreignKey: 'createdByFk',targetKey:'id',as:'created_user'})
        SugoRoleDraft.belongsTo(models.SugoUser, {foreignKey:'changedByFk',targetKey:'id',as:'change_user'})
        SugoRoleDraft.hasOne(models.SugoDataChecking, {foreignKey:'checkId',as:'check_detail',onDelete: 'cascade', hooks: true})
        SugoRoleDraft.hasMany(models.SugoUserRole, {foreignKey: 'role_id',as: 'userRole'})
        //SugoRoleDraft.belongsTo(models.SugoInstitutions, {foreignKey:'institutionsIds',as:'Sugo_institutions'})
        // SugoRoleDraft.hasMany(models.SugoUserRole, {foreignKey: 'role_id'})
        
        // SugoRoleDraft.hasMany(models.SugoRoleApp, {foreignKey: 'role_id'})
      }
    }
  )
  return SugoRoleDraft
}
