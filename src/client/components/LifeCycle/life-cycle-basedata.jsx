import React, { Component } from 'react'
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { Radio, DatePicker, Popover, Divider, Button } from 'antd'
import { connect } from 'react-redux'
import {browserHistory} from 'react-router'
import { namespace } from './store/life-cycle'
import { UNTILTYPE } from './store/constants'
import DataBaseDiagram from './life-cycle-databasediagram'
import { links } from '../Usergroup/constants'
import UserGroupExporter from '../Usergroup/usergroup-exporter'
import {UserGroupBuildInTagEnum} from '../../../common/constants'
import {defaultFormat} from '../../../common/param-transform'
import showPopover from '../Common/free-popover'
import AsyncHref from '../Common/async-href'
import Icon from '../Common/sugo-icon'
import classNames from 'classnames'
import Link from '../Common/link-nojam'
import moment from 'moment'

const fmt = defaultFormat()

const RadioGroup = Radio.Group
const RadioButton = Radio.Button

@connect(state => ({
  ...state[namespace]
}))
class LCBaseData extends Component {

  state = {
    since: moment(),
    until: moment().add(-7, 'd'),
    untilType: 'preWeek',
    diagram: 'userCount'
  }

  componentDidMount() {
    const { dataBase: { since, until, untilType } } = this.props
    this.setState({
      since,
      until,
      untilType
    })
  }

  componentWillReceiveProps(nextProps) {
    const { dataBase: { untilType: nextType, until } } = nextProps
    const { dataBase: { untilType: sinceType } } = this.props
    if (!_.isEqual(nextType, sinceType)) {
      this.setState({
        untilType: nextType,
        until
      })
    }
  }

  changeProps(payload) {
    const { dataBase } = this.props
    this.props.dispatch({
      type: `${namespace}/setState`,
      payload: {
        dataBase: {
          ...dataBase,
          ...payload
        }
      }
    })
  }

  dispatch(func, payload = '') {
    this.props.dispatch({
      type: `${namespace}/${func}`,
      payload
    })
  }

  renderTimeBox() {
    const { since, until, untilType } = this.state
    return (
      <div className="height40">
        <div className="fleft">
          时间:
          <DatePicker
            className="width200 mg2r"
            value={since}
            format={'YYYY-MM-DD'}
            onChange={(v) => {
              this.setState({
                since: v,
                untilType: UNTILTYPE.preDay,
                until: _.cloneDeep(v).add(-1, 'd')
              })
            }}
          />
        </div>
        <div className="fleft">
          对比:
          <RadioGroup 
            value={untilType}
            onChange={(e) => {
              let type = e.target.value
              let nextUntil = _.cloneDeep(since)
              if (type === UNTILTYPE.preDay) {
                nextUntil = nextUntil.add(-1, 'd')
              } else if (type === UNTILTYPE.preWeek) {
                nextUntil = nextUntil.add(-7, 'd')
              } else if (type === UNTILTYPE.DIY) {
                nextUntil = _.cloneDeep(until)
              }
              this.setState({
                untilType: type,
                until: nextUntil
              })
            }}
          >
            <Radio value="preDay">前一日</Radio>
            <Radio value="preWeek">上周同期</Radio>
            <Radio value="DIY">指定日期</Radio>
          </RadioGroup>
          <DatePicker
            className="width200 mg2r"
            format={'YYYY-MM-DD'}
            disabled={untilType !== 'DIY'}
            disabledDate={(current) => current && current.startOf('day') >= moment().startOf('day')}
            value={until}
            onChange={(v) => {
              this.setState({
                until: v
              })
            }}
          />
        </div>
        <Button 
          type="primary"
          onClick={() =>{ 
            this.changeProps({
              since,
              until,
              untilType
            })
            this.dispatch('fetchNowUg')
            this.dispatch('fetchPreUg')
          }}
        >确定</Button>
      </div>
    )
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

  renderUsergroupLinks(ug) {
    const { lifeCycle } = this.props
    ug.params = { groupby: lifeCycle.group_by_name }
    let {id, title, compute_time, params} = ug

    let time = moment(compute_time).format(fmt)
    const linkDisabled = _.includes(ug.tags, UserGroupBuildInTagEnum.UserGroupWithoutLookup)

    let mainTimeDimName = '__time'

    return (
      <div className="ug-thumb-links pd2y aligncenter">
        {links.map((link, i, arr) => {
          let {title, url, icon, asyncUrl, children} = link
          const pd = 16, mg = 10
          let count = arr.length || 1
          let style = {
            //cardwidth
            width: (500 - (count - 1) * mg - pd * 2 - 5) / count,
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
            >
              <span className="ug-thumb-link-text">{title}</span>
              <Icon type={icon} className="ug-thumb-link-icon font20" />
            </AsyncHref>
          )
          return title !== '导出' ? linkDom : (
            <UserGroupExporter userGroup={ug} key={i}>
              {({loadingCsvData}) => {
                return loadingCsvData
                  ? (
                    <a
                      style={style}
                      className={`ug-thumb-link ug-thumb-link${i} pointer elli`}
                    >
                      <span className="ug-thumb-link-text">{title}</span>
                      <Icon type="loading" className="ug-thumb-link-icon font20" />
                    </a>
                  )
                  : linkDom
              }}
            </UserGroupExporter>
          )

        })}
      </div>
    )
  }

  renderUserGroupBox() {
    const { dataBase: { nowUg, preUg, since }} = this.props

    return (
      <div className="height50">
        {
          nowUg.map( (nUg, idx) => (
            <div className="width-20 fleft" key={_.get(nUg, 'title', idx) + 'topBar'}>
              <Popover
                content={this.renderUsergroupLinks(nUg)}
                placement="bottom" 
              >
                <a className="mg2b mg2l">{nUg.title.replace(since.format('YYYY-MM-DD')+ '_', '')}</a>
              </Popover>
              <div>
                <div className="fleft mg2l">
                  <div>用户数: </div>
                  <div>用户占比:</div>
                </div>
                <div className="fleft mg2l">
                  <div>{nUg.userCount} </div>
                  <div>{nUg.userRatio + '%'}</div>
                </div>
                <div className="fleft mg2l">
                  <div>{_.get(_.find(preUg, o => o.id === nUg.id || o.segment_id === nUg.id), 'userCount', 0) /*preUg做过处理 所以id相同即可*/ } </div>
                  <div>{_.get(_.find(preUg, o => o.id === nUg.id || o.segment_id === nUg.id), 'userRatio', 0) + '%'}
                  </div>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    )
  }

  renderDiagram() {
    const { diagram } = this.state
    const { dataBase: { since, until, nowUg, preUg } } = this.props

    return (
      <div>
        <div>
          分布图
        </div>
        <div>
          <RadioGroup 
            value={diagram}
            onChange={(e) => this.setState({diagram: e.target.value})}
          >
            <RadioButton value="userCount">用户数</RadioButton>
            <RadioButton value="userRatio">用户占比</RadioButton>
          </RadioGroup>
        </div>
        <div>
          <DataBaseDiagram 
            diagram={diagram}
            since={since}
            until={until}
            nowUg={nowUg}
            preUg={preUg}
          />
        </div>
      </div>
    )
  }

  render() {
    
    return (
      <div>
        {this.renderTimeBox()}
        <Divider />
        {this.renderUserGroupBox()}
        <Divider />
        {this.renderDiagram()}
      </div>
    )
  }
}

export default LCBaseData
