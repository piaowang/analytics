import React from 'react'

export default function UnavailablePage(props) {
  return (
    <div className='aligncenter' style={{margin: '0 auto 0', paddingTop: '200px'}}>
      <img src={'/_bc/sugo-analytics-static/assets/images/portals/in-the-maintenance.png'} alt=''/>
      <div className='font14 pd3t pd2b'>
        门户正在维护中，请联系系统管理员。
      </div>
      {/* <div className="font14">
        support@sugo.io
      </div> */}
    </div>
  )
}
