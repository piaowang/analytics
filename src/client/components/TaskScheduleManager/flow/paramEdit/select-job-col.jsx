import React from 'react'
import { Select } from 'antd'
import _ from 'lodash'
import { synchronizer } from '../../../Fetcher/synchronizer'

const Option = Select.Option

@synchronizer(props => ({
  url: `/app/task-schedule/manager?project=${props.taskName}&graph&refProjectId=${props.projectId}`,
  modelName: 'taskJobs',
  doFetch: !!props.projectId && !!props.taskName,
  resultExtractor: data => {
    return _.reduce(JSON.parse(_.get(data,'gnode', '{}')), (r, v, k) => {
      const id = k.substr(k.lastIndexOf('_') + 1)
      r.push({ showName: v.name, id })
      return r
    }, [])
  }
}))
export default class SelectJobCol extends React.Component {

  render() {
    const { value, taskJobs, className, onChangeJob } = this.props
    return (<Select
      value={taskJobs.length ? value : ''}
      placeholder="请选择节点"
      allowClear
      onChange={(value) => onChangeJob(value)}
      className={className}
            >
      {
        taskJobs.map((p, i) => <Option key={i} value={p.id}>{p.showName}</Option>)
      }
    </Select>)
  }
}

