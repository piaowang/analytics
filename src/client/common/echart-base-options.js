import _ from 'lodash'

const EchartBaseOptions = {
  // color: [
  //   '#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#E86452', '#6DC8EC', '#945FB9', '#FF9845', '#1E9493', '#FF99C3'
  // ],
  // color20: [
  //   '#5B8FF9', '#CDDDFD', '#5AD8A6', '#CDF3E4', '#5D7092', '#CED4DE', '#F6BD16', '#FCEBB9', '#E86452', '#F8D0CB',
  //   '#6DC8EC', '#D3EEF9', '#945FB9', '#DECFEA', '#FF9845', '#FFE0C7', '#1E9493', '#BBDEDE', '#FF99C3', '#FFE0ED'
  // ]
  color:[
    '#2e5bff','#8c54ff','#00c1d4','#33ac2e','#fad052','#e84a50','#ed44a1','#fb6633','#fb982e','#64ca31'
  ],
  color20:[
    '#2e5bff','#8c54ff','#00c1d4','#33ac2e','#fad052','#e84a50','#ed44a1','#fb6633','#fb982e','#64ca31',
    '#5781ff','#9071ff','#24d7e0','#56b84f','#ffe27a','#f57676','#fa70b7','#ff8a5c','#ffb357','#85d656'
  ]
}

// 获得方法：进入 antv demo 地址，调用 api 取得主题风格与样式，再提取部分设定
// https://antv-g2.gitee.io/zh/examples/gallery/line#line6
// import { Chart, getStyleSheet,getTheme } from '@antv/g2';
// console.log('light',  getStyleSheet('light'), getTheme('light'));
export const customLightTheme = {
  'fontFamily': '"Microsoft YaHei","PingFangSC-Regular","-apple-system", "Segoe UI", Roboto, "Helvetica Neue", Arial,\n  "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",\n  "Noto Color Emoji"',
  'axisLabelFillColor': 'rgba(54,60,66,0.5)',
  'axisLabelFontSize': 12,
  'axisLabelLineHeight': 12,
  'axisLabelFontWeight': 'normal',
  'axisLineBorderColor': 'rgba(128,151,177,0.7)',
  'axisLineBorder': 1,
  'axisTickLineBorderColor': '#BFBFBF',
  'axisTickLineBorder': 0.5,
  'axisTickLineLength': 4,
  'axisGridBorderColor': '#D9D9D9',
  'axisGridBorder': 0.5,
  'axisSplitLineColor':'rgba(128,151,177,0.7)',
  'axisSplitLineWidth':1,
  'axisSplitLineType':'dashed',
  legend: {
    'fill': 'rgba(54,60,66,0.5)',
    'fontFamily': '"Microsoft YaHei","PingFangSC-Regular","-apple-system", "Segoe UI", Roboto, "Helvetica Neue", Arial,\n  "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",\n  "Noto Color Emoji"',
    'fontSize': 12,
    'lineHeight': 12,
    'fontWeight': 'normal'
  },
  tooltip: {
    domStyles: {
      'zIndex': 8,
      'transition': 'visibility 0.2s cubic-bezier(0.23, 1, 0.32, 1), left 0.4s cubic-bezier(0.23, 1, 0.32, 1), top 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
      'backgroundColor': 'rgb(255, 255, 255)',
      'opacity': 0.95,
      'boxShadow': '0px 0px 10px #aeaeae',
      'borderRadius': '3px',
      'color': '#595959',
      'fontSize': '12px',
      'fontFamily': '"Microsoft YaHei","PingFangSC-Regular","-apple-system", "Segoe UI", Roboto, "Helvetica Neue", Arial,\n  "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",\n  "Noto Color Emoji"',
      'lineHeight': '24px',
      'padding': '6px 12px'
    }
  }
}

export const customDarkTheme = _.defaultsDeep({
  'axisLabelFillColor': 'rgba(233,236,242,0.3)',
  'axisLineBorderColor': 'rgba(128,151,177,0.7)',
  'axisTickLineBorderColor': '#404040',
  'axisGridBorderColor': '#262626',
  legend: {
    'fill': 'rgba(233,236,242,0.3)'
  },
  tooltip: {
    domStyles: {
      'backgroundColor': '#1f1f1f',
      'color': '#A6A6A6'
    }
  }
}, customLightTheme)

export function domStylesToCss(domStyles) {
  return Object.keys(domStyles).map(styleName => `${_.kebabCase(styleName)}: ${domStyles[styleName]};`).join('\n')
}

export default EchartBaseOptions
