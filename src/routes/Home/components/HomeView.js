import React from 'react'
import './HomeView.scss'

import Editor from './Editor'

export const HomeView = () => (
  <div>
    <div className='header'>
      <div className='wrapper'>
        <img src='https://codecode.ninja/assets/ccn_identity-5ec5c7dcd3bdf21f67383e653a0a411a299b894256f243bbda78a35a7581e9ec.svg' alt='' />
      </div>
    </div>
    <div className='wrapper'>
      <h2 className='h'>Paste your code</h2>

      <Editor />

      <h3 className='h h--small'>What is this about?</h3>

      <div className='desc'>
        <div className='tag'>React</div>
        component
      </div>

      <div className='buttons'>
        <button className='btn btn--dark'>Save</button>
        <button className='btn'>Create Another</button>
      </div>
    </div>
  </div>
)

export default HomeView
