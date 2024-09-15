/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('SugoTagValueEnhance', {
    id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(32),
      allowNull: false
    },
    tag: {
      type: DataTypes.STRING(32),
      allowNull: false
    },
    tag_from: {
      type: DataTypes.STRING(32),
      allowNull: false
    },
    tag_to: {
      type: DataTypes.STRING(32),
      allowNull: false
    },
    topn: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    project_id: {
      type: DataTypes.STRING(32),
      allowNull: false
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
    tableName: 'sugo_tags_value_enhance',
    freezeTableName: true,
    underscored: true,
    timestamps: true
  })
}
