import React from 'react'
import { Button, Popconfirm } from 'antd'
import FilterBox from './filter'
import { TASK_SCHEDULE_STATUS } from 'common/constants'

export default function HandlerBox(props) {
  const { taskProjectList, onQueryData, cancelAudit, pauseAudit, startAudit, queryPamrams, setQueryParams } = props
  return (
    <div className='mg2y'>
      <div className='width700 iblock'>
        <FilterBox
          taskProjectList={taskProjectList}
          onQueryData={onQueryData}
          queryPamrams={queryPamrams}
          setQueryPamrams={setQueryParams}
        />
      </div>
      <div className='width400 fright alignright'>
        {
          queryPamrams.status === TASK_SCHEDULE_STATUS.pause
            ? (
              <Popconfirm
                title='确定取消已选中的调度任务？'
                onConfirm={cancelAudit}
                okText='确定'
                cancelText='取消'
              >
                <Button type='primary'>批量取消</Button>
              </Popconfirm>)
            : null
        }
        {
          queryPamrams.status === TASK_SCHEDULE_STATUS.running
            ? (
              <Popconfirm
                title='确定暂定已选中的调度任务？'
                onConfirm={pauseAudit}
                okText='确定'
                cancelText='取消'
              >
                <Button type='primary' className='mg2l' >批量暂停</Button>
              </Popconfirm>)
            : null
        }
        {
          queryPamrams.status === TASK_SCHEDULE_STATUS.pause 
          || queryPamrams.status === TASK_SCHEDULE_STATUS.stop
            ? (
              <Popconfirm
                title='确定启动已选中的调度任务？'
                onConfirm={startAudit}
                okText='确定'
                cancelText='取消'
              >
                <Button type='primary' className='mg2l' >批量启动</Button>
              </Popconfirm>)
            : null
        }
      </div>
    </div>
  )
}
