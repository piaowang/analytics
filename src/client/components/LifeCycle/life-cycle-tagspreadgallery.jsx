import React, { Component } from 'react'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import { Radio } from 'antd'
import Resources from '../../models/segment/resources'
import ReactEcharts from '../Charts/ReactEchartsEnhance'
import EchartBaseOptions from '../../common/echart-base-options'


@withContextConsumer(ContextNameEnum.ProjectInfo)
export default class tagSpreadGallery extends Component {

  state = {
    tagFrequencyNameDict: {},
    isFetchingGalleryData: false,
    vizType: 'bar'
  }

  componentDidMount() {
    this.fetchData(this.props)
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(this.props, nextProps)) this.fetchData(nextProps)
  }

  async fetchData(props, suffix = '', argsModer = _.identity) {
    let {tagFiltersArr, dbTags, activeTagIds, tagProject, nowUg} = props
    let {[`tagFrequencyNameDict${suffix}`]: tagFrequencyNameDict} = this.state

    this.setState({ isFetchingGalleryData: true })

    for ( let i = 0; i < tagFiltersArr.length; i ++) {
      let filters = tagFiltersArr[i]
      // 如果存在子项目，优先取子项目parent_id
      const projectId = tagProject.parent_id || tagProject.id
      const datasourceId = tagProject.datasource_id
      // 子项目ID，用来查询子项目设置的数据过滤条件
      const childProjectId = !_.isEmpty(tagProject.parent_id) ? tagProject.id : null

      let tagNames = (activeTagIds || []).map(tagId => _.find(dbTags, dbTag => dbTag.id === tagId))
        .filter(tag => tag && !(tag.name in tagFrequencyNameDict)) // 已经查过的就不再查询，不过需要在条件变更时清除缓存
        .map(tag => tag.name)
      const args = argsModer([projectId, '', datasourceId, tagNames, filters, childProjectId])

      let { result, success, message } = await Resources.queryTagGalleryByDruidQuery(...args)  
      
      this.setState({
        [nowUg[i].id]: result
      })
    }

    this.setState({
      isFetchingGalleryData: false
    })

  }

  renderChart() {
    const { nowUg, dbTags, activeTagIds } = this.props

    let tagIdDict = _.keyBy(dbTags, 'id')
    let tag = tagIdDict[activeTagIds[0]] || { name: '' }
    let legend = []
    let xAxis = []
    nowUg.map( i => {
      legend = Object.keys(_.get(this.state, `${i.id}.tag_groups.${tag.name}`, {}))
      
      xAxis.push(i.title)
    })

    let series = legend.map( i => ({
      barGap: 0,
      data: nowUg.map( j => _.get(this.state, `${j.id}.tag_groups.${tag.name}.${i}`, 0)),
      name: i,
      stack: '',
      type: 'bar'
    }))

    let option = {
      ...EchartBaseOptions,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params) => {
          let format = params.map( i => `</br><span>${i.seriesName}: ${i.data}</span>`)
          return params[0].name + format
        }
      },
      legend: {
        show: legend.length <= 7,
        data: legend
      },
      xAxis: [
        {
          type: 'category',
          axisTick: { show: false },
          data: xAxis
        }
      ],
      yAxis: [
        {
          type: 'value'
        }
      ],
      series
    }

    if (_.isEmpty(legend)) return false
    return option
  }

  renderPercent() {

    const { nowUg, dbTags, activeTagIds } = this.props

    let tagIdDict = _.keyBy(dbTags, 'id')
    let tag = tagIdDict[activeTagIds[0]] || { name: '' }
    let legend = []
    let yAxis = []
    let totalArr = nowUg.map( i => {
      legend = Object.keys(_.get(this.state, `${i.id}.tag_groups.${tag.name}`, {}))
      
      yAxis.push(i.title)

      let temp = Object.values(_.get(this.state, `${i.id}.tag_groups.${tag.name}`, {}))

      return !_.isEmpty(temp) ? temp.reduce( (a,b) => _.isNumber(a) ? a += b : 0) : 0
    })

    let series = legend.map( i => ({
      name: i,
      type: 'bar',
      stack: '总量',
      data: nowUg.map( (j,jdx) => _.get(this.state, `${j.id}.tag_groups.${tag.name}.${i}`, 0) * 100 / Math.max(totalArr[jdx], 1))
    }))

    let option = {
      ...EchartBaseOptions,
      tooltip: {
        confine: true,
        formatter: (params) => {
          let format = ''
          if (!params) return ''
          params.map( i => {
            format += `<br/>${i.seriesName}: ${i.data}%`
          })
          return `${params[0].name}${format}`
        }
      },
      legend: {
        data: legend,
        show: legend.length <= 7
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis:  {
        type: 'value',
        axisLabel: {
          formatter: '{value}%'
        }
      },
      yAxis: {
        type: 'category',
        data: yAxis
      },
      series
    }

    if (_.isEmpty(legend)) return false
    return option
  }

  render() {
    const { vizType, isFetchingGalleryData } = this.state 
    const  { nowUg, dbTags } = this.props

    if (_.isEmpty(nowUg)) return <div className="aligncenter font20 pd3 color-gray">没有数据</div>
    if (isFetchingGalleryData || _.isEmpty(dbTags)) return <div className="aligncenter font20 pd3 color-gray">加载中...</div>

    let option = vizType === 'bar' ? this.renderChart() : this.renderPercent()

    if (!option) return <div className="aligncenter font20 pd3 color-gray">没有数据</div>

    return (
      <div>
        <Radio.Group 
          value={vizType} 
          buttonStyle="solid"
          onChange={(e) => this.setState({ vizType: e.target.value })} 
        >
          <Radio.Button value="bar">人数</Radio.Button>
          <Radio.Button value="precent">百分比</Radio.Button>
        </Radio.Group>
        <ReactEcharts option={option}/>
      </div>
    )
  }
}
