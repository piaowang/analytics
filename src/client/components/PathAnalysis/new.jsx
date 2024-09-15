import React from 'react'
import Bread from '../Common/bread'
import PathAnalysisForm from './form'
import _ from 'lodash'
import {browserHistory} from 'react-router'
export default class PathAnalysisNew extends React.Component {

  componentWillMount() {
    let {datasources, pathAnalysis} = this.props
    let datasource = datasources[0] || {}
    let defaultOne = _.find(pathAnalysis, d => {
      return d.datasource_id === datasource.id
    })
    if (defaultOne) {
      browserHistory.push(`/console/path-analysis/${defaultOne.id}`)
    }
  }

  render () {
    return (
      <div className="height-100">
        <Bread
          path={[
            { name: '路径分析' }
          ]}
        />
        <div className="scroll-content always-display-scrollbar relative">
          <PathAnalysisForm {...this.props} />
        </div>
      </div>
    )
  }
}
