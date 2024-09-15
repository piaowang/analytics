import { useState, useEffect, Component } from 'react'
import { loadModules } from 'esri-loader'
import Direct from './imgs/direct.png'

export default class PointerLayer extends Component{
  
  componentDidMount(){
    let { cityData } = this.props
    console.log('props===', this.props)
    loadModules(['esri/layers/GraphicsLayer',
      'esri/Graphic',
      'esri/symbols/PictureMarkerSymbol'
    ]).then(([GraphicsLayer, Graphic, PictureMarkerSymbol]) => {
      let graphicsLayer = new GraphicsLayer()
      this.props.map.add(graphicsLayer)  
      
      Object.keys(cityData).map(item => {
        let point = {
          type: 'point',
          longitude: cityData[item].lon,//经度
          latitude: cityData[item].lat //维度
        }
        let pictureSymbol = {
          type: 'picture-marker',
          url: Direct,
          width: 30,
          height: 30
        }
        let pointGraphic = new Graphic({
          geometry: point,
          symbol: pictureSymbol,
          popupTemplate: {
            title: cityData[item].province,
            content: '22'
          }
        })
        let textSym = { 
          type: 'text', 
          text: cityData[item].name,
          font: { size: 12 },
          yoffset: 0,
          color: 'yellow' 
        }
        let textGraphic = new Graphic({
          geometry: point,
          symbol: textSym
        })
        graphicsLayer.addMany([pointGraphic, textGraphic]) 
        return item
      })
      
    }).catch((err) => console.error(err))
  }
  render() {
    return null
  }
}

