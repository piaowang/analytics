import React from 'react'
import {bindActionCreators} from 'redux'
import Link from '../Common/link-nojam'
import {connect} from 'react-redux'
import {Button} from 'antd'
import * as actions from '../../actions'
import _ from 'lodash'
import {urlBase, canSetDataSource, dsSettingPath} from './constants'

let mapStateToProps = state => state.common
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
export default class UsergroupIndex extends React.Component {

  componentWillMount() {
    this.getData()
  }

  getData = async () => {
    //这里要确保分群数据获得，必须要await
    await this.props.getUsergroups()
  }

  renderSettingGuide() {
    let {projectCurrent} = this.props
    return  (
      <div
        className="relative"
        style={{height: 'calc(100vh - 200px)'}}
      >
        <div className="center-of-relative aligncenter">
          <p>
            <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
          </p>
          <p className="font16 pd2y">
            要使用用户分群，请设置这个项目的
            <b className="color-red">用户ID</b>
          </p>
          <div>
            {
              canSetDataSource
                ? <Link to={`${dsSettingPath}?id=${projectCurrent.id}`}>
                  <Button type="primary">马上设置</Button>
                </Link>
                : null
            }
          </div>
        </div>
      </div>
    )
  }

  render() {
    const props = _.omit(this.props, 'children')
    let {datasourceCurrent, loadingProject} = props
    if (!loadingProject && !_.get(datasourceCurrent, 'params.commonMetric[0]')) {
      return this.renderSettingGuide()
    }
    const childrenWithProps = React.Children.map(this.props.children,
      child => React.cloneElement(child, {...props})
    )

    return (
      <div className="height-100">
        {childrenWithProps}
      </div>
    )
  }
}

