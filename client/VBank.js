var VideoBanking = {
    socket: null,
    role: null,

    username: null,
    token: null,
    sessionID: null,
    remoteSessionID: null,
    token: null,
    isConnected: false,

    localStream: null,
    localVideo: null,
    remoteVideo: null,
    peerConnection: null,

    remoteUsername: null,
    mediaOptions: { video: { width: 720, height: 720 }, audio: false },

    start: (token) => {
        var _this = VideoBanking;

        _this.token = token;
        _this.localVideo = document.getElementById('localVideo');
        _this.remoteVideo = document.getElementById('remoteVideo');

        _this.connectToWebSocket();

        if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia(_this.mediaOptions)
                .then(_this.onGetLocalMedia)
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
                        token: _this.token
                    }));
                    break;

                case "LOGIN_SUCCESS":
                    _this.username = payload.name;
                    _this.role = payload.role;

                    _this.createConnection();

                    //Simulate call to signal server if USER
                    if (_this.role === "USER") {
                        _this.socket.send(JSON.stringify({
                            name: _this.username,
                            status: "REQUEST_AGENT"
                        }));
                    }

                    break;

                case "NEW_CANDIDATE":
                    console.log("NEW CANDIDATE FOUND");
                    var candidate = new RTCIceCandidate(payload.candidate);
                    _this.peerConnection.addIceCandidate(candidate)
                    .catch(_this.handleError);
                    break;

                case "INCOMING_CALL":
                    _this.remoteSessionID = payload.remoteSessionID;
                    _this.remoteUsername = payload.name;
                    _this.connectAgent(payload.sdp);
                    break;

                //Agent assigned. Start video connection
                case "AGENT_ASSIGNED":
                    _this.remoteSessionID = payload.remoteSessionID;
                    _this.remoteUsername = payload.name;

                    //Make Video Call
                    _this.peerConnection.createOffer().then((offer) => {
                        console.log("Offer created");
                        _this.peerConnection.setLocalDescription(offer);

                        //Send Video call handshake
                        _this.socket.send(JSON.stringify({
                            status: "INCOMING_CALL",
                            remoteSessionID: _this.remoteSessionID,
                            name: _this.username,
                            sdp: offer
                        }));
                    })
                    .catch((error) => {
                        console.log(error);
                    });
                    break;

                case "VIDEO_HANDSHAKE":
                    console.log("HANDSHAKE", payload.sdp);
                    var desc = new RTCSessionDescription(payload.sdp);
                    _this.peerConnection.setRemoteDescription(desc);
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

        _this.peerConnection = new RTCPeerConnection({ 'iceServers': [ {'urls': 'stun:stun.stunprotocol.org' } ] });
        _this.peerConnection.onicecandidateerror = (event) => { console.log (event) };

        _this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                _this.socket.send(JSON.stringify({
                    status: "NEW_CANDIDATE",
                    remoteSessionID: _this.remoteSessionID,
                    candidate: event.candidate
                }));
            }
        };

        _this.peerConnection.ontrack = (event) => {
            if (_this.remoteVideo.srcObject !== event.streams[0]) {
                console.log("Streaming:", event.streams[0]);
                _this.remoteVideo.srcObject = event.streams[0];
            }
        };

        _this.peerConnection.oniceconnectionstatechange = () => {
            console.log("ICE State:", _this.peerConnection.iceConnectionState)
            switch(_this.peerConnection.iceConnectionState) {
                case "closed":
                case "failed":
                    _this.callEnded();
                    break;
            }
        };

        _this.peerConnection.onsignalingstatechange = () => {
            console.log("Signal State:", _this.peerConnection.signalingState);
            switch(_this.peerConnection.signalingState) {
                case "closed":
                   //closeVideoCall();
                    break;
            }
        };
    },

    connectAgent: async (sdp) => {
        var _this = VideoBanking;
        console.log("Answering Call:", sdp);

        var desc = new RTCSessionDescription(sdp);
        _this.peerConnection.setRemoteDescription(desc);

        _this.peerConnection.createAnswer().then((answer) => {
            console.log("Answer Created", answer);
            _this.peerConnection.setLocalDescription(answer);
            _this.socket.send(JSON.stringify({
                status: "VIDEO_HANDSHAKE",
                remoteSessionID: _this.remoteSessionID,
                sdp: answer
            }));
        });
    },

    handleError: (error) => {
        console.log(error);
    }
}