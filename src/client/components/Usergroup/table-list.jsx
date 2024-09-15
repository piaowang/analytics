import React from 'react'
import Link from '../Common/link-nojam'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { Icon as LegacyIcon } from '@ant-design/compatible'
import { Tooltip, Table, Button, Popover, Select, Popconfirm, Spin, message, Radio } from 'antd'
import moment from 'moment'
import Thumbs from './thumbs'
import { canViewInsight, urlBase, links, modelTypeMap } from './constants'
import { Auth, checkPermission } from '../../common/permission-control'
import { withCommonFilter } from '../Common/common-filter'
import smartSearch from '../../../common/smart-search'
import Icon from '../Common/sugo-icon'
import deepCopy from '../../../common/deep-copy'
import * as ls from '../../common/localstorage'
import { compressUrlQuery, isDiffByPath } from '../../../common/sugo-utils'
import _ from 'lodash'
import { getInsightUrlByUserGroup, isUserGroupCanNotEdit } from '../../common/usergroup-helper'
import AsyncHref from '../Common/async-href'
import { browserHistory } from 'react-router'
import showPopover from '../Common/free-popover'
import UserGroupExporter from './usergroup-exporter'
import { withDbDims } from '../Fetcher/data-source-dimensions-fetcher'
import { AccessDataType, DimDatasourceType, UserGroupBuildInTagEnum } from '../../../common/constants'
import EditTitle from './edit-title'
import { connect } from 'react-redux'
import { namespace } from './model'

const { Option } = Select
const listTypeLSKey = 'listType_ug'
const RadioButton = Radio.Button
const RadioGroup = Radio.Group
const { usergroupList } = window.sugo
const canAdd = checkPermission('/app/usergroup/create')

/**
 * 创建标签用户列表url
 * @param {object} params
 */
const createUserListUrl = (ug, isModel, type) => {
  return getInsightUrlByUserGroup(ug, isModel, type)
}

const getPopupContainer = () => document.querySelector('.scroll-content')

/**
 * 创建编辑用户群url
 * @param {object} params
 */
const createEditUrl = ug => {
  return `/console/usergroup/${ug.id}`
}

@connect(props => ({ ...props[namespace] }))
@withCommonFilter
export default class Uglist extends React.Component {
  state = {
    listType: ls.gets(listTypeLSKey) || usergroupList || 'thumb'
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (isDiffByPath(this.props, nextProps, 'projectCurrent')) {
      this.setState({
        listType: ls.gets(listTypeLSKey) || usergroupList || 'thumb'
      })
    }
  }

  onChangeListType = e => {
    let listType = e.target.value
    ls.set(listTypeLSKey, listType)
    this.setState({
      listType
    })
  }

  reCompute = ug => {
    let { id } = ug
    let params = deepCopy(ug.params)
    params.random = +new Date()
    let cb = res => {
      if (res) message.success('更新成功', 5)
    }
    this.props.updateUsergroup(id, { params }, cb)
  }

  renderTipsBtn = status => {
    const { showSettingModal, manualCalc } = this.props
    switch (status) {
      case 0:
      case 2:
      case 3:
        return (
          <Button type='primary' icon={<ReloadOutlined />} onClick={manualCalc}>
            分群计算
          </Button>
        )
      default:
        return (
          <Button type='primary' icon={<PlusOutlined />} onClick={showSettingModal}>
            模型设置
          </Button>
        )
    }
  }

  renderTips = status => {
    switch (status) {
      case 0:
        return '模型参数已设置，点击下面按钮开始计算分群'
      case 1:
        return '已设置模型参数，正在计算分群'
      case 3:
        return '分群计算失败，点击下面按钮重新计算分群'
      case 2:
        return '该分群下无数据，点击下面按钮重新计算分群'
      default:
        return '模型参数为空，请先设置模型参数'
    }
  }

