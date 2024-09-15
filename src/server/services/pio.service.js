import fetch from '../utils/fetch-kit'
import conf from '../config'
const { pioUrl } = conf

//获取算子列表
const getOperators = id => {
  return fetch.get(`${pioUrl}/pio/operator`)
}

//获取算子信息
const getOperatorInfo = (processId, operatorId) => {
  // return {
  //       "operatorType" : "db_data_reader",
  //       "name" : "operator_db_reader",
  //       "xPos" : 0,
  //       "yPos" : 0,
  //       "parameters" : {
  //         "keyToValueMap" : {
  //           "database_url" : "jdbc:postgresql://192.168.0.210:5432/druid_perform",
  //           "username" : "postgres",
  //           "password" : "123456",
  //           "query" : "SELECT * from bank_sample"
  //         },
  //         "parameterTypes" : [ {
  //           "paramType" : "param_type_string",
  //           "key" : "database_url",
  //           "description" : "The URL connection string for the database, e.g. 'jdbc:mysql://foo.bar:portnr/database'",
  //           "isHidden" : false,
  //           "isOptional" : false,
  //           "defaultValue" : null
  //         }, {
  //           "paramType" : "param_type_string",
  //           "key" : "username",
  //           "description" : "The database username.",
  //           "isHidden" : false,
  //           "isOptional" : false,
  //           "defaultValue" : null
  //         }, {
  //           "paramType" : "param_type_password",
  //           "key" : "password",
  //           "description" : "The password for the database.",
  //           "isHidden" : false,
  //           "isOptional" : true,
  //           "defaultValue" : null
  //         }, {
  //           "paramType" : "param_type_sql_query",
  //           "key" : "query",
  //           "description" : "An SQL query.",
  //           "isHidden" : false,
  //           "isOptional" : true
  //         } ]
  //       },
  //       "status" : "QUEUE",
  //       "inputPorts" : {
  //         "portList" : [ ]
  //       },
  //       "outputPorts" : {
  //         "portList" : [ {
  //           "outputType" : "default",
  //           "name" : "output"
  //         } ]
  //       },
  //       "description" : "DatabaseDataReader",
  //       "fullName" : "DatabaseDataReader",
  //       "group" : "source"
  //     }
  //todo: use real one
  return fetch.get(`${pioUrl}/pio/operator/${processId}/${operatorId}`)
}

/*
2.创建项目
POST: http://192.168.0.110:8080/pio/process
{
  "name":"test-process",
  "description":"测试process"
}
*/
const createProcess = (data, companyId) => {
  // return {
  //   "id" : "cf625f3f-b862-4e69-994a-ab75f23fceba",
  //   "name" : "testProcess",
  //   "description" : "testProcess desc",
  //   "status" : "QUEUE",
  //   "createTime" : "2017-01-22T15:09:59.809+08:00",
  //   "updateTime" : "2017-01-22T15:09:59.809+08:00",
  //   "connections" : [],
  //   "rootOperator" : {
  //     "operatorType" : "root_operator",
  //     "execUnits" : []
  //   }
  // }
  //todo: use real data
  return fetch.post(`${pioUrl}/pio/process/${companyId}`, data)
}

/*
14.修改项目中特定算子
POST：http://192.168.0.110:8080/pio/operator/update/{processId}/{operatorId}
{
  "fullName":"新的名字",
  "xPos":100,
  "yPos":200
}
*/
const updateOperatorInfo = (processId, operatorId, data) => {
  return fetch.post(`${pioUrl}/pio/operator/update/${processId}/${operatorId}`, data)
}

/*
3.修改项目：
PUT: http://192.168.0.110:8080/pio/process 
{
  "name":"test-process",
  "description":"测试process"
}
*/
const updateProcess = (id, data) => {
  return fetch.put(`${pioUrl}/pio/process/${id}`, data)
}

/*
4.获取所有项目
GET: http://192.168.0.110:8080/pio/process
*/
const getProcesses = companyId => {
  return fetch.get(`${pioUrl}/pio/process/list/${companyId}`)
}

/*
6.获取单个项目信息
GET: http://192.168.0.110:8080/pio/process/{processId}
*/
const getProcess = id => {
  return fetch.get(`${pioUrl}/pio/process/${id}`)
}

/*
5.删除项目
DELETE: http://192.168.0.110:8080/pio/process/{processId}
*/
const delProcesses = id => {
  return fetch.delete(`${pioUrl}/pio/process/${id}`)
}

