import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const sugoPivotMarks = sequelize.define('SugoPivotMarks', 
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(50)
      },
      queryParams: {
        type: dataTypes.JSONB,
        defaultValue: {}
      },
      user_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_pivot_marks',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
  )
  return sugoPivotMarks
}
