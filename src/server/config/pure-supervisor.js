// 默认supervisor配置选项
import Config from './index'

export default {
  'type': 'lucene_supervisor',
  'dataSchema': {
    'dataSource': void 0,
    'parser': {
      'type': 'string',
      'parseSpec': {
        'format': 'csv',
        'timestampSpec': {
          'column': void 0,
          'format': 'millis'
        },
        'dimensionsSpec': {
          'dimensions': [],
          'dimensionExclusions': [],
          'spatialDimensions': []
        }
      }
    },
    'metricsSpec': [],
    'granularitySpec': {
      'type': 'uniform',
      'segmentGranularity': 'HOUR',
      'queryGranularity': 'NONE'
    }
  },
  'tuningConfig': {
    'type': 'kafka',
    'maxRowsInMemory': 500000,
    'maxRowsPerSegment': 20000000,
    'intermediatePersistPeriod': 'PT10M',
    'basePersistDirectory': '/opt/apps/druidio_sugo/var/tmp/taskStorage',
    'buildV9Directly': true
  },
  'ioConfig': {
    'topic': void 0,
    'consumerProperties': {
      'bootstrap.servers': '192.168.0.214:9092,192.168.0.215:9092'
    },
    'taskCount': 1,
    'replicas': 1,
    'taskDuration': 'PT5M',
    'useEarliestOffset': 'false'
  }
}
