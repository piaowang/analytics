import {generate} from 'shortid'

//** 经传-算法推荐结果表 */
export default (sequelize, dataTypes) => {
  const sugoRecommendResult = sequelize.define('SugoRecommendResult',
    {
      uid: {
        type: dataTypes.STRING(255),
        primaryKey: true,
        comment: '用户ID'
      },
      pids: {
        type: dataTypes.STRING(255),
        comment: '推荐记录ID列表（逗号分隔)'
      },
      createdAt: {
        type: dataTypes.DATE,
        comment: '创建时间'
      },
      updatedAt: {
        type: dataTypes.DATE,
        comment: '修改时间'
      }
    },
    {
      tableName: 'sugo_recommend_result',
      timestamps: false,
      underscored: true
    }
  )
  return sugoRecommendResult
}
