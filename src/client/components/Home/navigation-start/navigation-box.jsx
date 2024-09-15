import React, { Component } from 'react'
import { Divider } from 'antd'
import NavigationBoxHeader from './box-header'
import NavigationBoxItem from './box-item'

class NavigationBox extends Component {

  constructor(props) {
    super(props)
    this.state = {  }
  }

  render() { 
    const { title, icon, datasource, appBgImgIdle, appBgImgHover, appsFontColor} = this.props
    return (  
      <div style={{margin: '0px 50px 0 37px'}}>
        <NavigationBoxHeader
          title={title}
          icon={icon}
          appsFontColor={appsFontColor}
        />
        <Divider style={{ marginTop:20, background:'rgba(224,229,243,1)', opacity: 0.1, height: '2px'}}/>
        {/* flex方案 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            flexWrap: 'wrap'
          }}
        >
          {
            datasource.map((item, itemIdx) => (
              <div className="mg2r" style={{marginBottom: '20px'}} key={'navigationBox' + itemIdx} >
                <NavigationBoxItem
                  openWay={item.openWay}
                  title={item.title}
                  subTitle={item.subTitle}
                  img={item.img}
                  path={item.path}
                  icon={item.icon}
                  iconPng={item.iconPng}
                  iconHoverPng={item.iconHoverPng}
                  bgPng={appBgImgIdle?appBgImgIdle : item.bgPng}
                  type={item.type}
                  iconColor={item.iconColor}
                  titleStyle={item.titleStyle}
                  subTitleStyle={item.subTitleStyle}
                  appsFontColor={appsFontColor}
                />
              </div>
            ))
          }
        </div>
        <div style={{height: '50px'}} />
        {/* 备选方案 栅格响应式 */}
        {/* {
          _.chunk(datasource, chunkNum).map((list, listIdx) => (
            <Row key={'navigationBox' + listIdx} style={listIdx > 0 ? {marginTop: '32px'}: null} className='pd2x'>
              {
                list.map((item, itemIdx) => (
                  <Col key={ 'navigationBox' + listIdx + itemIdx} span={Math.round(24 / chunkNum)}>
                    <NavigationBoxItem
                      title={item.title}
                      img={item.img}
                      path={item.path}
                      icon={item.icon}
                      type={item.type}
                      iconColor={item.iconColor}
                    />
                  </Col>
                ))
              }
            </Row>
          ))
        } */}
      </div>
    )
  }
}
 
export default NavigationBox
