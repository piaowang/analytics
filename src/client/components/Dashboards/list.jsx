import React from 'react'
import _ from 'lodash'
import DashboardForm from './dashboard-form'
import { browserHistory } from 'react-router'
import Link from '../Common/link-nojam'
import { listPath } from './dashboard-common'
import { PlusOutlined } from '@ant-design/icons'
import { Button, Row, Col, Spin } from 'antd'
import { Auth, checkPermission } from '../../common/permission-control'
import Icon from '../Common/sugo-icon'
import helpLinkMap from 'common/help-link-map'
import flatMenusType from '../../../common/flatMenus.js'
import { Anchor } from '../Common/anchor-custom'

const { cdn, docUrl, enableNewMenu, menus } = window.sugo
const helpLink = docUrl + helpLinkMap['startWith#/console/dashboards']
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`

export const HasOverviewPermission = checkPermission('/console/overview')
export const OverviewInDashboard = !(enableNewMenu
  ? _.includes(flatMenusType(menus), '/console/overview')
  : _.some(menus, mg => _.some(mg.children, subM => subM.path === '/console/overview')))

export default class DashboardList extends React.Component {
  componentDidMount() {
    // 如果概览在看版下，则直接跳转到概览页
    if (OverviewInDashboard && HasOverviewPermission) {
      this.redirect({ id: 'overview' })
    } else {
      this.goToFirstDashboard()
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!OverviewInDashboard || !HasOverviewPermission) {
      this.goToFirstDashboard(nextProps)
    }
  }

  goToFirstDashboard(props = this.props) {
    let { dashboards, datasourceCurrent } = props

    let firstDashboardOfCurrDs = _.find(dashboards, ds => ds.datasource_id === datasourceCurrent.id)
    if (firstDashboardOfCurrDs) {
      this.redirect(firstDashboardOfCurrDs)
    }
  }

  componentWillUnmount() {
    this.onRedirect = false
  }

  renderEmpty = () => {
    if (this.onRedirect) {
      return (
        <Spin>
          <p className='pd3' />
        </Spin>
      )
    }
    return (
      <div className='aligncenter scroll-content always-display-scrollbar'>
        <div className='bg-grey-f5 pd3 borderb'>
          <p className='pd3t' />
          <p className='pd3t'>
            <img src={`${urlBase}/ui-nothing.png`} alt='' className='iblock' />
          </p>
          <p className='pd2t'>当前项目还没有看板, 请新建数据看板</p>
          <div className='pd2t pd3b'>
            <Auth auth='/app/dashboards/create'>
              <Link to='/console/dashboards/new'>
                <Button type='primary' icon={<PlusOutlined />}>
                  新建数据看板
                </Button>
              </Link>
            </Auth>
          </div>
          <p className='pd3b' />
        </div>

        <p className='pd2t'>
          通过拖放建立好的单图来制作数据看板，以便快速查阅图表。
          <Anchor href={helpLink} target='_blank' title='查看帮助文档'>
            <Icon type='question-circle' />
          </Anchor>
        </p>
        <p className='pd2t pd3x alignleft'>
          <span className='mg1l'>看板案例：各个行业参保基数排序与对比</span>
        </p>
        <div className='pd3x'>
          <Row>
            {[1, 2, 3, 4].map(n => {
              return (
                <Col span={6} key={n + 'deg'}>
                  <div className='pd1'>
                    <img src={`${urlBase}/dashboard-examples/d0${n}.png`} alt='' className='iblock mw-100' />
                  </div>
                </Col>
              )
            })}
          </Row>
        </div>
      </div>
    )
  }

  redirect(inst) {
    this.onRedirect = true
    return browserHistory.replace(`${listPath}/${inst.id}`)
  }

  render() {
    let { dashboards, loadingProject, loading, datasourceCurrent } = this.props

    let dsId = datasourceCurrent && datasourceCurrent.id
    if (!loadingProject && !loading && !this.onRedirect && !_.some(dashboards, b => b.druid_datasource_id === dsId)) {
      return this.renderEmpty()
    }

    return <DashboardForm {...this.props} />
  }
}
