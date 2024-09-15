import React from 'react'
import { AppstoreOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Select, Button, message, Row, Col, Popover, Spin } from 'antd';
import Store from '../store/microcosmic-portrait/index'
import _ from 'lodash'
import './css.styl'
import { withDbDims } from 'client/components/Fetcher/data-source-dimensions-fetcher'
import TagDetails from './tag-details'
import Bread from '../../Common/bread'
import tagUserman from '../../../images/tag-man.png'
import tagUserWomen from '../../../images/tag-women.png'
import tagUserUnknow from '../../../images/tag-unknown.png'
import tagQuery from '../../../images/tag-query.png'
import UserActions from './user-actions'
import { withSizeProvider } from '../../Common/size-provider'
import { getCurrentTagProject } from '../../../common/tag-current-project'
import { isDiffByPath } from '../../../../common/sugo-utils'
import HoverHelp from '../../Common/hover-help'
import { PermissionLink } from '../../../common/permission-control'
import { Helmet } from 'react-helmet'
import { TAG_DEFAULT_DIMENSIONS } from '../../../../common/sdk-access-dimensions'
import { AccessDataType } from '../../../../common/constants'

const excludeDim = TAG_DEFAULT_DIMENSIONS.map(p => p[0])

const { cdn, siteName } = window.sugo

