import React from 'react'
import { Link } from 'react-router'
import { Tooltip, Input } from 'antd'
import statusMap from '../../../common/segment-status-map'

export default class Uglist extends React.Component {

  state = {
    search: ''
  }

  onChange = e => {
    this.setState({
      search: e.target.value
    })
  }

  render () {
    let {segmentExpands, segmentExpand: {id: segmentExpandId, status}, datasources} = this.props
    let {search} = this.state
    let datasourcesIds = datasources.map(d => d.id)
    segmentExpands = segmentExpands.filter(se => datasourcesIds.includes(se.datasource_id))
    segmentExpands = search
      ? segmentExpands.filter(ug => ug.title.includes(search))
      : segmentExpands

    return (
      <div className="usergroup-list">
        <div className="search-box pd2">
          <Input onChange={this.onChange} value={search} placeholder="搜索" />
        </div>
        <div className="usergroup-list-wrapper">
          {
            segmentExpands.length
              ? segmentExpands.map((ug, index) => {
                let {count, id, title, description} = ug
                count = count || 0
                let tip = `${title}:${statusMap[status]}${description? (' : ' + description) : ''}`
                let cls = '' + id === segmentExpandId
                  ? 'elli block' + ' active'
                  : 'elli block'
                return (
                  <div key={index + '@se' + id} className="usergroup-unit">
                    <Tooltip placement="right" title={tip}>
                      <Link className={cls} to={`/console/segment-expand/${id}`}>
                        <span className="iblock number-badge">{count}</span>
                        {title}
                      </Link>
                    </Tooltip>
                  </div>
                )
              })
              : <p className="ug-empty pd2 aligncenter">
                还没有扩群
              </p>
          }
        </div>
      </div>
    )
  }
}
