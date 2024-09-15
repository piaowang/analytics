
import { generate } from 'shortid'
export default(sequelize, dataTypes) => {
  const BusinessLineManagement = sequelize.define('BusinessLineManagement', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    
    name: {
      type: dataTypes.STRING(50)
    },

    created_by: {
      type: dataTypes.STRING(32),
      allowNull: true
    },
    updated_by: {
      type: dataTypes.STRING(32),
      allowNull: true
    },
    company_id: {
      type: dataTypes.STRING(32)
    },
    describe: {
      type: dataTypes.STRING(500)
    }
  }, {
    tableName: 'sugo_business_lines',
    timestamps: true,
    underscored: true
  })

  return BusinessLineManagement

}
