import React from 'react'
import { Select, Button, Input } from 'antd'
import { TASK_SCHEDULE_STATUS, TASK_SCHEDULE_STATUS_TRANSLATE } from 'common/constants'
import _ from 'lodash'

export default function FilterBox(props) {
  const { taskProjectList, onQueryData, queryPamrams, setQueryPamrams } = props
  return (
    <React.Fragment>
      <span className='pd1'>状态：</span>
      <Select
        className='mg1x width120'
        onChange={val => setQueryPamrams({ ...queryPamrams, status: val })}
        value={queryPamrams?.status}
      >
        {_.keys(TASK_SCHEDULE_STATUS).map(p => {
          return (
            <Select.Option
              key={`status_${p}`}
              value={TASK_SCHEDULE_STATUS[p]}
            >
              {_.get(TASK_SCHEDULE_STATUS_TRANSLATE, [TASK_SCHEDULE_STATUS[p]], '')}
            </Select.Option>)
        })}
      </Select>
      <span className='pd1'>所属项目：</span>
      <Select
        className='mg1x width150'
        onChange={val => setQueryPamrams({ ...queryPamrams, taskProjectId: val })}
      >
        {taskProjectList.map(p => <Select.Option key={`status_${p.id}`} value={p.id}>{p.name}</Select.Option>)}
      </Select>
      <span className='pd1'>任务名称: </span>
      <Input
        className='mg1x width150'
        onChange={e => setQueryPamrams({ ...queryPamrams, taskName: e.target.value })}
      />
      <Button onClick={() => onQueryData(queryPamrams)}>查询</Button>
    </React.Fragment>
  )
}

