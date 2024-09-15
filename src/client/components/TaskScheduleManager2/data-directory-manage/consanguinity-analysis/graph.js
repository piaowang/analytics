import _ from 'lodash'

export function makeGraphData(data) {
  let graphData = {}
  graphData.tables = flattenTree(data, 'sources')
  graphData.joinLinks= {table: genLinks(data)}
  return graphData
}

function genLinks(data) {
  let list = []

  function getLink(obj) {
    if (obj.sources.length > 0) {
      obj.sources.forEach(o => {
        list.push({
          type: 'none',
          source: `${o.targetName}/192.168.0.1/`,
          target: `${obj.targetName}/192.168.0.1/`
        })
        getLink(o)
      })
    }
  }

  getLink(data)
  return list
}

function flattenTree(obj, attr) {
  let list = []
  let position = {}
  let index = 0
  let x = 1000
  function getAttr(targetObj, y) {
    position = {x, y}   
    list.push({
      id: _.get(targetObj, 'targetName', ''),
      name: _.get(targetObj, 'targetName', ''),
      fields: [
        { type: 'NUMBER', field: 'USERID' }
      ],
      attrs: [
        { label: 'IP', value: '192.168.0.1' }
 
      ],
      position,
      ..._.omit(targetObj, [attr])
    })
    index = index + 1
    if(Array.isArray(targetObj[attr]) && targetObj[attr].length ) {
      x = 1000 - (index * 300)
      targetObj[attr].forEach((o, i)=> getAttr(o, (i+1) * 150))
    }
  }
  getAttr(obj, 1 * 150)
  return list
}

function withPosition(data) {
  if(!Array.isArray(data)) return data
  data.forEach((o, i) => {
    o.position = {
      x: 1200-(data.position.x * 200),
      y: data.position.x * 150
    }
  })
  return data
}
