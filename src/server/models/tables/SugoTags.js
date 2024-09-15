/* jshint indent: 1 */


// import {TagTypeEnum} from '../../../common/constants'

export default (sequelize, DataTypes) => {
  return sequelize.define('SugoTags', {
    id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      primaryKey: true
    },
    parent_id: {
      type: DataTypes.STRING(32)
    },
    name: {
      type: DataTypes.STRING(32),
      validate: {
        is: /^\s*(\S+)\s*$/ // 不能包含空格
      }
    },
    type: {
      // 注意跟 TagTypeEnum 同步
      // https://github.com/sequelize/sequelize/blob/v4.43.0/lib/query-interface.js#L226
      // 因为 postgres 这里的逻辑比较奇怪，同时添加两个枚举的话，会生成 sql:
      // ALTER TYPE enum_sugo_tags_type ADD VALUE 'A' BEFORE 'B';
      // 但由于 B 未创建，导致语句报错，所以只能穿插地添加枚举（同时添加多个枚举时）
      type: DataTypes.ENUM,
      values: [
        'offline_calc_dimension',
        'dimension',
        'dimension_layer',
        'offline_calc_index',
        'measure',
        'offline_calc_model',
        'track_event',
        'user_group',
        'sugo_data_apis',
        'slices',
        'portals',
        'publish'
        //sequelize往这加枚举 启动服务时自动添加
        //mysql不会自动添加
      ],
      allowNull: false
    },
    project_id: {
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
    tableName: 'sugo_tags',
    freezeTableName: true,
    underscored: true,
    timestamps: true
  })
}
