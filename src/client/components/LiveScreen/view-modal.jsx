import React from 'react'
import {Modal } from 'antd'
import { bindActionCreators } from 'redux'
import Chart from './chart'
import { connect } from 'react-redux'
import _ from 'lodash'
import * as actions from './actions/workbench'
import {immutateUpdate, immutateUpdates} from 'common/sugo-utils'


class ViewModal extends React.Component {

  generateComponentDom = (component) => {
    if (_.isEmpty(component)) return null
    // console.log('screenComponent---', component)
    component = immutateUpdates(component, 'params.socketCacheParams', 
      ()=> ({}), 'style_config', (s)=>{
        return {
          ...(s || {}),
          cssWarn: {
            '.ant-table': {
              margin: '0px' 
            },
            '.ant-table-header': {
              overflow: 'scroll !important',
              overflowX: 'hidden !important'
            },
            '.ant-table-body': {
              overflow: 'scroll',
              maxHeight: '257px',
              marginTop: '15px'
            }
          }
        }
      }
    )
    
    return (
      <div style={{height: '300px'}}>
        <Chart {...component} />
      </div>
    )
  }

  render() {
    const { visible, onOk,  screenComponents = [],  activedId, currScreenComp } = this.props
    const currentComponent = _.find(screenComponents, {id: activedId})
    // console.log(this.props, currentComponent, 'this=====')
    return (
      <Modal
        width="93%"
        title="预览"
        closable={false}
        visible={visible}
        onOk={onOk}
        onCancel={onOk}
        bodyStyle={{background:  '#0E2A42'}}
      >
        { _.isEmpty(currentComponent) ? null : this.generateComponentDom(currentComponent)}
      </Modal>
    )
  }
}

export default ViewModal




