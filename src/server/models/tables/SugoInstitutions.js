import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const sugoInstitutions = sequelize.define('SugoInstitutions',
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
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      suggestion: { 
        type: dataTypes.STRING(500)
      },
      check_status: {
        type: dataTypes.INTEGER,
        comment: '审核状态： 0 待审核 1 通过 2 驳回'
      }
    },
    {
      tableName: 'sugo_institutions',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        sugoInstitutions.belongsToMany(models.SugoInstitutionsRole, {through: models.SugoInstitutionsRole, foreignKey: 'institutions_id', uniqueKey: 'sugo_institutions_institutions_id_unique' })
        sugoInstitutions.hasMany(models.SugoInstitutionsRole, {foreignKey: 'institutions_id' })
        sugoInstitutions.hasMany(models.SugoUser, {foreignKey: 'institutions_id'})
      }
    }
  )
  return sugoInstitutions
}
