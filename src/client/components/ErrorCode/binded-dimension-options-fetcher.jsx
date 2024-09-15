/**
 * 用于替换通用 CommonDruidFilterPanel 筛选组件里面的 druid fetcher，用于当维度与错误码字段关联了的情况下
 */
import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import Synchronizer from '../Fetcher/synchronizer'
import {ErrorCodeBindingTypeEnum} from '../../../common/constants'

const urlDictByErrorCodeType = {
  [ErrorCodeBindingTypeEnum.SystemCode]: '/app/system-code/find-project-systems',
  [ErrorCodeBindingTypeEnum.ModuleCode]: '/app/module-code/find-project-modules',
  [ErrorCodeBindingTypeEnum.InterfaceCode]: '/app/interface-code/find-project-interface',
  [ErrorCodeBindingTypeEnum.ErrorCode]: '/app/log-code/find-project-log-code'
}

const {distinctDropDownFirstNLimit = 10} = window.sugo

export default class BindedDimensionOptionsFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func,
    projectId: PropTypes.string.isRequired,
    dimensionExtraSettingDict: PropTypes.object,
    filters: PropTypes.array,
    dbDimensions: PropTypes.array,
    dimensions: PropTypes.array,
    doFetch: PropTypes.bool,
    onData: PropTypes.func
  }

  static defaultProps = {
    doFetch: true,
    dimensions: [],
    dbDimensions: [],
    children: _.constant(null)
  }

  genQueryBody = (props = this.props) => {
    let {projectId, dimensionExtraSettingDict, filters, dimensions} = props
    const dimName = dimensions[0]

    let dimFilter = _.find(filters, flt => flt.col === dimName)
    return {
      project_id: projectId,
      code_keyword: _.get(dimFilter, 'eq', '') + '',
      limit: _.get(dimensionExtraSettingDict, [dimName, 'limit']) || distinctDropDownFirstNLimit
    }
  }

  render() {
    let {children, dbDimensions, dimensions, doFetch, onData} = this.props

    const dimName = dimensions[0]
    let dbDim = _.find(dbDimensions, d => d.name === dimName)
    let {bindToErrorCode} = dbDim.params

    return (
      <Synchronizer
        modelName="codes"
        url={urlDictByErrorCodeType[bindToErrorCode]}
        doFetch={doFetch}
        onLoaded={onData}
        query={this.genQueryBody()}
        resultExtractor={data => _.get(data, 'body') || []}
      >
        {({isFetching, data, fetch}) => {
          return children({
            isFetching,
            data: data.map(d => ({[dimName]: d.code})),
            fetch: (body, params) => {
              if (_.isFunction(body)) {
                let bodyMapper = body
                let finalBody = bodyMapper(this.props)
                return fetch(this.genQueryBody(finalBody), params)
              }
              return fetch(body, params)
            }
          })
        }}
      </Synchronizer>
    )
  }
}
