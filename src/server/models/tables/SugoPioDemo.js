/*
 * @Author: xuxinjiang
 * @Date: 2020-07-06 21:09:14
 * @LastEditors: your name
 * @LastEditTime: 2020-07-06 21:17:18
 * @Description: demo表，以后会删除
 */ 

export default (sequelize, dataTypes) => {
  const SugoPioDemo = sequelize.define('SugoPioDemo', 
    {
      category: {
        type: dataTypes.STRING(32),
        defaultValue: '算法建模'
      },
      categoryCode: {
        type: dataTypes.STRING(50),
        defaultValue: 'algorithmModel'

      },
      description: {
        type: dataTypes.STRING(100),
        defaultValue: ''
      },
      fullName: {
        type: dataTypes.STRING(100),
        defaultValue: ''
      },
      group: {
        type: dataTypes.STRING(32),
        defaultValue: '分类算法'
      },
      groupCode: {
        type: dataTypes.STRING(32),
        defaultValue:'classification'
      },
      groupSequence: {
        type: dataTypes.STRING(32),
        defaultValue:0
      },
      name: {
        type: dataTypes.STRING(100),
        defaultValue:'classification'
      },
      sequence:{
        type: dataTypes.STRING(32),
        defaultValue:0
      }
    },
    {
      tableName: 'sugo_pio_demo',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
  )
  return SugoPioDemo
}
