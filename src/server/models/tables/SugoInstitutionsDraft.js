import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoInstitutionsDraft = sequelize.define('SugoInstitutionsDraft',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      serial_number: {
        type: dataTypes.STRING(50),
        comment: '编号'
      },
      name: {
        type: dataTypes.STRING(50),
        comment: '名称'
      },
      parent: {
        type: dataTypes.STRING(50),
        comment: '上级机构'
      },
      level: {
        type: dataTypes.INTEGER,
        comment: '机构层级'
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '机构状态'
      },
      description: {
        type: dataTypes.STRING(32),
        comment: '描述'
      },
      created_by: {
        type: dataTypes.STRING(32),
        comment:'创建人'
      },
      updated_by: {
        type: dataTypes.STRING(32),
        comment:'修改人'
      },
      company_id: {
        type: dataTypes.STRING(32),
        comment:'企业id'
      }
    },
    {
      tableName: 'sugo_institutions_draft',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoInstitutionsDraft.hasMany(models.SugoDataChecking, {foreignKey: 'institutionsDraftId', targetKey: 'id'}),
        // SugoInstitutionsDraft.belongsTo(models.SugoInstitutions, {foreignKey: 'id'}),
        SugoInstitutionsDraft.hasMany(models.SugoInstitutionsRole, {foreignKey: 'institutions_id' }),
        SugoInstitutionsDraft.hasMany(models.SugoUser, {foreignKey: 'institutions_id'})
      }
    }
  )
  return SugoInstitutionsDraft
}
