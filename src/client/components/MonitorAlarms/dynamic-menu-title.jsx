/* eslint-disable react/prop-types */
import React from 'react'
import Fetch from '../Common/fetch.jsx'
import _ from 'lodash'

export default class DynamicMenuTitle extends React.Component {
  componentDidMount() {
    let {PubSub} = this.props
    this.pubsubToken = PubSub.subscribe('exception-list-count-refresh', () => {
      if (_.isFunction(this._fetcher && this._fetcher.fetch)) {
        this._fetcher.fetch()
      }
    })
  }

  componentWillUnmount() {
    let {PubSub} = this.props
    PubSub.unsubscribe(this.pubsubToken)
  }

  render() {
    let {countByHandleState, children, projectCurrent} = this.props
    let pId = projectCurrent && projectCurrent.id
    if (!pId) {
      return null
    }
    return (
      <Fetch
        ref={ref => this._fetcher = ref}
        url="/app/monitor-alarms/exceptionsCount"
        doFetch={pId}
        body={{
          projectId: pId,
          handleState: countByHandleState
        }}
      >
        {({data}) => {
          let count = _.get(data, 'result') || 0
          let countDom = count
            ? <span className="fright font12 border bg-black pd1x corner">{99 < count ? '99+' : count}</span>
            : null
          return (
            <span>{children}{countDom}</span>
          )
        }}
      </Fetch>
    )
  }
}
