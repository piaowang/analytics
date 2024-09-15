import React from 'react'
import './formula-editor.styl'
import _ from 'lodash'

export default class FormulaEditor extends React.Component {
  state = {
    widgets: []
  }
  
  componentDidMount() {
    let {value} = this.props
    this.replaceToWidget(value)
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    let {value} = this.props
    if (prevProps.value !== value) {
      this.replaceToWidget(value)
    }
  }
  
  replaceToWidget = (value) => {
    this.setState({
      widgets: value
    })
  }
  
  render() {
    let {onChange, options, className, disabled, inlineWidgetOpts, ...rest} = this.props
    let {widgets = []} = this.state
    return (
      <div>
        {
          widgets.map( (i,idx) => (
            inlineWidgetOpts(i, idx)
          ))
        }
      </div>
    )
  }
}
