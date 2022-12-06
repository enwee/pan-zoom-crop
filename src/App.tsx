import { Button } from 'flowbite-react'
import { useState } from 'react'
import { PanAndZoom } from './containers/PanAndZoom'

export default () => {
  const [count, setCount] = useState<number>(0)

  return (
    <div className='bg-blue-300 p-8'>
      <PanAndZoom />
    </div>
  )
}


