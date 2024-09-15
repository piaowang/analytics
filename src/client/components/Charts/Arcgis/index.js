import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {loadCss} from 'esri-loader'
import { Map, Scene } from '@esri/react-arcgis'
import PointerLayer from './pointerLayer'
import Searching from './searching'
import cityData from './city.json'

// loadScript()

export default class ArcgisChart extends Component {
  static propTypes = {
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    data: PropTypes.array,
    translationDict: PropTypes.object,
    settings: PropTypes.object,
    onSettingsChange: PropTypes.func,
    isThumbnail: PropTypes.bool,
    metricsFormatDict: PropTypes.object,
    dimensionColumnFormatterGen: PropTypes.func
  }

  state={
    value: '3D'
  }

  componentWillMount() {
    loadCss()
  }

  render(){
    let { value } = this.state
    let { settings: 
      {
        show3D = true, 
        showSearch = true,
        selectBasemap = 'bf024b8d0b4b48f5a486070214e87c5f',
        centerLon = 110,
        centerLat = 38,
        zoom = 5
      } 
    } = this.props
    let MapComponent = value === '3D' ? Map : Scene
    return (
      <div
        className="height-100"
        style={{position: 'relative'}}
      >
        {
          show3D 
            ? <input
              className="absolute esri-component esri-widget--button esri-widget esri-interactive"
              style={{left: '50px',top: '15px', zIndex: 15}}
              type="button"
              id="switch"
              onClick={() => {this.setState({value: value === '2D' ? '3D' : '2D'})}}
              value={value}
            />
            : null
        }
        <MapComponent
          mapProperties={
            { basemap: {
              portalItem: {
                id: selectBasemap || 'bf024b8d0b4b48f5a486070214e87c5f'
              }
            } 
            }
          }
          viewProperties={
            {
              zoom: +zoom,
              center: [+centerLon, +centerLat] 
            }
          }
          loaderOptions={{  css: true }}
        >
          <PointerLayer cityData={cityData}/>
          <Searching showSearch={showSearch}/>
        </MapComponent>
      </div>
    )
  }

}

