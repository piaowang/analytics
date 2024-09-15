import React from 'react'
import FixWidthHelper from '../../components/Common/fix-width-helper-no-hidden'
import { Menu, Checkbox, message, Radio, Tooltip, Popover } from 'antd'
import HighLightString from '../Common/highlight-string'
import _ from 'lodash'
import classNames from 'classnames'
import { checkPermission } from '../../common/permission-control'
import { Link } from 'react-router'
import { withCommonFilter } from '../Common/common-filter'
import smartSearch from '../../../common/smart-search'
import { groupBy, isEqualWithFunc } from '../../../common/sugo-utils'
import * as PubSub from 'pubsub-js'
import CustomOrderList from '../Common/custom-order-list'
import { move } from '../../../common/sugo-utils'
import Fetch from '../../common/fetch-final'
import { useOrders } from '../Fetcher/data-source-custom-orders-fetcher'
import Alert from '../Common/alert'
import Icon from '../Common/sugo-icon'
import helpLinkMap from 'common/help-link-map'
import setStatePromiseDec from '../../common/set-state-promise'
import { Anchor } from '../Common/anchor-custom'

const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['/console/analytic#measure']
let willCheckEqualsProps = ['dataSourceMeasures']

@setStatePromiseDec
class MetricsPanel extends React.Component {
  state = {
    isSearching: false,
    forceSingleChoice: false,
    isSettingOrder: false,
    tempOrders: null,
    singleSelectTagsMode: false
  }

  componentDidMount() {
    this.hasCreateMeasurePermission = checkPermission('app/measure/create')

    PubSub.subscribe('analytic.onDimensionsPanelSettingOrder', (msg, callback) => {
      this.setState({ isSettingOrder: false, tempOrders: null }, callback)
    })
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!isEqualWithFunc(_.pick(this.props, willCheckEqualsProps), _.pick(prevProps, willCheckEqualsProps))) {
      this.setState({
        isSearching: false,
        forceSingleChoice: false,
        isSettingOrder: false,
        tempOrders: null
      })
      this.props.setCommonFilterState({
        searching: '',
        selectedGroupKey: null
      })
    } else if (prevState.forceSingleChoice && prevProps.selectedMetrics.length === 1 && this.props.selectedMetrics.length > 1) {
      this.setState({
        forceSingleChoice: false
      })
    }
    // 强制分组单选
    if (prevState.singleSelectTagsMode && this.props.selectedGroupKey && 1 < this.props.selectedGroupKey.length) {
      this.props.setCurrentGroupKey(_.takeRight(this.props.selectedGroupKey, 1))
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !isEqualWithFunc(nextProps, this.props) || !_.isEqual(nextState, this.state)
  }

  componentWillUnmount() {
    PubSub.unsubscribe('analytic.onDimensionsPanelSettingOrder')
  }

  onMenuItemClick = ev => {
    ev.domEvent.stopPropagation()
    ev.domEvent.preventDefault()

    let { selectedMetrics, singleChoice } = this.props
    let { forceSingleChoice } = this.state
    let metricName = ev.key
    if (singleChoice || forceSingleChoice) {
      // 移除临时维度时需要连 dict 里的设置也移除

      PubSub.publish('analytic.update-metrics', () => [metricName])
    } else {
      PubSub.publish('analytic.update-metrics', prevMetrics => {
        return _.includes(prevMetrics, metricName)
          ? prevMetrics.filter(m => m !== metricName) // 移除
          : prevMetrics.concat([metricName]) // 添加
      })
    }
  }

  renderTagsPopupContent = optionsHasTags => {
    let tagsExt = _.flatMap(optionsHasTags, op => op.tags || [])
    let opCountByTagId = groupBy(tagsExt, _.identity, arr => arr.length)
    let { checkableTag: CheckableTag, tags } = this.props
    return (
      <div>
        {tags.map(t => {
          return (
            <CheckableTag key={t.id} className='block elli' title={t.name} uncheckedClass='border' tagId={t.id} style={{ margin: '4px 0 4px' }}>
              {opCountByTagId[t.id] ? `${t.name}(${opCountByTagId[t.id]})` : t.name}
            </CheckableTag>
          )
        })}
      </div>
    )
  }

  onMetricDragStart = ev => {
    let metricName = ev.target.getAttribute('data-metric-name')
    ev.dataTransfer.setData('text', `指标:${metricName}`)
  }

