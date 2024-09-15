import React from 'react'

const Map = (props) => {
  return (
    <div className="v-m-view">
      <iframe id="Jframe" className="if-box" src={`/app/mannings/getMap?id=${props.id}`} />
    </div>
  )
}
export default Map
