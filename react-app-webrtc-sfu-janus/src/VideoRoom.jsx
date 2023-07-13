import {useEffect, useState} from 'react'
import Janus from "./assets/janus.js";
import janus from "./assets/janus.js";
import adapter from "webrtc-adapter";

import './App.css'

// 1、初始化 Janus，无需注册，加入 room 返回唯一 id。
// 2、publisher 发布视频流的同时会 createOffer（和 Janus 服务器连接）WebRTC 流会直接上传到 Janus 服务器。
// 3、subscriber 可以通过加入相同的房间，订阅（feed）指定 publisher 的唯一 id 来获取该 publisher 发布的视频流；在订阅的过程中会使用到 createAnswer（和 Janus 服务器进行交流）。
// 值得注意的是：createOffer 和 createAnswer 不是在同一个 pluginHandle 上进行的；publisher 的 pluginHandle 负责执行 createOffer；subscriber 的 pluginHandle 负责 createAnswer。
// 当然也可以在一次操作中同时进行 publish 和 subscribe 操作，但是要注意将两个不同的 pluginHandle 区分

let localVideo = null;
let localStream = null;
let remoteVideo = null;
let remoteStream = null;

let janusInst = null
let videoRoomPluginHandle = null
let subscribePluginHandle = null
let feedStreams = {}
let gRoomId = -1

const subscribe_mode = 'subscriber'
let opaqueId = null
let iceServers = null

