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

    start: (token, role) => {
        var _this = VideoBanking;

        _this.role = role;

        _this.token = token;
        _this.localVideo = document.getElementById('localVideo');
        _this.remoteVideo = document.getElementById('remoteVideo');

        if (role === "USER") _this.createConnection();

        if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { width: 720, height: 720 }, audio: false })
                .then(_this.onGetLocalMedia)
                .then(_this.onMediaReady)
                .catch(_this.onMediaError);
        } else {
            alert("Your browser does not support Video Banking.");
        }
    },

    answerCall: () => {},

    endCall: () => {},

    callEnded: () => {},

    muteCall: () => {},

    rateCall: (rating) => {},


    //Display Local Camera
    onGetLocalMedia: (stream) => {
        var _this = VideoBanking;

        _this.localStream = stream;

        if ('srcObject' in _this.localVideo) _this.localVideo.srcObject = _this.localStream;
        else _this.localVideo.src = URL.createObjectURL(_this.localStream);

        _this.localStream.getTracks().forEach(track => _this.peerConnection.addTrack(track, stream));
    },

    connectToWebSocket: () => {
        console.log("Connecting to WebSocket");
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
                        token: _this.token,
                        role: _this.role
                    }));
                    break;

                case "LOGIN_SUCCESS":
                    _this.username = payload.name;
                    console.log(_this.username);

                    break;

                case "INCOMING_CALL":
                    //Logic for incoming calls here

                    break;
            }
        });
    },

    onMediaError: (e) => {
        switch(e.name) {
            case "NotFoundError":
              alert("Error launching WebCam or microphone. Please ensure another application isn't currently using it.");
              break;
            case "SecurityError":
            case "PermissionDeniedError":
              break;
          }
    },

    createConnection: () => {
        var _this = VideoBanking;
        console.log("Creating connection...");

        _this.connectToWebSocket();

        _this.peerConnection = new RTCPeerConnection({ 'iceServers': [ {'urls': 'stun:stun.stunprotocol.org' } ] });
        _this.peerConnection.onicecandidateerror = (event) => { console.log (event) };

        _this.peerConnection.onicecandidate = (event) => {
            console.log(event);
            if (event.candidate) {
                _this.socket.send(JSON.stringify({
                    sessionID: _this.sessionID,
                    status: "NEW_CANDIDATE",
                    candidate: event.candidate
                }));
            }
        };

        _this.peerConnection.ontrack = (event) => {
            console.log("Tracking...");
            _this.remoteVideo.srcObject = event.streams[0];
        };

        _this.peerConnection.onnegotiationneeded = () => {
            console.log("NEGOTIATION NEEDED");
            _this.peerConnection.createOffer().then((offer) => {
                console.log("Offer created");
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
            .catch((error) => {
                console.log(error);
            });
        };

        _this.peerConnection.oniceconnectionstatechange = () => {
            console.log("HERE")
            switch(_this.peerConnection.iceConnectionState) {
                case "closed":
                case "failed":
                    _this.callEnded();
                    break;
            }
        };

        _this.peerConnection.onsignalingstatechange = () => {
            console.log("HERE")
            switch(_this.peerConnection.signalingState) {
                case "closed":
                    closeVideoCall();
                    break;
            }
        };
    },
}