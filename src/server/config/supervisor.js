// 默认supervisor配置选项

export default {
  'type': 'lucene_supervisor',
  'dataSchema': {
    'dataSource': 'wuxianji',
    'parser': {
      'type': 'string',
      'parseSpec': {
        'format': 'json',
        'timestampSpec': {
          'column': 'EventDateTime',
          'format': 'millis'
        },
        'dimensionsSpec': {
          'dimensions': [
            {
              'name': 'IP',
              'type': 'string'
            },
            {
              'name': 'Nation',
              'type': 'string'
            },
            {
              'name': 'Province',
              'type': 'string'
            },
            {
              'name': 'City',
              'type': 'string'
            },
            {
              'name': 'Operator',
              'type': 'string'
            },
            {
              'name': 'Network',
              'type': 'string'
            },
            {
              'name': 'SystemName',
              'type': 'string'
            },
            {
              'name': 'SystemVersion',
              'type': 'string'
            },
            {
              'name': 'UserID',
              'type': 'string'
            },
            {
              'name': 'SessionID',
              'type': 'string'
            },
            {
              'name': 'ClientDeviceID',
              'type': 'string'
            },
            {
              'name': 'ClientDeviceBrand',
              'type': 'string'
            },
            {
              'name': 'ClientDeviceModel',
              'type': 'string'
            },
            {
              'name': 'ClientDeviceAgent',
              'type': 'string'
            },
            {
              'name': 'ClientDeviceVersion',
              'type': 'string'
            },
            {
              'name': 'OsScreen',
              'type': 'string'
            },
            {
              'name': 'EventDateTime',
              'type': 'string'
            },
            {
              'name': 'EventDate',
              'type': 'string'
            },
            {
              'name': 'EventHour',
              'type': 'string'
            },
            {
              'name': 'EventScreen',
              'type': 'string'
            },
            {
              'name': 'EventAction',
              'type': 'string'
            },
            {
              'name': 'EventLabel',
              'type': 'string'
            },
            {
              'name': 'EventValue',
              'type': 'string'
            },
            {
              'name': 'Referrer',
              'type': 'string'
            },
            {
              'name': 'Campaign',
              'type': 'string'
            },
            {
              'name': 'Source',
              'type': 'string'
            },
            {
              'name': 'Media',
              'type': 'string'
            },
            {
              'name': 'Creative',
              'type': 'string'
            },
            {
              'name': 'Extras',
              'type': 'string'
            }
          ],
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
    'topic': 's5',
    'consumerProperties': {
      'bootstrap.servers': '192.168.0.214:9092,192.168.0.215:9092'
    },
    'taskCount': 1,
    'replicas': 1,
    'taskDuration': 'PT5M',
    'useEarliestOffset': 'false'
  }
}
