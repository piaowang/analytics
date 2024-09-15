import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import '@ant-design/compatible/assets/index.css'
import { Input, Tooltip, Radio, Card, Button, Select, Switch, Form } from 'antd'

const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 16 }
}
const RadioGroup = Radio.Group
const { Option } = Select
export default function PageEditPanel(props) {
  const {
    panelHeight,
    editPageInfo,
    appMultiViews = [],
    canDelete,
    deletePageInfo,
    loading,
    currentPageView,
    chagePagePath,
    savePageInfo
  } = props
  const [pageNameType, setPageNameType] = useState('self')
  // 定义form
  const [form] = Form.useForm()
  // 保存事件
  const save = () => {
    form.validateFields()
      .then(values => {
        savePageInfo({
          // 是否当前保存的页面为h5页面
          isH5: currentPageView.isH5,
          ...values,
          page_name: pageNameType === 'self' ? values.page_name : ''
        })
      })
  }

  // 操作按钮
  const buttons = (
    <div>
      {canDelete && <Button onClick={deletePageInfo} loading={loading} type="danger" >删除</Button>}
      <Button className="mg1l" onClick={save} loading={loading} type="success" >保存</Button>
    </div>
  )

  useEffect(() => {
    return () => {
      form.resetFields()
    }
  }, [])

  useEffect(() => {
    form.setFieldsValue({ ...editPageInfo, page_name: editPageInfo.page_name || currentPageView.pageName })
  }, [editPageInfo])

  // 返回页面属性设置表单
  return (<Card title="页面设置" bodyStyle={{ padding: 5 }} className="page-edit" extra={buttons}>
    <div className="width-100 pd2t" style={{ height: panelHeight }}>
      <Form layout="horizontal" form={form} {...formItemLayout}>
        <FormItem
          name="page"
          label="页面路径"
        >
          {
            appMultiViews.length <= 1
              ? <Input disabled />
              : <Select onChange={(val) => chagePagePath(appMultiViews.find(p => p.path === val) || [])}>
                {
                  appMultiViews.map((p, i) => {
                    return (
                      <Option value={p.path} key={`url_${i}`}>
                        <Tooltip title={p.path}>{p.path}</Tooltip>
                      </Option>
                    )
                  })
                }
              </Select>
          }
        </FormItem>
        <FormItem label="页面名称">
          <Input.Group compact>
            <div className="mg1b">
              <RadioGroup
                value={currentPageView.isH5 ? pageNameType : 'self'}
                onChange={(e) => {
                  if (e.target.value === 'auto') {
                    form.setFieldsValue({ page_name: currentPageView.pageName })
                    setPageNameType('auto')
                    return
                  }
                  form.setFieldsValue({ page_name: currentPageView.pageName })
                  setPageNameType('self')
                }}
              >
                <Radio value="auto" disabled={!currentPageView.isH5}>自动设置</Radio>
                <Radio value="self">手动设置</Radio>
              </RadioGroup>
            </div>
            <FormItem
              name="page_name"
              noStyle
              rules={[{ required: true, message: '请输入页面名称' }]}
            >
              <Input readOnly={pageNameType === 'auto'} />
            </FormItem>
          </Input.Group>
        </FormItem>
        <FormItem name="is_submit_point" label={<Tooltip title="上报当前页面点击位置">上报点击位置</Tooltip>}>
          <Switch checkedChildren="允许" unCheckedChildren="禁止" />
        </FormItem>
        {
          // 只有h5 界面支持代码注入 页面加载完成执行js注入的代码
          currentPageView.isH5 && <FormItem name="code" label="注入h5代码">
            <Input.TextArea placeholder="仅支持HTML5页面" autosize={{ minRows: 4, maxRows: 8 }} />
          </FormItem>
        }
      </Form>
    </div>
  </Card>)
}

PageEditPanel.propTypes = {
  editPageInfo: PropTypes.object.isRequired,  //修改pageinfo
  deletePageInfo: PropTypes.func.isRequired,  //删除事件
  loading: PropTypes.bool.isRequired,         //按钮状态
  savePageInfo: PropTypes.func.isRequired,    //保存事件
  canDelete: PropTypes.bool.isRequired,       //在页面列表中才能删除
  panelHeight: PropTypes.string.isRequired,   //控件高度
  appMultiViews: PropTypes.array.isRequired,  //单个界面包含多view的集合
  chagePagePath: PropTypes.func.isRequired    //更改当前选中的页面
}
