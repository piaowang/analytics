import React from 'react'
import { AppstoreFilled, DeleteOutlined, PlusCircleFilled, QuestionCircleOutlined } from '@ant-design/icons';
import { Icon } from '@ant-design/compatible'
import { Button, Card, Input, Popconfirm, Popover, Spin } from 'antd';
import ListRender from './table-list'
import AddBtn from './add-btn'
import Bread from 'client/components/Common/bread'
import {withSizeProvider} from 'client/components/Common/size-provider'
import _ from 'lodash'
import HorizontalSplitHelper from 'client/components/Common/horizontal-split-helper'
import {withCommonFilter} from 'client/components/Common/common-filter'
import {withDataSourceTagsDec} from 'client/components/Fetcher/data-source-tags-fetcher'
import {TagTypeEnum, UserGroupBuildInTagEnum, UserGroupBuildInTags, AccessDataType} from 'common/constants'
import classNames from 'classnames'
import Fetch from 'client/common/fetch-final'
import smartSearch from 'common/smart-search'
import {modelType, modelTypeMap } from './constants'
import EditModal from '../marketing-model/edit'
import { connect } from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import UsergroupsModelSetting, {namespace } from './model'


let help = (
  <div className="pd2b">
    <p>用户群是可以通过用户的属性和行为来定义用户</p>
    <p>群，用户群是动态的，新满足条件的用户将自动</p>
    <p>划入用户群。如果在这里没有您想用的项目，请</p>
    <p>检查场景数据设置里的SessionID和用户行为维</p>
    <p>度是否填写了。</p>
  </div>
)
let extra = (
  <Popover content={help} trigger="hover" placement="bottomLeft">
    <QuestionCircleOutlined className="font14" />
  </Popover>
)


@withDataSourceTagsDec(props => {
  let dsId = _.get(props, 'datasourceCurrent.id') || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    type: TagTypeEnum.user_group
  }
})
@withCommonFilter
@connect(props => ({...props[namespace]}))
@withRuntimeSagaModel(UsergroupsModelSetting)
export default class UsergroupList extends React.Component {
  state = {
    selectedTagId: '', // EMPTY STRING 即是 default tag
    visiblePopoverKey: '',
    pendingTagName: '',
    isShowSettingModal: false,
    isEmpty: false
  }

  renderAddUserGroupTagBtn = () => {
    let {datasourceCurrent, reloadDataSourceTags} = this.props
    let {pendingTagName, visiblePopoverKey} = this.state
    let currDataSourceId = _.get(datasourceCurrent, 'id') || ''
    return (
      <Popover
        title="添加用户群分组"
        visible={visiblePopoverKey === 'addUserGroupTag'}
        onVisibleChange={visible => {
          this.setState({
            visiblePopoverKey: visible ? 'addUserGroupTag' : ''
          })
        }}
        content={
          <React.Fragment>
            <Input
              key="input"
              placeholder="未输入组名"
              value={pendingTagName}
              onChange={ev => this.setState({pendingTagName: ev.target.value})}
            />
            <div key="buttons" className="mg2t ant-popover-buttons">
              <Button
                size="small"
                onClick={() => this.setState({visiblePopoverKey: ''})}
              >取消</Button>
              <Button
                type="primary"
                size="small"
                onClick={async () => {
                  let res = await Fetch.post(`/app/tag/create/${currDataSourceId}`, {
                    name: pendingTagName,
                    type: TagTypeEnum.user_group,
                    projectId: currDataSourceId
                  })
                  if (res) {
                    await reloadDataSourceTags()
                    this.setState({
                      visiblePopoverKey: '',
                      pendingTagName: ''
                    })
                  }
                }}
              >确定</Button>
            </div>
          </React.Fragment>
        }
        trigger="click"
      >
        <PlusCircleFilled className="pointer font16" />
      </Popover>
    );
  }

  renderDelUserGroupTagBtn = (tag) => {
    let {reloadDataSourceTags} = this.props
    let {visiblePopoverKey} = this.state
    const popoverVisible = visiblePopoverKey === `deletingTag:${tag.id}`
    return (
      <Popconfirm
        title={(
          <React.Fragment>
            <div>确认删除 {tag.name} ？</div>
            <div className="color-red">分组里面的分群会移动到默认组</div>
          </React.Fragment>
        )}
        visible={popoverVisible}
        onConfirm={async () => {
          let res = await Fetch.post(`/app/tag/delete/${tag.id}`)
          if (res) {
            await reloadDataSourceTags()
          }
        }}
        onVisibleChange={visible => {
          if (!visible) {
            this.setState({visiblePopoverKey: ''})
          }
        }}
      >
        <DeleteOutlined
          className={popoverVisible ? '' : 'hover-display-iblock'}
          onClick={() => {
            this.setState({visiblePopoverKey: `deletingTag:${tag.id}`})
          }} />
      </Popconfirm>
    );
  }

