import React from 'react'
import {Link} from 'react-router'
import {Button} from 'antd'
const {cdn} = window.sugo
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`

export default class NewDashboards extends React.Component{

  state = {}

  render() {
    return (
      <div
        className="relative empty-overview-hint"
        style={{height: 'calc(100vh - 200px)'}}
      >
        <div className="center-of-relative aligncenter">
          <p className="pd2">
            <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
          </p>
          <div className="pd2">
            <Link to="/console/dashboards/new">
              <Button type="primary">点击新建看板</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }
}