  renderEmpty = tagsLimited => {
    // uindex 项目暂不支持创建行为用户群
    // let {projectCurrent} = this.props
    // let isUindexProject = !!projectCurrent.reference_tag_name
    const { isModel, showSettingModal, manualCalc, calcState = {}, selectedTagId = '' } = this.props
    const status = calcState[selectedTagId]
    return (
      <div className='relative' style={{ height: 'calc(100vh - 300px)' }}>
        <div className='center-of-relative aligncenter'>
          <p>
            <img src={`${urlBase}/ui-nothing.png`} alt='' className='iblock' />
          </p>
          <p className='font16 pd2y'>{isModel ? this.renderTips(status) : '当前项目暂无用户群, 请新建用户群'}</p>
          <div>
            {canAdd && !isModel ? (
              <Link to={`/console/usergroup/new?tags=${tagsLimited}`}>
                <Button type='primary' icon={<PlusOutlined />}>
                  新建用户群
                </Button>
              </Link>
            ) : null}
            {canAdd && isModel ? this.renderTipsBtn(status) : null}
          </div>
        </div>
      </div>
    )
  }

  renderListType() {
    return (
      <div className='itblock mg1l'>
        <RadioGroup
          onChange={this.onChangeListType}
          value={this.state.listType}
          // buttonStyle="solid"
        >
          <RadioButton value='thumb'>卡片</RadioButton>
          <RadioButton value='table'>列表</RadioButton>
        </RadioGroup>
      </div>
    )
  }

  renderFilters = KeywordInput => {
    return (
      <div className='pd2b line-height26' style={{ display: 'flex', alignItems: 'flex-end' }}>
        <KeywordInput placeholder='搜索用户群名称' className='itblock width200' />
        {this.renderListType()}
      </div>
    )
  }

  renderDetailLink = ug => {
    return (
      <Link className='pointer itblock mw240 elli mg2l' to={createUserListUrl(ug)}>
        <b>用户列表</b>
      </Link>
    )
  }

  renderThumb = (datasourceCurrent, usergroups, delUsergroup, updateUsergroup, createEditUrl, createUserListUrl, isLifeCycle, isModel, onSaveTitle, selectedTagId) => {
    return (
      <Thumbs
        {...{
          datasourceCurrent,
          usergroups,
          createEditUrl,
          createUserListUrl,
          reCompute: this.reCompute,
          delUsergroup,
          updateUsergroup,
          isLifeCycle,
          isModel,
          onSaveTitle,
          selectedTagId
        }}
      />
    )
  }

  showBehaviorLinksPopover = (dom, ug, links) => {
    let cleanUp = null
    let popoverContent = (
      <div className='width100'>
        {links.map((link, i) => {
          return (
            <Button
              key={i}
              className='width-100 mg1b'
              icon={<LegacyIcon type={link.icon} />}
              onClick={() => {
                cleanUp()
                browserHistory.push(`${link.url}?usergroup_id=${ug.id}`)
              }}
            >
              {link.title}
            </Button>
          )
        })}
      </div>
    )
    cleanUp = showPopover(dom, popoverContent, {
      placement: 'right',
      overlayClassName: 'dimension-popover-shortcut'
    })
  }

  onSaveTitle = (id, title, callback) => {
    // this.props.updateUsergroup(id, {title }, callback )
    const { dispatch, usergroupsModels, projectCurrent, selectedTagId } = this.props
    let titleResult = usergroupsModels[selectedTagId].result
    const type = modelTypeMap[selectedTagId]
    if (type === 0) {
      const index = _.get(titleResult, 'data.groups', []).findIndex(o => o.groupId === id)
      _.set(titleResult, `data.groups.${index}.title`, title)
    } else {
      const index = _.get(titleResult, 'data', []).findIndex(o => o.groupId === id)
      _.set(titleResult, `data.${index}.title`, title)
    }

    dispatch({
      type: `${namespace}/saveTitle`,
      payload: { projectId: projectCurrent.id, type, newResult: titleResult }
    })
  }

