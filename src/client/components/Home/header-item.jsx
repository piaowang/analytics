import React from 'react'
import Icon from '../Common/sugo-icon'
export default function HeaderItem(props) {
  return (
    <div className='h-tap-p'>
      {props.data.map(item => {
        return item.hide ? (
          ''
        ) : (
          <div className='item-l' key={item.title}>
            <div className={props.selectItem[1] && props.selectItem[1].tit === item.title && props.selectItem[1].path === item.path ? 'tit on' : 'tit'}>{item.title}</div>
            <div className='list'>
              {item.children?.map(val => {
                return val.hide ? (
                  ''
                ) : (
                  <div
                    onClick={() => props.changePopFun(val.path || (val.children ? val.children[0].path : ''))}
                    className={props.selectItem[2] && props.selectItem[2].tit === val.title && props.selectItem[2].path === val.path ? 'it cur' : 'it'}
                    key={val.title}
                  >
                    <Icon type={val.icon || 'profile'} className='ico' />
                    {val.title}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
