import { Component } from 'react'
import Icon from '../../Common/sugo-icon'
import './navigation-start.styl'

class NavigationBoxHeader extends Component {

  constructor(props) {
    super(props)
    this.state = {  }
  }

  render() { 
    const { title, icon, appsFontColor } = this.props
    return (  
      <div style={{
        height: '24px', 
        lineHeight: '24px', 
        color: appsFontColor || '#ffffff',
        fontSize: '18px'
      }}
      >
        {/*<Icon style={{fontSize: '20px'}} type={icon} className='mg2r'/>*/}
        <span style={{ width: '8px', height: '22px', lineHeight: '22px',background: '#6E75FF', borderRadius: '2px', marginRight: '20px'}} type={icon} 
          className="iblock"
        />
        <span className="category-name iblock"> {title} </span>
      </div>
    )
  }
}
 
export default NavigationBoxHeader
