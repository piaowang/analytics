//左侧看板列表
import React from 'react'
import { Tooltip, Tag, Button } from 'antd'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { SettingOutlined } from '@ant-design/icons'
import { withCommonFilter } from '../Common/common-filter'
import { Link, browserHistory } from 'react-router'
import smartSearch from '../../../common/smart-search'
import _ from 'lodash'
import { listPath } from './dashboard-common'
import { checkPermission } from '../../common/permission-control'
import helpLinkMap from 'common/help-link-map'
import Icon from '../Common/sugo-icon'
import { HasOverviewPermission, OverviewInDashboard } from './list'
import CopyDashboards from './copy-dashboards'
import DashboardCategoryModal, { buildCategory } from './dashboard-category'
import { Anchor } from '../Common/anchor-custom'

const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['startWith#/console/dashboards']

const currUserId = window.sugo.user.id

@withCommonFilter
export default class DashboardList extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      copyDashboardsVisible: false
    }
  }

  hideSetCategory = () => {
    const { reoloadDashBoardCategory, changeState } = this.props
    if (reoloadDashBoardCategory) {
      reoloadDashBoardCategory()
    }
    changeState({ setCategoryVisable: false })
  }

  setSlectCategory(val) {
    const { selectCategory, changeState } = this.props
    let newSelectCategory
    if (selectCategory.includes(val)) {
      newSelectCategory = selectCategory.filter(p => p !== val)
    } else {
      newSelectCategory = [...selectCategory, val]
    }
    changeState({ selectCategory: newSelectCategory, isClickCategory: true })
  }

  renderCategoryItem = (items, dashboardsMap) => {
    const { selectCategory, selectDashboard, dashboardId, changeState } = this.props
    const selectDashboardId = selectDashboard ? selectDashboard : dashboardId
    return _.sortBy(items, p => p.order).map(p => {
      const subKey = 'sub' + p.id
      let isActive = selectCategory.includes(p.id)
      let subChildren = []
      if (!p.dashboards.length && !p.children.length) {
        return null
      }
      if (isActive) {
        subChildren = p.dashboards.map(d => {
          if (!dashboardsMap[d]) return
          let { id, dashboard_title, created_by, params } = dashboardsMap[d]
          const childrenKey = id
          return (
            <div key={childrenKey + 'renderCategoryItem'} onClick={() => changeState({ selectDashboard: childrenKey })}>
              <Tooltip placement='right' key={`${childrenKey}-tip`} title={dashboard_title}>
                <Link key={`${childrenKey}-link`} to={`${listPath}/${id}`} className={`aside-menu relative ${childrenKey === selectDashboardId ? 'active' : ''}`}>
                  <div key={`${childrenKey}-menu`} className='width-100 elli aside-menu-txt'>
                    {!_.get(params, 'allowAddSlicesCrossProjects') ? null : (
                      <Tag key={`${childrenKey}-tag`} className='mg1r' color='#479cdf'>
                        看板
                      </Tag>
                    )}
                    {created_by === currUserId ? null : (
                      <Tag key={`${childrenKey}-tag2`} className='mg1r' color='#479cdf'>
                        分享
                      </Tag>
                    )}
                    <span>{dashboard_title}</span>
                  </div>
                </Link>
              </Tooltip>
            </div>
          )
        })
        if (p.children.length) {
          subChildren = _.concat(subChildren, this.renderCategoryItem(p.children, dashboardsMap))
        }
      }
      return (
        <div key={`${subKey}-root`}>
          <div key={subKey} className={'aside-menu relative '} onClick={() => this.setSlectCategory(p.id)}>
            <div className='aside-menu-txt'>
              {p.parent_id.length > 1 ? null : (
                <Tag className='mg1r' color='#479cdf'>
                  {p.type === 1 ? '项目' : '全局'}
                </Tag>
              )}
              {p.title}
            </div>
            {isActive ? (
              <MinusOutlined className='color-white vertical-center-of-relative right2 bold font14 fpointer' />
            ) : (
              <PlusOutlined className='color-white vertical-center-of-relative right2 bold font14 fpointer' />
            )}
            {isActive ? (
              <MinusOutlined className='color-white vertical-center-of-relative right2 bold font14 fpointer' />
            ) : (
              <PlusOutlined className='color-white vertical-center-of-relative right2 bold font14 fpointer' />
            )}
            {/* <Icon
            type={isActive ? 'minus' : 'plus'}
            className="color-white vertical-center-of-relative right2 bold font14 fpointer"
          /> */}
          </div>
          <div className='mg2l'>{subChildren}</div>
        </div>
      )
    })
  }

  renderCategoryTree = dashboardFilterPredicate => {
    let { dashboards, dashboardsCategory, projectCurrent = {} } = this.props

    let dashboards0 = _.orderBy(dashboards, d => (_.get(d.params, 'allowAddSlicesCrossProjects', 1) ? 0 : 1)).filter(dashboardFilterPredicate)
    let catrgoryList = []
    const dashboardsMap = _.keyBy(dashboards0, p => p.id)
    if (dashboards0.length) {
      catrgoryList = dashboardsCategory.map(p => ({ ...p, dashboards: p.dashboards.filter(d => _.keys(dashboardsMap).includes(d)) }))
      // catrgoryList = catrgoryList.filter(p => p.dashboards && p.dashboards.length)
      catrgoryList = buildCategory(catrgoryList, projectCurrent.id)
      catrgoryList = _.flatten(catrgoryList.map(p => p.children))
    }

    return this.renderCategoryItem(catrgoryList, dashboardsMap)
  }

  render() {
    let {
      keywordInput: KeywordInput,
      dashboards,
      datasourceCurrent,
      projectCurrent,
      searching,
      dashboardsCategory,
      dashboardId,
      setCategoryVisable,
      selectCategory,
      selectDashboard,
      changeState,
      projectList,
      reoloadDashBoardCategory
    } = this.props

    const { copyDashboardsVisible } = this.state

    const copyDashboardsCancel = () => this.setState({ copyDashboardsVisible: false })
    let dsId = datasourceCurrent.id
    let dashboardFilterPredicate = _.overEvery(
      _.compact([
        searching && (d => smartSearch(searching, d.dashboard_title)),
        d => {
          return d.datasource_id === dsId || _.get(d, 'params.allowAddSlicesCrossProjects', 1) || _.some(d.slices, s => s.druid_datasource_id === dsId)
        }
      ])
    )
    let dashboards0 = _.orderBy(dashboards, d => (_.get(d.params, 'allowAddSlicesCrossProjects') ? 0 : 1)).filter(dashboardFilterPredicate)
    let dashboards1 = dashboards.filter(d => {
      return d.datasource_id === dsId || _.get(d, 'params.allowAddSlicesCrossProjects', 1) || _.some(d.slices, s => s.druid_datasource_id === dsId)
    })
    let catrgoryList = []
    const dashboardsMap = _.keyBy(dashboards0, p => p.id)
    if (dashboards0.length) {
      catrgoryList = dashboardsCategory.map(p => ({ ...p, dashboards: p.dashboards.filter(d => _.keys(dashboardsMap).includes(d)) }))
      catrgoryList = catrgoryList.filter(p => p.dashboards && p.dashboards.length)
    }
    const hasCategory = _.flatten(dashboardsCategory.map(p => p.dashboards))
    const isNoCategory = selectCategory.includes('noCategory')
    const selectDashboardId = selectDashboard ? selectDashboard : dashboardId
    return (
      <div className='slice-pool height-100' style={{ overflowY: 'auto' }}>
        <div className='pd2x pd2t relative'>
          <div className='fix'>
            <div className='fleft pd1t'>
              数据看板
              <Anchor href={helpLink} target='_blank' className='mg1l' title='查看帮助文档'>
                <QuestionCircleOutlined />
              </Anchor>
            </div>
            <div className='fright'>
              <Button
                onClick={() => {
                  browserHistory.push('/console/dashboards/new')
                }}
              >
                新建看板
              </Button>
              {/*<DropOption menuOptions={menuOptions} />*/}
            </div>
          </div>
        </div>
        <div className='pool-search pd2x pd2t relative'>
          <KeywordInput placeholder='搜索看板' wait={500} />
        </div>
        <div className='pool-body'>
          <div className='aside-menus'>
            <div
              onClick={() => {
                changeState({ selectDashboard: 'creatDashboard' })
              }}
            >
              <Link
                onClick={() => {
                  changeState({ setCategoryVisable: true })
                }}
                className={`aside-menu relative depth-1 ${selectDashboardId === 'creatDashboard' ? 'active' : ''}`}
              >
                分类管理
                <SettingOutlined className='mg2l' />
              </Link>
            </div>
            <div
              onClick={() => {
                changeState({ selectDashboard: 'overview' })
              }}
            >
              {!OverviewInDashboard || !HasOverviewPermission || !window.sugo.disableOverview ? null : (
                <Link to={`${listPath}/overview`} className={`aside-menu relative depth-1 ${selectDashboardId === 'overview' ? 'active' : ''}`}>
                  <Tag className='mg1r' color='#479cdf'>
                    公共
                  </Tag>
                  概览看板
                </Link>
              )}
            </div>
            {this.renderCategoryTree(dashboardFilterPredicate)}
            <div className={'aside-menu relative depth-1 '} onClick={() => this.setSlectCategory('noCategory')}>
              <div className='aside-menu-txt'>未分类</div>
              {/* <Icon
                type={isNoCategory ? 'minus' : 'plus'}
                className="color-white vertical-center-of-relative right2 bold font14 fpointer"
              /> */}
            </div>
            {isNoCategory
              ? _.difference(
                  dashboards0.map(p => p.id),
                  hasCategory
                ).map(d => {
                  if (!dashboardsMap[d]) return
                  let { id, dashboard_title, created_by, params } = dashboardsMap[d]
                  const childrenKey = id
                  return (
                    <div key={childrenKey} onClick={() => changeState({ selectDashboard: childrenKey })}>
                      <Tooltip placement='right' key={id} title={dashboard_title}>
                        <Link to={`${listPath}/${id}`} className={`aside-menu relative depth-2 ${childrenKey === selectDashboardId ? 'active' : ''}`}>
                          <div className='width-100 elli aside-menu-txt'>
                            {!_.get(params, 'allowAddSlicesCrossProjects') ? null : (
                              <Tag className='mg1r' color='#479cdf'>
                                看板
                              </Tag>
                            )}
                            {created_by === currUserId ? null : (
                              <Tag className='mg1r' color='#479cdf'>
                                分享
                              </Tag>
                            )}
                            <span>{dashboard_title}</span>
                          </div>
                        </Link>
                      </Tooltip>
                    </div>
                  )
                })
              : null}
          </div>
        </div>
        <DashboardCategoryModal
          dashboardsCategory={dashboardsCategory}
          dashboards={dashboards1}
          projectCurrent={projectCurrent}
          setCategoryVisable={setCategoryVisable}
          hide={this.hideSetCategory}
        />
        <CopyDashboards
          reoloadDashBoardCategory={reoloadDashBoardCategory}
          visible={copyDashboardsVisible}
          onCancel={copyDashboardsCancel}
          projectCurrent={projectCurrent}
          projectList={projectList}
        />
      </div>
    )
  }
}