/*
7.添加算子到项目
POST: http://192.168.0.110:8080/pio/operator/{processId}
{
  "processId":"a3a8b9eb-dbfd-4b0d-b235-231410ae4e29",
  "operatorType":"csv_reader",
  "xPos":10,
  "yPos":20
}

return
{"result":{"id":"ccf0337c-1dcb-4fa9-864d-31ac277da04b","name":"test-process-BkxGiGmPx","description":null,"status":"INIT","createTime":"2017-01-23T13:57:04.406+08:00","updateTime":"2017-01-23T13:57:24.074+08:00","connections":[],"rootOperator":{"operatorType":"root_operator","parameters":{"keyToValueMap":{},"parameterTypes":[{"paramType":"param_type_int","key":"random_seed","description":"Global random seed for random generators (-1 for initialization by system time).","isHidden":false,"isOptional":true,"defaultValue":2001,"min":-2147483648,"max":2147483647,"noDefault":false}]},"status":"QUEUE","inputPorts":{"portList":[]},"outputPorts":{"portList":[]},"execUnits":[{"operators":[{"operatorType":"db_data_reader","name":"db_data_reader-6f94e588-2bdb-476d-9f8d-bf5ec38d9318","xPos":240,"yPos":40,"parameters":{"keyToValueMap":{},"parameterTypes":[{"paramType":"param_type_string","key":"database_url","description":"The URL connection string for the database, e.g. 'jdbc:mysql://foo.bar:portnr/database'","isHidden":false,"isOptional":false,"defaultValue":null},{"paramType":"param_type_string","key":"username","description":"The database username.","isHidden":false,"isOptional":false,"defaultValue":null},{"paramType":"param_type_password","key":"password","description":"The password for the database.","isHidden":false,"isOptional":true,"defaultValue":null},{"paramType":"param_type_sql_query","key":"query","description":"An SQL query.","isHidden":false,"isOptional":true}]},"status":"QUEUE","inputPorts":{"portList":[]},"outputPorts":{"portList":[{"outputType":"default","name":"output"}]},"description":"DatabaseDataReader","group":"source","fullName":"DatabaseDataReader","parameterTypes":[{"paramType":"param_type_string","key":"database_url","description":"The URL connection string for the database, e.g. 'jdbc:mysql://foo.bar:portnr/database'","isHidden":false,"isOptional":false,"defaultValue":null},{"paramType":"param_type_string","key":"username","description":"The database username.","isHidden":false,"isOptional":false,"defaultValue":null},{"paramType":"param_type_password","key":"password","description":"The password for the database.","isHidden":false,"isOptional":true,"defaultValue":null},{"paramType":"param_type_sql_query","key":"query","description":"An SQL query.","isHidden":false,"isOptional":true}]}]}],"parameterTypes":[{"paramType":"param_type_int","key":"random_seed","description":"Global random seed for random generators (-1 for initialization by system time).","isHidden":false,"isOptional":true,"defaultValue":2001,"min":-2147483648,"max":2147483647,"noDefault":false}]}},"code":0}
*/
const addProcessOperator = (processId, data) => {
  return fetch.post(`${pioUrl}/pio/operator/${processId}`, data)
}

/*
9.删除项目中的算子
DELETE: http://192.168.0.110:8080/pio/operator/{processId}/{operatorName}
*/
const delProcessOperator = (processId, operatorName) => {
  return fetch.delete(`${pioUrl}/pio/operator/${processId}/${operatorName}`)
}

/*
10.连接项目中的两个算子（连线）
POST： http://192.168.0.110:8080/pio/operator/connect/{processId}
{
  "fromOperator":"operator_1",
  "fromPort":"port_1",
  "toOperator":"operator_2",
  "toPort":"port_2"
}
*/
const connect = (processId, data) => {
  return fetch.post(`${pioUrl}/pio/operator/connect/${processId}`, data)
}

/*
11.断开连接项目中的两个算子（删除连线）
POST：http://192.168.0.110:8080/pio/operator/disconnect/{processId}
{
  "fromOperator":"operator_1",
  "fromPort":"port_1",
  "toOperator":"operator_2",
  "toPort":"port_2"
}
*/
const disConnect = (processId, data) => {
  return fetch.post(`${pioUrl}/pio/operator/disconnect/${processId}`, data)
}

/*
12.修改项目中特定算子的参数
POST：http://192.168.0.110:8080/pio/operator/{processId}/{operatorId}
{
  "key":"param_1",
  "value":"csv_reader"
}
*/
const updateProcessOperator = (processId, operatorName, data) => {
  return fetch.post(`${pioUrl}/pio/operator/${processId}/${operatorName}`, data)
}

