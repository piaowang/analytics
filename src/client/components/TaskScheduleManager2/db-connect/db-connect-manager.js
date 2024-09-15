import _ from 'lodash'

export const DATASOURCE_TYPE = {
  mysql: 'mysql',
  postgresql: 'postgresql',
  oracle: 'oracle',
  sqlserver: 'sqlserver',
  db2: 'db2',
  kafka: 'kafka',
  redis: 'redis',
  hdfs: 'hdfs',
  hive: 'hive',
  hana: 'hana',
  hbase: 'hbase',
  kudu: 'kudu',
  starrocks: 'starrocks'
}

export const CONNECTION_TOOLTIP = {
  mysql: 'jdbc:mysql://127.0.0.1:3306/default',
  postgresql: 'jdbc:postgresql://127.0.0.1:15432/default',
  oracle: 'jdbc:oracle:thin:@//127.0.0.1:1521/orcl',
  sqlserver: 'jdbc:sqlserver://127.0.0.1:1433;DatabaseName=master',
  db2: 'jdbc:db2://127.0.0.1:50000/sample:currentSchema=default',
  hive: 'jdbc:hive2://127.0.0.1:10000/default',
  hana: 'jdbc:sap://127.0.0.1:39017?currentschema=SYSTEM',
  starrocks: 'jdbc:mysql://127.0.0.1:9030/default'
}

const dbAlais = {
  name: 'dbAlais',
  label: '数据源名称',
  rules: [
    {
      required: true,
      message: '请输入数据源名称'
    },
    {
      pattern: new RegExp('[^a-zA-Z0-9_\u4e00-\u9fa5]', 'i'),
      message: '输入无效, 支持输入英文、数字或中文',
      validator: (rule, value, callback) => {
        if (rule.pattern.test(value)) {
          callback(rule.message)
        }
        callback()
      }
    },
    {
      max: 32,
      message: '1~32个字符'
    }
  ],
  params: {
    placeholder: '请输入数据源名称'
  },
  component: 'input'
}

const dbType = {
  name: 'dbType',
  label: '数据库类型',
  rules: [
    {
      required: true,
      message: '请输入数据库类型'
    }
  ],
  component: 'select',
  options: _.map(_.values(DATASOURCE_TYPE), p => ({ key: p, value: p, title: p }))
}

const noDbUser = {
  name: 'dbUser',
  label: '数据库账号',
  rules: [
    {
      pattern: new RegExp('[^a-zA-Z0-9_\u4e00-\u9fa5]', 'i'),
      message: '输入无效, 包含非法字符',
      validator: (rule, value, callback) => {
        if (rule.pattern.test(value)) {
          callback(rule.message)
        }
        callback()
      }
    },
    {
      max: 32,
      message: '1~32个字符'
    }
  ],
  component: 'input'
}

const dbUser = {
  name: 'dbUser',
  label: '数据库账号',
  rules: [
    {
      required: true,
      message: '请输入数据库账号'
    },
    {
      pattern: new RegExp('[^a-zA-Z0-9_\u4e00-\u9fa5]', 'i'),
      message: '输入无效, 支持输入英文、数字或中文',
      validator: (rule, value, callback) => {
        if (rule.pattern.test(value)) {
          callback(rule.message)
        }
        callback()
      }
    },
    {
      max: 32,
      message: '1~32个字符'
    }
  ],
  component: 'input'
}

const oracleDbUser = {
  name: 'dbUser',
  label: '数据库账号',
  rules: [
    {
      required: true,
      message: '请输入数据库账号'
    },
    {
      pattern: new RegExp('[^a-zA-Z0-9_\u4e00-\u9fa5#]', 'i'),
      message: '输入无效, 支持输入英文、数字或中文',
      validator: (rule, value, callback) => {
        if (rule.pattern.test(value)) {
          callback(rule.message)
        }
        callback()
      }
    },
    {
      max: 32,
      message: '1~32个字符'
    }
  ],
  component: 'input'
}

const httpPort = {
  name: 'httpPort',
  label: 'HTTP端口',
  rules: [
    {
      required: true,
      message: ''
    },
    {
      pattern: new RegExp('[^a-zA-Z0-9_\u4e00-\u9fa5#]', 'i'),
      message: '输入无效, 仅支持输入数字',
      validator: (rule, value, callback) => {
        if (rule.pattern.test(value)) {
          callback(rule.message)
        }
        callback()
      }
    }
  ],
  component: 'input'
}

const noDbPassword = {
  name: 'dbPassword',
  label: '数据库密码',
  rules: [
    {
      max: 32,
      message: '1~32个字符'
    }
  ],
  component: 'password'
}

const dbPassword = {
  name: 'dbPassword',
  label: '数据库密码',
  rules: [
    {
      required: true,
      message: '请输入数据库密码'
    },
    {
      max: 32,
      message: '1~32个字符'
    }
  ],
  component: 'password'
}

