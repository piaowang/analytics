import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const pioProject = sequelize.define('PioProject',
    {
      id: {
        type: dataTypes.STRING(100),
        primaryKey: true,
      },
      name: {
        type: dataTypes.STRING
      },
      connections: {
        type: dataTypes.JSON,
        defaultValue: []
      },
      rootOperator: {
        type: dataTypes.JSON,
        defaultValue: {}
      },
      description: {
        type: dataTypes.STRING(500)
      },
      dimension: {
        type: dataTypes.JSON,
        defaultValue: []
      },
      result: {
        type: dataTypes.JSON,
        defaultValue: []
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      status: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_pio_project',
      timestamps: true,
      underscored: true
    }
  )
  return pioProject
}
