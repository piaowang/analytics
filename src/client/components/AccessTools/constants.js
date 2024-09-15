/**
 * Created by asd on 17-7-17.
 */

import { ACCESS_DATA_TASK_STATUS, DIMENSION_MAP } from '../../../common/constants'

const NAMESPACE = {
  CREATE: 'access-data-task-create'
}

const ACCESS_TYPE_LIST = [
  { name: 'MR导入', value: 'lucene_index_hadoop' }
]

const RESOURCE_FILE_TYPE_LIST = [
  //  { name: 'csv', value: 'csv' },
  { name: 'hive', value: 'hive' }
]

const CSV_SEPARATOR_LIST = [
  { name: '逗号', value: ',' },
  { name: '分号', value: ';' },
  { name: '空格', value: ' ' },
  { name: 'Tab键', value: '  ' }
]

const TIME_FORMAT_LIST = [
  { name: 'yyyy-MM-dd HH:mm:ss', value: 'yyyy-MM-dd HH:mm:ss' },
  { name: 'yyyy-MM-dd', value: 'yyyy-MM-dd' },
  { name: 'yyyy-MM', value: 'yyyy-MM' },
  { name: 'yyyy', value: 'yyyy' },
  { name: 'iso', value: 'iso' },
  { name: 'posix', value: 'posix' },
  { name: 'millis', value: 'millis' }
]

const HADOOP_VERSIONS = [
  { name: '2.6及以上', value: '>=2.6' },
  { name: '2.6以下', value: '<2.6' }
]

export {
  NAMESPACE,
  ACCESS_DATA_TASK_STATUS,
  ACCESS_TYPE_LIST,
  RESOURCE_FILE_TYPE_LIST,
  CSV_SEPARATOR_LIST,
  DIMENSION_MAP,
  TIME_FORMAT_LIST,
  HADOOP_VERSIONS
}
