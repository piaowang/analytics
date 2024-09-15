import React from 'react'
import PropTypes from 'prop-types'

export default class StaticImageChart extends React.PureComponent {

  static propTypes = {
    settings: PropTypes.object
  }

  render() {
    const { settings } = this.props
    const imageUrl = settings && settings.imageUrl
    return (
      <div className="aligncenter">
        {!imageUrl ? '暂无内容' : (
          <img src={imageUrl} alt="" style={{maxWidth: '100%', height: '100%'}}/>
        )}
      </div>
    )
  }
}
