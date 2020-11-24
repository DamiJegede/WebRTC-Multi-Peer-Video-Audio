var localVideo;
var sessionID;
var role; //USER, AGENT
var localStream;

var VideoBanking = {
    socket: null,
    role: null,

    username: null,
    token: null,
    sessionID: null,
    token: null,
    isConnected: false,

    localStream: null,
    localVideo: null,
    remoteVideo: null,
    peerConnection: null,

    start: (token) => {
        var _this = VideoBanking;

        _this.token = token;
        _this.localVideo = document.getElementById('localVideo');
        _this.remoteVideo = document.getElementById('remoteVideo');

        if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 640 }, audio: false })
                .then(_this.onGetLocalMedia)
                .then(_this.onMediaReady)
                .catch(e => { console.log(`Error starting WebCam. Is another application currently using it?`) });
        } else {
            alert("Your browser does not support Video Banking.");
        }
    },

    startCall: () => {
        var _this = VideoBanking;

        _this.role = "USER";
        console.log(`Starting call as ${_this.role}...`);

        //Send call request to socket server and start local video
        _this.peerConnection = new RTCPeerConnection(config.peers);
        _this.peerConnection.onicecandidate = () => {};
        _this.peerConnection.onnegotiationneeded = () => {
            _this.peerConnection.createOffer().then((offer) => {
                return _this.peerConnection.setLocalDescription(offer);
            })
            .then(() => {
                //Send call to signal server
                _this.socket.send(JSON.stringify({
                    sessionID: _this.sessionID,
                    status: "CALLING",
                    sdp: _this.peerConnection.localDescription
                }));
            })
            .catch((error) => {});
        };
    },

    answerCall: () => {
        VideoBanking.role = "AGENT";
    },

    endCall: () => {},

    muteCall: () => {},

    rateCall: (rating) => {},


    //Display Local Camera
    onGetLocalMedia: (stream) => {
        var _this = VideoBanking;

        _this.localStream = stream;

        if ('srcObject' in _this.localVideo) _this.localVideo.srcObject = _this.localStream;
        else _this.localVideo.src = URL.createObjectURL(_this.localStream);
    },

    onMediaReady: () => {
        var _this = VideoBanking;

        console.log("Connecting to", config.host);
        _this.socket = new WebSocket(config.host, 'echo-protocol');

        _this.socket.addEventListener('error', (e) => {
            console.log("Error", e);
        });

        _this.socket.addEventListener('open', (event) => {
            console.log("Connected to host.", event);
        });

        _this.socket.addEventListener('close', (e) => {
            console.log("Closed", e)
        });

        // Listen for messages
        _this.socket.addEventListener('message', function (event) {
            var payload = JSON.parse(event.data);
            console.log(event.data);

            switch (payload.status) {
                //Check for login
                case "CONNECTED":
                    //Get SessionID and Report my name
                    _this.sessionID = payload.sessionID;
                    _this.socket.send(JSON.stringify({
                        status: "LOGIN",
                        sessionID: _this.sessionID,
                        token: _this.token
                    }));
                    break;

                case "LOGIN_SUCCESS":
                    _this.username = payload.name;
                    console.log(_this.username);

                    //Trigger test call
                    _this.startCall();
                    break;

                case "INCOMING":
                    //Logic for incoming calls here
                    break;
            }
        });
    }
}