  renderUserGroupTagList = withCommonFilter(commonFilter => {
    let {dataSourceTags, dispatch, projectCurrent, usergroupsModels = {}, calcState = {}, projectId = '' } = this.props
    let {selectedTagId} = this.state
    let {keywordInput: SearchBox, searching} = commonFilter
    return (
      <React.Fragment>
        <div style={{padding: '0 12px'}}>
          <div style={{padding: '21px 0 16px'}} className="alignright">
            <span className="fleft">用户群分组</span> {this.renderAddUserGroupTagBtn()}
          </div>
          <SearchBox placeholder="搜索..." />
        </div>

        <div style={{marginTop: '10px'}}>
          {[...UserGroupBuildInTags, ...dataSourceTags].filter(tag => searching ? smartSearch(searching, tag.name) : true).map(dbTag => {
            if (window.sugo.userGroupsClustering && dbTag.id !== 'fromUserTagFiltered') {  // 禁用用户分群时只保留 “标签圈选结果”
              return null
            }
            return (
              <div
                key={dbTag.id || 'default'}
                className={classNames('usergroup-tag-list-item fpointer alignright hover-display-trigger', {
                  active: (!selectedTagId ? !dbTag.id : dbTag.id === selectedTagId) 
                          || (window.sugo.userGroupsClustering && dbTag.id === 'fromUserTagFiltered') // 禁用用户分群时默认选用“标签圈选结果”
                })}
                onClick={() => {
                  this.setState({selectedTagId: dbTag.id})
                }}
              >
                <span className="fleft">
                  <AppstoreFilled className="mg1r" />{dbTag.name}
                </span>
                {!dbTag.id || _(UserGroupBuildInTagEnum).values().some(tId => dbTag.id === tId)
                  ? null : this.renderDelUserGroupTagBtn(dbTag)}
              </div>
            );
          })}
          {modelType.map(o => {
            return (
              <div
                key={o.id}
                className={classNames('usergroup-tag-list-item fpointer alignright hover-display-trigger', {
                  active: (!selectedTagId ? !o.id : o.id === selectedTagId)
                })}
                onClick={() => {
                  if(!projectCurrent.id ) return
                  this.setState({ selectedTagId: o.id }, () => {
                    if (!projectId) {
                      dispatch({
                        type: `${namespace}/changeState`,
                        payload: { projectId: projectCurrent.id || ''  }
                      })
                    }
                    if (JSON.stringify(usergroupsModels) === '{}') {
                      dispatch({
                        type: `${namespace}/getModelUsergroups`,
                        payload: { projectId: projectCurrent.id || ''  }
                      })
                    }
                    if (JSON.stringify(calcState) === '{}') {
                      dispatch({
                        type: `${namespace}/getCalcState`,
                        payload: { projectId: projectCurrent.id || ''  }
                      })
                    }
                  })
                }}
              >
                <span className="fleft">
                  <AppstoreFilled className="mg1r" />{o.name}
                </span>
              </div>
            );
          })}
        </div>
      </React.Fragment>
    );
  })

  renderMainContent = withSizeProvider(({spWidth}) => {
    return (
      <HorizontalSplitHelper style={{height: 'calc(100% - 44px)'}}>
        <div
          defaultWeight={275}
          className="height-100"
          style={{padding: '10px 5px 10px 10px'}}
        >
          <div className="bg-white height-100 corner">
            {this.renderUserGroupTagList()}
          </div>
        </div>
        <div
          defaultWeight={spWidth - 255}
          className="height-100"
          style={{padding: '10px 10px 10px 5px'}}
        >
          <div className="height-100 corner bg-white">
            {this.renderRightContent()}
          </div>
        </div>
      </HorizontalSplitHelper>
    )
  })

  deleteModel = (usergroups0) => {
    const {delUsergroup, dispatch, usergroupsModels } = this.props
    const {selectedTagId } = this.state
    // const models = modelType.map(o => o.id)
    // const index = models.indexOf(selectedTagId)
    dispatch({
      type: `${namespace}/remove`,
      payload: {id: usergroupsModels[selectedTagId].id || '' }
    })
    usergroups0.forEach(ug => {
      delUsergroup(ug, () => {})
    })
  }