  getOrderedDbMetrics = (orders, includeHidden) => {
    let { dataSourceMeasures } = this.props

    return useOrders(dataSourceMeasures, orders, includeHidden)
  }

  updateCustomOrders = async nextOrders => {
    let { dataSourceId } = this.props
    await Fetch.post(`/app/custom-orders/update/${dataSourceId}`, { metrics_order: nextOrders })
    PubSub.publish('analytic.panels.customOrdersInvalid')
    this.setState({ isSavingCustomOrders: false })
  }

  onMetricVisibleChange = ev => {
    let metricName = ev.target.getAttribute('data-metric-name')
    let metricVisible = ev.target.getAttribute('data-metric-visible')
    let { tempOrders } = this.state

    if (metricVisible) {
      this.setState({
        tempOrders: tempOrders.map(name => (name === metricName ? `hide:${name}` : name))
      })
    } else {
      let originalName = `hide:${metricName}`
      this.setState({
        tempOrders: tempOrders.map(name => (name === originalName ? metricName : name))
      })
    }
  }

  moveToTop = ev => {
    let metricName = ev.target.getAttribute('data-metric-name')
    this.setState(prevState => {
      let from = _.findIndex(prevState.tempOrders, m => m === metricName)
      return {
        tempOrders: move(prevState.tempOrders, from, 0)
      }
    })
  }

  moveToBottom = ev => {
    let metricName = ev.target.getAttribute('data-metric-name')
    this.setState(prevState => {
      let from = _.findIndex(prevState.tempOrders, m => m === metricName)
      return {
        tempOrders: move(prevState.tempOrders, from, prevState.tempOrders.length)
      }
    })
  }

  renderMetricDoms = () => {
    let { dataSourceMeasures, searching, selectedMetrics, singleChoice, selectedGroupKey, orders } = this.props
    let { isSearching, forceSingleChoice, isSettingOrder, tempOrders } = this.state

    let selectedMetricSet = new Set(singleChoice || forceSingleChoice ? _.take(selectedMetrics, 1) : selectedMetrics)

    let filteredOptions = this.getOrderedDbMetrics(isSettingOrder ? tempOrders : orders, isSettingOrder)
    if (isSearching) {
      filteredOptions = searching ? filteredOptions.filter(op => smartSearch(searching, op.title || op.name)) : filteredOptions
    }

    // 根据分组进行筛选
    if (selectedGroupKey && selectedGroupKey.length) {
      let selectedTagsSet = new Set(selectedGroupKey)
      filteredOptions = filteredOptions.filter(op => _.some(op.tags || [], tId => selectedTagsSet.has(tId)))
    }

    let dbMetricDict = _.keyBy(dataSourceMeasures, m => m.name)

    let CheckComponent = singleChoice || forceSingleChoice ? Radio : Checkbox

    if (isSettingOrder) {
      return (
        <CustomOrderList
          style={{
            width: '100%',
            overflow: 'auto',
            height: `calc(100% - 46px ${isSearching ? '- 33px' : ''})`,
            paddingLeft: '8px'
          }}
          onChildrenMove={(from, to) => {
            this.setState({
              tempOrders: move(tempOrders, from, to)
            })
          }}
        >
          {filteredOptions.map(o => {
            let visible = o.__visible !== false
            return (
              <div
                key={o.name}
                className={classNames('sorting-item alignright elli relative', { invisible: !visible })}
                style={{ paddingLeft: '5px', border: '1px solid #c4c6d2' }}
              >
                <CheckComponent checked={selectedMetricSet.has(o.name)} className='elli absolute alignleft left1 ignore-mouse' style={{ maxWidth: 'calc(100% - 30px)' }}>
                  <HighLightString text={o.title || o.name} highlight={isSearching ? searching : null} />
                </CheckComponent>

                {!visible ? null : (
                  <Tooltip title='到顶部' mouseEnterDelay={1.5}>
                    <Icon type='sugo-up' className='pointer display-by-hover font16 mg1r grey-at-first' data-metric-name={o.name} onClick={this.moveToTop} />
                  </Tooltip>
                )}

                {!visible ? null : (
                  <Tooltip title='到底部' mouseEnterDelay={1.5}>
                    <Icon type='sugo-down' className='pointer display-by-hover font16 mg1r grey-at-first' data-metric-name={o.name} onClick={this.moveToBottom} />
                  </Tooltip>
                )}

                <Tooltip placement='right' title='切换是否可见' mouseEnterDelay={1.5}>
                  <Icon
                    type={visible ? 'sugo-visible' : 'sugo-invisible'}
                    title='切换是否可见'
                    className='pointer font16 mg1r grey-at-first'
                    data-metric-name={o.name}
                    data-metric-visible={visible ? '1' : ''}
                    onClick={this.onMetricVisibleChange}
                  />
                </Tooltip>
              </div>
            )
          })}
        </CustomOrderList>
      )
    }

    return (
      <Menu
        prefixCls='ant-select-dropdown-menu'
        style={{ width: '100%', overflow: 'auto', maxHeight: 'none', height: `calc(100% - 45px ${isSearching ? '- 38px' : ''})` }}
        onClick={this.onMenuItemClick}
      >
        {filteredOptions.map(o => {
          return (
            <Menu.Item key={o.name}>
              <Tooltip title={<p className='wordbreak'>{dbMetricDict[o.name].formula}</p>} placement='right' mouseEnterDelay={1.5}>
                <div className='noselect' draggable data-metric-name={o.name} onDragStart={this.onMetricDragStart}>
                  <CheckComponent checked={selectedMetricSet.has(o.name)}>
                    <HighLightString text={o.title || o.name} highlight={isSearching ? searching : null} />
                  </CheckComponent>
                </div>
              </Tooltip>
            </Menu.Item>
          )
        })}
      </Menu>
    )
  }

