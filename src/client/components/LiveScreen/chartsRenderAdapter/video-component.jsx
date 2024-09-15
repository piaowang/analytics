import React from 'react'
import _ from 'lodash'

export default function VideoComponent(props) {
  const {params, styleConfig, className} = props
  const {is_autoplay, is_loop, is_controls, isFullScreen} = styleConfig
  const video_url = _.get(params, 'videoUrl')
  return (
    <video
      style={isFullScreen ? {'objectFit': 'fill'} : null}
      className={className}
      width="100%"
      height="100%"
      src={video_url}
      loop={is_loop}
      autoPlay={is_autoplay ? 'autoplay' : false}
      // muted={is_autoplay} // https://github.com/facebook/react/issues/1649#issuecomment-392653722
      controls={is_controls}
    />
  )
}
