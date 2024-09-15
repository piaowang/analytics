import React from 'react'
import { Select } from 'antd'
import _ from 'lodash'
import { synchronizer } from '../../Fetcher/synchronizer'

const Option = Select.Option

@synchronizer(props => ({
  url: `/app/new-task-schedule/manager?project=${props.taskName}&graph`,
  modelName: 'taskJobs',
  doFetch: !!props.taskName,
  resultExtractor: data => {
    return _.reduce(JSON.parse(_.get(data,'gnode', '{}')), (r, v, k) => {
      r.push({ showName: v.name, id: k.split('_node_')[1] })
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

