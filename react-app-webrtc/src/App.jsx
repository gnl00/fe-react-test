import {useEffect} from 'react'

import './App.css'

let localVideoDom = null
let remoteVideoDom = null
let localStream = null
let remoteStream = null

let clientId = null;

let ws = null
let wsURL = 'ws://localhost:8866/pTop/'

let peerStart = false;
let peerConnection = null

function App() {
	useEffect(() => {
		return () => {
			localVideoDom.srcObject = null
			remoteVideoDom.srcObject = null
		}
	}, [])

	const startVideo = async () => {
		console.log('startVideo')
		await getDisplay()
		createWebSocket();
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

				localVideoDom.volume = 0 // 设置视频播放音量为 0
				localVideoDom.autoplay = true // 设置视频自动播放
			}
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
				messageHandler(JSON.parse(evt.data))
			}

		}
	}

	const messageHandler = (evt) => {
		const type = evt.type
		switch (type) {
			case 'offer':
				console.log('received OFFER')
				onOffer(evt)
				break
			case 'answer':
				console.log('received ANSWER')
				if (peerStart.value) {
					onAnswer(evt)
				}
				break
			case 'candidate':
				console.log('received ICE CANDIDATE')
				if (peerStart.value) {
					onCandidate(evt)
				}
				break
			case 'bye':
				console.log('received BYE, DISCONNECTED')
				if (peerStart.value) {
					stop()
				}
				break
			default:
				break
		}
	}

	const onOffer = (evt) => {
		console.log('set OFFER')
		setOffer(evt)
		sendAnswer()

		peerStart = true
	}

	const setOffer = (evt) => {
		if (!peerConnection) {
			peerConnection = getPeerConnection()
			peerConnection.setRemoteDescription(new RTCSessionDescription(evt))
		}
		console.log(peerConnection)
	}

	const sendAnswer = () => {
		console.log('create and send ANSWER')
		if (peerConnection) {
			peerConnection.createAnswer(rtcOption).then(sdp => {
				peerConnection.setLocalDescription(sdp)
				sendSDP(sdp)
			}).catch(err => {
				console.log('create answer failed ', err.message)
			})
		} else {
			console.log('peerConnection not exist')
		}
	}

	const sendSDP = (evt) => {
		const text = JSON.stringify(evt)
		ws.send(text)
	}

	const onAnswer = (evt) => {
		console.log('onAnswer ', evt)
		setAnswer(evt)
	}

	const setAnswer = (evt) => {
		console.log('set ANSWER')
		if (peerConnection) {
			peerConnection.setRemoteDescription(new RTCSessionDescription(evt))
		}
		console.log(peerConnection)
	}

	const sendCandidate = (candidate) => {
		console.log('sendCandidate ', candidate)
		const text = JSON.stringify(candidate)
		ws.send(text)
	}

	const onCandidate = (evt) => {
		const candidate = new RTCIceCandidate({
			sdpMLineIndex: evt.sdpMLineIndex,
			sdpMid: evt.sdpMid,
			candidate: evt.candidate
		})
		console.log('onCandidate CANDIDATE: ', candidate)
		peerConnection.addIceCandidate(candidate)

		console.log(peerConnection)
	}

	function getPeerConnection() {
		let peer = null

		const config = {
			'iceServers': []
		}

		try {
			// About RTCPeerConnection, check this link: https://developer.mozilla.org/zh-CN/docs/Web/API/RTCPeerConnection
			peer = new RTCPeerConnection(config)
		} catch (e) {
			console.log('connect establish failed: ', e.message)
		}

		// 调用 setLocalDescription 方法后，RTCPeerConnection 开始收集候选人（ICE 信息）
		peer.onicecandidate = (evt) => {
			console.log('onicecandidate ', evt)
			let candidate = null
			if ((candidate = evt.candidate)) {
				sendCandidate({
					type: 'candidate',
					sdpMLineIndex: candidate.sdpMLineIndex,
					sdpMid: candidate.sdpMid,
					candidate: candidate.candidate
				})
			}
		}

		// 添加本地 音/视频流对象
		// peer.addStream(localStream.value)
		// addStream 方法已经被删除 使用 addTrack 代替。
		// check this link for more about addStream: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addStream
		localStream.srcObject.getTracks().forEach(track => {
			peer.addTrack(track, localStream.srcObject)
		})

		// 添加远程 音/视频流对象
		peer.ontrack = (evt) => {
			console.log('ontrack ', evt)
			console.log('添加远程视频流')
			remoteStream.srcObject = evt.streams[0]
		}

		return peer

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
