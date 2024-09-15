import { render } from 'react-dom'
import Login from '../components/pages/login'
import React from 'react'
import {set as setSessionStorage} from '../common/session-storage'
const rootElement = document.getElementById('container')

setSessionStorage('fromPortal', '')

render(
  <Login {...window.sugo}/>,
  rootElement
)