const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`
const Option = Select.Option

@withDbDims(({ projectList, projectCurrent }) => {
  const { tagProject } = getCurrentTagProject(projectList, projectCurrent)
  let dsId = _.get(tagProject, 'datasource_id') || ''
  return ({
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true,
    datasourceType: 'all',
    resultFilter: dim => dim.parentId === dsId
  })
})
@withSizeProvider
export default class MicrocosmicPortrait extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    this.state = this.store.getState()
  }

  componentDidMount() {
    const { projectCurrent, datasourceCurrent, dataSourceDimensions, projectList, datasourceList } = this.props
    let { id } = this.props.params
    if (projectCurrent && projectCurrent.id && datasourceCurrent && datasourceCurrent.id
      && !_.isEmpty(dataSourceDimensions)) {
      this.getData(projectList, datasourceList, projectCurrent, datasourceCurrent, dataSourceDimensions, id, true)
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { projectCurrent } = this.props
    let { id } = nextProps.params

    if (isDiffByPath(this.props, nextProps, 'dataSourceDimensions') && !_.isEmpty(nextProps.dataSourceDimensions)) {
      id = decodeURIComponent(id)
      this.getData(nextProps.projectList, nextProps.datasourceList, nextProps.projectCurrent, nextProps.datasourceCurrent,
        nextProps.dataSourceDimensions, id, true)
    }
  }

  UNSAFE_componentWillUpdate(nextProps, nextState) {
    if (this.tagsBegin && this.tagsEnd) {
      const height = this.tagsEnd.offsetTop - this.tagsBegin.offsetTop
      if (this.state.vm.tagsLineHeight !== height && this.state.vm.microcosmicId) {
        this.store.changeState({ tagsLineHeight: height })
      }
    }
  }


  renderPageTitle(title) {
    return (
      <Helmet>
        <title>{title ? `${title}-${siteName}` : siteName}</title>
      </Helmet>
    )
  }

  getData = (projectList = [], datasourceList = [], projectCurrent, datasourceCurrent, dimensions, id, refresh) => {
    // 判断项目类型 使用关联tag项目的数据源
    const { tagProject, tagDatasource } = getCurrentTagProject(projectList, projectCurrent, datasourceList, datasourceCurrent)

    const commonMetric = _.get(tagDatasource, 'params.commonMetric[0]', '')
    this.store.initData(
      tagProject,
      dimensions,
      commonMetric,
      id,
      refresh
    )
  }

  renderQueryPanel = (tagProject, tagDatasource) => {
    const { dataSourceDimensions } = this.props
    if (!dataSourceDimensions || !dataSourceDimensions.length) return null
    return (<div className="query-panel">
      <div className="query-title color-main">微观<img className="query-icon" src={tagQuery} />画像</div>
      <div className="mg2t aligncenter">
        {this.renderQuerySelect(tagProject, tagDatasource, true)}
      </div>
    </div>)
  }

  queryLile = _.debounce((val, tagProject, notQueryLike) => this.store.queryLike(tagProject, val, notQueryLike), 200)

  renderQuerySelect = (tagProject, tagDatasource, isIndex) => {
    const { queryLikeValues, queryLikeLoadding, queryKey, queryDim } = this.state.vm
    const { dataSourceDimensions } = this.props
    const dimMap = _.keyBy(dataSourceDimensions, 'name')
    const notQueryLike = _.get(dimMap, `${queryDim}.tag_extra.is_Desensitiz`, '') === '1'
    const SELECT_FILTER = _.get(tagDatasource, 'params.commonMicroPicture', []).filter(_.identity)
    if (!SELECT_FILTER.length) {
      return (<div className="color-grey pd3 aligncenter">
        此项目尚未设置微观画像搜索条件，请前往
        <PermissionLink className="color-main" to={'/console/project/datasource-settings'}>场景数据设置</PermissionLink>
        进行设置
      </div>)
    }
    return (<span className="mg1l">
      <Select
        className={`query-input${isIndex ? '' : '1'} query-input${isIndex ? '' : '1'}dim`}
        size="large"
        showSearch
        placeholder="请选择查询维度"
        allowClear
        onChange={(v) => this.store.changeState({ queryDim: v, queryLikeValues: [], queryKey: '' })}
      >
        {
          SELECT_FILTER.map((p, i) => {
            const dimension = _.get(dimMap, [p])
            if (!dimension) {
              return null
            }
            return <Option key={`queryDim${i}`} value={p}>{dimension.title || p}</Option>
          })
        }
      </Select>
      <Select
        className={`query-input${isIndex ? '' : '1'} query-input${isIndex ? '' : '1'}key mg1l`}
        size="large"
        showSearch
        value={queryKey ? queryKey : undefined}
        placeholder="请输入查询内容"
        allowClear
        filterOption={false}
        notFoundContent={queryLikeLoadding ? <Spin size="small" /> : null}
        onSearch={v => this.queryLile(v, tagProject, notQueryLike)}
        onChange={v => this.store.changeState({ queryKey: v })}
      >
        {
          queryLikeLoadding
            ? null
            : queryLikeValues.map((p, i) => <Option key={`queryKey${i}`} value={p}>{p}</Option>)
        }
      </Select>
      <Button
        style={{height:'40px'}}
        className={`mg1l width80 ${isIndex ? 'query-button' : ''}`}
        type="primary"
        onClick={() => {
          // 判断项目类型 使用关联tag项目的数据源
          const commonMetric = _.get(tagDatasource, 'params.commonMetric[0]', '')
          this.store.getMicrocosmicInfo(
            tagProject,
            dataSourceDimensions,
            commonMetric)
        }}
      >
        查询
      </Button>
    </span>)
  }

  renderBaseInfo(tagDatasource) {
    const { microcosmicUserGroups, microcosmicData } = this.state.vm
    const { dataSourceDimensions, tagProject } = this.props
    const dimensionsMap = _.keyBy(dataSourceDimensions, 'name')
    // 判断项目类型 使用关联tag项目的数据源
    const commonMetric = _.get(tagDatasource, 'params.commonMetric[0]', '')
    const commonMetricTitle = _.get(dimensionsMap, `${commonMetric}.title`, '')
    const sex = _.get(microcosmicData, 's_sex')
    const baseInfoFilelds = _.get(tagDatasource, 'params.microPictureBaseInfo', excludeDim).filter(_.identity)
    let sexPng = null
    if (!sex) {
      sexPng = tagUserUnknow
    } else if (sex === '0') {
      sexPng = tagUserWomen
    } else if (sex === '1') {
      sexPng = tagUserman
    } else {
      sexPng = tagUserUnknow
    }
    return (<div className="borderb">
      <div className="tag-info-photo iblock"><img src={sexPng} alt="" /></div>
      <div className="mg2t tag-info-base iblock pd3r ">
        <div className="border-bottom pd1b font18 color-main">
          <span className="base-info-id color-main">{_.get(dimensionsMap, 's_member_name.title', '会员名称')}：{_.get(microcosmicData, 's_member_name')} </span>
          <span className="mg3l font16 color-999">({commonMetricTitle || commonMetric}: {_.get(microcosmicData, commonMetric)})</span>
        </div>
        <Row className="border-bottom pd1y pd2t">

          {
            baseInfoFilelds.map(p => {
              return <Col key={`col-${p}`} span={8} className="mg2b">{_.get(dimensionsMap, `${p}.title`, p)}：{_.get(microcosmicData, `${p}`)}</Col>
            })
          }
        </Row>
        <div className="pd2y">
          所属用户群： {
            microcosmicUserGroups.map((p, idx) => (
              <span
                key={`groupsp${idx}`}
                className="mg1l tag-user-group-item"
              >
                {p}
              </span>
              )
            )
          }
        </div>
      </div>
    </div>)
  }

  renderTagPanel() {
    let { dataSourceDimensions, datasourceCurrent, projectCurrent, projectList, datasourceList, tagDatasource } = this.props
    let { tagsInfo, tagCategoryMap, tagCategory, microcosmicData, displayPanel, tagsLineHeight, customOrder } = this.state.vm
    let { id } = this.props.params
    const baseInfoFilelds = _.get(tagDatasource, 'params.microPictureBaseInfo', excludeDim).filter(_.identity)
    let content = null
    if (!dataSourceDimensions.length || !tagCategory.length) return null
    if (displayPanel === 'baseTags') {
      const dims = dataSourceDimensions.filter(p => _.get(p, 'tag_extra.is_base_tag', '0') === '1')
      let basTags = []
      if (dims.length) {
        basTags = dims.map(p => {
          const mapInfo = tagCategoryMap.find(m => m.dimension_id === p.id) ||{ tag_tree_id: 'not-typed'}
          const categoryInfo = tagCategory.find(t => t.id === mapInfo.tag_tree_id)
          if (!categoryInfo) return null
          return {
            name: p.title || p.name,
            value: _.get(tagsInfo, p.name, '无'),
            typeName: categoryInfo.title || categoryInfo.name,
            typeId: categoryInfo.id,
            parentId: categoryInfo.parent_id,
            tag_desc: p.tag_desc
          }
        })
        basTags = _.groupBy(basTags.filter(_.identity), 'typeId')
        basTags = _.reduce(basTags, (r, v, k) => {
          r[k] = {
            name: _.get(v, '[0].typeName', ''),
            parentId: _.get(v, '[0].parentId', ''),
            child: v.map(p => _.pick(p, ['name', 'value', 'tag_desc']))
          }
          return r
        }, {})
      }
      content = (<div>
        <div className="tag-list-line-l" style={{ height: tagsLineHeight }} />
        {
          _.keys(basTags).map((p, j) => {
            let nodeId = basTags[p].parentId
            let categoryText = basTags[p].name
            while (nodeId && nodeId !== '-1') {
              const typeNode = tagCategory.find(p => p.id === nodeId)
              categoryText = `${typeNode.name}/${categoryText}`
              nodeId = typeNode.parentId
            }

            const tags = basTags[p].child.map((c, i) => {
              const tipText = (<div>
                <div className="font18 color-main">{c.title || c.name}</div>
                <div>
                  <span className="color-main">
                    标签说明：
                  </span>
                  {c.tag_desc}
                </div>
              </div>)
              return (
                <div className="iblock mg3r mg2t" key={`tags-p-${i}`}>
                  <div className="tag-group-item iblock " key={`tags${i}`}>
                    <div className="itblock">
                      {c.name}: {c.value}
                    </div>
                    <Popover trigger="hover" placement="rightTop" content={tipText}>
                      <ExclamationCircleOutlined className="mg1l color-main font15" />
                    </Popover>
                  </div>
                  <div className="tag-group-item2" />
                </div>
              );
            })

            return (
              <div className="tag-group-panel mg2b" key={`tagsgroup${j}`} ref={ref => {
                if (j === 0) { this.tagsBegin = ref }
                if (j === _.keys(basTags).length - 1) { this.tagsEnd = ref }
              }}>
                <div className="tag-group-name ">
                  <AppstoreOutlined className="tag-list-icon color-main" />
                  <div className="tag-list-line iblock" />
                  {categoryText}
                </div>
                <div>{tags}</div>
              </div>
            );
          })
        }
      </div>)
    } else if (displayPanel === 'tagDetails') {
      let showTagDetails = true
      if (!tagCategory.length || !tagCategoryMap || _.isEmpty(tagsInfo) || _.isEmpty(microcosmicData) || !dataSourceDimensions.length) {
        showTagDetails = false
      }
      content = showTagDetails ? (
        <TagDetails
          tagCategory={tagCategory}
          baseInfoFilelds ={baseInfoFilelds}
          tagCategoryMap={tagCategoryMap}
          tagsInfo={tagsInfo}
          microcosmicData={microcosmicData}
          customOrder={customOrder}
          projectCurrent={projectCurrent}
          dimensions={dataSourceDimensions.filter(p => _.includes(p.datasource_type, 'tag') && _.get(p, 'tag_extra.is_base_prop', '0') === '0')}
          baseDimensions={dataSourceDimensions.filter(p => _.includes(p.datasource_type, 'tag') && _.get(p, 'tag_extra.is_base_prop', '0') === '1')}
        />
      ) : null
    } else if (displayPanel === 'userActions') {
      content = (
        <UserActions
          datasource={datasourceCurrent}
          dimensions={dataSourceDimensions.filter(p => !_.includes(p.datasource_type, 'tag'))}
          project={projectCurrent}
          projectList={projectList}
          userId={id}
          datasourceList={datasourceList}
        />
      )
    }

    return (
      <div className="pd3x pd2t">
        <div>
          <Button.Group>
            <Button
              type={displayPanel === 'baseTags' ? 'primary' : ''}
              onClick={() => this.store.changeState({ displayPanel: 'baseTags' })}
            >
              基础标签
            </Button>
            <Button
              type={displayPanel === 'tagDetails' ? 'primary' : ''}
              onClick={() => this.store.changeState({ displayPanel: 'tagDetails' })}
            >
              用户详情
            </Button>
            <Button
              type={displayPanel === 'userActions' ? 'primary' : ''}
              onClick={() => this.store.changeState({ displayPanel: 'userActions' })}
            >
              行为序列
            </Button>
          </Button.Group>
        </div>
        <div className="pd3y" style={{ position: 'relative' }}>
          {content}
        </div>
      </div>
    )
  }

  renderPortraitPanel = (tagProject, tagDatasource, projectCurrent) => {
    return (
      <div>
        <Bread
          path={[
            {
              name: tagProject.id !== projectCurrent.id
                ? <HoverHelp placement="right" icon="link" addonBefore="微观画像 " content={`已关联标签项目【${tagProject.name}】`} />
                : '微观画像'
            }
          ]}
        />
        <div className="aligncenter info-query color-main">微观画像查询{this.renderQuerySelect(tagProject, tagDatasource, false)}</div>
        <div className="data-panel overscroll-y always-display-scrollbar" style={{ height: 'calc(100vh - 180px)' }}>
          {this.renderBaseInfo(tagDatasource)}
          {this.renderTagPanel()}
        </div>
      </div>
    )
  }

  renderMessage = () => {
    const { message: msg } = this.state.vm
    if (window.location.pathname.split('/')[3]) {
      if (!_.isEmpty(msg)) {
        if (message.type === 'error') message.error(msg.content)
        else message.success(msg.content)
      }
    }
  }

  notok = () => {
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
            这个项目不是由标签系统创建的，不能使用用户画像，请切换到由标签系统创建的项目。
          </div>
        </div>
      </div>
    )
  }

  render() {
    let { id } = this.props.params
    const { loadding } = this.state.vm
    const { projectCurrent, tagProject, tagDatasource } = this.props
    if (AccessDataType.Tag !== projectCurrent.access_type) {
      return this.notok()
    }
    return (
      <div className="microcosmic-portrait">
        <Helmet>
          <title>{'微观画像' ? `${'微观画像'}-${siteName}` : siteName}</title>
        </Helmet>
        <Spin spinning={loadding}>
          {
            !id ? this.renderQueryPanel(tagProject, tagDatasource) : this.renderPortraitPanel(tagProject, tagDatasource, projectCurrent)
          }
        </Spin>
        {
          this.renderMessage()
        }
      </div>
    )
  }
}
