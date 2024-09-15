import React from 'react'
import Link from '../Common/link-nojam'
import { Icon as LegacyIcon } from '@ant-design/compatible';
import {Button, Col, message, Popconfirm, Row, Tooltip, Input} from 'antd'
import Icon from '../Common/sugo-icon'
import moment from 'moment'
import _ from 'lodash'
import {Auth} from '../../common/permission-control'
import {canViewInsight, links} from './constants'
import {defaultFormat} from '../../../common/param-transform'
import {getInsightUrlByUserGroup} from 'client/common/usergroup-helper'
import {isUserGroupCanNotEdit} from '../../common/usergroup-helper'
import {withSizeProviderDec} from '../Common/size-provider'
import AsyncHref from '../Common/async-href'
import showPopover from '../Common/free-popover'
import {browserHistory} from 'react-router'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import UserGroupExporter from './usergroup-exporter'
import classNames from 'classnames'
import {UserGroupBuildInTagEnum} from '../../../common/constants'
import EditTitle from './edit-title'
import  {namespace } from './model'
import { modelTypeMap } from './constants'
import { connect } from 'react-redux'

const fmt = defaultFormat()

const TARGET_CARD_WIDTH = 366
const CARD_GUTTER = 15
@connect(props => ({...props[namespace]}))
@withContextConsumer(ContextNameEnum.ProjectInfo)
@withSizeProviderDec()
export default class UsergroupThumbs extends React.Component {
  state = {
  }

  showBehaviorLinksPopover = (dom, ug, links) => {
    let cleanUp = null
    let popoverContent = (
      <div className="width100">
        {links.map((link, i) => {
          return (
            <Button
              key={i}
              className="width-100 mg1b"
              icon={<LegacyIcon type={link.icon} />}
              onClick={() => {
                cleanUp()
                browserHistory.push(`${link.url}?usergroup_id=${ug.id}`)
              }}
            >{link.title}</Button>
          );
        })}
      </div>
    )
    cleanUp = showPopover(dom, popoverContent, {
      placement: 'right',
      overlayClassName: 'dimension-popover-shortcut'
    })
  }


  renderItem = (ug, index, cardWidth) => {
    let {createUserListUrl, mainTimeDimName, isLifeCycle, isModel, onSaveTitle, usergroupsModels, selectedTagId } = this.props
    let {id, title, compute_time, params} = ug

    let time = moment(isModel? _.get(usergroupsModels, `${selectedTagId}.updated_at`) : compute_time).format(fmt)
    const linkDisabled = _.includes(ug.tags, UserGroupBuildInTagEnum.UserGroupWithoutLookup)
    return (
      <div className={`ug-thumb pd2x ug-thumb-${id} ug-hover-con`}   >
        <Tooltip title={title}  >
          <h2 className="pd1b pd2t mg0 aligncenter bold">
            {
              canViewInsight
                ? <span className="ug-title-editor">
                  {/* <a><Icon type="sugo-user" /></a> */}
                  <EditTitle
                    key={ug.id} 
                    title={title}
                    isShowEditIcon={isModel}
                    link={createUserListUrl(ug, isModel, modelTypeMap[selectedTagId])}
                    onOk={(title, cb) => onSaveTitle(isModel? ug.groupId: ug.id, title, cb)}
                  />
                </span>
                : title
            }
          </h2>
        </Tooltip>
        <div className="ug-thumb-count pd1y font14 aligncenter">
          {id !== 'all' ? `人数： ${isModel? `${ug.userCount} (${ug.userPercent})` :_.get(ug, 'params.total')}` : null} 
        </div>
        <div className="ug-thumb-links pd2y aligncenter">
          {links.map((link, i, arr) => {
            let {title, url, icon, asyncUrl, children, linkDomMapper} = link
            const pd = 16, mg = 10
            let count = arr.length || 1
            let style = {
              width: (cardWidth - (count - 1) * mg - pd * 2 - 5) / count,
              marginRight: i === count - 1 ? 0 : mg
            }

            const linkDom = (
              <AsyncHref
                key={i}
                style={style}
                className={classNames(`ug-thumb-link ug-thumb-link${i} pointer elli`, { disabled: linkDisabled })}
                initFunc={() => {
                  if (asyncUrl) {
                    return asyncUrl(ug, mainTimeDimName)
                  }
                  return url ? `${url}?usergroup_id=${id || 'all'}` : ''
                }}
                component={Link}
                onClick={(to, ev) => {
                  if (_.isEmpty(children)) {
                    return
                  }
                  ev.stopPropagation()
                  ev.preventDefault()
                  this.showBehaviorLinksPopover(ev.target, ug, children)
                }}
                title={title}
              >
                <span className="ug-thumb-link-text">{title}</span>
                <Icon type={icon} className="ug-thumb-link-icon font20" />
              </AsyncHref>
            )
            return _.isFunction(linkDomMapper) ? linkDomMapper(linkDom, ug, i) : linkDom
          })}
        </div>
        <div className="ug-thumb-footer fix pd2y bordert">
          {
            compute_time || _.get(usergroupsModels, `${selectedTagId}.updated_at`)
              ? <Tooltip title={`上次更新时间 ${time}`} >
                <div className="fleft">
                  <Icon type="clock-circle-o" /> {time}
                </div>
              </Tooltip>
              : null
          }
          {!isModel
            ? <div className="fright">
              {/*{canViewInsight ? <Link to={to} className="color-grey pointer">用户列表</Link> : null}*/}
              {id !== 'all' && params.createMethod !== 'by-upload' ? this.renderRecomputeBtn(ug) : null}
              {id !== 'all' && !isLifeCycle && !isUserGroupCanNotEdit(ug) ? this.renderEditBtn(ug) : null}
              {id !== 'all' && !isLifeCycle ? this.renderDelBtn(ug) : null}
            </div>
            : null}
        </div>
      </div>
    )
  }

