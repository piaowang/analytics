import React from 'react'
import DruidColumnType, {isNumberDimension} from '../../../common/druid-column-type'
import {getFormatterByDbDim} from '../Analytic/inspect-source-data'
import _ from 'lodash'
import HighlightString from '../Common/highlight-string'


const truncate20 = _.partialRight(_.truncate, {length: 20})

export default class RowPreviewer extends React.Component {
  state = {
    showAll: false
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !_.isEqual(this.props, nextProps) || this.state.showAll !== nextState.showAll
  }

  showAll = () => {
    this.setState({showAll: true})
  }

  render() {
    let {dimNameDict, rowData, highlightConfig, style, mainTimeDimName} = this.props
    let {showAll} = this.state

    let omited = _.pickBy(rowData, (val, key) => key !== mainTimeDimName && key !== '__rowId' && key in dimNameDict && (val || val === 0))
    let keys = Object.keys(omited)
    if (!_.isEmpty(highlightConfig)) {
      keys = _.orderBy(keys, k => k in highlightConfig ? 0 : 1)
    }
    let keysShortEnough = keys.length <= 25
    let content = (keysShortEnough || showAll ? keys : _.take(keys, 25)).map(dimName => {
      let dbDim = dimNameDict[dimName] || {name: dimName, type: DruidColumnType.String}
      let formatter = dbDim && getFormatterByDbDim(dbDim) || _.identity

      let highlightChecker = highlightConfig && highlightConfig[dimName]

      let dimValue = rowData[dimName]
      return (
        <span className="mg1r pd1r" key={dimName} data-dim-name={dimName}>
          <span
            className="mg1r pd1x bg-light-grey bold wordbreak-keep-all fpointer"
            title={dbDim.name}
          >{dbDim.title || dbDim.name}</span>
          {highlightChecker
            ? (
              <HighlightString
                text={isNumberDimension(dbDim) ? `${dimValue}` : formatter(dimValue)}
                highlight={_.isFunction(highlightChecker)
                  ? () => highlightChecker(dimValue) // 检查源值
                  : highlightChecker}
                className="highlight-yellow"
              />
            ) : truncate20(formatter(dimValue))}
        </span>
      )
    })

    if (keysShortEnough || showAll) {
      return (
        <div style={style}>{content}</div>
      )
    }

    return (
      <div style={style}>{[
        ...content,
        <span
          key="expand"
          className="mg1r pd1x bg-light-grey bold wordbreak-keep-all fpointer"
          title={`查看折叠了的 ${keys.length - 25} 项`}
          onClick={this.showAll}
        >...</span>
      ]}</div>
    )
  }
}