function VideoRoom() {
	const [clientId, setClientId] = useState(-1);
	const [roomId, setRoomId] = useState(-1);
	const [feedId, setFeedId] = useState(-1);
	const [character, setCharacter] = useState('publisher');

	// ======================================================================================= Janus

	function initJanus () {

		janus.init({
			debug: true,
			dependencies: Janus.useDefaultDependencies({ adapter: adapter }),
		})

		janusInst = new Janus({
			server: 'http://localhost:8088/janus',
			iceServers: iceServers,
			success: () => {
				console.log('new Janus instance success')
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

		// generate a random id
		opaqueId = Janus.randomString(8);

		janusInst.attach({
			opaqueId: opaqueId,
			plugin: 'janus.plugin.videoroom',
			success: pluginHandle => {
				videoRoomPluginHandle = pluginHandle
				console.log('janus.plugin.videoroom initialized')
			},
			error: (cause) => {
				console.log(cause)
			},
			iceState: state => {
				console.log('ICE state change to: ', state)
			},
			webrtcState: on => {
				console.log('WebRTC is: ' + (on? 'up':'down'))
				if (on) {
					const bitrate = 0; // Not limiting bandwidth
					const message = {
						request: "configure",
						bitrate: bitrate
					}
					videoRoomPluginHandle.send({message})
					console.log('set bandwidth to no limit')
				}
			},
			mediaState: (media, on, mid) => {
				console.log('Janus ' + (on? 'start':'stop') + ' receiving media')
			},
			onmessage: (msg, jsep) => {
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
			let publishers = null;
			switch (event) {
				case 'joined':
					const id = msg['id'];
					setClientId(id)
					console.log(`client:  ${id} joined`)

					// if there are any publishers
					// save publisher info
					publishers = msg["publishers"]
					if (publishers) {
						savePublishersInfo(publishers)

						// character check
						if (character === subscribe_mode) subscribeFeeds()
					}

					break;
				case 'event':
					let streams = null
					if (streams = msg['streams']) {
						streams.forEach(stream => {
							stream['id'] = clientId
						})
						feedStreams[clientId] = streams
					}

					// received publish event
					// save publisher info
					publishers = msg["publishers"]
					if (publishers) {
						savePublishersInfo(publishers)
						subscribeFeeds()
					}
					break;
				default:
					break;
			}
		}

		if (jsep) {
			videoRoomPluginHandle.handleRemoteJsep({jsep})
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

	const createVideoDom = (feedId, track) => {
		const createdDom = document.createElement('video');
		const stream = new MediaStream();
		stream.addTrack(track)
		createdDom.width = '720px';
		createdDom.height = '680px'
		createdDom.srcObject = stream
		createdDom.controls = false
		createdDom.autoplay = true

		const videoArea = document.getElementById('videoArea')
		videoArea.appendChild(createdDom)
	}

	const savePublishersInfo = publishers => {
		publishers.forEach(pub => {
			// {id, streams, video_codec}
			const id = pub['id']
			const streams = pub['streams']
			feedStreams[id] = streams
		})

		console.log(feedStreams)
	}

	/**
	 * subscribe feeds
	 * @param Array publishers
	 */
	const subscribeFeeds = () => {
		console.log('subscribeFeeds')
		initSubscriberPluginHandle();
	}

	const initSubscriberPluginHandle = () => {
		janusInst.attach({
			opaqueId: opaqueId,
			plugin: 'janus.plugin.videoroom',
			success: pluginHandle => {
				subscribePluginHandle = pluginHandle

				console.log(' -- This is a subscriber --')

				let streams = []
				for (const feedId in feedStreams) {
					streams.push({
						feed: Number.parseInt(feedId)
					})
				}

				const subscribe = {
					request: 'join',
					room: gRoomId,
					ptype: "subscriber",
					streams
				}
				subscribePluginHandle.send({message: subscribe})
			},
			error: (cause) => {
				console.log(cause)
			},
			iceState: state => {
				console.log('ICE state change to: ', state)
			},
			webrtcState: on => {
				console.log('WebRTC is: ' + (on? 'up':'down'))
				if (on) {
					const bitrate = 0; // Not limiting bandwidth
					const message = {
						request: "configure",
						bitrate: bitrate
					}
					subscribePluginHandle.send({ message })
					console.log('set bandwidth to no limit')
				}
			},
			mediaState: (media, on, mid) => {
				console.log('Janus ' + (on? 'start':'stop') + ' receiving media')
			},
			onmessage: (msg, jsep) => {
				console.log('::: Subscriber received :::')
				console.log(msg)

				let event = null
				if (event = msg['videoroom']) {
					switch (event) {
						case 'attached':
							break;
						default:
							break;

					}
				}

				if (jsep) {
					// create answer
					subscribePluginHandle.createAnswer({
						jsep,
						tracks: [
							{type: 'data'}
						],
						success: innerJsep => {
							const message = {
								request: 'start',
								room: gRoomId
							}
							subscribePluginHandle.send({message, jsep: innerJsep})
						}
					})
				}
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
				console.log(track)
				if (added) {
					setVideoTrack('remoteVideo', track)
				}
			}
		})
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

	const joinRoom = () => {
		const message = {
			request: 'join',
			ptype : 'publisher',
			room: roomId,
			notify_joining: true,
			token: 'adminpwd'
		}

		// if (character === subscribe_mode) {
		// 	message['streams'] = [
		// 		{
		// 			feed: feedId
		// 		}
		// 	]
		// }

		console.log('ready to send: ', message)

		videoRoomPluginHandle.send({ message })
	}

	const createOffer = () => {
		let mStream = null
		videoRoomPluginHandle.createOffer({
			tracks: [
				{
					type: 'screen',
					capture: navigator.mediaDevices.getDisplayMedia({video: true, audio: false}).then(stream => {
						mStream = stream
					}),
					simulcast: false

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

	const createAnswer = (receivedJsep) => {
		videoRoomPluginHandle.createAnswer({
			jsep: receivedJsep,
			success: innerJsep => {
				const body = {
					request: 'start',
					room: roomId
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

	const initJanusClick = () => {
		initJanus();
	}

	const createRoomClick = () => {
		createRoom()
	}

	const onRoomChange = evt => {
		gRoomId = Number.parseInt(evt.target.value)
		setRoomId(gRoomId)
	}

	const joinRoomClick = () => {
		joinRoom()
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
		createOffer()
	}

	const onCharacterChange = evt => {
		const char = evt.target.value
		setCharacter(char)
	}

	const onFeedIdChange = evt => {
		setFeedId(Number.parseInt(evt.target.value))
	}

	return (
		<>
			<div>
				<p>clientId: {clientId}</p>
				<p>roomId: {roomId}</p>
				<button onClick={initJanusClick}>connectToJanus</button>

				<br/>
				<button onClick={createRoomClick}>createRoom</button>
				<button onClick={listRoomsClick}>list Rooms</button>

				<br /><br />
				<label >Choose a your character: </label>
				<select id="pet-select" onChange={onCharacterChange}>
					<option value="publisher">publisher</option>
					<option value="subscriber">subscriber</option>
				</select>
				<br /><br />

				<p>
					join roomId: <input type={"text"} onChange={onRoomChange}/>
					{
						character === subscribe_mode ?
						<>
							&nbsp; feedId: <input type={"text"} onChange={onFeedIdChange}/>
						</> :
						<></>
					}
					<br></br>
					<button onClick={joinRoomClick}>join</button>
					<button onClick={listParticipantsClick}>list Participants</button>
				</p>

				{
					character !== subscribe_mode ?
						<>
							<button onClick={publishClick}>publish</button>
						</>:<></>
				}
				<p>dataChannel: <input type={"text"} onChange={onDataChange}/><button onClick={sendDataClick}>sendData</button></p>
				<div id={"videoArea"}>
					<video id={"localVideo"} autoPlay muted width={"720px"} height={"640px"}></video>
					<video id={"remoteVideo"} autoPlay muted width={"720px"} height={"640px"}></video>
				</div>
			</div>
		</>
	)
}

export default VideoRoom
