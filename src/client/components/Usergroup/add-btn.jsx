import {checkPermission} from '../../common/permission-control'
import React from 'react'
import { Link } from 'react-router'
import { PlusCircleOutlined,DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button,Popconfirm, message } from 'antd'
import _ from 'lodash'

const canAdd = checkPermission('/app/usergroup/create')

export default function AddBtn(props) {
  // eslint-disable-next-line react/prop-types
  const { selectedTagId: tags, isModel, showSettingModal, usergroups,  modelName, deleteModel, manualCalc } = props

  if (canAdd) {
    return !isModel
      ? <Link to={`/console/usergroup/new${!_.isEmpty(tags) ? `?tags=${tags}` : ''}`}>
        <Button type="primary">
          <PlusCircleOutlined />
          新建用户群
        </Button>
      </Link>
      : (
        <React.Fragment>
        
          {<Button type="primary" className="mg1r" onClick={manualCalc} ><ReloadOutlined />分群计算</Button>}
          <Button type="primary" className="mg1r" onClick={showSettingModal} >
            <PlusCircleOutlined />
            模型设置
          </Button>
          {/* </Link> */}
          {!!usergroups.length && (
            <Popconfirm
              title={`确定删除 "${modelName}"用户分群 么？`}
              placement="topLeft"
              onConfirm={() => deleteModel()}
            >
              <Button icon={<DeleteOutlined />} >删除</Button>
            </Popconfirm>
          )}
        </React.Fragment>
      ); 
  }
  return null
}

