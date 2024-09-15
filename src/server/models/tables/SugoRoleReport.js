/*
 * @Author: xuxinjiang
 * @Date: 2020-06-23 13:37:17
 * @LastEditTime: 2020-07-02 15:33:04
 * @LastEditors: your name
 * @Description: In User Settings Edit
 * @FilePath: \sugo-analytics\src\server\models\tables\SugoRoleReport.js
 */ 
import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoRoleReport = sequelize.define('SugoRoleReport',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      roleId: {
        type: dataTypes.STRING(100),
        validate: {
          notEmpty: true
        },
        comment:'角色id'
      },
      reportId:{
        type: dataTypes.JSONB,
        defaultValue:[],
        comment:'视图报告id'
      },
      defaultReportId:{
        type: dataTypes.STRING(100),
        comment:'默认显示报告id',
        defaultValue: ''
      }
    },
    {
      tableName: 'sugo_role_report',
      timestamps: true,
      underscored: true,
      associate: function (models) {

      }
    }
  )
  return SugoRoleReport
}
