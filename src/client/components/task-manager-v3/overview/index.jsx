import React from 'react'
import Bread from '../../Common/bread'
import FlowBox from './flowBox'
import _ from 'lodash'
import './index.styl'


export default function CircleDispatchManager(props) {


  return (
    <div className='height-100 E4container' >
      <Bread
        path={[
          { name: '概览' }
        ]}
      />
      <FlowBox />

    </div>
  )
}