  renderList = (datasourceCurrent, usergroups0, delUsergroup, updateUsergroup, isModel) => {
    let { mainTimeDimName, isLifeCycle, usergroupsModels, selectedTagId } = this.props
    const pagination = {
      total: usergroups0.length,
      showSizeChanger: true,
      defaultPageSize: 30
    }

    let columns = [
      {
        title: '用户群',
        dataIndex: 'title',
        key: 'title',
        sorter: (a, b) => (a.title > b.title ? 1 : -1),
        render: (text, ug) => {
          if (!canViewInsight) {
            return (
              <div className='mw400 elli'>
                <b>{' ' + ug.title}</b>
                <Icon type='editor' />
              </div>
            )
          }
          let { description } = ug
          return (
            <Tooltip
              placement='topLeft'
              title={
                <div>
                  <div>点击查看用户群"{text}"的用户列表</div>
                  {description ? <div>{description}</div> : null}
                </div>
              }
            >
              <div className='ug-hover-con'>
                <div className='mw400 elli ug-title-editor'>
                  <EditTitle
                    isList
                    key={ug.id}
                    title={ug.title}
                    isShowEditIcon={isModel}
                    link={createUserListUrl(ug, isModel, modelTypeMap[selectedTagId])}
                    onOk={(title, cb) => this.onSaveTitle(isModel ? ug.groupId : ug.id, title, cb)}
                  />
                </div>
              </div>
            </Tooltip>
          )
        }
      },
      {
        title: (
          <Popover
            content={
              <div>
                <p>行为：由行为筛选或者上传建立的用户群</p>
                <p>标签：由标签筛选或者上传建立的用户群</p>
              </div>
            }
          >
            类型 <Icon type='question-circle-o' />
          </Popover>
        ),
        dataIndex: 'ug-type',
        key: 'ug-type',
        render: (text, ug) => {
          if (ug.id === 'all') {
            return '--'
          }
          let isOpenWithTagManager = _.get(ug, 'params.openWith') === 'tag-dict'
          return isOpenWithTagManager ? '标签' : '行为'
        }
      },
      {
        title: '用户群人数',
        key: 'params.total',
        sorter: (a, b) => a.params.total - b.params.total,
        render(text, ug) {
          return isModel ? `${ug.userCount} (${ug.userPercent})` : ug.params.total
        }
      },
      {
        title: '上一次计算时间',
        dataIndex: 'compute_time',
        key: 'compute_time',
        sorter: (a, b) => (a.compute_time > b.compute_time ? 1 : -1),
        render(text) {
          let m = moment(text)
          if (isModel) return moment(_.get(usergroupsModels, `${selectedTagId}.updated_at`)).format('YYYY-MM-DD HH:mm:ss')
          return m.isValid() ? m.format('YYYY-MM-DD HH:mm:ss') : text
        }
      },
      {
        title: <div className='aligncenter'>分析</div>,
        key: 'analysis',
        render: (text, ug) => {
          let { id, title: groupTitle } = ug

          const linkDisabled = _.includes(ug.tags, UserGroupBuildInTagEnum.UserGroupWithoutLookup)
          return (
            <div className='aligncenter'>
              {links.map((link, idx) => {
                let { title, icon, url, asyncUrl, children, linkDomMapper } = link

                const linkDom = (
                  <Tooltip title={title === '导出' ? `导出用户群“${groupTitle}”` : `查看“${groupTitle}”的${title}`} key={idx}>
                    <AsyncHref
                      initFunc={() => {
                        if (asyncUrl) {
                          return asyncUrl(ug, mainTimeDimName)
                        }
                        return url ? `${url}?usergroup_id=${id}` : ''
                      }}
                      component={Link}
                      className='color-grey pointer mg1r'
                      style={
                        linkDisabled
                          ? {
                              color: 'rgba(0, 0, 0, 0.25)',
                              background: '#f5f5f5',
                              pointerEvents: 'none'
                            }
                          : undefined
                      }
                      onClick={(to, ev) => {
                        if (_.isEmpty(children)) {
                          return
                        }
                        ev.stopPropagation()
                        ev.preventDefault()
                        this.showBehaviorLinksPopover(ev.target, ug, children)
                      }}
                    >
                      <Icon type={icon} />
                    </AsyncHref>
                  </Tooltip>
                )
                if (title !== '导出') {
                  return _.isFunction(linkDomMapper) ? linkDomMapper(linkDom, ug, idx) : linkDom
                } else {
                  return (
                    <UserGroupExporter userGroup={ug} key={idx}>
                      {({ loadingCsvData }) => {
                        return loadingCsvData ? <Icon type='loading' /> : linkDom
                      }}
                    </UserGroupExporter>
                  )
                }
              })}
            </div>
          )
        }
      },
      {
        title: <div className='aligncenter'>操作</div>,
        key: 'op',
        render: (text, ug) => {
          let { id = 'all', title, params } = ug
          return !isModel ? (
            <div className='aligncenter'>
              {id !== 'all' && params.createMethod !== 'by-upload' ? (
                <Auth auth='get:/app/usergroup/:id/recompute'>
                  <Tooltip title='重新计算用户群'>
                    <Icon type='reload' className='color-grey font16 mg2r' onClick={() => this.reCompute(ug)} />
                  </Tooltip>
                </Auth>
              ) : null}
              {id !== 'all' && !isUserGroupCanNotEdit(ug) ? (
                <Auth auth='app/usergroup/update'>
                  <Link to={createEditUrl(ug)}>
                    <Tooltip title='编辑'>
                      <Icon type='edit' className='color-grey font16 mg2r' />
                    </Tooltip>
                  </Link>
                </Auth>
              ) : null}
              {id !== 'all' && !isLifeCycle ? (
                <Auth auth='app/usergroup/delete'>
                  <Popconfirm
                    title={`确定删除用户群 "${title}" 么？`}
                    placement='topLeft'
                    onConfirm={() =>
                      delUsergroup(ug, res => {
                        if (res) {
                          message.success('删除成功')
                        } else {
                          message.warn('删除失败，请联系管理员')
                        }
                      })
                    }
                  >
                    <Tooltip title='删除'>
                      <Icon type='close-circle-o' className='font16 color-grey pointer' />
                    </Tooltip>
                  </Popconfirm>
                </Auth>
              ) : null}
              {/*{this.renderDetailLink(ug)}*/}
            </div>
          ) : null
        }
      }
    ]
    return <Table columns={columns} pagination={pagination} dataSource={usergroups0} bordered rowKey={record => record.id} size='small' />
  }

