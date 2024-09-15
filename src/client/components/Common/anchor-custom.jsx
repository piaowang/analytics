import React from 'react'

function isInIframe () {
  try {
    return window.self !== window.top
  } catch (e) {
    return true
  }
}

const {anchorCustomForbidNewTab = 'no'} = window.sugo

export function Anchor(props) {
  if (anchorCustomForbidNewTab === 'always' || (anchorCustomForbidNewTab === 'inIframe' && isInIframe())) {
    return (
      <a {...props} target="_self" />
    )
  }
  return (
    <a {...props} />
  )
}
