import React from 'react'
import PropTypes from 'prop-types'

export default class IframeBox extends React.PureComponent {

  static propTypes = {
    settings: PropTypes.object
  }

  render() {
    const { settings } = this.props
    const {imageUrl, iframeUrl} = settings || {}
    return (
      <div className="height-100 width-100">
        <iframe
          className="width-100 height-100"
          style={{ minWidth: '980px', minHeight: '552px'}}
          src={iframeUrl ? iframeUrl : `${location.origin}/livescreen/${imageUrl}`}
          frameBorder="0"
        />
      </div>
    )
  }
}
