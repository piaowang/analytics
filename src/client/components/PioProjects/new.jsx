import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import * as actions from '../../actions'
import ProjForm from './form'
import {initProcess} from './constants'
import Bread from '../Common/bread'

class ProjNew extends React.Component {

  componentWillMount() {
    //this.getMetadata()
    //this.props.getProjects()
    this.props.getOperators()
  }

  render() {
    return (
      <div className="height-100">
        <Bread
          path={[
            { name: '智能分析', link: '/console/pio-projects' },
            { name: '新建智能分析' }
          ]}
        />
        <ProjForm
          {...this.props}
          process={initProcess()}
        />
      </div>
    )
  }
}

let mapStateToProps = state => state.common
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

export default connect(mapStateToProps, mapDispatchToProps)(ProjNew)

