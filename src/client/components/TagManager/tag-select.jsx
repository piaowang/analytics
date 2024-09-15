/**
 * 标签选择组件
*/

import React from 'react'
import { CloseOutlined, FilterOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import {Affix, Button, Popover, Spin, Tooltip} from 'antd'
import Icon from '../Common/sugo-icon'
import Pie from './pie-chart'
import _ from 'lodash'
import {convertTagFilterValue, smartSort, convertTagFilterDateValue} from './common'
import Link from '../Common/link-nojam'
import {tagGroupParamsToSliceFilters} from './url-functions'
import {DIMENSION_TYPES, EMPTY_VALUE_OR_NULL, TagType, EMPTY_TAG_NUMBER} from '../../../common/constants'
import {addFilter2TagManager, checkInFilter, removeSubFilterFromTagManager, simplifyTagFilter} from '../../actions'
import {checkPermission} from '../../common/permission-control'
import moment from 'moment'
import {EMPTY_TAG_TITLE, OTHERS_TAG_TITLE} from '../../constants/string-constant'
import {
  immutateUpdate,
  immutateUpdates,
  interpose,
  isDiffBySomePath
} from '../../../common/sugo-utils'
import {recurMapFilters} from '../../../common/druid-query-utils'
import * as d3 from 'd3'
import AsyncHref from '../Common/async-href'
import measureTextWidth from '../../common/measure-text-width'

const percent2f = _.flow(v => _.floor(v, 4), d3.format('.2%'))

const canCreateGroupTag = checkPermission('post:/app/tag-group/create')
// const canEditGroupTag = checkPermission('put:/app/tag-group/update')
// const canDeleteGroupTag = checkPermission('post:/app/tag-group/delete')

const inArray = (arr1, arr2) => {
  let all = [...arr1, ...arr2]
  return _.uniq(all).length === _.uniq(arr1).length
}

/**
 * 获取tagGroupFilters包含过滤条件的数量
 * @param {object} props
 */
const getLen = props => {
  let {tagGroupFilters} = props
  return tagGroupFilters.reduce((prev, curr) => {
    return prev + curr.children.length
  }, 0)
}

const sortFunctionMap = {
  countAsc: (a, b) => a.count > b.count ? 1 : -1,
  countDesc: (a, b) => a.count > b.count ? -1 : 1,
  valueAsc: smartSort,
  '': smartSort,
  valueDesc: (a, b) => smartSort(b, a)
}

const getIcon = (sortBy, type) => {
  if (!sortBy || !sortBy.includes(type)) {
    return 'sugo-sort'
  }
  return sortBy.includes('Asc')
    ? 'sugo-sort-up'
    : 'sugo-sort-down'
}

const SCROLL_HIDE_POPOVER_EXPIRE = 500

export default class TagSelect extends React.Component {

  state = {
    showTagPanel: false,
    sortBy: '',
    scrollAt: 0
  }
  
  componentDidMount() {
    document.addEventListener('scroll', this.onWindowScrollThrottle, true)
  }
  
  componentWillUnmount() {
    document.removeEventListener('scroll', this.onWindowScrollThrottle, true)
  }
  
  onWindowScroll = () => {
    let {showTagPanel} = this.state
    if (showTagPanel) {
      this.setState({
        scrollAt: Date.now()
      }, () => {
        setTimeout(() => {
          this.forceUpdate()
        }, SCROLL_HIDE_POPOVER_EXPIRE)
      })
    }
  }
  
  onWindowScrollThrottle = _.throttle(this.onWindowScroll, 250)
  
  componentWillReceiveProps(nextProps) {
    if (
      getLen(nextProps) !== getLen(this.props)
    ) {
      this.setState({
        showTagPanel: true
      })
    }
  }

  toggleSort = type => {
    let {sortBy} = this.state
    let tar = ''
    if (!sortBy || !sortBy.includes(type)) {
      tar = type + 'Desc'
    } else if (sortBy.includes(type)) {
      tar = type + (sortBy.includes('Desc') ? 'Asc' : 'Desc')
    }
    this.setState({
      sortBy: tar
    })
  }

  onChangeVisible = showTagPanel => {
    this.setState({
      showTagPanel
    })
  }

  inTagGroupFilterAll = () => {
    let children = _.get(this.props, 'tagResult.children') || []
    return children.reduce((prev, c) => {
      return prev && this.checkInTagGroupfilter(c)
    }, true)
  }

  checkInTagGroupfilter = item => {
    let {tagGroupFilters} = this.props
    return _.some(tagGroupFilters, t => {
      return t.dimension.id === item.dimension.id &&
        _.some(t.children, c => {
          return c.title === item.title
        })
    })
  }

  removeAllTagGroupFiltersCurrent = () => {
    let children = _.get(this.props, 'tagResult.children') || []
    for (let item of children) {
      setTimeout(() => this.props.removeTagGroupFilter(item), 5)
    }
  }

  addTagGroupFilterAll = () => {
    let children = _.get(this.props, 'tagResult.children') || []
    for (let item of children) {
      setTimeout(() => this.props.addTagGroupFilter(item), 5)
    }
  }

  removeFilterTagGroup = (params) => {
    let {updateHashState, modifier} = this.props
    let preRemove = this.props.tagResult.title
    updateHashState(prevState => {
      return {
        filters: _.filter(prevState.filters, flt => flt.col !== preRemove)
      }
    })
    modifier({
      computeResult: null
    })
  }

  addFilterTagGroup = params => {
    const filter = {col: this.props.tagResult.title, op: params.relation || 'and', eq: tagGroupParamsToSliceFilters(params)}
    this.props.updateHashState({filters: [...this.props.filters, filter]})
  }

  checkInFilterTagGroup = (params) => {
    let groupTitle = this.props.tagResult.title
    let {filters} = this.props
    return _.some(filters, flt => flt.col === groupTitle)
  }

  removeAllTagGroupFilters = () => {
    this.props.modifier({
      tagGroupFilters: []
    })
  }

  addAllFilter = () => {
    let children = _.get(this.props, 'tagResult.children') || []
    for (let item of children) {
      setTimeout(() => this.props.addFilter(item), 5)
    }
  }

  renderTagGroupFilter = (item, i) => {
    let {dimension, children} = item
    let title = dimension.title || dimension.name
    let opts = children.map(d => d.title).join(',')
    let t = `${title}(${opts})`
    return (
      <div
        className="tag-group-btn-content-item pd1y relative"
        key={i + 'tgp' + title}
      >
        <div
          className="width260 iblock mg1r elli pd1x"
          title={t}
        >
          {t}
        </div>
        <Icon
          type="close"
          className="pointer iblock rm-tag-group-item"
          title="移除"
          onClick={() => this.props.removeTagGroupFilter(item)}
        />
      </div>
    )
  }

  renderTagGroupBtnContent = () => {
    let {tagGroupFilters} = this.props
    return (
      <div className="width300">
        <div className="tag-group-btn-content-title borderb pd1b">
          <div className="fix">
            <div className="fleft">
              <AsyncHref
                component={Link}
                initFunc={() => this.props.buildTagGroupUrl()}
              >
                <Button
                  type="ghost"
                >
                  立刻创建
                </Button>
              </AsyncHref>
            </div>
            <div className="fright">
              <span
                className="pointer iblock line-height32"
                onClick={this.removeAllTagGroupFilters}
              >
                清除所有选择
              </span>
            </div>
          </div>
        </div>
        <div className="tag-group-btn-content pd1y">
          {tagGroupFilters.map(this.renderTagGroupFilter)}
        </div>
      </div>
    )
  }

  renderTagGroupBtn() {
    let {tagGroupFilters} = this.props
    let {scrollAt} = this.state
    let isTagGroup = _.get(this.props, 'tagResult.params')
    let len = tagGroupFilters.length
    let btn = (
      <AsyncHref
        component={Link}
        initFunc={() => this.props.buildTagGroupUrl()}
      >
        <Button
          type="primary"
          icon={<SettingOutlined />}
        >
          管理我的组合标签
          {
            len
              ? `(${len})`
              : ''
          }
        </Button>
      </AsyncHref>
    )
    if (!len || isTagGroup) {
      return btn
    }
    let {showTagPanel} = this.state
    return (
      <Popover
        placement="leftTop"
        arrowPointAtCenter
        visible={showTagPanel && SCROLL_HIDE_POPOVER_EXPIRE <= (Date.now() - scrollAt) /* 滚动时隐藏 */}
        onVisibleChange={this.onChangeVisible}
        content={
          this.renderTagGroupBtnContent()
        }
      >
        {btn}
      </Popover>
    )
  }

  getTypeTitle = (
    types = this.props.types,
    activeChildId = this.props.activeChildIds[0] || ''
  ) => {
    for (let t of types) {
      let {children = [], type} = t
      if (_.find(children, c => c.id === activeChildId)) {
        return type
      }
      let childTypes = children.filter(d => d && d.treeId)
      let tt = this.getTypeTitle(childTypes)
      if (tt) {
        return tt
      }
    }
    return ''
  }

  renderTitle() {
    return (
      <Affix target={() => document.querySelector('.overscroll-y.always-display-scrollbar')}>
        <div className="tag-select-title bg-white">
          <div className="fix">
            <div className="fleft">
              <span className="tag-filter-title-big">{this.getTypeTitle()}</span>
            </div>
            <div className="fright">
              {canCreateGroupTag ? this.renderTagGroupBtn() : null}
            </div>
          </div>
        </div>
      </Affix>
    )
  }

  renderChart = (children) => {
    let opt = {
      data: children.map(c => {
        return {
          name: c.title,
          value: c.count,
          percent: c.percent
        }
      }),
      width: 98,
      height: 98
    }
    return (
      <Pie {...opt} />
    )
  }

  sqlCondToTag(type, val, subTag) {
    let [start, end] = val
    if (type === TagType.Range) {
      if (subTag === OTHERS_TAG_TITLE) {
        // const value = _.flatten(val.map(p => p.eq)).filter(p => _.isNumber(p) && p !== EMPTY_TAG_NUMBER)
        return `${subTag}   "= 其他"`
      }
      // 数值转成字符串避免 0 当做 false
      start = _.isNumber(start) ? `${start}` : start
      end = _.isNumber(end) ? `${end}` : end
      if (start && end) {                      // (start, end]
        return `${subTag}   ">= ${start} AND < ${end}"`
      } else if (val.length === 1 && !end) {                   // [start, start]
        return `${subTag}   "= ${start}"`
      } else if (!start && end) {               // (, end]
        return `${subTag}   "< ${end}"`
      } else if (start && !end) {               // (start, ]
        return `${subTag}   ">= ${start}"`
      } else {
        console.error('Unconsidered case: ' + subTag)
      }
    } else if (type === TagType.Time) { // 数值范围类型标签
      start = !start ? null : moment(start).startOf('d').format('YYYY-MM-DD hh:mm:ss')
      end = !end ? null : moment(end).endOf('d').format('YYYY-MM-DD hh:mm:ss')
      if (start && end) {                      // (start, end]
        return `${subTag} >= '${start}' AND < '${end}'`
      } else if (val.length === 1 && !end) {                   // [start, start]
        return `${subTag} = '${start}'`
      } else if (!start && end) {               // (, end]
        return `${subTag} < '${end}'`
      } else if (start && !end) {               // (start, ]
        return `${subTag} >= '${start}'`
      } else {
        console.error('Unconsidered case: ' + subTag)
      }
    } else if (type === TagType.String) {
      if (subTag === OTHERS_TAG_TITLE) {
        return subTag
      }
      return `${name} IN ('${val.join('\',\'')}')`
    } else {
      console.error('Unconsidered tag type: ' + subTag)
    }
  }

  renderChild = (item, i, titleWidthOverwrite) => {
    if (!item) {
      return null
    }
    let {
      title, count, percent, value = [], type
    } = item
    let {filters} = this.props
    let inFilter = checkInFilter(filters, item)
    let inTagGroupFilter = this.checkInTagGroupfilter(item)
    value = _.isArray(value) ? value : value.split('`')
    value = this.sqlCondToTag(type, value, title)
    let desc = (
      <span>
        共
        {
          count
            ? <Tooltip title="查看用户详情">
              <AsyncHref
                className="under-line pointer mg1x"
                component={Link}
                initFunc={() => {
                  let filters = addFilter2TagManager([], item)
                  return this.props.buildUrl(filters)
                }}
              >
                {Math.max(0, count)}
              </AsyncHref>
            </Tooltip>
            : Math.max(0, count)
        }
        人{item.title === EMPTY_TAG_TITLE ? '' : `，占标签人数 ${percent2f(Math.max(0, percent / 100))}`}
      </span>
    )
    return (
      <div className="tag-select-item" key={i + 'ts' + title}>
        <div className="tag-select-item-box" style={title === EMPTY_TAG_TITLE ? {marginLeft: '30px'} : undefined}>
          <div
            className="inline tag-select-item-name elli"
            title={value}
            style={{width: titleWidthOverwrite}}
          >
            <Icon type="tags-o" className="color-purple mg1r" />
            {title}
          </div>
          <div
            className="inline tag-select-item-count elli"
            style={{left: `${42 + titleWidthOverwrite}px`}}
          >
            {desc}
          </div>
          <div className="inline tag-select-item-btn-wrap">
            {
              inFilter
                ? <Button
                  type="ghost"
                  icon={<CloseOutlined />}
                  size="small"
                  onClick={() => {
                    let {filters, updateHashState, modifier} = this.props
                    filters = removeSubFilterFromTagManager(filters, item)
                    updateHashState({filters})
                    modifier({
                      computeResult: null
                    })
                  }}
                  >移除筛选</Button>
                : <Button
                  type="primary"
                  icon={<FilterOutlined />}
                  size="small"
                  onClick={() => this.props.addFilter(item)}
                  >加入筛选</Button>
            }
            {
              !canCreateGroupTag ? null :
                (inTagGroupFilter
                  ? <Button
                    type="ghost"
                    icon={<CloseOutlined />}
                    size="small"
                    className="mg1l"
                    title="从组合标签移除"
                    onClick={() => this.props.removeTagGroupFilter(item)}
                    >组合标签</Button>
                  : <Button
                    type="primary"
                    className="mg1l"
                    icon={<PlusOutlined />}
                    size="small"
                    title="加入组合标签"
                    onClick={() => this.props.addTagGroupFilter(item)}
                  >组合标签</Button>)
            }
          </div>
        </div>
        {title !== EMPTY_TAG_TITLE
          ? <div className="tag-select-item-line"/>
          : null
        }
        {
          i && title !== EMPTY_TAG_TITLE
            ? <div className="tag-select-item-line-vertical"/>
            : null
        }
        {title !== EMPTY_TAG_TITLE ? <div className="tag-select-item-dot"/> : null}
      </div>
    );
  }
  
  renderSingleTagGroupCond(f, i) {
    let {children, dimension, action} = f
    const opMap = {
      'in': '包含',
      'not in': '排除',
      'equal': '有且仅有',
      'in-range': '包含',
      'not in-range': '排除',
      'also in': '同时包含'
    }
    let t = dimension.title || dimension.name
    return (
      <div key={i + 'tgc' + t} className="pd1b">
        <Icon type="arrow-right"  className="mg1r" />
        <span className="color-blue">
          <b>{t}</b>
          <span className="color-grey mg1x">{opMap[action] || '包含'}</span>
          {children.map(c => c.title).join(',')}
        </span>
      </div>
    )
  }
  
  renderTagGroupConditions(params, idx) {
    let filters = _.get(params, 'filters') || []
    let relation = _.get(params, 'relation')
    return (
      <fieldset
        className="mg1l corner"
        style={{
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: '#6969d7',
          borderImage: 'initial',
          paddingLeft: '5px'
        }}
        key={idx}
      >
        <legend
          style={{
            width: 'auto',
            fontSize: '14px',
            marginLeft: '10px',
            display: 'block',
            paddingInlineStart: '2px',
            paddingInlineEnd: '2px',
            borderWidth: 'initial',
            borderStyle: 'none',
            borderColor: 'initial',
            borderImage: 'initial'
          }}
        >{relation === 'and' ? '并且' : '或者'}</legend>
        {filters.map((f, i, arr) => this.renderSingleTagGroupCond(f, i, arr, relation))}
      </fieldset>
    )
  }

  renderTagGroup() {
    let {
      count = 0,
      totalCount = 0,
      title,
      description,
      id,
      params
    } = this.props.tagResult || {}
    let percent = totalCount
      ? (count * 100 / totalCount).toFixed(2)
      : '0.00'
    let inFilter = this.checkInFilterTagGroup(params)
    return (
      <div className="tag-select-item-title relative tag-group-item-wrap">
        <div className="tag-select-item-title-box relative">
          <div
            className="iblock tag-select-item-name"
          >
            <div className="pd1b pd2t title-and-desc">
              <Icon type="appstore" className="color-purple mg1r" />
              <b>{title}</b>
              <Tooltip title={description}>
                <span className="color-grey mg2l">
                  <Icon type="info-circle-o" className="color-purple mg1r" />
                  {description}
                </span>
              </Tooltip>
            </div>
            <div className="pd1b pd2b tag-group-conditions">
              <div className="pd1b">组合条件:</div>
              {interpose((d, i) => <div key={`sep${i}`} className="mg2y">{params.relation === 'and' ? '并且' : '或者'}</div>, _.map(params.filters, (flt, idx, arr) => {
                if ('children' in flt) {
                  return this.renderSingleTagGroupCond(flt, idx)
                } else if ('filters' in flt) {
                  return this.renderTagGroupConditions(flt, idx)
                }
                return null
              }))}
            </div>
          </div>
          <div className="iblock tag-select-item-count" >
            共
            <AsyncHref
              initFunc={() => {
                let filters = [{col: title, op: params.relation || 'and', eq: tagGroupParamsToSliceFilters(params), from: 'tagGroup'}]
                let url = this.props.buildUrl(filters, 'and')
                return url
              }}
              component={Link}
              className="under-line pointer mg1x"
            >
              {Math.max(0, count)}
            </AsyncHref>
            人，占总人数{percent2f(Math.max(0, percent / 100))}
          </div>
          <div className="iblock tag-select-item-btn-wrap">
            {
              inFilter
                ? <Button
                  type="ghost"
                  icon={<CloseOutlined />}
                  size="small"
                  onClick={() => this.removeFilterTagGroup(params)}
                  >移除筛选</Button>
                : <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="small"
                  onClick={() => this.addFilterTagGroup(params)}
                  >加入筛选</Button>
            }
          </div>
        </div>
      </div>
    );
  }

  renderSort = () => {
    let {sortBy} = this.state
    let icon1 = getIcon(sortBy, 'value')
    let icon2 = getIcon(sortBy, 'count')
    let cls1 = icon1 === 'sugo-sort'
      ? 'color-grey'
      : ''
    let cls2 = icon2 === 'sugo-sort'
      ? 'color-grey'
      : ''
    const maxSubTagNameLenInPx = this.getMaxSubTagNameLenInPx() + 10
    return (
      <div className="tag-select-sort-icon-wrap">
        <div className="name-sort iblock" style={{width: maxSubTagNameLenInPx}}>
          <span onClick={() => this.toggleSort('value')}>
            <Icon
              type={icon1}
              className={`pointer mg1r ${cls1}`}
            />
            按名称排序
          </span>
        </div>
        <div className="count-sort iblock">
          <Tooltip
            title="按人数排序"
          >
            <span onClick={() => this.toggleSort('count')}>
              <Icon
                type={icon2}
                className={`pointer mg1r ${cls2}`}
              />
            按人数排序
            </span>
          </Tooltip>
        </div>
      </div>
    )
  }

  renderExtraInfo = (dimension) => {
    /**
      tag_extra: {
        type: dataTypes.JSONB,

         * tag_extra => keys: {
          * // tag_desc: 定义口径
          * data_from: 数据来源
          * cleaning_rule: 清洗规则
          * life_cycle: 生命周期
         * }

      }
     */
    let tag_extra = _.get(dimension, 'tag_extra') || {}
    tag_extra.tag_desc = dimension.tag_desc
    // tag_extra = {
    //   tag_desc: '定义口径',
    //   data_from: '数据来源',
    //   cleaning_rule: '清洗规则',
    //   life_cycle: '生命周期'
    // }

    let dict = {
      tag_desc: '定义口径',
      data_from: '数据来源',
      cleaning_rule: '清洗规则',
      life_cycle: '生命周期',
      is_base_tag: '是基础标签',
      is_base_prop: '是用户属性'
    }

    tag_extra = _(tag_extra)
      .pickBy((val, key) => val && (key in dict))
      .mapValues((val, key) => {
        if (key === 'is_base_prop' || key === 'is_base_tag') {
          return +val ? '是' : '否'
        }
        return val
      })
      .value()

    if (_.isEmpty(tag_extra)) {
      return null
    }
    let content = (
      <div className="tag-extra-info pd1y">
        {
          Object.keys(tag_extra).map(k => {
            let v = tag_extra[k]
            return (
              <p key={k}>
                {dict[k]}: {_.isArray(v) ? v.join(' ~ ') : v}
              </p>
            )
          })
        }
      </div>
    )
    return (
      <Popover
        content={content}
        title="标签信息"
        trigger="click"
      >
        <Icon
          type="info-circle"
          className="mg1l tag-dim-extra-info"
          title="点击查看标签信息"
        />
      </Popover>
    )
  }

  renderItemTitle() {
    let {
      count = 0,
      //percent = 0,
      title,
      params,
      children = [],
      dimension,
      recent_updated_at
    } = this.props.tagResult || {}
    if (!title) {
      return (
        <div className="pd3y aligncenter">
          请选择标签
        </div>
      )
    } else if (params) {
      return this.renderTagGroup()
    }

    let emptyTagCount = _(children).chain()
      .find(subTagInfo => subTagInfo.title === EMPTY_TAG_TITLE)
      .get('count')
      .value() || 0

    const coverCount = count - emptyTagCount
    let coverDom = coverCount
      ? (<Tooltip title="查看覆盖用户详情">
        <AsyncHref
          component={Link}
          initFunc={() => {
            let filters = (children || []).filter(t => t.title !== EMPTY_TAG_TITLE).reduce((prev, item) => {
              return addFilter2TagManager(prev, item)
            }, [])
            return this.props.buildUrl(filters, this.props.relation)
          }}
          className="under-line pointer mg1x"
        >
          {Math.max(0, coverCount)}
        </AsyncHref>
      </Tooltip>)
      : Math.max(0, coverCount)

    const totalDom = count
      ? (<Tooltip title="查看全部用户详情">
        <AsyncHref
          className="under-line pointer mg1x"
          initFunc={() => {
            let children = _.get(this.props, 'tagResult.children') || []
            let filters = children.reduce((prev, item) => {
              return addFilter2TagManager(prev, item)
            }, [])
            return this.props.buildUrl(filters, this.props.relation)
          }}
          component={Link}
        >
          {Math.max(0, count)}
        </AsyncHref>
      </Tooltip>)
      : Math.max(0, count)
    const coverRate = count === 0 ? 0 : _.clamp(coverCount/count, 0, 1)
    let desc = (
      <span>
        覆盖 {coverDom} 人 / 共 {totalDom} 人，覆盖率 {percent2f(coverRate)}
      </span>
    )
    return (
      <div className="tag-select-item-title relative">
        <div className="tag-select-item-title-box relative">
          <div
            className="iblock tag-select-item-name elli"
            title={title}
          >
            <Icon type="appstore" className="color-purple mg1r" />
            {title}
            {this.renderExtraInfo(dimension)}
          </div>
          <div
            className="iblock tag-select-item-count elli"
          >
            {desc}
            {!recent_updated_at ? null :
              <span className="mg2l">更新于：{moment(recent_updated_at).format('YYYY年MM月DD日 HH:mm:ss')}</span>
            }
          </div>
          <div
            className="iblock tag-select-item-chart"
            style={!canCreateGroupTag ? {right: 0} : undefined}
          >
            {this.renderChart(children)}
          </div>
          <div className="tag-select-item-btn-wrap">
            {
              !canCreateGroupTag ? null : (
                this.inTagGroupFilterAll()
                  ? (
                    <Button
                      type="ghost"
                      icon={<CloseOutlined />}
                      size="small"
                      className="mg1l"
                      title="从组合标签移除"
                      onClick={() => this.removeAllTagGroupFiltersCurrent()}
                    >组合标签</Button>
                  )
                  : (
                    <Button
                      type="primary"
                      className="mg1l"
                      icon={<PlusOutlined />}
                      size="small"
                      title="加入组合标签"
                      onClick={() => this.addTagGroupFilterAll()}
                    >组合标签</Button>
                  )
              )
            }
          </div>
        </div>
        <div className="tag-select-item-line"/>
        <div className="tag-select-item-dot"/>
        {
          children && children.length
            ? <div className="tag-select-item-line-vertical"/>
            : null
        }
        {this.renderSort()}
      </div>
    );
  }

  renderFilters() {
    let children = _.get(this.props, 'tagResult.children') || []
    let {sortBy} = this.state
    let sorter = sortFunctionMap[sortBy]
    
    let maxChildLenInPx = this.getMaxSubTagNameLenInPx(children)
    return (
      <div className="tag-select-items pd2y">
        {this.renderItemTitle()}
        <div className="tag-select-items-content relative">
          {
          /* 未覆盖 始终在最后 */
            _.orderBy(children.sort(sorter), subTagInfo => subTagInfo.title === EMPTY_TAG_TITLE ? 1 : 0)
              .map((item, idx) => this.renderChild(item, idx, maxChildLenInPx))
          }
        </div>
      </div>
    )
  }
  
  getMaxSubTagNameLenInPx(subTags = _.get(this.props, 'tagResult.children') || []) {
    let maxLen = _(subTags)
      .map(st => measureTextWidth(st.title, '13', 'microsoft Yahei'))
      .max() + 20 // 预留 icon 位置
    return _.clamp(maxLen, 160, 400)
  }
  
  render() {
    const { loadingTagSelect } = this.props
    return (
      <div className="tag-select-wrap tag-setion-wrap">
        <div className="tag-select-inner tag-setion-inner">
          <Spin spinning={loadingTagSelect}>
            {this.renderTitle()}
            {this.renderFilters()}
          </Spin>
        </div>
      </div>
    )
  }

}
