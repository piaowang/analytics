/* jshint indent: 1 */


// import {TagTypeEnum} from '../../../common/constants'

export default (sequelize, DataTypes) => {
  return sequelize.define('SugoDimensionLayer', {
    id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      primaryKey: true
    },
    dimension_id: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    tags_name: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    created_by: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    updated_by: {
      type: DataTypes.STRING(32),
      allowNull: true
    }
  }, {
    tableName: 'sugo_dimension_layer',
    freezeTableName: true,
    underscored: true,
    timestamps: true
  })
}
