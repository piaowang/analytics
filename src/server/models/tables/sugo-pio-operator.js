import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const pioOperator = sequelize.define('PioOperator',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      processId: {
        type: dataTypes.STRING(50)
      },
      type: {
        type: dataTypes.STRING(50)
      },
      xPos: {
        type: dataTypes.FLOAT,
        defaultValue: 0
      },
      yPos: {
        type: dataTypes.FLOAT,
        defaultValue: 0
      },
      name: {
        type: dataTypes.STRING(50)
      },
      fullName: {
        type: dataTypes.STRING(50)
      },
      group: {
        type: dataTypes.STRING(50)
      },
      parameterTypes: {
        type: dataTypes.JSON,
        defaultValue: []
      },
      inputPorts: {
        type: dataTypes.JSON,
        defaultValue: {}
      },
      outputPorts: {
        type: dataTypes.JSON,
        defaultValue: {}
      },
      parameters: {
        type: dataTypes.JSON,
        defaultValue: {}
      },
      operatorType: {
        type: dataTypes.STRING(32)
      },
      description: {
        type: dataTypes.STRING(500)
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
      tableName: 'sugo_pio_operator',
      timestamps: true,
      underscored: true
    }
  )
  return pioOperator
}
