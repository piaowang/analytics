import React from 'react'
import { TagsOutlined } from '@ant-design/icons';
import { Card, Spin, Radio, Tooltip } from 'antd';
import Bread from 'client/components/Common/bread'
import _ from 'lodash'
import { browserHistory } from 'react-router'
import Store from './store/single-user'
import TagTypeListRender from './tag-type-list'
import checkProjectType from './tag-require'
import {DisplayTabNameDict, DisplayTabsEnum} from './store/single-user/view-model'
import classNames from 'classnames'
import {withSizeProvider} from '../Common/size-provider'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import {TAG_PANEL_WIDTH} from './tag-manager-form'
import {patchPush} from '../../common/patch-url'
import userIcon from '../../images/user.png'
import UserInspect from '../Usergroup/user-inspect'
import {isDiffByPath} from '../../../common/sugo-utils'

const {Group: RadioGroup, Button: RadioButton} = Radio

export default class SingleUser extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    this.state = this.store.getState()
  }

  componentDidMount() {
    let pId = _.get(this.props.projectCurrent, 'id')
    let { id: userId } = this.props.params
    if (pId && userId) {
      let userDimName = _.get(this.props, 'location.query.userDimName')
      this.store.initViewListModel(this.props.projectCurrent, this.props.datasourceCurrent, userDimName, userId)
    }
  }

  componentWillReceiveProps(nextProps) {
    let { id: userId } = this.props.params

    let pId = _.get(this.props.projectCurrent, 'id')
    let userDimName = _.get(nextProps, 'location.query.userDimName')
    
    if (isDiffByPath(this.props, nextProps, 'projectCurrent.id')) {
      if (!pId) {
        this.store.initViewListModel(nextProps.projectCurrent, nextProps.datasourceCurrent, userDimName, userId)
      } else {
        browserHistory.push('/console/usergroup')
      }
    } else if (isDiffByPath(this.props, nextProps, 'location.pathname')) {
      this.store.initViewListModel(nextProps.projectCurrent, nextProps.datasourceCurrent, userDimName, userId)
    }
  }

  renderChild = (props) => {
    let { dimensions } = this.state.vm
    return (<div className="tag-single-prop-panel relative">
      {
        props.map((p, i) => {
          let dimension = _.find(dimensions, d => d.name === p.id)
          if (!dimension) return
          return (
            <div className="tag-single-prop-item font14 " key={p.id}>
              <div className="tag-single-item-line tag-single-item-line-props" />
              <div className="tag-single-item-prop-box">
                {dimension.title || dimension.name}
              </div>
              <div className="tag-single-item-value-box">
                <div className="tag-single-item-value">{_.truncate(p.value, 14)}</div>
                <div className="tag-single-item-value-dot" />
              </div>
            </div>
          )
        })
      }
    </div>)
  }

  renderTagValues = withSizeProvider(({spWidth, spHeight}) => {
    let { projectCurrent } = this.props
    let { uuidFieldName,
      data,
      dimensions,
      activeChildIds,
      loading,
      types,
      tagTypes,
      activeTreeIds,
      tagTrees = [],
      singleData,
      dimNameDict
    } = this.state.vm
    let [vLineTop, vlineHeight] = [0, 0]
    let { id } = this.props.params
    let dataKeys = _.orderBy(_.keys(data), p => _.findIndex(tagTrees, t => t.id === p))
    let props1 = {
      ...this.props,
      tagTypes,
      types,
      dimensions
    }
    let dict = tagTrees.reduce((p, v) => {
      return {
        ...p,
        [v.id]: v
      }
    }, {})
    let content = _.isEmpty(singleData)
      ? (<div className="color-red font14 aligncenter width-100 mg2t">查无此用户</div>)
      : _.map(dataKeys, (k, i) => {
        let height = data[k].length * 42 + 10
        let obj = dict[k] || { name: '未分类' }
        if (i === 0) {
          vLineTop = 105
          vlineHeight = (height / (dataKeys.length === 1 ? 2 : 1) + 30)
        } else if (dataKeys.length === i + 1) {
          vlineHeight += height / 2 + 15
        } else {
          vlineHeight += height + 15
        }
        return (
          <div className="tag-single-item-panel relative" key={'tag' + i}>
            <div className="tag-single-tag-panel relative" >
              <div className="tag-single-item-line tag-single-item-line-title" />
              <div className="tag-single-item-dot tag-single-item-dot-title" />
              <div
                className="tag-single-item-title-box elli"
                style={{ height: `${height}px`, lineHeight: `${height}px` }}
              >
                <TagsOutlined className="color-purple mg1r" />
                <Tooltip
                  title={obj.name}
                  placement="topLeft"
                >
                  {obj.name}
                </Tooltip>
              </div>
            </div>
            {
              this.renderChild(data[k])
            }
          </div>
        );
      })
    let activeChildIds0 = activeChildIds || _.take(_.get(types, '[0].children', []).map(dbDim => dbDim.id), 1)
    return (
      <Spin spinning={loading}>
        <HorizontalSplitHelper
          style={{height: spHeight - 51}}
          collapseWidth={125}
        >
          <TagTypeListRender
            defaultWeight={TAG_PANEL_WIDTH}
            {...props1}
            className="itblock height-100 no-active-underline"
            onClickTitle={obj => {
              let { treeId, id, typeTitle } = obj
              let {activeTreeIds, activeChildIds} = this.state.vm
              let update = !typeTitle
                ? {
                  activeTreeIds:  activeTreeIds.includes(treeId)
                    ? activeTreeIds.filter(dimId => dimId !== treeId)
                    : [...activeTreeIds, treeId]
                }
                : {
                  activeChildIds: id
                    ? (_.includes(activeChildIds, id)
                      ? activeChildIds.filter(dimId => dimId !== id)
                      : [...(activeChildIds || activeChildIds0), id])
                    : activeChildIds
                }
              this.store.changeState(update, projectCurrent.id)
            }}
            activeTreeIds={activeTreeIds}
            tagTrees={tagTrees}
            activeChildIds={activeChildIds0}
          />
          <div
            defaultWeight={spWidth - TAG_PANEL_WIDTH}
            className="height-100"
            style={{paddingBottom: '10px'}}
          >
            <div className="tag-single-user height-100">

              <div className="tag-setion-wrap height-100" >
                <Card
                  title="个人画像"
                  style={{ minHeight: Math.max(729, window.innerHeight) - 48 - 44 - 66 - 53 - 20 }}
                  className="height-100"
                  bodyStyle={{overflowY: 'auto', height: 'calc(100% - 48px)', position: 'relative'}}
                >
                  <div className="tag-single-title pd2 font14 corner">
                    <img className="tag-enhance-edit-arrows-img" src={userIcon} />
                    <span className="pd2l">
                      {!_.isEmpty(dimNameDict)
                      && uuidFieldName in dimNameDict
                      && _.get(dimNameDict, [uuidFieldName, 'title']) || uuidFieldName}：{id}
                    </span>
                  </div>
                  <div className="tag-single-context">
                    {
                      loading ? null : content
                    }
                  </div>
                  <div
                    className="tag-single-item-line-vertical"
                    style={{
                      top: vLineTop,
                      height: vlineHeight
                    }}
                  />
                  {
                    !dataKeys.length
                      ? null
                      : <div
                        className="tag-single-item-line-icon"
                        />
                  }
                </Card>
              </div>
            </div>
          </div>
        </HorizontalSplitHelper>
      </Spin>
    )
  })
  
  render() {
    let { id: userId } = this.props.params
    let { uuidFieldName, displayTabName} = this.state.vm

    let { loadingProject, datasourceCurrent, projectCurrent } = this.props
    let datasourceSettingsNeededHint, onlyForUserActionInspect = false
    if (!loadingProject) {
      datasourceSettingsNeededHint = checkProjectType({
        datasourceCurrent,
        projectCurrent,
        moduleName: '用户画像功能'
      })
      onlyForUserActionInspect = !!datasourceSettingsNeededHint
    }

    let ugId = _.get(this.props, 'location.query.ugId')
    let userDimName = _.get(this.props, 'location.query.userDimName')
    return (
      <div className="height-100 bg-white tag-manager-single-user">
        <Bread
          path={
            ugId
              ? [{name: '用户群'}, {name: '用户列表'}, { name: '用户详情' }]
              : [{name: '用户列表'}, { name: '用户详情' }]
          }
        >
          {/* <div className="fright">
           <Button
           icon="sugo-back"
           onClick={() => browserHistory.goBack()}
           >返回到用户列表</Button>
           </div> */}
        </Bread>

        <div
          className="contain-docs-analytic"
          style={{height: 'calc(100% - 44px)'}}
        >
          <RadioGroup
            className={classNames('block mg2x pd2t mg1b', {hide: onlyForUserActionInspect})}
            onChange={ev => {
              let val = ev.target.value
              let { id: userId } = this.props.params
              let nextUrl = val === DisplayTabsEnum.userActions
                ? `/console/inspect-user/${userId}`
                : `/console/tag-users/${userId}`
              patchPush(nextUrl)
            }}
            value={displayTabName}
          >
            {_.keys(DisplayTabsEnum).map(tabName => {
              return (
                <RadioButton key={tabName} value={tabName}>{DisplayTabNameDict[tabName]}</RadioButton>
              )
            })}
          </RadioGroup>
  
          {displayTabName === DisplayTabsEnum.tagValues
            ? datasourceSettingsNeededHint || this.renderTagValues()
            : (
              <UserInspect
                style={{height: onlyForUserActionInspect ? '100%' : 'calc(100% - 53px)'}}
                userId={userId}
                userDimName={userDimName}
              />
            )}
          
        </div>
      </div>
    )
  }
}
