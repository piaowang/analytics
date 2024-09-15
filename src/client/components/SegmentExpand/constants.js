import {checkPermission} from '../../common/permission-control'
import { TeamOutlined } from '@ant-design/icons';
import { message } from 'antd';
import Link from '../Common/link-nojam'
import {getInsightUrlByUserGroup} from '../../common/usergroup-helper'

export const propsToSubmit = [
  'usergroup_id',
  'title',
  'datasource_id',
  'params',
  'description'
]

export const canVisitUsergroup = true // TODO 细查已经去掉，重新实现权限控制 checkPermission({ path: '/console/insight' })

export function alertSaveAsSuccess(inst) {
  inst.prototype.alertSaveAsSuccess = function(ug) {
    let msg = (
      <span>
        <span className="mg2r">保存为分群成功</span>
        <Link to={getInsightUrlByUserGroup(ug)} >
          <TeamOutlined />查看分群用户
        </Link>
      </span>
    )
    message.success(msg, 15)
  }
}

export const canEdit = checkPermission('/console/segment-expand/:seId')
export const canCreateUsergroup = checkPermission('/app/usergroup/create')
