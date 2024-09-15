import React, { Component } from 'react'
import { connect } from 'react-redux'
import { namespace } from './store/life-cycle'
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import { DatePicker, Select, Row, Col, message } from 'antd'
import TagSpreadGallery from './life-cycle-tagspreadgallery'
import {AccessDataType, DimDatasourceType } from '../../../common/constants'

const Option = Select.Option

@connect(state => ({
  ...state.sagaCommon,
  ...state[namespace]
}))
@withDbDims(props => {
  let dsId = _.get(props, 'datasourceCurrent.id') || ''
  return {
    dataSourceId: dsId,
    datasourceType: DimDatasourceType.tag,
    doFetch: !!dsId,
    exportNameDict: true
  }
})
export default class LCTagSpread extends Component {

  componentDidMount() {
    const { dataBase: { since }, rotated: { nowUg } } = this.props
    this.changeProps({ since, nowUg })
  }

  changeProps(payload) {
    const { tagSpread } = this.props
    this.props.dispatch({
      type: `${namespace}/setState`,
      payload: {
        tagSpread: {
          ...tagSpread,
          ...payload
        }
      }
    })
  }

  dispatch(func, payload) {
    this.props.dispatch({
      type: `${namespace}/${func}`,
      payload
    })
  }

  renderTimeBox() {
    const { tagSpread: { since } } = this.props
    return (
      <div className="mg2b">
        <span>时间:</span>
        <DatePicker
          className="width200 mg2r"
          value={since}
          format={'YYYY-MM-DD'}
          onChange={(v) => {
            this.changeProps({
              since: v
            })
            this.dispatch('fetchTagUg')
          }}
        />
      </div>
    )
  }

  renderTagSelectBox() {
    const { dataSourceDimensions: tags, tagSpread: { selectedTag } } = this.props
    let barChartTag = tags.filter(i => i.params.charType !== 'dist_bar' && i.tag_extra.is_base_prop === '0')
    return (
      <div>
        <span>标签:</span>
        <Select 
          className="width-80" 
          mode="multiple"
          value={selectedTag}
          onChange={(v) => {
            if (v.length > 4) return message.error('最多选择4个标签')
            this.changeProps({
              selectedTag: v
            })
          }}
        >
          {
            barChartTag.map( i => (
              <Option key={i.id} value={i.id}>{i.title || i.name}</Option>
            ))
          }
        </Select>
      </div>
    )
  }

  renderChart() {
    const { dataSourceDimensions: tags, tagSpread: { selectedTag, nowUg },  projectCurrent, projectList, datasourceCurrent } = this.props

    const tagFiltersArr = nowUg.map( ug => ug && ug.id && !_.startsWith(ug.id, 'temp_')
      ? [{ col: _.get(ug, 'params.groupby'), op: 'lookupin', eq: ug.id }]
      : _.get(ug, 'params.composeInstruction[0].config.tagFilters') || []) 

    let tagProject
    let dsId = _.get(datasourceCurrent, 'id') || ''
    if (projectCurrent.access_type !== AccessDataType.Tag) {
      tagProject = projectList.find(p => p.tag_datasource_name === projectCurrent.tag_datasource_name && p.access_type === AccessDataType.Tag) || {}
      dsId = [dsId, tagProject.datasource_id]
    } else {
      tagProject = projectCurrent
    }

    let structure = selectedTag.length < 2 ? [[selectedTag[0], selectedTag[1]]] : [[selectedTag[0], selectedTag[1]], [selectedTag[2], selectedTag[3]]]

    return (
      <div>
        {
          structure.map( (i,idx) => (
            <Row className="mg2y" key={`structure-${idx}`}>
              {
                i.map( j => {
                  if (!j) return
                  return (
                    <Col key={j} span={12}>
                      <TagSpreadGallery 
                        dbTags={tags}
                        tagFiltersArr={tagFiltersArr}
                        activeTagIds={[j]}
                        tagProject={tagProject}
                        nowUg={nowUg}
                      />
                    </Col>
                  )
                })
              }
            </Row>
          ))
        }
      </div>
    )
  }

  render() {
    const { dataSourceDimensions: tags } = this.props
    return (
      <div>
        {this.renderTimeBox()}
        {this.renderTagSelectBox()}
        {this.renderChart()}
      </div>
    )
  }
}
