import React from 'react'
import PropTypes from 'prop-types'
import { ClockCircleOutlined, EditOutlined, SaveOutlined, SettingOutlined } from '@ant-design/icons';
import {Button, Popover} from 'antd'
import JobParamsEdit from '../monaco-editor/popover/job-params-edit'
import DateVarCheatSheet from '../monaco-editor/popover/date-var-cheatsheet'

const ToolBar = (props) => {
  const {
    showEditor,
    editor,
    goBack,
    jobParams,
    setParams,
    changeEditStatus,
    reduction,
    save
  } = props
  return (
    <div
      className='pd1b'
      style={{ height: '38px' }}
    >
      <Button
        className='mg1l'
        icon={<SaveOutlined />}
        onClick={save}
      >保存</Button>
      {
        !showEditor
          ? (
            <Button
              className='mg1l'
              icon={<EditOutlined />}
              onClick={editor}
            >编辑</Button>
          )
          : (<React.Fragment>
            {/* <Button
              className='mg1l'
              onClick={goBack}
            >
              <i className='anticon anticon-rollback' />
              返回
            </Button> */}
            <Popover
              content={<DateVarCheatSheet />}
              placement='rightTop'
              arrowPointAtCenter
              trigger='click'
            >
              <Button className='mg1l' icon={<ClockCircleOutlined />}>日期变量</Button>
            </Popover>
            <Popover overlayStyle={{ width: '350px' }}
              content={
                <JobParamsEdit
                  params={jobParams}
                  setParams={setParams}
                  reduction={reduction}
                  changeEditStatus={changeEditStatus}
                />
              }
              placement='rightTop'
              arrowPointAtCenter
              trigger='click'
              title={[
                <span key='title' className='font16 mg2r'>设置自定义参数</span>
              ]}
            >
              <Button className='mg1l' icon={<SettingOutlined />}>设置参数</Button>
            </Popover>
          </React.Fragment>)
      }
    </div>
  )
}

ToolBar.propTypes = {
  showEditor: PropTypes.bool,
  editor: PropTypes.func,
  goBack: PropTypes.func,
  jobParams: PropTypes.array,
  setParams: PropTypes.array,
  reduction: PropTypes.func,
  save: PropTypes.func,
  changeEditStatus: PropTypes.func
}

export default ToolBar
