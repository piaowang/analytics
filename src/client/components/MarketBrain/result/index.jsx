import { Component } from 'react'
import _ from 'lodash'

import WxjTyj from './wxjtyj'
import Noraml from './default'

const { marketBrain: { 
  feature
} } = window.sugo

export default class MarketBrainResult extends Component {
  render() {
    if (feature === 'wxjTyj') {
      return <WxjTyj />
    }

    return <Noraml />
  }
}
