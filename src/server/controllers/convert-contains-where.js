import { fn, col } from 'sequelize'
import Config from '../config'
import _ from 'lodash'

export const convertContainsByDBType = function (key, value) {
  const dialect = _.get(Config, 'db.dialect', 'postgress')
  if (dialect === 'mysql') {
    return fn('JSON_CONTAINS', col(key), JSON.stringify(value))
  }
  return { [key]: { $contains: value } }
}