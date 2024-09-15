import React from 'react'
import { PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Spin, Popover } from 'antd';
import {Link} from 'react-router'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import * as actions from '../../actions'
import List from './slices'
import Bread from '../Common/bread'
import {Auth} from '../../common/permission-control'
import _ from 'lodash'

class SliceList extends React.Component {

  componentDidMount() {
    this.props.getSlices()
  }

  render() {

    let help = (<div>
      <p>单图列表是所有图表的汇集处，主要来自自助分</p>
      <p>析和行为事件分析保存过来的图表，可对这些图</p>
      <p>表进行管理。</p>
    </div>)
    let extra = (
      <Popover content={help} trigger="hover" placement="bottomLeft">
        <QuestionCircleOutlined className="font14" />
      </Popover>
    )

    let {location} = this.props
    let {hideLeftNavigator} = location && location.query || {}
    return (
      <div className="height-100">
        <Bread
          path={[
            hideLeftNavigator ? {name: '多维分析', link: '/console/analytic'} : null,
            {name: '单图列表', link: '/console/slices'}
          ].filter(_.identity)}
          extra={extra}
        >
          <Auth auth="/console/analytic">
            <Link to="/console/analytic">
              <Button type="primary" icon={<PlusCircleOutlined />}>新建单图</Button>
            </Link>
          </Auth>
        </Bread>
        <div className="scroll-content always-display-scrollbar right-content-bg" id="scroll-content">
          <Spin spinning={this.props.loading}>
            <div className="pd3x pd1t pd2b">
              <List {...this.props} />
            </div>
          </Spin>
        </div>

      </div>
    );
  }
}


export default (()=>{
  function ExcludeStoppedProject(props) {
    let {datasourceList: datasources, slices} = props
    let validDataSources = datasources.filter(ds => ds.status)
    let activeDataSourcesIdSet = new Set(validDataSources.map(ds => ds.id))
    let sliceFilter = sl => activeDataSourcesIdSet.has(sl.druid_datasource_id)
    return (
      <SliceList {...{...props, datasources: validDataSources, slices: slices.filter(sliceFilter)}} />
    )
  }
  let mapStateToProps = state => state.common
  let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

  return connect(mapStateToProps, mapDispatchToProps)(ExcludeStoppedProject)
})()
