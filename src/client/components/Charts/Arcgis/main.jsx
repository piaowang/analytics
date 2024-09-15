import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {loadModules, loadScript, loadCss} from 'esri-loader'
import { Map, Scene } from '@esri/react-arcgis'
import Layer from './polygonLayer'

loadCss()
loadScript()

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
    value: '3D',
    view: null
  }

  componentDidMount() {
    let {value, view} = this.state
    let that = this
    let map
    loadModules(['esri/Map', 
      'esri/views/MapView',
      'esri/views/SceneView',
      'esri/widgets/BasemapGallery',
      'esri/Graphic',
      'esri/layers/GraphicsLayer',
      'esri/widgets/BasemapToggle',
      'esri/widgets/Expand',
      'dojo/domReady!'], { css: true })
      .then(function([
        Map, MapView, SceneView, BasemapGallery,  Graphic,
        GraphicsLayer, BasemapToggle, Expand
      ]){
        let switchButton = document.getElementById('switch-btn')     
        let getMap = (map,view) => {
          //选择地图
          let basemapGallery = new BasemapGallery({
            view: view,
            source: {
              portal: {
                url: 'http://www.arcgis.com',
                useVectorBasemaps: true // Load vector tile basemap group
              }
            } 
          })
          //展开功能
          let bgExpand = new Expand({
            view: view,
            content: basemapGallery
          })
          basemapGallery.watch('activeBasemap', function() {
            let mobileSize =
              view.heightBreakpoint === 'xsmall' ||
              view.widthBreakpoint === 'xsmall'
            if (mobileSize) {
              bgExpand.collapse()
            }
          })
          view.ui.add(bgExpand, 'top-right') // Add to the view

          //添加图层
          let graphicsLayer = new GraphicsLayer()
          map.add(graphicsLayer)  
          let point = {
            type: 'point',
            longitude: 113.25,//经度
            latitude: 23.10   //维度
          }
          let simpleMarkerSymbol = {
            type: 'simple-marker',
            color: [226, 119, 40],  // orange
            outline: {
              color: [255, 255, 255], // white
              width: 1
            }
          }
          let pointGraphic = new Graphic({
            geometry: point,
            symbol: simpleMarkerSymbol,
            popupTemplate: {
              title: '1',
              content: '22'
            }
          })
          graphicsLayer.add(pointGraphic)        
          //切换下个basemap
          let toggle = new BasemapToggle({
            view: view,
            nextBasemap: 'hybrid'
          })
          view.ui.add(toggle, 'top-right')
          
          
          // view.on('click', function(event) {
          //   view.popup.autoOpenEnabled = false
           
          //   let lat = Math.round(event.mapPoint.latitude * 1000) / 1000
          //   let lon = Math.round(event.mapPoint.longitude * 1000) / 1000
          //   view.popup.open({
          //     // Set the popup's title to the coordinates of the location
          //     title: 'Reverse geocode: [' + lon + ', ' + lat + ']',
          //     location: event.mapPoint, // Set the location of the popup to the clicked location
          //     content: 'This is a point of interest'  // getMapContent displayed in the popup
          //   })
          // })       
        }

        //世界地图
        map = new Map({
          basemap: 'topo',
          ground: 'world-elevation'
        })
        //容器
        let viewParams = {
          map: map,
          container: 'viewDiv',
          scale: 9244648.86861805,
          center: [110, 38]
        }
        view = new MapView(viewParams)

        getMap(map, view)
        //切换3D、2D
        switchButton.onclick=function(ev){
          view.container = null
          if(ev.target.value === '2D'){
            view = new MapView(viewParams)
            getMap(map, view)
            that.setState({
              value: '3D'
            })
          }else{
            view = new SceneView(viewParams)
            getMap(map, view)
            that.setState({
              value: '2D'
            })
          }
        }
      }).catch((err) => console.error(err))
  }

  render(){
    let { value } = this.state
    return (
      <div
        className="height-100"
        style={{position: 'relative'}}
      >
        {
          // <input
          //     className="absolute esri-component esri-widget--button esri-widget esri-interactive"
          //     style={{left: '50px',right: '15px', zIndex: 15}}
          //     type="button"
          //     id="switch-btn"
          //     value={value}
          //   />
          //   <div id="viewDiv" className="height-100" />
        }
        <input
          className="absolute esri-component esri-widget--button esri-widget esri-interactive"
          style={{left: '50px',right: '15px', zIndex: 15}}
          type="button"
          id="switch"
          onClick={
            () => {
              this.setState({
                value: value === '2D' ? '3D' : '2D'
              })
            }
          }
          value={value}
        />
        {
          value === '3D' ?
            <Map
              mapProperties={{ basemap: 'streets-vector', ground: 'world-elevation' }}
              viewProperties={
                {
                  scale: 9244648.86861805,
                  center: [110, 38] 
                }
              }
              loaderOptions={{  css: true }}
            >
              <Layer />
            </Map>
            :<Scene
              mapProperties={{ basemap: 'streets-vector', ground: 'world-elevation' }}
              viewProperties={
                {
                  scale: 9244648.86861805,
                  center: [110, 38] 
                }
              }
              loaderOptions={{  css: true }}
            >
              <Layer />
            </Scene>
        }
      </div>
    )
  }

}