/*

13.运行项目
GET:http://192.168.0.110:8080/pio/process/run/{processId}
*/

const runProcess = processId => {
  return fetch.get(`${pioUrl}/pio/process/run/${processId}`)
}

/*
15.获取算子运行结果
GET：http://192.168.0.110:8080/pio/operator/result/{processId}/{operatorId} 
{
    "ioObjects": []
}
*/
const getOperatorResult = (processId, operatorName) => {
  return fetch.get(`${pioUrl}/pio/operator/result/${processId}/${operatorName}`)
}

/*
16.上传csv数据
POST：http://192.168.0.110:8080/pio/operator/data/{processId}/{operatorId}
["NO,category,attribute_1,attribute_2,attribute_3,attribute_4,attribute_5,attribute_6,attribute_7,attribute_8,attribute_9,attribute_10","1,Rock,0.02,0.0371,0.0428,0.0207,0.0954,0.0986,0.1539,0.1601,0.3109,0.2111","2,Rock,0.0453,0.0523,0.0843,0.0689,0.1183,0.2583,0.2156,0.3481,0.3337,0.2872","3,Rock,0.0262,0.0582,0.1099,0.1083,0.0974,0.228,0.2431,0.3771,0.5598,0.6194","4,Rock,0.01,0.0171,0.0623,0.0205,0.0205,0.0368,0.1098,0.1276,0.0598,0.1264","5,Rock,0.0762,0.0666,0.0481,0.0394,0.059,0.0649,0.1209,0.2467,0.3564,0.4459"]
*/
const uploadProcessOperatorData = (processId, operatorName, data) => {
  return fetch.post(`${pioUrl}/pio/operator/data/${processId}/${operatorName}`, data)
}

/**
 * 创建一个模板流程，只有管理员可以创建
 * @param {object} data 模板信息
 * @param {string} companyId 公司id
 */
const createTemplate = (data, companyId) => {
  return fetch.post(`${pioUrl}/pio/process/template/${companyId}`, data)
}

/**
 * 获取模板类型
 */
const getTemplateType = () => {
  return fetch.get(`${pioUrl}/pio/process/template/spec`)
}

/**
 * 创建一个公用样例流程，只有管理员可以创建
 * @param {object} data 样例信息
 * @param {string} companyId 公司id
 */
const createCase = (data, companyId) => {
  return fetch.post(`${pioUrl}/pio/process/case/${companyId}`, data)
}

/**
 * 获取所有公用样例
 */
const getCase = () => {
  return fetch.get(`${pioUrl}/pio/process/case/list?false`)
}

/**
 * 复制案例公用样例
 */
const cloneCase = (data, companyId) => {
  return fetch.post(`${pioUrl}/pio/process/case/clone/${companyId}`, data)
}

/**
 * 运行到指定算子
 * @param {String} processId
 * @param {String} operatorId
 */
const runTo = (processId, operatorId) => {
  return fetch.get(`${pioUrl}/pio/process/run/to/${processId}/${operatorId}`)
}

/**
 * 从指定算子开始运行
 * @param {String} processId
 * @param {String} operatorId
 */
const runFrom = (processId, operatorId) => {
  return fetch.get(`${pioUrl}/pio/process/run/from/${processId}/${operatorId}`)
}

/**
 * 克隆算子
 * @param {String} processId
 * @param {String} operatorId
 * @param {Object} data 位置信息
 */
const cloneOperator = (processId, operatorId, data) => {
  return fetch.post(`${pioUrl}/pio/operator/clone/${processId}/${operatorId}`, data)
}

/**
 * 查看算子运行日志
 * @param {String} processId
 * @param {String} operatorId
 */
const logOperator = (processId, operatorId) => {
  return fetch.get(`${pioUrl}/pio/operator/log/${processId}/${operatorId}`)
}

/**
 * 运行单个算子
 * @param {*} processId
 * @param {*} operatorId
 */
const runSingle = (processId, operatorId) => {
  return fetch.get(`${pioUrl}/pio/process/run/single/${processId}/${operatorId}`)
}

export default {
  getOperators,
  getOperatorInfo,
  createProcess,
  updateProcess,
  getProcesses,
  getProcess,
  delProcesses,
  addProcessOperator,
  delProcessOperator,
  connect,
  disConnect,
  runProcess,
  updateOperatorInfo,
  updateProcessOperator,
  getOperatorResult,
  uploadProcessOperatorData,
  createTemplate,
  getTemplateType,
  createCase,
  getCase,
  cloneCase,
  runTo,
  runFrom,
  cloneOperator,
  logOperator,
  runSingle
}
