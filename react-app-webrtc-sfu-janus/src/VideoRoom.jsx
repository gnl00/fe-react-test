import {useEffect, useState} from 'react'
import Janus from "./assets/janus.js";
import janus from "./assets/janus.js";
import adapter from "webrtc-adapter";

import './App.css'

let localVideo = null;
let localStream = null;
let remoteVideo = null;
let remoteStream = null;

let janusInst = null
let videoRoomPluginHandle = null;

const subscribe_mode = 'subscribe'

// 1、初始化 Janus，使用 videoCallPluginHandle 管理整个会话（发起通话、发送 dataChannel 数据）
// 2、发送 register 消息注册到 Janus
// 3、发送 call 消息，请求通话

function VideoRoom() {
	const [clientId, setClientId] = useState('');
	const [roomId, setRoomId] = useState(0);
	const [character, setCharacter] = useState('publisher');
	const [feed, setFeed] = useState(0);


	// ======================================================================================= Janus

	function initJanus () {

		janus.init({
			debug: true,
			dependencies: Janus.useDefaultDependencies({ adapter: adapter }),
		})

		janusInst = new Janus({
			server: 'http://192.168.116.54:8088/janus',
			success: () => {
				console.log('new Janus success')
				initPluginHandle();
			},
			error: err => {
				console.log(err)
			},
			destroy: () => {
				console.log('destroy')
			}
		})
	}

	const initPluginHandle = () => {
		console.log('initPluginHandle')

		// client unique Id
		const randomId = Janus.randomString(8);
		console.log('clientId', randomId)

		setClientId(randomId)

		janusInst.attach({
			opaqueId: clientId,
			plugin: 'janus.plugin.videoroom',
			success: pluginHandle => {
				videoRoomPluginHandle = pluginHandle
				console.log('janus.plugin.videoroom initialized')
			},
			error: (cause) => {
				console.log(cause)
			},
			icestate: state => {
				console.log('ice state change to: ', state)
			},
			onmessage: (msg, jsep) => {
				// msg 交互信息：create/join/stop
				// jsep：协商信令
				onMessage(msg, jsep)
			},
			ondata: data => {
				// data has been received through the Data Channel;
				console.log(':: Received data ::')
				console.log(data)
			},
			onlocaltrack: (track, added) => {
				console.log('onlocaltrack')
				if (added) {
					setVideoTrack('localVideo', track)
				}
			},
			onremotetrack: (track, mid, added) => {
				console.log('onremotetrack')
				if (added) {
					setVideoTrack('remoteVideo', track)
				}
			},
			oncleanup: () => {},
			detach: () => {}
		})
	}
	const sendJanusRequest = (body) => {
		videoRoomPluginHandle.send({
			...body,
			success: resp => {
				console.log(resp)
			}
		})
	}

	const onMessage = (msg, jsep) => {
		console.log('::: Received Message :::')
		console.log(msg)
		const event = msg['videoroom']
		if (event) {
			switch (event) {
				case 'joined':
					console.log(`client: ${clientId} joined room : ${roomId}`)

					if (jsep) {
						// createAnswer(jsep)
					}
					break;
				case 'accepted':
					if (jsep) {
						onAccepted(jsep)
					}
					break;
				case 'update':
					break;
				case 'hangup':
					break;
				default:
					break;
			}
		}
	}

	const setVideoTrack = (videoDomId, track) => {
		const videoDom = document.getElementById(videoDomId);
		let stream = videoDom.srcObject
		if (stream) {
			stream.addTrack(track)
		} else {
			stream = new MediaStream();
			stream.addTrack(track)
			videoDom.srcObject = stream
			videoDom.controls = false
			videoDom.autoplay = true
		}
	}

	const initJanusClick = () => {
		initJanus();
	}

	const registerClick = () => {
		registerToJanus()
	}

	const registerToJanus = () => {
		const register = {
			request: 'register',
			username: clientId
		}

		videoRoomPluginHandle.send({message: register})
		console.log('register: ', clientId)
	}

	const createAnswer = (jsep) => {
		videoRoomPluginHandle.createAnswer({
			jsep,
			tracks: [
				{
					type: 'screen',
					capture: navigator.mediaDevices.getDisplayMedia({video: true, audio: false}),
				},
				{ type: 'data' }
			],
			success: innerJsep => {
				const body = {
					request: 'accept'
				}
				videoRoomPluginHandle.send({
					message: body,
					jsep: innerJsep
				})
			},
			error: err => {
				console.log('createAnswer error: ', err)
			}
		})
	}

	const onAccepted = (jsep) => {
		console.log('onAccepted jsep: ', jsep)
		videoRoomPluginHandle.handleRemoteJsep({
			jsep
		})
	}

	const sendToDataChannel = param => {
		console.log(param)
		// data(parameters): sends data through the Data Channel, if available;
		videoRoomPluginHandle.data({
			data: param
		})
	}

	let sendData = null;
	const onDataChange = evt => {
		sendData = evt.target.value
	}

	const sendDataClick = () => {
		sendToDataChannel(sendData)
	}

	const createRoomClick = () => {
		createRoom()
	}

	const createRoom = () => {
		const body = {
			request: 'create',
			publishers: 6,
			is_private: false
		}

		videoRoomPluginHandle.send({
			message: body,
			success: resp => {
				console.log(resp)
				let returnRoomId = null
				if (resp && (returnRoomId = resp['room'])) {
					setRoomId(returnRoomId)
				}
			}
		})
	}

	const onRoomChange = evt => {
		setRoomId(Number.parseInt(evt.target.value))
	}

	const joinRoomClick = () => {
		const message = {
			request: 'join',
			ptype : character,
			room: roomId,
			notify_joining: true,
			token: 'adminpwd'
		}

		if (character === 'subscriber') {
			message.feed = feed
		}

		console.log(message)

		sendJanusRequest({message})
	}
	const listRoomsClick = () => {
		const message = {
			request: 'list'
		}
		sendJanusRequest({message})
	}
	const listParticipantsClick = () => {
		const message = {
			request: 'listparticipants',
			room: roomId
		}
		sendJanusRequest({message})
	}

	const publishClick = () => {
		let mStream = null
		videoRoomPluginHandle.createOffer({
			tracks: [
				{
					type: 'screen',
					capture: navigator.mediaDevices.getDisplayMedia({video: true, audio: false}).then(stream => {
						mStream = stream
					}),
				},
				{ type: 'data' }
			],
			success: jsep => {
				console.log(jsep)
				const body = {
					request: 'configure',
					audio: false,
					video: true,
				}

				videoRoomPluginHandle.send({
					jsep,
					message: body
				})
			},
			error: cause => {
				console.log('publish error: ', cause)
			}
		})
	}

	const onCharacterChange = evt => {
		setCharacter(evt.target.value)
	}

	const onFeedChange = evt => {
		setFeed(Number.parseInt(evt.target.value))
	}

	const subscribeClick = () => {}

	return (
		<>
			<div>
				<p>clientId: {clientId}</p>
				<p>roomId: {roomId}</p>
				<p>feed: {feed}</p>
				<button onClick={initJanusClick}>initJanus</button>
				<button onClick={registerClick}>register</button>
				<button onClick={createRoomClick}>createRoom</button>
				<button onClick={listRoomsClick}>list Rooms</button>

				<br />
				<label >Choose a your character: </label>

				<select id="pet-select" onChange={onCharacterChange}>
					<option value="publisher">publisher</option>
					<option value="subscriber">subscriber</option>
				</select>
				<br />

				<p>
					join roomId: <input type={"text"} onChange={onRoomChange}/>
					<button onClick={joinRoomClick}>join</button>
					<button onClick={listParticipantsClick}>list Participants</button>
				</p>
				<p>subscribe feed: <input type={"text"} onChange={onFeedChange}/><button onClick={subscribeClick}>subscribe</button></p>

				<button onClick={publishClick}>publish</button>
				<p>dataChannel: <input type={"text"} onChange={onDataChange}/><button onClick={sendDataClick}>sendData</button></p>
				<video id={"localVideo"} autoPlay muted width={"720px"} height={"640px"}></video>
				<video id={"remoteVideo"} autoPlay muted width={"720px"} height={"640px"}></video>
			</div>
		</>
	)
}

export default VideoRoom
