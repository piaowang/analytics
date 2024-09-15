import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'

export default class IframeBox extends React.PureComponent {

  static propTypes = {
    settings: PropTypes.object
  }

  render() {
    const { settings } = this.props
    let {imageUrl, iframeUrl} = settings || {}
    return (
      <div className="height-100 width-100">
        <iframe
          className="width-100 height-100"
          style={{minHeight:'300px'}}
          src={iframeUrl ? iframeUrl : (imageUrl ? `${location.origin}/livescreen/${imageUrl}` : null)}
          frameBorder="0"
        />
      </div>
    )
  }
}