  manualCalc = () => {
    const { dispatch, projectCurrent, usergroupsModels } = this.props
    const {selectedTagId } = this.state
    let projectId = _.get(projectCurrent, 'id') || ''
    // if((usergroupsModels[selectedTagId] || []).length) return
    const models = modelType.map(o => o.id)
    const index = models.indexOf(selectedTagId)
    dispatch({
      type: `${namespace}/manualCalc`,
      payload: {type: index, projectId }
    })
  }

  renderRightContent = () => {
    let props = this.props
    let {selectedTagId, isEmpty} = this.state
    // uindex 项目暂不支持创建行为分群
    let {projectCurrent, dataSourceTags, usergroups, datasourceCurrent, mergedFilterCreator, usergroupsModels } = props
    let isUindexProject = !!projectCurrent.reference_tag_name

    const isLifeCycle = selectedTagId === UserGroupBuildInTagEnum.UserGroupWithLifeCycle
    if (window.sugo.userGroupsClustering && !selectedTagId) {  // 禁用用户群行为分群默认选中 “标签圈选结果”
      selectedTagId = 'fromUserTagFiltered'
    }
    const models = modelType.map(o => o.id)
    const isModel = models.includes(selectedTagId)
    // 过滤得到分群
    let allUser = {
      title: '全部访问用户',
      id: 'all',
      druid_datasource_id: datasourceCurrent.id,
      params: {
        total: '--',
        openWith: projectCurrent.access_type === AccessDataType.Tag ? 'tag-dict' : null
      }
    }
    let arr = [
      allUser,
      ...usergroups
    ]
    const tagsLimited = [selectedTagId].filter(_.identity)
    const validTags = [...UserGroupBuildInTags.map(t => t.id), ...dataSourceTags.map(t => t.id)].filter(_.identity)
    // 按标签 id 限制
    if (tagsLimited) {
      if (_.isEmpty(tagsLimited)) {
        let validTagsSet = new Set(validTags)
        arr = arr.filter(ug => _.isEmpty(ug.tags) || _.every(ug.tags, tId => !validTagsSet.has(tId)))
      } else {
        let tagsSet = new Set(tagsLimited)
        arr = arr.filter(ug => _.some(ug.tags, tagId => tagsSet.has(tagId)))
      }
    }

    let mergedFilter = mergedFilterCreator(
      searching => ug => smartSearch(searching, ug.title),
      dsId => ug => ug.druid_datasource_id === dsId,
      datasourceCurrent.id
    )
    
    let usergroups0 = arr.filter(mergedFilter)
    const modelTypeObj = {}
    modelType.forEach(o => {
      modelTypeObj[o.id] = o.name
    })

    // console.log('9999999999', this.props.content)
    return (
      <Card
        title={<span>用户群列表 {extra}</span>}
        className="height-100 usergroup-list-card"
        bordered={false}
        extra={
          <AddBtn
            selectedTagId={selectedTagId}
            {...props} 
            disabled={isUindexProject}
            isModel={isModel}
            usergroups0={isModel? _.get(usergroupsModels, `${selectedTagId}.result.data${modelTypeMap[selectedTagId] === 0? '.groups': ''}`, []) : usergroups0}
            modelName={modelTypeObj[selectedTagId]}
            showSettingModal={() => this.setState({ isShowSettingModal: true })}
            deleteModel={() => this.deleteModel(usergroups0)}
            manualCalc={this.manualCalc}

          />}
      >
        <div className="scroll-content always-display-scrollbar relative">
          <Spin spinning={props.loading}>
            <div className="ug-wrapper relative" style={{ minHeight: 114 }}>
              <ListRender
                {...props}
                selectedTagId={selectedTagId}
                tagsLimited={tagsLimited}
                isLifeCycle={isLifeCycle}
                usergroups0={isModel? _.get(usergroupsModels, `${selectedTagId}.result.data${modelTypeMap[selectedTagId] === 0? '.groups': ''}`, []) : usergroups0}
                isModel={isModel}
                manualCalc={this.manualCalc}
                showSettingModal={() => this.setState({isShowSettingModal: true})}
              />
            </div>
          </Spin>
        </div>
      </Card>
    )
  }

  render() {
    const { isShowSettingModal, selectedTagId } = this.state
    return (
      <div className="height-100 contain-docs-analytic">
        <Bread path={[{ name: '用户群' }]} />
        {this.renderMainContent()}
        {
          isShowSettingModal
            ? <EditModal hide={() => this.setState({ isShowSettingModal: false })} {...this.props} type={(modelType.find(p => p.id === selectedTagId) || { key: 0 }).key} visible={isShowSettingModal} />
            : null
        }
      </div>
    )
  }
}
