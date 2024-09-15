import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoLivescreenCategory = sequelize.define('SugoLivescreenCategory', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    },
    title: {
      type: dataTypes.STRING(200)
    },
    order:{
      type: dataTypes.INTEGER
    },
    company_id: {
      type: dataTypes.STRING(32)
    }
  }, {
    tableName: 'sugo_livescreen_category',
    timestamps: true,
    underscored: true
  })
  return SugoLivescreenCategory
}
