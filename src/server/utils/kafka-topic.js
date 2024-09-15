import CONFIG from '../config'
import zookeeper from 'node-zookeeper-client'
import Q from 'q'
//import FetchKit from '../utils/fetch-kit'
import supervisorConf from '../config/supervisor'
import SupervisorService from '../services/druid-supervisor.service'


const BrokerTopicsPath = '/brokers/topics'

/** 创建kafka client实例 */
export function getClientInstance() {
  try {
    let client = zookeeper.createClient(CONFIG.kafka.zookeeperHost)
    // console.log(client);
    client.once('connected', () => {
      //console.log('Connected to ZooKeeper.');
    })
    client.on('state', (state) => {
      //console.log(state +"====state===");
      if (state === zookeeper.State.SYNC_CONNECTED) {
        console.log('Client state is changed to connected.')
      }
    })
    return client
  } catch (err) {
    console.log(err.stack)
  }
}
/**
 * 创建kafka topic
 */
export async function createTopic(topic, replicas, peakCount, client) {
  if (topic && -1 !== topic.indexOf('.')) {
    console.log('WARNING: Due to limitations in metric names, topics with a period (\'.\') or underscore (\'_\') could collide. To avoid issues it is best to use either, but not both.')
  }
  if (!client) {
    client = getClientInstance() //创建client实例
  }
  client.connect()
  //Use Kafka AdminUtils
  return Q.fcall(() => {
    let deferred = Q.defer()
    client.getChildren('/brokers/ids', function(error, children, stats) {
      if (error) {
        deferred.reject(new Error(error))
        return
      }
      deferred.resolve(children, stats)
    })
    return deferred.promise
  }).then((data) => {
    console.log(data)
    let brokerList = data.map(function(item) {
      return parseInt(item, 10)
    }).sort()
    let suggestPartitions = calculatePartitions(peakCount, brokerList.length)
    //args check
    if (undefined === suggestPartitions || undefined === replicas || 0 >= suggestPartitions || 0 >= replicas) {
      console.log('Partitions Or Replicas Must Greater than 0')
      return {
        state: 'error',
        message: 'Partitions Or Replicas Must Greater than 0'
      }
    }
    //do the real thing
    console.log('Currently Kafka Cluster Broker: %j', brokerList)
    let result = assignReplicasToBrokers(brokerList, suggestPartitions, replicas)
    if (result.state && result.state === 'error') {
      return result
    }
    return result
  })
    .then((replicaAssignment) => {
      console.log('ReplicaAssignment Calculate Result: %j', replicaAssignment)
      let result = createOrUpdateTopicPartitionAssignmentPathInZK(topic, replicaAssignment, client)
      return result
    })
    .then((result) => {
      if (client) client.close()
      if (result.state && result.state === 'error') {
        return result
      }
      return { state: 'success' }
    })
    .catch((error) => {
      console.log('createTopic Error Occur: ' + error)
      return { state: 'error', message: error }
    })
}

function calculatePartitions(peakCount, clusterSize) {
  let suggestPartitions = 2
  if (peakCount < 10000000) {
    suggestPartitions = clusterSize * 1
  } else if (peakCount < 100000000) {
    suggestPartitions = clusterSize * 2
  } else if (peakCount < 1000000000) {
    suggestPartitions = clusterSize * 4
  } else {
    suggestPartitions = clusterSize * 8
  }
  return suggestPartitions
}

/** 创建或者更新zookeeper kafka topic 信息 */
function createOrUpdateTopicPartitionAssignmentPathInZK(topic, partitionReplicaAssignment, client) {
  let uniqueMap = {}
  for (let key in partitionReplicaAssignment) {
    let replicaList = partitionReplicaAssignment[key]
    uniqueMap[replicaList.length] = ''

    //replica must in difference broker
    let replicaMap = {}
    for (let reKey in replicaList) {
      replicaMap[replicaList[reKey]] = ''
    }
    if (Object.keys(replicaMap).length !== replicaList.length) {
      console.log('Duplicate replica assignment found: %j', partitionReplicaAssignment)
      return {
        state: 'error',
        message: 'Duplicate replica assignment found: ' + partitionReplicaAssignment
      }
    }
  }
  if (1 !== Object.keys(uniqueMap).length) {
    console.log('All partitions should have the same number of replicas.')
    return {
      state: 'error',
      message: 'All partitions should have the same number of replicas.'
    }
  }
  return Q.fcall(() => {
    let deferred = Q.defer()
    let topicPath = BrokerTopicsPath + '/' + topic
    client.exists(topicPath, (error, stat) => {
      if (error) {
        console.log(error.stack)
        deferred.reject({
          state: 'error',
          message: error.stack
        })
        return
      }
      if (stat) {
        const message = `Topic '${topic}' already exists.`
        console.log(message)
        deferred.resolve({
          state: 'success',
          message: message
        })
        return
      }
      deferred.resolve('success')
    })
    return deferred.promise
  })
    .then((res) => {
      if (res !== 'success') { //存在直接返回错误信息
        return res
      }
      //console.log('===dfffff========'+res)
      //创建topic config
      writeTopicConfig(topic, client)
      //创建topic
      writeTopicPartitionAssignment(topic, partitionReplicaAssignment, client)
      return 'success'
    })
    .catch((error) => {
      console.log('createTopic Error Occur: ' + error)
      return { state: 'error', message: error }
    })
}

