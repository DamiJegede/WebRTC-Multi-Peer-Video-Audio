var localVideo;
var sessionID;
var username = "Damilola Jegede";
var token = "67d62d8d-68b1-4a1d-82db-c89f80f51ddf";
var role; //USER, AGENT
var localStream;
var connections = [];

var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};

function getUserMediaSuccess (stream) {
    localStream = stream;
    //console.log(stream);
    if ('srcObject' in localVideo) {
        console.log("ADDED OBJ")
        localVideo.srcObject = localStream;
    } else {
        console.log("ADDED SRC")
        localVideo.src = URL.createObjectURL(localStream);
    }
}

var VideoBanking = {
    socket: null,
    role: null,

    username: null,
    token: null,
    sessionID: null,

    localStream: null,
    localVideo: null,
    remoteVideo: null,

    setup: () => {
        var _this = VideoBanking;

        _this.localVideo = document.getElementById('localVideo');
        _this.remoteVideo = document.getElementById('remoteVideo');

        if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                .then(getUserMediaSuccess)
                .then(() => {
    
                    console.log("Connecting to", config.host);
    
                    _this.socket = new WebSocket(config.host, 'echo-protocol');
                    _this.socket.addEventListener('error', (e) => {
                        console.log("Error", e);
                    });
    
                    // Connection opened
                    _this.socket.addEventListener('open', function (event) {
                        console.log("Connected to host.", event);
                    });
    
                    _this.socket.addEventListener('close', (e) => { console.log("Closed", e) })
    
                    // Listen for messages
                    _this.socket.addEventListener('message', function (event) {
                        var payload = JSON.parse(event.data);
    
                        switch (payload.status) {
                            //Check for login
                            case "CONNECTED":
                                //Get SessionID and Report my name
                                _this.sessionID = payload.sessionID;
                                _this.socket.send(JSON.stringify({
                                    status: "LOGIN",
                                    sessionID: _this.sessionID,
                                    name: _this.username,
                                    token: _this.token
                                }));
    
                            case "INCOMING":
                                //Logic for incoming calls here
                        }
                    });
    
                    
                });
        } else {
            alert("Your browser does not support Video Banking.");
        } 
    },

    startCall: () => {
        VideoBanking.role = "USER";
        

    var constraints = {
        video: true,
        audio: false,
    };

    console.log("READY");
        //Send call request to socket server and start local video
    },

    answerCall: () => {
        VideoBanking.role = "AGENT";
    },

    endCall: () => {},

    muteCall: () => {},

    rateCall: (rating) => {}
}