const connectUrl = {
  name: 'connectUrl',
  label: '连接地址',
  rules: [
    {
      required: true,
      message: '例如: jdbc:{数据库类型}://{IP:端口}/{数据库}'
    },
    {
      max: 200,
      message: '1~200个字符'
    }
  ],
  help: '例如: jdbc:{数据库类型}://{IP:端口}/{数据库}',
  component: 'input'
}

const oracleConnectUrl = {
  name: 'connectUrl',
  label: '连接地址',
  rules: [
    {
      required: true,
      message: '例如: jdbc:{数据库类型}:thin://{IP:端口}/{数据库}'
    },
    {
      max: 200,
      message: '1~200个字符'
    }
  ],
  help: '例如: jdbc:{数据库类型}:thin://{IP:端口}/{数据库}',
  component: 'input'
}

const bootstrapServers = {
  name: 'bootstrapServers',
  label: 'broker地址',
  help: '逗号分隔，譬如192.168.0.220:9092,192.168.0.221:9092',
  component: 'input'
}

const version = {
  name: 'version',
  label: '版本',
  component: 'select',
  options: [
    { key: 'version-0.10', value: '10', title: '10' },
    { key: 'version-0.9', value: '0.9', title: '0.9' }
  ]
}

const redisServers = {
  name: 'redisServers',
  label: '地址',
  component: 'input'
}

const password = {
  name: 'password',
  label: '密码',
  rules: [
    {
      max: 32,
      message: '1~32个字符'
    }
  ],
  params: {
    placeholder: '无密码不需要填写'
  },
  component: 'password'
}
const redisModel = {
  name: 'redisModel',
  label: 'redis模式',
  component: 'redio',
  options: [
    { key: 'redis-model-alone', value: 'alone', title: '单机' },
    { key: 'redis-model-cluster', value: 'cluster', title: '集群' }
  ]
}

const warehouse = {
  name: 'warehouse',
  label: 'warehouse',
  component: 'input',
  params: {
    placeholder: '/user/hive/warehouse'
  }
}

const coreSite = {
  name: 'coreSite',
  label: 'core-site',
  component: 'text',
  params: {
    placeholder: '请输入hdfs的core-site配置'
  }
}

const hdfsSite = {
  name: 'hdfsSite',
  label: 'hdfs-site',
  component: 'text',
  params: {
    placeholder: '请输入hdfs的hdfs-site配置'
  }
}

const zookeeper = {
  name: 'zookeeper',
  label: 'zookeeper地址',
  component: 'input',
  params: {
    placeholder: '逗号分隔, 辟如 192.168.0.220:8092, 192.168.0.220:8092',
    help: '逗号分隔, 辟如 192.168.0.220:8092, 192.168.0.220:8092'
  }
}
const namespace = {
  name: 'namespace',
  label: 'namespace',
  component: 'input'
}

const masterAddr = {
  name: 'masterAddr',
  label: 'master地址',
  component: 'input',
  params: {
    placeholder: '逗号分隔, 辟如 192.168.0.220:8092, 192.168.0.220:8092',
    help: '逗号分隔, 辟如 192.168.0.220:8092, 192.168.0.220:8092'
  }
}

const schema = {
  name: 'schema',
  label: 'schema',
  component: 'input',
  defaultValue: 'public',
  params: {
    placeholder: '请输入schema'
  },
  rules: [
    {
      required: true,
      message: '请输入schema'
    },
    {
      max: 50,
      message: '1~50个字符'
    }
  ]
}

export default [
  { name: 'mysql', attrs: [dbAlais, dbType, connectUrl, dbUser, dbPassword] },
  { name: 'starrocks', attrs: [dbAlais, dbType, connectUrl, dbUser, dbPassword, httpPort] },
  { name: 'postgresql', attrs: [dbAlais, dbType, connectUrl, schema, dbUser, dbPassword] },
  { name: 'oracle', attrs: [dbAlais, dbType, oracleConnectUrl, schema, oracleDbUser, dbPassword] },
  { name: 'sqlserver', attrs: [dbAlais, dbType, connectUrl, dbUser, dbPassword] },
  { name: 'db2', attrs: [dbAlais, dbType, connectUrl, dbUser, dbPassword] },
  { name: 'kafka', attrs: [dbAlais, dbType, bootstrapServers, version] },
  { name: 'redis', attrs: [dbAlais, dbType, redisServers, password, redisModel] },
  { name: 'hdfs', attrs: [dbAlais, dbType, coreSite, hdfsSite] },
  { name: 'hive', attrs: [dbAlais, dbType, connectUrl, dbUser, dbPassword] },
  { name: 'hana', attrs: [dbAlais, dbType, connectUrl, dbUser, dbPassword] },
  { name: 'hbase', attrs: [dbAlais, dbType, zookeeper, namespace] },
  { name: 'kudu', attrs: [dbAlais, dbType, masterAddr] }
]
