import {useEffect} from 'react'

import './App.css'

let localVideoDom = null
let remoteVideoDom = null
let localStream = null

let clientId = null;

let ws = null
let wsURL = 'ws://192.168.2.201:8866/pTop/'

function App() {
	useEffect(() => {
		return () => {
			localVideoDom.srcObject = null
			remoteVideoDom.srcObject = null
		}
	}, [])

	const startVideo = async () => {
		console.log('startVideo')
		getDisplay().then(res => {
			createWebSocket();
		})
	}

	function createWebSocket() {
		if (!clientId) return

		ws = new WebSocket(wsURL + clientId)
		console.log(ws)

		websocketInit(ws);
	}

	function websocketInit(webSocket) {
		if (!webSocket) return

		webSocket.onopen = (evt) => {
			console.log('websocket opened ', evt)
		}

		webSocket.onclose = (evt) => {
			console.log('websocket closed ', evt)
		}

		webSocket.onerror = (evt) => {
			console.log('websocket error:  ', evt)
		}

		webSocket.onmessage = (evt) => {
			console.log('websocket onmessage:  ', evt)
			if (evt && evt.data) {
				// messageTypeHandler(JSON.parse(evt.data))
			}

		}
	}

	function getDisplay() {
		localVideoDom = document.getElementById('videoLocal');
		return navigator.mediaDevices.getDisplayMedia({
			video: true, audio: false
		}).then(stream => {
			clientId = stream.id
			if (stream) {
				localStream = stream
				localVideoDom.srcObject = stream

				// 设置视频播放音量为 0
				localVideoDom.volume = 0
				// 设置视频自动播放
				localVideoDom.autoplay = true
			}
		})
	}

	return (<>
			<div>
				<button onClick={startVideo}>click</button>
				<video id={"videoLocal"} autoPlay muted width={"720px"} height={"640px"}></video>
				<video id={"videoRemote"} autoPlay muted width={"720px"} height={"640px"}></video>
			</div>
		</>)
}

export default App
