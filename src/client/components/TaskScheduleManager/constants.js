import moment from 'moment'

export const formatDate = timer => {
  return timer > 0 ? moment(timer).format('YYYY-MM-DD HH:mm:ss') : '-'
}

/**
 * 计算任务耗时
 * @param obj
 * key
 */
export const getSpendTime = (obj, key) => {
  if (obj.endTime === -1 || obj.submitTime === -1) {
    return '-'
  }
  let start = obj.submitTime
  if (typeof start === 'undefined') {
    start = obj.startTime
  }

  const sec = moment(obj.endTime).diff(moment(start), 'seconds')
  return sec < 60 ? `${sec} 秒` : moment.duration(sec, 'seconds').humanize()
}

export const RELOAD_TREE = 'task-schedule.reloadTree'

export const FLOW_REMARK = {
  cursor: '选择指针',
  direct: '转换连线',
  command: 'Shell脚本',
  python: 'Python脚本',
  hive: 'Hive脚本',
  druidIndex: 'Duridio作业',
  nodeWait: '任务等待',
  sqlWait: '数据库等待',
  checkResult: '结果检查节点',
  oraclesql: 'oracle脚本',
  postgres: 'postgre脚本',
  sqlserver: 'sqlserver脚本',
  access: '接入节点',
  dataQuality: '数据质量',
  'end round': '结束',
  end: '结束',
  gobblin: 'gobblin脚本',
  mysql: 'mysql脚本',
  dataCollect: '数据采集脚本',
  scala: 'Scala脚本',
  impala: 'Impala脚本',
  perl: 'Perl脚本',
  mlsql: 'mlsql脚本',
  sybase: 'sybase脚本',
  sparkSql: 'sparkSql脚本'
}

export const FLOW_STATUS_COLOR_MAP = {
  READY: '#cccccc',
  RUNNING: '#3398cc',
  PAUSED: '#c82123',
  SUCCESS: '#5cb85c',
  SUCCEED: '#5cb85c',
  SUCCEEDED: '#5cb85c',
  KILLING: '#ff9999',
  KILLED: '#d9534f',
  FAILED: '#d9534f',
  CANCELLED: '#ff9999',
  PREPARING: '#cccccc'
}

export const FLOW_STATUS_TEXT_MAP = {
  READY: '准备',
  RUNNING: '执行中',
  PAUSED: '已暂停',
  SUCCESS: '成功',
  SUCCEED: '成功',
  SUCCEEDED: '成功',
  KILLING: '终止中',
  KILLED: '终止',
  FAILED: '失败',
  CANCELLED: '已取消',
  PREPARING: '准备中'
}

export const STEP_PARAMS_REMARK = {
  projectId: '依赖任务',
  nodeId: '任务节点',
  executeTime: '执行时间',
  timeout: '超时时间'
}

export const gobblin = {
  'bootstrap.with.offset': 'earliest',
  'data.publisher.final.dir': '${fs.uri}/gobblin/job-output',
  'data.publisher.type': 'gobblin.publisher.BaseDataPublisher',
  'extract.namespace': 'gobblin.extract.kafka',
  'job.description': 'Gobblin Load Data From Kafka To HDFS',
  'job.group': 'GobblinKafkaHDFS',
  'job.lock.enabled': 'false',
  'job.name': 'GobblinKafka-HDFS-REALTIME',
  'kafka.brokers': '192.168.0.223:9092,192.168.0.224:9092,192.168.0.225:9092',
  'metrics.log.dir': '/gobblin/gobblin-kafka/metrics',
  'metrics.reporting.file.enabled': 'true',
  'metrics.reporting.file.suffix': 'txt',
  'mr.job.max.mappers': '2',
  'mr.job.root.dir': '${fs.uri}/gobblin/gobblin-kafka/working',
  showName: 'gobblin脚本',
  'simple.writer.delimiter': '\n',
  'source.class': 'gobblin.source.extractor.extract.kafka.KafkaSimpleSource',
  'state.store.dir': '${fs.uri}/gobblin/gobblin-kafka/state-store',
  'task.data.root.dir': '${fs.uri}/gobblin/jobs/kafkaetl/gobblin/gobblin-kafka/task-data',
  'topic.whitelist': 'gobblin0413',
  'writer.builder.class': 'gobblin.writer.SimpleDataWriterBuilder',
  'writer.destination.type': 'HDFS',
  'writer.file.path.type': 'tablename',
  'writer.output.format': 'csv'
}
