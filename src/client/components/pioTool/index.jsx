import React from 'react'

export default class PioTool extends React.Component {
  render() {
    return (
      <div style={{width:'100%',height:'100%'}}>
        <iframe src="/app/pio/go-jupyter" style={{width:'100%',height:'100%',border:'none'}} />
      </div>
    )
  }
}
