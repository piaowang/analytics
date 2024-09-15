//左侧看板列表
import React from 'react'
import { Tooltip, Button, Select } from 'antd'
import { withCommonFilter } from '../Common/common-filter'
import { Link } from 'react-router'
import smartSearch from '../../../common/smart-search'
import { Auth } from '../../common/permission-control'
import SliceDraggable from './slice-draggable'
import Icon from '../Common/sugo-icon'
import helpLinkMap from 'common/help-link-map'
import { ContextNameEnum, withContextConsumer } from '../../common/context-helper'
import Fetch from '../../common/fetch-final'
import _ from 'lodash'

import { withDataSourceTags } from '../Fetcher/data-source-tags-fetcher'
import { Anchor } from '../Common/anchor-custom'

const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['/console/dashboards/new']
const { Option } = Select

@withContextConsumer(ContextNameEnum.ProjectInfo)
@withCommonFilter
class DashboardSliceList extends React.Component {
  state = {
    selectedTags: []
  }

  componentDidMount() {
    ;(async () => {
      let res = await Fetch.get('/app/tag/get/all', { type: 'slices' })
      this.setState({ tagsAllData: res.data })
    })()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.selectedGroupKey !== this.props.selectedGroupKey) {
      this.setState({ selectedTags: [] })
    }
  }

  groupChange = selectedTags => {
    this.setState({
      selectedTags
    })
  }

  render() {
    const {
      keywordInput: KeywordInput,
      slices,
      currentDashboard,
      addSliceToDashboard,
      keyword,
      datasourceCurrent: { id: datasource_id },
      removeSliceFromDashboard,
      projectList,
      groupSelector: FilterByProject,
      selectedGroupKey: dataSourceIdsForSliceFiltering
    } = this.props
    const { selectedTags, tagsAllData = {} } = this.state

    let { dataSourceTags: group } = this.props
    group = _.isEmpty(dataSourceIdsForSliceFiltering) ? group : tagsAllData.filter(p => p.project_id === dataSourceIdsForSliceFiltering)
    const showOtherProjectsSlice = _.get(currentDashboard, 'params.allowAddSlicesCrossProjects') || false

    let slices0 = slices
      .filter(d => {
        let pass = d.params.openWith !== 'UserActionAnalytics'
        if (!showOtherProjectsSlice) {
          pass = pass && d.druid_datasource_id === datasource_id
        }
        if (keyword) {
          pass = pass && smartSearch(keyword, d.slice_name)
        }
        if (dataSourceIdsForSliceFiltering) {
          return d.druid_datasource_id === dataSourceIdsForSliceFiltering && pass
        }
        return pass
      })
      .filter(({ tags }) => !selectedTags.length || tags.find(key => selectedTags.includes(key)))

    if (showOtherProjectsSlice) {
      slices0 = _.orderBy(slices0, s => (s.druid_datasource_id === datasource_id ? 0 : 1))
    }
    group = group.filter(({ type }) => type === 'slices')
    return (
      <div className='slice-pool'>
        <div className='pool-title fix'>
          <span className='fleft pd1t'>
            组建看板
            <Anchor href={helpLink} target='_blank' className='mg1l' title='查看帮助文档'>
              <Icon type='question-circle' />
            </Anchor>
          </span>
          <span className='fright'>
            <Auth auth='/console/analytic'>
              <Link to='/console/analytic'>
                <Tooltip title='新建单图'>
                  <Button size='small' type='primary'>
                    新建单图
                  </Button>
                </Tooltip>
              </Link>
            </Auth>
          </span>
        </div>

        <div className='pool-search pd2x relative'>
          {!showOtherProjectsSlice ? null : (
            <FilterByProject allowClear placeholder='按项目筛选' className='width-100 mg1b'>
              {(projectList || []).map(pr => {
                return (
                  <Option key={pr.datasource_id} value={pr.datasource_id}>
                    {pr.name}
                  </Option>
                )
              })}
            </FilterByProject>
          )}

          {group.length ? (
            <Select className='width-100 mg1b' mode='multiple' placeholder='按分组筛选' onChange={this.groupChange} optionLabelProp='label' value={selectedTags}>
              {group.map(({ name, id }) => (
                <Option key={id} value={id} label={name}>
                  {name}
                </Option>
              ))}
            </Select>
          ) : null}

          <KeywordInput placeholder='搜索单图' wait={500} />
        </div>

        <div className='pd2x'>
          <hr className='dotted' />
        </div>
        <div className='pool-body' style={showOtherProjectsSlice ? { top: '160px' } : undefined}>
          {/* 左侧 */}
          {slices0.map((slice, index) => {
            return (
              <SliceDraggable
                key={index + 'slice-index'}
                slice={slice}
                index={index}
                currentDashboard={currentDashboard}
                addSliceToDashboard={addSliceToDashboard}
                removeSliceFromDashboard={removeSliceFromDashboard}
                showProjectName={showOtherProjectsSlice}
              />
            )
          })}
        </div>
      </div>
    )
  }
}

const WithTags = withDataSourceTags(DashboardSliceList, props => {
  const { id: dataSourceId = '' } = props.datasourceCurrent
  return {
    dataSourceId: dataSourceId,
    doFetch: !!dataSourceId
  }
})

export default WithTags
