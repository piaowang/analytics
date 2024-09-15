import _ from 'lodash'

export const parseRes = (response) => {
  const { status, historyFlows = [], totalNum = 0 } = response
  if (status === 'success') {
    const list = historyFlows.map(({ first, second }) => ({
      id: _.get(first, ['executionId']),
      identifier: _.get(first, ['id']),
      name: _.get(first, ['showName']),
      executionId: _.get(first, ['executionId']),
      actuator: _.get(second, ['host']),
      start_at: _.get(first, ['startTime']),
      end_at: _.get(first, ['endTime']),
      take_up_time: _.get(first, ['endTime'], 0) - _.get(first, ['startTime'], 0),
      business_time: _.get(first, ['businessTime']),
      status: _.get(first, ['status'])
    }))
    return {
      historyList: list,
      historyCount: totalNum
    }
  }
}

export const parseRes2 = (response) => {
  const nodes = response.nodes || []
  let endTime = _.get(response, 'endTime', 0)
  endTime = endTime > 0 ? endTime : _.get(response, 'updateTime', 0)
  let totalSpend = endTime - _.get(response, 'startTime', 0)
  const list = nodes.map((n) => ({
    id: _.get(n, ['id']),
    name: _.get(n, ['showName']),
    type: _.get(n, ['type']),
    totalSpend,
    start_at: _.get(n, ['startTime']),
    end_at: _.get(n, ['endTime']),
    take_up_time: _.get(n, ['endTime'], 0) - _.get(n, ['startTime'], 0),
    status: _.get(n, ['status'])
  }))
  return list
}

export const getHref = (execid, jobId) => {
  return `/console/task-schedule-v3/details-text?&hideTopNavigator=1&action=fetchExecJobLogs&execid=${execid}&jobId=${jobId}&offset=0&type=logs`
}
