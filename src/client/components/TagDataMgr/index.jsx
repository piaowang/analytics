import React from 'react'
import Bread from '../Common/bread'
import {Tabs} from 'antd'
import TagHQLList from '../Project/tag-hql-manage'
import UserTagUpdateByUserGroupMgr from './user-tag-update-by-ug-mgr'
import HoverHelp from '../Common/hover-help'
import ImportHistoryList from './import-history'
import _ from 'lodash'
import { AccessDataType, getNewFlatMenus } from '../../../common'

const { TabPane } = Tabs

const {cdn} = window.sugo
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`

// 有用户分群菜单才显示分群建标签菜单

let menus = window.sugo.enableNewMenu ? getNewFlatMenus(window.sugo.menus) : _.flatMap(window.sugo.menus || [], m => _.map(m.children, p => p.path))
const showUserGroupMgr = menus.includes('/console/usergroup')

export default class TagDataMgr extends React.Component {

  notok() {
    return (
      <div
        className="relative"
        style={{ height: 'calc(100vh - 200px)' }}
      >
        <div className="center-of-relative aligncenter">
          <p>
            <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
          </p>
          <div className="pd2t">
            这个项目不是由标签系统创建的，不能使用标签数据管理，请切换到由标签系统创建的项目。
          </div>
        </div>
      </div>
    )
  }

  importData = () => {
    return this._tagHqlList && this._tagHqlList.store && this._tagHqlList.store.dataImport()
  }

  render() {
    let { projectCurrent={}, tagProject } = this.props
    if (AccessDataType.Tag !== projectCurrent.access_type) {
      return this.notok()
    }
    return (
      <div className="height-100 bg-white">
        <Bread
          path={[
            {
              name: tagProject.id !== projectCurrent.id
                ? <HoverHelp placement="right" icon="link" addonBefore="标签数据管理 " content={`已关联标签项目【${tagProject.name}】`} />
                : '标签数据管理'
            }
          ]}
        />

        <Tabs
          type="card"
          className="pd2y pd3x"
          // tabBarExtraContent={(
          //   <Auth auth="app/tag-hql/data-import">
          //     <div className="relative width120">
          //       {'\u00a0'}
          //       <Button
          //         className="absolute"
          //         type="primary"
          //         style={{top: '-4px', right: 0}}
          //         onClick={() => this._tagHqlList && this._tagHqlList.store.dataImport()}
          //       >标签数据导入</Button>
          //     </div>
          //   </Auth>
          // )}
        >
          {
            !showUserGroupMgr ? null : (
              <TabPane tab="用户群定义标签" key="1">
                <UserTagUpdateByUserGroupMgr />
              </TabPane>
            )
          }

          <TabPane
            forceRender
            tab="SQL 计算标签"
            key="2"
          >
            <TagHQLList ref={ref => this._tagHqlList = ref} {...this.props} />
          </TabPane>
          {
            sugo.enableTagUploadHistory
              ? <TabPane
                forceRender
                tab="标签数据导入"
                key="3"
              >
                <ImportHistoryList
                  importData={this.importData}
                  // 如果存在子项目，优先取子项目parent_id
                  projectId={projectCurrent.parent_id || projectCurrent.id}
                />
              </TabPane>
              : null
          }
        </Tabs>
      </div>
    )
  }
}
