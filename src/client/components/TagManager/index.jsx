/*
 * 用户画像
 */
import React from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import * as actions from '../../actions'
import TagManager from './tag-manager-form'
import TagGroup from './tag-group'
import check from './tag-require'
import {getUserTotal} from '../../actions'
import {convertTagGroups2Dimensions, dimensionFilter} from './common'
import _ from 'lodash'

const picks = ['dimensions', 'tagGroups']
const mapStateToProps = state => state.common
const mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
export default class TagManagerIndex extends React.Component {

  state = {
    dimensions: []
  }

  componentDidMount() {
    this.getData()
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.datasourceCurrent.id !== this.props.datasourceCurrent.id ||
      (
        this.props.location.pathname !== nextProps.location.pathname &&
        nextProps.location.pathname.includes('tag-dict')
      )
    ) {
      this.getData(nextProps)
      if (this.props.datasourceCurrent.id) {
        window.location.hash = ''
      }
    }
    else if (!_.isEqual(
      _.pick(this.props, picks),
      _.pick(nextProps, picks)
    )) {
      this.buildState(nextProps)
    }
  }

  buildState = (nextProps) => {
    let {dimensions, tagGroups} = nextProps
    let commonMetric = _.get(nextProps.datasourceCurrent, 'params.commonMetric') || []
    this.setState({
      dimensions: [
        ...dimensionFilter(dimensions, commonMetric),
        ...convertTagGroups2Dimensions(tagGroups)
      ]
    })
  }

  getData = async (props = this.props) => {
    const { tagDatasource, tagProject } = props
    let {id} = tagDatasource
    if (id) {
      let {
        customUpdate,
        getTagTypes,
        getDimensions,
        getUsergroups,
        getTagGroups,
        getTagTrees
      } = props
      let tagTypes = await getTagTypes({
        where: {
          datasource_id: id
        }
      }, false)
      let tagGroups = await getTagGroups({
        where: {
          datasource_id: id
        }
      }, false)
      let tagTrees = await getTagTrees(id, {
        parentId: 'all'
      }, false)
      let usergroups = await getUsergroups({}, false)
      let dimensions = await getDimensions(id, {
        datasource_type: 'tag',
        includeNotUsing: true
      }, false)
      let userTotal = await getUserTotal(tagProject)
      if (tagTypes && dimensions && usergroups && tagGroups) {
        let commonMetric = _.get(tagDatasource, 'params.commonMetric')
        let dims = dimensionFilter(dimensions.data, commonMetric)
        customUpdate({
          userTotal,
          tagTypes: tagTypes.result,
          dimensions: dims,
          tagTrees: tagTrees.result.trees,
          tagGroups: tagGroups.result,
          usergroups: usergroups.result.filter(t => t.druid_datasource_id === id)
        })
        this.setState({
          dimensions: [
            ...dims,
            ...convertTagGroups2Dimensions(tagGroups.result)
          ]
        })
      }
    }
  }

  render() {
    let {
      loadingProject,
      location: {pathname},
      tagProject,
      tagDatasource
    } = this.props
    let {dimensions} = this.state
    // 判断项目类型 使用关联tag项目的数据源
    if (!loadingProject) {
      let datasourceSettingsNeeded = check({
        projectCurrent: tagProject,
        datasourceCurrent:tagDatasource,
        moduleName: '用户画像功能'
      })
      if (datasourceSettingsNeeded) {
        return datasourceSettingsNeeded
      }
    }
    if (pathname.includes('tag-group')) {
      return (
        <TagGroup
          {...this.props}
          projectCurrent={tagProject}
          datasourceCurrent={tagDatasource}
          dimensions={dimensions}
        />
      )
    }
    return (
      <TagManager
        {...this.props}
        dimensions={dimensions.filter(p => p.params.isUsingTag !== false)}
      />
    )
  }
}
