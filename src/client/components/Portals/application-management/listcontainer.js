import React, {useEffect, useRef, useState} from 'react'
import Muuri from 'muuri'
// import AppItem from './appItem'
import _ from 'lodash'
import {connect} from 'react-redux'
import {APP_MGR_SAGA_MODEL_NS} from './models'

function Listcontainer(props) {
  let {
    apps,
    selectedTag
  } = props
  const {dispatch} = window.store
  
  const useSaveData = (dispatch) => (type, payload) => {
    if(!type|| !payload) return
    dispatch({
      type,
      payload
    })
  }
  const dragEndHook = useSaveData(dispatch)

  const gridRef = useRef()
  const [grid, setGrid] = useState(null)

  useEffect(() => {
    let grid = new Muuri('.muuri-grid', {
      dragEnabled: true,
      dragContainer: document.getElementById('applications-management-layout'),
      dragSort: true,
      dragPlaceholder: {
        enabled: true,
        duration: 400
      }
      // dragStartPredicate: (item, e) => canOrderRef.current
    }).on('dragReleaseEnd', () => {
      let currentTag 
      let orders = grid._items.map( i => {
        const [selectedTag, id] = i._element.id.split('|')
        currentTag = selectedTag
        return id
      })
      dragEndHook('application-management/changeEditingOrderAppMap', {
        [currentTag]: orders
      })
    })
    setGrid(grid)
  }, [gridRef])

  function createItemElements(arr) {
    let ret = []
    for (var i = 0; i < arr.length; i++) {
      ret.push(createItemElement(arr[i]))
    }

    return ret
  }

  function createItemElement(item) {
    const { id, name, img } = item 
    var el = document.createElement('div')
    // prettier-ignore

    let imgDom = img ? `<img class='application-manager-grid-item-top-img' src=${img}></img>` : '<span>暂无缩略图</span>'

    el.innerHTML = '<div class="muuri-grid-item" id="' + selectedTag + '|' + id + '" data-id="' + id + '">' +
                     '<div class="muuri-grid-item-content">' + 
                        `<div class='application-manager-grid-item'>
                          <div class='application-manager-grid-item-top'>
                            ${imgDom}
                          </div>
                          <div title=${name} class='application-manager-grid-item-bottom'>
                            ${name}
                          <div>
                        </div>`
                     + '</div>' +
                   '</div>'
    return el.firstChild
  }

  function removeItemsFromGrid(grid, amount) {
    var items = grid.getItems()
    grid.hide(items, {
      onFinish: function(hiddenItems) {
        grid.remove(hiddenItems, { removeElements: true })
      }
    })
  }

  useEffect(() => {
    if (_.isEmpty(grid)) return
    var elements = createItemElements(apps)
    // elements.forEach(function(el) {
    //   el.style.display = 'none';
    // });
    removeItemsFromGrid(grid)
    grid.add(elements)
    // grid.show(elements);
  }, [apps])

  
  return (
    <div id="applications-management-layout" style={{ width: '100%', height: '100%' }}>
      <div className="muuri-grid" />
    </div>
  )
}
export default _.flow([
  connect(state => {
    return {
      selectedTag: state[APP_MGR_SAGA_MODEL_NS].selectedTag
    }
  })
])(Listcontainer)
