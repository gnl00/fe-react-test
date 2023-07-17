import { useState } from "react";
import { randomString } from "./utils.js";
import { SrsRtcSignalingAsync } from "./assets/js/srs.sig.js";
import { SrsRtcPublisherAsync } from "./assets/js/srs.sdk.js";

// 连接到 signaling-server，const sig = new SrsRtcSignalingAsync()；sig 会连接并初始化 websocket，url=ws|wss://signaling-server-ip:1989/sig/v1/rtc
// join room
// start publish
// start play

let inputSrs = '';
let inputRoom = '';
let inputTarget = '';

let sig = null;
let publisher = null;

function One2One() {
	const [selfUrl, setSelfUrl] = useState('')
	const [srs, setSrs] = useState('localhost:1989')
	const [room, setRoom] = useState('1234')
	const [target, setTarget] = useState('')
	const [client, setClient] = useState('')



	const connectSignaling = async (wsSchema, host, port, roomId, clientId) => {
		console.log('connectSignaling')
		sig = new SrsRtcSignalingAsync()
		initSig(sig)

		// wsSchema = ws|wss
		// host = <signaling-server-ip>
		// const wsUrl = wsSchema + '://' + host + ':' + port + '/sig/v1/rtc?room=' + roomId  + '&display='+ clientId
		const srsUrl = host + ':' + port
		setSrs(srsUrl)
		await sig.connect(wsSchema, srsUrl, roomId, clientId)
	}

	const initSig = (sig) => {
		console.log('init Signaling')
		sig.onmessage = data => {
			console.log('::: Signaling Server Message Received :::')
			console.log(data)
		}
	}

	const join = async () => {
		let resp = await sig.send({action: 'join', room: room, display: client});
		console.log('signaling join ok ', resp)

		/*
		返回的消息格式如下
		 {
    "action": "join",
    "room": "1234",
    "self": {
        "display": "0vXBkT",
        "publishing": false
    },
    "participants": [
        {
            "display": "0vXBkT",
            "publishing": false
        }
    ]
   }
    */
	}

	const publish = async () => {
		await startPublish('localhost', room, client)
	}

	const startPublish = (host, room, display) => {
		const url = 'webrtc://' + host + '/' + room + '/' + display

		if (publisher) {
			publisher.close()
		}

		publisher = SrsRtcPublisherAsync()
		console.log('publisher ', publisher)
		const publisherVideoDom = document.getElementById('publishVideo')
		setStream(publisherVideoDom, publisher.stream)

		return publisher.publish(url).then(resp => {
			console.log('publish success ', resp)
			console.log('self url ', url)
			setSelfUrl(url)
		})
	}

	const setStream = (dom, stream) => {
		if (stream) dom.srcObject = stream
	}

	const onSrsChange = evt => {
		inputSrs = evt.target.value
		setSrs(inputSrs)
	}

	const onRoomChange = evt => {
		inputRoom = evt.target.value
		setRoom(inputRoom)
	}

	const onTargetChange = evt => {
		inputTarget = evt.target.value
		setTarget(inputTarget)
	}

	const startClick = () => {
		const randomId = randomString(6);
		setClient(randomId)
		connectSignaling('ws', 'localhost', 1989, 1234, randomId)
	}

	const joinClick = () => {
		join()
	}

	const publishClick = () => {
		startPublish(srs, room, client)
	}

	return(
		<>
			<div>
				<p>Self url：{selfUrl}</p>
				<p>Client id：{client}</p>

				SRS <input type={"text"} onChange={onSrsChange} value={srs} /><br /><br />
				Room <input type={"text"} onChange={onRoomChange} value={room} /><br /><br />
				Target <input type={"text"} onChange={onTargetChange} /><br /><br />
				<button onClick={startClick}>Start</button>
				<button onClick={joinClick}>Join Room</button>
				<button onClick={publishClick}>Publish</button>
			</div>
			<div>
				<video id={"publishVideo"} autoPlay muted style={{width: "720px", height: "auto"}} />
			</div>
		</>
	)
}

export default One2One