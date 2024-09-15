import React from 'react'
import Examine from '../../Examine/index'
import { EXAMINE_TYPE } from '~/src/common/constants'
import Bread from 'client/components/Common/bread'

export default class EamineIndex extends React.Component {
  state = {}
  render() {
    return (<div >
      <Bread path={[{ name: '审核管理' }]} />
      <div className="examine-config-warp pd2"
        style={{
          height: 'calc(100vh - 94px)', 
          overflowX: 'hidden'
        }}
      >
        {<Examine modelType={EXAMINE_TYPE.liveScreen} />}
      </div>
    </div>)
  }
}
