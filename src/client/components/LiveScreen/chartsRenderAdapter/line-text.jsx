import React from 'react'
import _ from 'lodash'

export default class LineText extends React.Component{

  state={
    style:{}
  }

  componentWillMount(){
    this.setState({
      style: this.props.styleConfig.css
    })
  }

  componentWillReceiveProps(nextprops){
    let { style } = this.state
    if(!_.isEqual(nextprops.styleConfig.css,this.props.styleConfig.css)){
      this.setState({
        style: {...style, ...(nextprops.styleConfig.css)}
      })
    }
  }

  render() {
    const { params, styleConfig = {}, className } = this.props
    const value = params && params.text
    let { style } = this.state
 
    return (
      <div className={`height-100`} 
        style={styleConfig?.css1?.showColor ? {...(_.get(styleConfig, 'css1')), ...style} : style}
      >
        <pre style={{ marginBottom: 0, ...(styleConfig || {}) }}>
          {value || '请添加文本'}
        </pre>
        <i style={{ display: 'inline-block', height: '100%', width: 0, verticalAlign: 'middle' }} />
      </div>
    )
  }
}
