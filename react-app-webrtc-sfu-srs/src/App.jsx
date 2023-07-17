import './App.css'
import One2One from "./one2one.jsx";
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import Room from "./room.jsx";
import './assets/js/jquery-1.10.2.min.js'

const router = createBrowserRouter([
  {
    path: '/one2one',
    element: <One2One />
  },
  {
    path: '/room',
    element: <Room />
  }
])

function App() {

  return (
    <>
      <RouterProvider router={router} />
    </>
  )
}

export default App
