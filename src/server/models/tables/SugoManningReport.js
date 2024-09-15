/*
 * @Author: your name
 * @Date: 2020-06-22 10:22:41
 * @LastEditTime: 2020-06-29 18:20:36
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \sugo-analytics\src\server\models\tables\SugoManningReport.js
 */ 
import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoManningReport = sequelize.define('SugoManningReport',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      title: {
        type: dataTypes.STRING(100),
        comment:'视图报告标题'

      },
      name: {
        type: dataTypes.STRING(200),
        comment: '视图名称',
        defaultValue: 0
      },
      sortNumber:{
        type: dataTypes.INTEGER,
        comment: '排序数字',
        defaultValue: 0
      }
    },
    {
      tableName: 'sugo_manning_report',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      associate: function (models) {
      }
    }
  )
  return SugoManningReport
}