/** 设置topic partitions 信息 */
function writeTopicPartitionAssignment(topic, replicaAssignment, client) {
  const topicPath = BrokerTopicsPath + '/' + topic
  const jsonPartitionData = { 'version': 1, 'partitions': replicaAssignment }
  client.create(topicPath, new Buffer(JSON.stringify(jsonPartitionData), 'utf-8'), zookeeper.CreateMode.PERSISTENT,
    (error, path) => {
      if (error) {
        console.log(error.stack)
        throw error
      }
      console.log('Success To Create ZNode: %s', path)
    }
  )
}

/** 设置topic config信息 */
function writeTopicConfig(topic, client) {
  let configMap = { 'version': 1, 'config': {} }
  var topicConfigPath = '/config/topics/' + topic
  return Q.fcall(() => {
    var deferred = Q.defer()
    client.exists(topicConfigPath, (error, stat) => {
      if (error) {
        deferred.reject(error)
        return
      }
      deferred.resolve(stat)
    })
    return deferred.promise
  })
    .then((stat) => {
      if (stat) { //存在则更新
        client.setData(topicConfigPath, new Buffer(JSON.stringify(configMap), 'utf-8'), -1, (error) => {
          if (error) {
            console.log(error.stack)
            throw error
          }
          console.log('%s Update Success', topic)
        })
        return 'modify'
      }
      client.create(topicConfigPath, new Buffer(JSON.stringify(configMap), 'utf-8'), zookeeper.CreateMode.PERSISTENT,
        (error, path) => {
          if (error) {
            console.log(error.stack)
            throw error
          }
          console.log('Success To Create ZNode: %s', path)
        }
      )
      return 'success'
    }).catch((err) => {
      console.log('writeConfigErr:' + err.message)
    })
}

function assignReplicasToBrokers(brokerList, nPartitions, replicationFactor) {
  let fixedStartIndex = -1,
    startPartitionId = -1
  if (replicationFactor > brokerList.length) {
    console.log('replication factor: ' + replicationFactor + ' larger than available brokers: ' + brokerList.length)
    return {
      state: 'error',
      message: 'replication factor: ' + replicationFactor + ' larger than available brokers: ' + brokerList.length
    }
  }
  let ret = {},
    startIndex = (fixedStartIndex >= 0) ? fixedStartIndex : getRandomInt(0, brokerList.length),
    currentPartitionId = (startPartitionId >= 0) ? startPartitionId : 0,
    nextReplicaShift = (fixedStartIndex >= 0) ? fixedStartIndex : getRandomInt(0, brokerList.length)

  for (let i = 0; i < nPartitions; i++) {
    if (currentPartitionId > 0 && (currentPartitionId % brokerList.length === 0)) {
      nextReplicaShift++
    }
    let firstReplicaIndex = (currentPartitionId + startIndex) % brokerList.length
    let replicaList = [brokerList[firstReplicaIndex]]

    for (let j = 0; j < replicationFactor - 1; j++) {
      replicaList.unshift(brokerList[replicaIndex(firstReplicaIndex, nextReplicaShift, j, brokerList.length)])
    }
    ret[currentPartitionId] = replicaList.reverse()
    currentPartitionId++
  }
  return ret
}

function replicaIndex(firstReplicaIndex, secondReplicaShift, replicaIndex, nBrokers) {
  var shift = 1 + (secondReplicaShift + replicaIndex) % (nBrokers - 1)
  return ((firstReplicaIndex + shift) % nBrokers)
}

function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min
}

/** 删除kafka topic */
export function deleteTopic(topic, client) {
  if (!client) {
    client = getClientInstance() //创建client实例
  }
  client.connect() //建立连接
  let topicPath = BrokerTopicsPath + '/' + topic
  client.remove(topicPath, -1, function(error) {
    if (error) {
      console.log(error.stack)
      return
    }
    client.close() //关闭连接
    console.log(` the topic '${topic}' is deleted.`)
  })
}

/** 发送post请求给druid的kafka indexing service 
 * @param josn
 * @param topic
 */
export function kafkaIndexingService(json) {
  let upload_supervisor_spec = json.supervisorJson
  if (!json.supervisorPath) {
    upload_supervisor_spec = supervisorConf // 默认配置项
  }
  //default_supervisor_spec.dataSchema.dataSource = json.dataCube + Math.round(Math.random()*10000);
  //console.log(json.dimensionsSpec)
  if (json && json.dimensionsSpec) { //替换为数据库维度信息
    if (typeof upload_supervisor_spec === 'string') {
      upload_supervisor_spec = JSON.parse(upload_supervisor_spec)
    }
    upload_supervisor_spec.dataSchema.dataSource = json.dataCube //数据源名称跟druid数据源名称对应
    upload_supervisor_spec.dataSchema.parser.parseSpec.dimensionsSpec.dimensions = json.dimensionsSpec
  }
  // console.log(JSON.stringify(upload_supervisor_spec))
  //先请求leader返回supervisor地址
  return SupervisorService.createSupervisor(upload_supervisor_spec)
}
