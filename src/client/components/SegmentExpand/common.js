/*
 * 公用功能装饰器
 */
import { TeamOutlined } from '@ant-design/icons';

import { message } from 'antd';
import Link from '../Common/link-nojam'
import {getInsightUrlByUserGroup} from '../../common/usergroup-helper'

//另存为分群的提示
export const alertSaveAsSuccess = function (cls) {
  cls.prototype.alertSaveAsSuccess = function(ug) {
    let msg = (
      <span>
        保存为分群成功
        <Link to={getInsightUrlByUserGroup(ug)} >
          <TeamOutlined className="mg1r" />
          查看分群
        </Link>
      </span>
    )
    message.success(msg, 15)
  }
}
