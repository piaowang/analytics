import React from 'react'
import { Link } from 'react-router'
import { Tooltip } from 'antd'
import Search from '../Common/search'

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
    let {companys, company: {id: companyId}} = this.props
    let {search} = this.state
    companys = search
      ? companys.filter(ug => ug.name.includes(search))
      : companys

    return (
      <div className="usergroup-list">
        <div className="search-box pd2">
          <Search
            onChange={this.onChange}
            value={search}
            placeholder="搜索"
          />
        </div>
        <div className="usergroup-list-wrapper">
          {
            companys.length
              ? companys.map((ug, index) => {
                let {name, description, id} = ug
                let tip = `${name}:${description? (' : ' + description) : ''}`
                let cls = id === companyId
                  ? 'elli block' + ' active'
                  : 'elli block'
                return (
                  <div key={index + '@se' + id} className="usergroup-unit">
                    <Tooltip placement="right" title={tip}>
                      <Link className={cls} to={`/console/company/${id}`}>
                        {name}
                      </Link>
                    </Tooltip>
                  </div>
                )
              })
              : <p className="ug-empty pd2 aligncenter">
                还没有企业
              </p>
          }
        </div>
      </div>
    )
  }
}
