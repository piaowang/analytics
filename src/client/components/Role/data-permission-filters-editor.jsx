import React, {useState} from 'react'
import { CloseCircleOutlined } from '@ant-design/icons'
import { Button, Form, Modal } from 'antd'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 }
}

const FormItem = Form.Item


export default function DataPermissionFiltersEditor(props) {
  const { project, roleName, value: filters, onChange, onCancel } = props
  const [pendingFilters, setPendingFilters] = useState(() => filters)
  
  return (
    <Modal
      visible
      onCancel={onCancel}
      title={`设置 ${roleName} 在项目 ${project.name} 中允许的查询范围`}
      destroyOnClose
      footer={(
        <div className="alignright">
          <Button
            type="ghost"
            icon={<CloseCircleOutlined />}
            className="mg1r iblock"
            onClick={onCancel}
          >取消</Button>
          <Button
            type="success"
            className="mg1r iblock"
            onClick={() => {
              onChange(pendingFilters)
              onCancel()
            }}
          >提交</Button>
        </div>
      )}
      width={700}
    >
      <Form>
        <FormItem
          {...formItemLayout}
          label="项目过滤条件"
        >
          <CommonDruidFilterPanel
            projectId={project.id}
            noDefaultDimension
            headerDomMapper={() => null}
            dataSourceId={project.datasource_id}
            filters={pendingFilters}
            onFiltersChange={setPendingFilters}
          />
        </FormItem>
      </Form>
    </Modal>
  )
}
