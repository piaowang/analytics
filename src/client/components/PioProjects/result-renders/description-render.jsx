import React from 'react'

export default class Description extends React.Component {

  render() {
    let {description, ...props} = this.props
    description = description || '没有描述'
    return (
      <div
        {...props}
        dangerouslySetInnerHTML={{
          __html: description.replace(/\|/g, '<span class="mg2r">|</span>').replace(/\n/g, '<br/>')
        }}
      />
    )
  }

}
