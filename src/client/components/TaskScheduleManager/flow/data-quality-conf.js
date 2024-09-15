/**
 * Created by fengxj on 3/15/19.
 */
export const envConfTemp = {
  'spark' : {
    'log.level' : 'WARN'
  },
  'sinks' : [ {
    'type' : 'CONSOLE',
    'config' : {
      'max.log.lines' : 10
    }
  }, {
    'type' : 'HDFS',
    'config' : {
      'path' : 'hdfs://sugo/griffin/persist',
      'max.persist.lines' : 10000,
      'max.lines.per.file' : 10000
    }
  },{
    'type': 'SUGO_MONITOR',
    'config': {
      'method': 'post',
      'api': 'http://192.168.0.220:6188/api/v1/datapoints',
      'connection.timeout': '1m',
      'retry': 10
    }
  }],
  'griffin.checkpoint' : [ ]
}



export const dqConfTemp = {
  'measure.type' : 'griffin',
  'id' : 1,
  'name' : 'test_job',
  'owner' : 'test',
  'deleted' : false,
  'dq.type' : 'PROFILING',
  'sinks' : [ 'HDFS', 'SUGO_MONITOR' ],
  'process.type' : 'BATCH',
  'data.sources' : [ {
    'id' : 5,
    'name' : 'source',
    'connectors' : [ {
      'id' : 6,
      'name' : 'source1551859086841',
      'type' : 'HIVE',
      'version' : '1.2',
      'predicates' : [ ],
      'data.unit' : '1hour',
      'data.time.zone' : 'GMT+8',
      'config' : {
        'database' : '',
        'table.name' : '',
        'where' : ''
      }
    } ],
    'baseline' : false
  } ],
  'evaluate.rule' : {
  },
  'measure.type' : 'griffin'
}