  renderRecomputeBtn(ug) {
    return (<Auth auth="get:/app/usergroup/:id/recompute">
      <Tooltip title="重新计算分群">
        <Icon
          type="reload"
          className="color-grey mg1x pointer"
          onClick={() => this.props.reCompute(ug)}
        />
      </Tooltip>
    </Auth>)
  }

  renderEditBtn(ug) {
    let {createEditUrl} = this.props
    return (<Auth auth={'app/usergroup/update'}>
      <Link
        to={createEditUrl(ug)}
        className="mg1l color-grey pointer"
      >编辑</Link>
    </Auth>)
  }

  renderDelBtn(ug) {
    let {delUsergroup} = this.props
    return (<Auth auth="app/usergroup/delete">
      <Popconfirm
        title={`确定删除用户分群 "${ug.title}" 么？`}
        placement="topLeft"
        onConfirm={() => delUsergroup(ug, (res) => {
          if (res) {
            message.success('删除成功')
          } else {
            message.warn('删除失败，请联系管理员')
          }
        })}
      >
        <span className="color-grey pointer mg1l">删除</span>
      </Popconfirm>
    </Auth>)
  }

  render () {
    let {spWidth} = this.props

    // 根据 spWidth，算出最佳的 span，使得卡片的宽度最接近 TARGET_CARD_WIDTH
    // rowCount = Math.floor(24/span) // 1 2 3 4 6 8 12
    // spWidth = rowCount * cardWidth + (rowCount - 1) * CARD_GUTTER
    // cardWidth = (spWidth - (rowCount - 1) * CARD_GUTTER) / rowCount
    // cardWidth = (spWidth - rowCount * CARD_GUTTER + CARD_GUTTER) / rowCount
    // costFn = Math.abs(TARGET_CARD_WIDTH - cardWidth)

    let bestSpan = _([4, 6, 8, 12]).chain()
      .map(span => {
        let rowCount = Math.floor(24/span)
        let cardWidth = (spWidth - rowCount * CARD_GUTTER + CARD_GUTTER) / rowCount
        let cost = Math.abs(TARGET_CARD_WIDTH - cardWidth)
        return { span, cost }
      }).orderBy(o => o.cost).first().get('span').value()

    let finalRowCount = Math.floor(24/bestSpan)
    let finalCardWidth = (spWidth - finalRowCount * CARD_GUTTER + CARD_GUTTER) / finalRowCount
    return (
      <Row className="usergroup-thumbs" gutter={CARD_GUTTER}>
        {this.props.usergroups.map((ug, i) => {
          return (
            <Col span={bestSpan} key={i}>
              {this.renderItem(ug, i, finalCardWidth)}
            </Col>
          )
        })}
      </Row>
    )
  }
}
