export const rectCoordinates = (theme = 'light') => {
  return {
    xAxis: {
      splitLine: {
        lineStyle: {
          color: 'rgba(128,151,177,0.7)',
          width: 1,
          type: 'dashed'
        }
      },
      axisLabel: {
        color: theme === 'light' ? 'rgba(54,60,66,0.5)' : 'rgba(233,236,242,0.3)'
      }
    },
    yAxis: {
      splitLine: {
        lineStyle: {
          color: 'rgba(128,151,177,0.7)',
          width: 1,
          type: 'dashed'
        }
      },
      //   axisLabel: {
      //     color: theme === 'light' ? 'rgba(54,60,66,0.5)' : 'rgba(233,236,242,0.3)'
      //   }
      axisLabel: {
        color: theme === 'light' ? '#000' : '#fff'
      }
    },
    legend: {
      textStyle: {
        color: theme === 'light' ? 'rgba(54,60,66,0.5)' : 'rgba(233,236,242,0.3)',
        fontFamily: '"Microsoft YaHei","PingFangSC-Regular"',
        fontSize: 12,
      }
    }
  }
}
