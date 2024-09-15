/**
 * Created by asd on 17-7-17.
 */

import _ from 'lodash'
import Ot from '../base/object-tool'
import Conf from '../base/config.json'
import { get, BaseConfKeys, AdvanceConfKeys, getConf } from '../base/ot-conf'

import {
  NAMESPACE,
  ACCESS_TYPE_LIST,
  RESOURCE_FILE_TYPE_LIST,
  CSV_SEPARATOR_LIST,
  TIME_FORMAT_LIST,
  HADOOP_VERSIONS
} from '../constants'
import Actions from './actions'

/**
 * @param {String} mark
 * @return {string}
 */
function creator (mark) {
  return `${NAMESPACE.CREATE}-${mark}`
}

const Action = {
  list: creator('list'),
  create: creator('create'),
  run: creator('run'),
  stop: creator('stop'),

  projects: creator('query-project-list'),
  file: creator('parse-file'),

  change: creator('change'),
  post: creator('post'),

  stopOne: creator('stop-one'),
  runOne: creator('run-one'),
  params: creator('update-params'),

  download: creator('download-example-file'),
  sync: creator('sync-dimensions')
}

/**
 * @typedef {Object} AccessDataTaskViewModel
 * @property {Array<AccessDataTaskModel>} AccessDataTask
 * @property {Array<ProjectModel>} Projects
 *
 * @property {String} access_type
 * @property {String} resource_file_type
 * @property {String} csv_separator
 * @property {String} file_dir
 * @property {Array<{name:String,type:String}>} titles
 * @property {Ot} ot
 *
 * @property {Array<{name:String,values:String}>} AccessTypeList
 * @property {Array<{name:String,values:String}>} ResourceFileTypeList
 * @property {Array<{name:String,values:String}>} CSVSeparator
 * @property {Array<{name:String,values:String}>} TimeFormatList
 * @property {Array<{name:String,values:String}>} HadoopVersionsList
 *
 * @property {File} file
 * @property {Array<ConfItem>} BaseConf
 * @property {Array<ConfItem>} AdvanceConf
 *
 * @property {Boolean} showCode
 */

const ot = new Ot(_.cloneDeep(Conf))

const HADOOP_JOB_PROPERTIES = {
  // >=2.6
  [HADOOP_VERSIONS[0].value]: {
    'mapreduce.job.queuename': 'root.default',
    'mapreduce.job.classloader': 'true',
    'mapreduce.job.classloader.system.classes': '-javax.validation.,java.,javax.,org.apache.commons.logging.,org.apache.log4j.,org.apache.hadoop.'
  },
  // <2.6
  [HADOOP_VERSIONS[1].value]: {
    'mapreduce.job.queuename': 'root.default',
    'mapreduce.job.user.classpath.first': 'true',
    'mapreduce.job.classloader.system.classes': '-javax.validation.,java.,javax.,org.apache.commons.logging.,org.apache.log4j.,org.apache.hadoop.'
  }
}

/**
 * 返回 hadoop 不同版本的 jobProperties 配置
 * @param {String} hadoop_version
 * @return {Object}
 */
function jobProperties (hadoop_version) {
  return HADOOP_JOB_PROPERTIES[hadoop_version] || HADOOP_JOB_PROPERTIES[HADOOP_VERSIONS[0].value]
}

/** @type {AccessDataTaskViewModel} */
const Def = {
  AccessDataTask: [],
  Projects: [],

  // config
  access_type: get('type', ot),
  resource_file_type: get('format', ot),
  csv_separator: get('listDelimiter', ot),
  file_dir: get('paths', ot),
  hadoop_version: HADOOP_VERSIONS[0].value,
  titles: [],
  ot,

  // view model
  AccessTypeList: ACCESS_TYPE_LIST.slice(),
  ResourceFileTypeList: RESOURCE_FILE_TYPE_LIST.slice(),
  CSVSeparator: CSV_SEPARATOR_LIST.slice(),
  TimeFormatList: TIME_FORMAT_LIST.slice(),
  HadoopVersionsList: HADOOP_VERSIONS.slice(),

  file: null,
  BaseConf: getConf(BaseConfKeys),
  AdvanceConf: getConf(AdvanceConfKeys),

  showCode: false
}

/**
 * @param state
 * @param action
 * @param next
 */
function scheduler (state, action, next) {
  const { type, payload } = action

  switch (type) {

    case Action.projects:
      return Actions.projects(this.store, next)

    case Action.list:
      return Actions.list(payload.project_id, this.store, next)

    case Action.file:
      return Actions.parseFile(state, payload.file, this.store, next)

    case Action.runOne:
      return Actions.runOne(payload.id, state, this.store, next)
    case Action.stopOne:
      return Actions.stopOne(payload.id, state, this.store, next)

    case Action.params:
      return Actions.setParams(state, this.store, next)

    case Action.download:
      return Actions.download(state, this.store, next)

    case Action.sync:
      return Actions.sync(state, this.store, next)

    case Action.change:
      return { ...payload }

    default:
      return state
  }
}

export default {
  name: 'vm',
  scheduler,
  state: { ...Def }
}

export {
  Action,
  jobProperties
}
