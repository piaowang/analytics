import React, { useState, useEffect } from 'react'
import Bread from '../../Common/bread'
import HorizontalSplitHelper from '../../Common/horizontal-split-helper'
import { Radio } from 'antd';
import CreatePackage from './create'
import ShowPackage from './show'
import UploadPackage from './upload'
import cloneManagerModel, {namespace } from './model'
import { connect } from 'react-redux'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import { getUsers } from '../../../actions/users'


function CloneManager(props) {
  const {dispatch, users } = props
  const [currentTab, setCurrentTab] = useState(1)

  useEffect(() => {
    dispatch(getUsers())
  }, [])

  function changeTab(tab) {
    if (tab === 2) {
      return dispatch({
        type: `${namespace}/getClonePackages`,
        payload: {type: 1 }
      })
    }
    if(tab === 3) {
      dispatch({
        type: `${namespace}/getClonePackages`,
        payload: {type: 2 }
      })
      return dispatch({
        type: `${namespace}/getProjects`
      })
    }
  }

  return (
    <React.Fragment>
      <Bread
        path={[
          { name: '项目包克隆管理' }
        ]}
      />
      <HorizontalSplitHelper
        style={{ height: 'calc(100% - 44px)' }}
        className="contain-docs-analytic"
      >
        <div
          className="itblock height-100"
          style={{ padding: '10px' }}
          defaultWeight={5}
        >
          <div className="pd3x pd2y bg-white corner height-100 overscroll-y">
            <div className="mg3b">
              <Radio.Group
                value={currentTab}
                buttonStyle="solid"
                onChange={(e) => {
                  setCurrentTab(e.target.value)
                  changeTab(e.target.value)
                }}
              >
                <Radio.Button value={1}>创建克隆包</Radio.Button>
                <Radio.Button value={2}>克隆列表</Radio.Button>
                <Radio.Button value={3}>上传克隆包</Radio.Button>
              </Radio.Group>
            </div>
            {currentTab === 1 && <CreatePackage /> }
            {currentTab === 2 && <ShowPackage /> }
            {currentTab === 3 && <UploadPackage />}
          </div>
        </div>
      </HorizontalSplitHelper>
    </React.Fragment>
  )
}

export default connect(props => ({...props[namespace], ...props['common']}))(withRuntimeSagaModel(cloneManagerModel)(CloneManager)) 
