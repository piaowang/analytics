import Sequelize from 'sequelize'
import _ from 'lodash'

export async function rawSQLQueryForMysql(sql, binds, hostAndPort, database, user, password) {
  let [host, port] = hostAndPort.split(':')
  let sequelize = new Sequelize(database, user, password, {
    host,
    port: (+port || 3306),
    dialect: 'mysql',
    logging: console.log
  })
  
  let res = await sequelize.query(sql, { replacements: binds, type: sequelize.QueryTypes.SELECT })
  return res
}
