import React from 'react'
import { Select } from 'antd'
import _ from 'lodash'
import { synchronizer } from '../../../Fetcher/synchronizer'


const ReaderDefaultProps = {
  kafka: {
    readerClass: 'KafkaReader',
    brokers: 'localhost:9092',
    filePath: ' '
  },
  file: {
    readerClass: 'fileReader',
    filePath: '',
    fileName: ''
  }
}

const Option = Select.Option

@synchronizer(props => ({
  url: `/app/task-schedule/manager?project=${props.taskName}&graph&refProjectId=${props.projectId}`,
  modelName: 'taskJobs',
  doFetch: !!props.projectId && !!props.taskName,
  resultExtractor: data => {
    return _.reduce(JSON.parse(_.get(data,'gnode', '{}')), (r, v, k) => {
      r.push({ showName: v.name, id: k.split('_node_')[1] })
      return r
    }, [])
  }
}))
export default class ETLTaskEditSelect extends React.Component {

  render() {
    const { value, placeholder, changeParserProps, className } = this.props
    return (<Select
      value={value ? value : ''}
      placeholder={placeholder}
      allowClear
      onChange={(value) => changeParserProps(value)}
      className={className}
            >
      {
        _.keys(ReaderDefaultProps).map(k => {
          return (
            <Option
              key={k + ''}
              value={k + ''}
            >{k}</Option>
          )
        })
      }
    </Select>)
  }
}