  renderContent = () => {
    let {
      delUsergroup,
      updateUsergroup,
      datasourceCurrent,
      keywordInput: KeywordInput,
      keyword,
      tagsLimited, // tag id array, empty means default tag
      validTags,
      isLifeCycle,
      isModel,
      usergroups0: usergroups,
      selectedTagId,
      mergedFilterCreator
    } = this.props
    let { listType } = this.state
    if (_.isEmpty(usergroups) && !keyword) {
      return this.renderEmpty(tagsLimited)
    }

    let usergroups0 = _.isArray(usergroups) ? usergroups.filter(ug => smartSearch(keyword, ug.title)) : []
    return (
      <div>
        {this.renderFilters(KeywordInput)}
        {listType === 'thumb'
          ? this.renderThumb(datasourceCurrent, usergroups0, delUsergroup, updateUsergroup, createEditUrl, createUserListUrl, isLifeCycle, isModel, this.onSaveTitle, selectedTagId)
          : this.renderList(datasourceCurrent, usergroups0, delUsergroup, updateUsergroup, isModel)}
      </div>
    )
  }

  render() {
    let { loading: propLoading, loadingProject } = this.props
    let loading = loadingProject || propLoading
    return (
      <div>
        <Spin spinning={loading}>{this.renderContent()}</Spin>
      </div>
    )
  }
}
