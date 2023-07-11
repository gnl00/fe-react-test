import {useEffect, useState} from 'react'

import './App.css'

let localVideoDom = null
let remoteVideoDom = null
let localStream = null
let remoteStream = null

let ws = null
let wsURL = 'ws://localhost:8866/pTop/'

let peerStart = false;
let peerConnection = null

function App() {

	let [clientId, setClientId] = useState('');
	let [targetId, setTargetId] = useState('');

	const getVideo = () => {
		getDisplay()
	}

	const connectSignaling = () => {
		createWebSocket();
	}

	const connectPeer = () => {
		createOffer()
	}

	function onTargetInputChange(evt) {
		setTargetId(evt.target.value)
	}

	function getDisplay() {
		localVideoDom = document.getElementById('videoLocal');
		remoteVideoDom = document.getElementById('videoRemote');
		navigator.mediaDevices.getDisplayMedia({
			video: true, audio: false
		}).then(stream => {
			setClientId(stream?.id)
			if (stream) {
				localStream = stream
				localVideoDom.srcObject = stream

				localVideoDom.volume = 0 // 设置视频播放音量为 0
				localVideoDom.autoplay = true // 设置视频自动播放
			}
		}).catch(err => {
			console.log('getDisplay error: ', err.message)
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

	const sendSDP = (rawSDP) => {
		// offer answer candidate

		const sendObj = {
			src: clientId,
			type: rawSDP.type,
			sdp: rawSDP,
			target: targetId,
		}

		const sendText = JSON.stringify(sendObj)
		ws.send(sendText)
	}

	const rtcOption = {
		offerToReceiveAudio: true,
		offerToReceiveVideo: true
	}

// 创建 offer
	const createOffer = () => {
		// 0
		console.log('create OFFER')
		peerConnection = getPeerConnection()
		peerConnection.createOffer(rtcOption).then(evt => {
			peerConnection.setLocalDescription(evt)
			console.log(evt)
			sendSDP(evt)

		}).catch(err => {
			console.log('offer create failed: ', err.message)
		})
	}

	const onOffer = (evt) => {
		console.log('set OFFER')
		setOffer(evt.sdp)
		sendAnswer()

		peerStart = true
	}

	const setOffer = (sdp) => {
		if (!peerConnection) {
			peerConnection = getPeerConnection()
			peerConnection.setRemoteDescription(new RTCSessionDescription(sdp))
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

	const onAnswer = (evt) => {
		console.log('onAnswer ', evt)
		setAnswer(evt.sdp)
	}

	const setAnswer = (sdp) => {
		console.log('set ANSWER')
		if (peerConnection) {
			peerConnection.setRemoteDescription(new RTCSessionDescription(sdp))
		}
		console.log(peerConnection)
	}

	const sendCandidate = (raw) => {
		console.log('sendCandidate ', raw)
		let candidateWrap = {
			src: clientId,
			target: targetId,
			type: raw.type,
			candidate: raw
		}
		let jsonStr = JSON.stringify(candidateWrap)
		ws.send(jsonStr)
	}

	const onCandidate = (evt) => {
		const cand = evt.candidate
		const candidate = new RTCIceCandidate({
			sdpMLineIndex: cand.sdpMLineIndex,
			sdpMid: cand.sdpMid,
			candidate: cand.candidate
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
		localStream.getTracks().forEach(track => {
			peer.addTrack(track, localStream)
		})

		// 添加远程 音/视频流对象
		peer.ontrack = (evt) => {
			console.log('ontrack ', evt)
			console.log('添加远程视频流')
			remoteStream = evt.streams[0]
		}

		return peer
	}

	return (<>
			<div>
				<p>currentId: {clientId}</p>
				<p>targetId: {targetId}</p>
				<input type={"text"} onChange={onTargetInputChange} placeholder={"input targetId"}/>
				<br></br>
				<button onClick={getVideo}>getVideo</button>
				<button onClick={connectSignaling}>connect Signaling Server</button>
				<button onClick={connectPeer}>connect WebRTC</button>
				<video id={"videoLocal"} autoPlay muted width={"720px"} height={"640px"}></video>
				<video id={"videoRemote"} autoPlay muted width={"720px"} height={"640px"}></video>
			</div>
		</>)
}

export default App