  renderNoPermissionHint() {
    return <Alert msg='请检查该项目维度是否授权或隐藏，请到[数据管理->数据维度]授权维度,或[排查和隐藏]开放维度。' />
  }

  toggleSettingOrder = async () => {
    let { orders } = this.props
    let { isSearching, isSettingOrder, tempOrders } = this.state

    if (isSearching) {
      await this.setStatePromise({ isSearching: false })
    }
    if (isSettingOrder) {
      // 关闭排序功能，保存排序
      await this.updateCustomOrders(_.orderBy(tempOrders, name => (_.startsWith(name, 'hide:') ? -1 : 1), 'desc'))
      await this.setStatePromise({ isSettingOrder: false, tempOrders: null })
    } else {
      // 启用排序，通知维度的排序功能关闭，因为同时启用两个排序组件会报错
      PubSub.publishSync('analytic.onMetricsPanelSettingOrder', () => {
        let initTempOrders = this.getOrderedDbMetrics(orders, true).map(dbM => (dbM.__visible !== false ? dbM.name : `hide:${dbM.name}`))
        this.setState({ isSettingOrder: true, tempOrders: initTempOrders })
      })
    }
  }

  render() {
    let {
      dataSourceMeasures,
      searching,
      style,
      className,
      singleChoice,
      dataSourceId,
      setCurrentGroupKey,
      selectedGroupKey,
      tags,
      visiblePopoverKey,
      keywordInput: SearchingInput,
      orders,
      isFetchingDataSourceMeasures
    } = this.props
    let { isSearching, forceSingleChoice, isSettingOrder, tempOrders, singleSelectTagsMode } = this.state

    let filteredOptions = this.getOrderedDbMetrics(isSettingOrder ? tempOrders : orders, isSettingOrder)
    if (isSearching) {
      filteredOptions = searching ? filteredOptions.filter(op => smartSearch(searching, op.title || op.name)) : filteredOptions
    }

    // 根据分组进行筛选
    let optionsHasTags = filteredOptions.filter(op => op.tags && op.tags.length)

    return (
      <div className={classNames('bg-white corner', className)} style={style}>
        <FixWidthHelper
          className={classNames('elli', { 'shadowb-eee mg1b cornert': !isSearching })}
          style={{ height: 40, lineHeight: '30px', padding: '5px', backgroundColor: 'white' }}
          toFix='first'
          toFixWidth='75px'
          wrapperClassLast='alignright line-height26'
        >
          <div className='analytic-search-title elli'>
            指标
            <Anchor href={helpLink} target='_blank' className='color-grey pointer mg1l' title='查看帮助文档'>
              <Icon type='question-circle' />
            </Anchor>
          </div>
          <Tooltip title={isSettingOrder ? '保存指标排序' : '编辑指标排序'} placement='topLeft' arrowPointAtCenter>
            <Icon
              type={isSettingOrder ? 'sugo-save' : 'sugo-setting'}
              onClick={this.toggleSettingOrder}
              className={classNames('font16 mg1r pointer iblock-force', {
                'grey-at-first': !isSettingOrder,
                'color-blue': isSettingOrder
              })}
            />
          </Tooltip>

          <Tooltip title='搜索' placement='topLeft' arrowPointAtCenter>
            <Icon
              type='sugo-search'
              className={classNames('pointer font16 mg1r iblock-force', {
                'grey-at-first': !isSearching,
                'color-blue': isSearching
              })}
              onClick={async () => {
                if (isSettingOrder) {
                  await this.toggleSettingOrder()
                }
                this.setState({ isSearching: !isSearching })
              }}
            />
          </Tooltip>

          {singleChoice ? null : (
            <Tooltip title='切换单选' placement='topLeft' arrowPointAtCenter>
              <Icon
                type='sugo-tab'
                className={classNames('font16 pointer mg1r iblock-force', {
                  'grey-at-first': !forceSingleChoice,
                  'color-blue': forceSingleChoice
                })}
                onClick={() => {
                  this.setState({ forceSingleChoice: !forceSingleChoice })
                  if (!forceSingleChoice) {
                    PubSub.publish('analytic.update-metrics', prevMetrics => _.take(prevMetrics, 1))
                  }
                }}
              />
            </Tooltip>
          )}
          {this.hasCreateMeasurePermission ? (
            <Link to={`/console/measure?id=${dataSourceId}`} style={{ color: 'inherit' }}>
              <Tooltip title='切换到数据管理页面创建指标'>
                <Icon type='sugo-add' className='font20 mg1r grey-at-first iblock-force' />
              </Tooltip>
            </Link>
          ) : null}
          <Popover
            placement='rightTop'
            title={
              visiblePopoverKey === 'measure-tag-popover' ? (
                <FixWidthHelper toFix='first' toFixWidth='80px'>
                  <div>按分组筛选</div>
                  <div className='alignright'>
                    <Tooltip title={singleSelectTagsMode ? '切换多选' : '切换单选'} placement='topLeft' arrowPointAtCenter>
                      <Icon
                        type={singleSelectTagsMode ? 'tags' : 'tag'}
                        className={classNames('pointer mg1r iblock-force', {
                          'grey-at-first font13': !singleSelectTagsMode,
                          'color-blue font16': singleSelectTagsMode
                        })}
                        onClick={() => {
                          this.setState({ singleSelectTagsMode: !singleSelectTagsMode }, () => {
                            if (this.state.singleSelectTagsMode && selectedGroupKey && selectedGroupKey[1]) {
                              setCurrentGroupKey(_.takeRight(selectedGroupKey, 1))
                            }
                          })
                        }}
                      />
                    </Tooltip>

                    <Tooltip title='清除选择' placement='topLeft' arrowPointAtCenter>
                      <Icon
                        type='tags-o'
                        className={classNames('font16 pointer grey-at-first mg1r iblock-force', { disabled: _.isEmpty(selectedGroupKey) })}
                        onClick={() => setCurrentGroupKey([])}
                      />
                    </Tooltip>
                  </div>
                </FixWidthHelper>
              ) : (
                '按分组筛选'
              )
            }
            trigger='click'
            arrowPointAtCenter
            content={visiblePopoverKey === 'measure-tag-popover' ? this.renderTagsPopupContent(optionsHasTags) : null}
            overlayClassName='width180'
            visible={visiblePopoverKey === 'measure-tag-popover'}
            onVisibleChange={visible => {
              if (!visible) {
                PubSub.publish('analytic.onVisiblePopoverKeyChange', null)
              }
            }}
          >
            <Tooltip title='按分组筛选' placement='topLeft' arrowPointAtCenter>
              <Icon
                type='sugo-tag'
                className={classNames('font20 pointer iblock-force', {
                  'grey-at-first': !selectedGroupKey || !selectedGroupKey[0],
                  'color-blue': selectedGroupKey && !!selectedGroupKey.length
                })}
                onClick={async () => {
                  if (isSettingOrder) {
                    await this.toggleSettingOrder()
                  }
                  if (_.isArray(tags) && tags.length) {
                    PubSub.publish('analytic.onVisiblePopoverKeyChange', 'measure-tag-popover')
                  } else {
                    message.warn('目前还没有为此项目设置指标分组')
                  }
                }}
              />
            </Tooltip>
          </Popover>
        </FixWidthHelper>
        {!isSearching ? null : <SearchingInput className='mg1 shadowb-eee' placeholder='搜索' />}
        {dataSourceMeasures.length || isFetchingDataSourceMeasures ? this.renderMetricDoms() : this.renderNoPermissionHint()}
      </div>
    )
  }
}

export default withCommonFilter(MetricsPanel, true)
