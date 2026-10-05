let currentUserId = null;
let currentUserName = "";

let currentPartnerId = null;
let currentPartnerName = "";

let currentCallId = null;

let localStream = null;
let peerConnection = null;
let websocket = null;

let isCaller = false;
let incomingCallData = null;

let pendingIceCandidates = [];

const ICE_SERVERS = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};


// ======================================================
// PAGE LOAD
// ======================================================

document.addEventListener("DOMContentLoaded", async function () {

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {

        await loadProfile();
        await loadConnections();
        await loadCallHistory();

        connectWebSocket();

    } catch (error) {

        console.error("Video call page error:", error);

    }

});


// ======================================================
// PROFILE
// ======================================================

async function loadProfile() {

    const profile = await apiRequest("/api/profile");

    currentUserId = profile.user_id;
    currentUserName = profile.full_name;

    const userName = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");
    const userRole = document.getElementById("userRole");

    if (userName) {
        userName.textContent = profile.full_name;
    }

    if (userAvatar) {
        userAvatar.textContent =
            profile.full_name.charAt(0).toUpperCase();
    }

    if (userRole) {
        userRole.textContent = profile.role || "User";
    }
}


// ======================================================
// LOAD CONNECTIONS
// ======================================================

async function loadConnections() {

    const data = await apiRequest("/api/connections");

    console.log("Video call connections:", data);

    const select = document.getElementById("connectionSelect");

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Select a connection
        </option>
    `;

    const connections = data.connections || [];

    if (connections.length === 0) {

        select.innerHTML = `
            <option value="">
                No connections available
            </option>
        `;

        return;
    }

    connections.forEach(function (connection) {

        const option = document.createElement("option");

        option.value = connection.user_id;
        option.textContent = connection.full_name;

        option.dataset.name = connection.full_name;

        select.appendChild(option);

    });

}


// ======================================================
// LOAD CALL HISTORY
// ======================================================

async function loadCallHistory() {

    try {

        const data = await apiRequest("/api/calls/history");

        console.log("Call history:", data);

        const historyList =
            document.getElementById("callHistoryList");

        if (!historyList) {
            return;
        }

        const calls = data.calls || [];

        if (calls.length === 0) {

            historyList.innerHTML = `
                <div class="connections-empty">
                    No call history yet.
                </div>
            `;

            return;
        }

        historyList.innerHTML = "";

        calls.forEach(function (call) {

            const item = document.createElement("div");

            item.className = "call-history-item";

            let durationText = "Not completed";

            if (
                call.duration !== null &&
                call.duration !== undefined
            ) {
                durationText = `${call.duration}s`;
            }

            const date = call.started_at
                ? new Date(call.started_at).toLocaleString()
                : "Unknown";

            const otherUserName =
                call.other_user_name ||
                call.full_name ||
                "User";

            item.innerHTML = `
                <div class="call-history-user">

                    <div class="call-history-avatar">
                        ${otherUserName.charAt(0).toUpperCase()}
                    </div>

                    <div class="call-history-info">

                        <strong>
                            ${otherUserName}
                        </strong>

                        <span>
                            ${date}
                        </span>

                    </div>

                </div>

                <div class="call-history-duration">
                    ${durationText}
                </div>
            `;

            historyList.appendChild(item);

        });

    } catch (error) {

        console.error("Call history error:", error);

    }

}


// ======================================================
// WEBSOCKET CONNECTION
// ======================================================

function connectWebSocket() {

    const token = localStorage.getItem("access_token");

    if (!token) {
        console.error(
            "Cannot connect WebSocket: access token missing."
        );
        return;
    }

    if (
        websocket &&
        (
            websocket.readyState === WebSocket.OPEN ||
            websocket.readyState === WebSocket.CONNECTING
        )
    ) {
        return;
    }

    const wsProtocol =
        window.location.protocol === "https:"
            ? "wss:"
            : "ws:";

    /*
     * JWT is now sent to the backend.
     *
     * The backend verifies this token and gets
     * the real user_id from it.
     */

    const wsUrl =
        `${wsProtocol}//127.0.0.1:8000/api/ws?token=${encodeURIComponent(token)}`;

    /*
     * Do NOT print wsUrl here because it contains
     * the user's JWT token.
     */

    console.log("Connecting WebSocket...");

    websocket = new WebSocket(wsUrl);


    // --------------------------------------------------
    // WEBSOCKET OPEN
    // --------------------------------------------------

    websocket.onopen = function () {

        console.log("WebSocket connected.");

        /*
         * If the caller started the call while the
         * WebSocket was still connecting, send the
         * call signal now.
         */

        if (
            isCaller &&
            currentCallId &&
            currentPartnerId
        ) {

            sendSignal("call", {

                call_id: currentCallId,

                caller_name: currentUserName

            });

        }

    };


    // --------------------------------------------------
    // WEBSOCKET MESSAGE
    // --------------------------------------------------

    websocket.onmessage = async function (event) {

        try {

            const message =
                JSON.parse(event.data);

            console.log(
                "WebSocket message:",
                message
            );

            await handleSignal(message);

        } catch (error) {

            console.error(
                "WebSocket message error:",
                error
            );

        }

    };


    // --------------------------------------------------
    // WEBSOCKET ERROR
    // --------------------------------------------------

    websocket.onerror = function (error) {

        console.error(
            "WebSocket error:",
            error
        );

    };


    // --------------------------------------------------
    // WEBSOCKET CLOSE
    // --------------------------------------------------

    websocket.onclose = function () {

        console.log(
            "WebSocket disconnected."
        );

    };

}


// ======================================================
// SEND SIGNAL
// ======================================================

function sendSignal(type, data) {

    if (!websocket) {

        console.warn(
            "Cannot send signal: WebSocket does not exist."
        );

        return false;
    }

    if (websocket.readyState !== WebSocket.OPEN) {

        console.warn(
            "Cannot send signal: WebSocket is not open.",
            type
        );

        return false;
    }

    if (!currentPartnerId) {

        console.warn(
            "Cannot send signal: partner ID missing."
        );

        return false;
    }

    const message = {

        target_user_id: Number(currentPartnerId),

        type: type,

        data: data

    };

    console.log(
        "Sending signal:",
        message
    );

    websocket.send(
        JSON.stringify(message)
    );

    return true;
}


// ======================================================
// HANDLE SIGNAL
// ======================================================

async function handleSignal(message) {

    const type = message.type;

    const data = message.data || {};

    const fromUserId =
        Number(message.from_user_id);


    // ==================================================
    // INCOMING CALL
    // ==================================================

    if (type === "call") {

        console.log(
            "Incoming call received:",
            message
        );

        /*
         * Ignore our own call signal if it somehow
         * reaches this browser.
         */

        if (fromUserId === Number(currentUserId)) {
            return;
        }

        incomingCallData = {

            call_id: data.call_id,

            caller_id: fromUserId,

            caller_name:
                data.caller_name || "User"

        };

        showIncomingCall(
            incomingCallData
        );

        return;
    }


    // ==================================================
    // CALL ACCEPTED
    // ==================================================

    if (type === "call-accepted") {

        console.log(
            "Call accepted by receiver."
        );

        currentPartnerId =
            Number(fromUserId);

        try {

            await createOffer();

        } catch (error) {

            console.error(
                "Offer creation error:",
                error
            );

            updateCallStatus(
                "Connection failed"
            );

        }

        return;
    }


    // ==================================================
    // CALL REJECTED
    // ==================================================

    if (type === "call-rejected") {

        console.log(
            "Call rejected."
        );

        showCallMessage(
            "The call was rejected."
        );

        cleanupCall();

        return;
    }


    // ==================================================
    // OFFER
    // ==================================================

    if (type === "offer") {

        console.log(
            "Offer received."
        );

        currentPartnerId =
            Number(fromUserId);

        try {

            await handleOffer(data);

        } catch (error) {

            console.error(
                "Offer handling error:",
                error
            );

            updateCallStatus(
                "Connection failed"
            );

        }

        return;
    }


    // ==================================================
    // ANSWER
    // ==================================================

    if (type === "answer") {

        console.log(
            "Answer received."
        );

        try {

            await handleAnswer(data);

        } catch (error) {

            console.error(
                "Answer handling error:",
                error
            );

        }

        return;
    }


    // ==================================================
    // ICE CANDIDATE
    // ==================================================

    if (type === "ice-candidate") {

        try {

            await handleIceCandidate(data);

        } catch (error) {

            console.error(
                "ICE candidate error:",
                error
            );

        }

        return;
    }


    // ==================================================
    // HANGUP
    // ==================================================

    if (type === "hangup") {

        console.log(
            "Remote user ended the call."
        );

        showCallMessage(
            "The other user ended the call."
        );

        cleanupCall();

        await loadCallHistory();

        return;
    }

}


// ======================================================
// START CALL
// ======================================================

async function startCall() {

    if (currentCallId) {

        console.warn(
            "A call is already active."
        );

        return;
    }

    const select =
        document.getElementById(
            "connectionSelect"
        );

    if (!select || !select.value) {

        showCallMessage(
            "Please select a connection first."
        );

        return;
    }

    currentPartnerId =
        Number(select.value);

    const selectedOption =
        select.options[select.selectedIndex];

    currentPartnerName =
        selectedOption.dataset.name ||
        selectedOption.textContent;


    try {

        isCaller = true;

        setStartButtonState(true);

        showCallMessage(
            "Starting call..."
        );


        // ----------------------------------------------
        // CREATE CALL IN DATABASE
        // ----------------------------------------------

        const call =
            await apiRequest(
                `/api/calls?receiver_id=${currentPartnerId}`,
                {
                    method: "POST"
                }
            );

        console.log(
            "Call created:",
            call
        );

        currentCallId =
            call.call_id;


        // ----------------------------------------------
        // GET CAMERA + MICROPHONE
        // ----------------------------------------------

        await getLocalMedia();


        // ----------------------------------------------
        // SHOW ACTIVE CALL UI
        // ----------------------------------------------

        showActiveCall();


        updateCallStatus(
            "Calling..."
        );


        // ----------------------------------------------
        // CREATE PEER CONNECTION
        // ----------------------------------------------

        createPeerConnection();


        // ----------------------------------------------
        // CONNECT WEBSOCKET
        // ----------------------------------------------

        connectWebSocket();


        /*
         * If WebSocket was already connected before
         * Start Video Call was clicked, onopen will NOT
         * run again.
         *
         * Therefore we send the "call" signal directly.
         */

        if (
            websocket &&
            websocket.readyState === WebSocket.OPEN
        ) {

            sendSignal("call", {

                call_id: currentCallId,

                caller_name: currentUserName

            });

        }

        showCallMessage("");

    } catch (error) {

        console.error(
            "Start call error:",
            error
        );

        showCallMessage(
            error.message ||
            "Unable to start the call."
        );

        cleanupCall();

    }

}


// ======================================================
// ACCEPT INCOMING CALL
// ======================================================

async function acceptIncomingCall() {

    if (!incomingCallData) {
        return;
    }

    try {

        currentCallId =
            incomingCallData.call_id;

        currentPartnerId =
            Number(incomingCallData.caller_id);

        currentPartnerName =
            incomingCallData.caller_name;

        isCaller = false;


        // ----------------------------------------------
        // REMOVE INCOMING POPUP
        // ----------------------------------------------

        removeIncomingCall();


        // ----------------------------------------------
        // GET CAMERA + MICROPHONE
        // ----------------------------------------------

        await getLocalMedia();


        // ----------------------------------------------
        // SHOW CALL UI
        // ----------------------------------------------

        showActiveCall();

        updateCallStatus(
            "Connecting..."
        );


        // ----------------------------------------------
        // CREATE PEER CONNECTION
        // ----------------------------------------------

        createPeerConnection();


        // ----------------------------------------------
        // TELL CALLER WE ACCEPTED
        // ----------------------------------------------

        sendSignal(
            "call-accepted",
            {
                call_id: currentCallId
            }
        );


        incomingCallData = null;

    } catch (error) {

        console.error(
            "Accept call error:",
            error
        );

        showCallMessage(
            "Could not accept the call."
        );

        cleanupCall();

    }

}


// ======================================================
// REJECT INCOMING CALL
// ======================================================

function rejectIncomingCall() {

    if (!incomingCallData) {
        return;
    }

    currentPartnerId =
        Number(incomingCallData.caller_id);

    currentCallId =
        incomingCallData.call_id;

    sendSignal(
        "call-rejected",
        {
            call_id: currentCallId
        }
    );

    removeIncomingCall();

    incomingCallData = null;

    currentPartnerId = null;
    currentCallId = null;

    showCallMessage(
        "Call rejected."
    );

}


// ======================================================
// GET LOCAL MEDIA
// ======================================================

async function getLocalMedia() {

    if (localStream) {
        return;
    }

    try {

        localStream =
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

        const localVideo =
            document.getElementById(
                "localVideo"
            );

        if (localVideo) {

            localVideo.srcObject =
                localStream;

        }

    } catch (error) {

        console.error(
            "Camera/microphone error:",
            error
        );

        throw new Error(
            "Camera and microphone permission is required."
        );

    }

}


// ======================================================
// CREATE PEER CONNECTION
// ======================================================

function createPeerConnection() {

    if (peerConnection) {
        return;
    }

    console.log(
        "Creating RTCPeerConnection."
    );

    peerConnection =
        new RTCPeerConnection(
            ICE_SERVERS
        );


    // ----------------------------------------------
    // ADD LOCAL TRACKS
    // ----------------------------------------------

    if (localStream) {

        localStream
            .getTracks()
            .forEach(function (track) {

                peerConnection.addTrack(
                    track,
                    localStream
                );

            });

    }


    // ----------------------------------------------
    // RECEIVE REMOTE STREAM
    // ----------------------------------------------

    peerConnection.ontrack =
        function (event) {

            console.log(
                "Remote track received."
            );

            const remoteVideo =
                document.getElementById(
                    "remoteVideo"
                );

            if (
                remoteVideo &&
                event.streams &&
                event.streams[0]
            ) {

                remoteVideo.srcObject =
                    event.streams[0];

            }

        };


    // ----------------------------------------------
    // ICE CANDIDATE
    // ----------------------------------------------

    peerConnection.onicecandidate =
        function (event) {

            if (
                event.candidate &&
                currentPartnerId
            ) {

                sendSignal(
                    "ice-candidate",
                    {
                        candidate:
                            event.candidate
                    }
                );

            }

        };


    // ----------------------------------------------
    // CONNECTION STATE
    // ----------------------------------------------

    peerConnection.onconnectionstatechange =
        function () {

            if (!peerConnection) {
                return;
            }

            const state =
                peerConnection.connectionState;

            console.log(
                "Peer connection state:",
                state
            );

            if (state === "connecting") {

                updateCallStatus(
                    "Connecting..."
                );

            }

            if (state === "connected") {

                updateCallStatus(
                    "Connected"
                );

            }

            if (
                state === "disconnected" ||
                state === "failed"
            ) {

                updateCallStatus(
                    "Connection lost"
                );

            }

        };


    // ----------------------------------------------
    // ICE CONNECTION STATE
    // ----------------------------------------------

    peerConnection.oniceconnectionstatechange =
        function () {

            if (!peerConnection) {
                return;
            }

            console.log(
                "ICE state:",
                peerConnection.iceConnectionState
            );

        };

}


// ======================================================
// CREATE OFFER
// ======================================================

async function createOffer() {

    if (!peerConnection) {

        createPeerConnection();

    }

    const offer =
        await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
        offer
    );

    sendSignal(
        "offer",
        {
            type: offer.type,
            sdp: offer.sdp
        }
    );

}


// ======================================================
// HANDLE OFFER
// ======================================================

async function handleOffer(data) {

    if (!peerConnection) {

        createPeerConnection();

    }

    const offer = {

        type: data.type,

        sdp: data.sdp

    };

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
    );


    await flushPendingIceCandidates();


    const answer =
        await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(
        answer
    );


    sendSignal(
        "answer",
        {
            type: answer.type,
            sdp: answer.sdp
        }
    );

}


// ======================================================
// HANDLE ANSWER
// ======================================================

async function handleAnswer(data) {

    if (!peerConnection) {
        return;
    }

    const answer = {

        type: data.type,

        sdp: data.sdp

    };

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
    );


    await flushPendingIceCandidates();

}


// ======================================================
// HANDLE ICE CANDIDATE
// ======================================================

async function handleIceCandidate(data) {

    if (!data || !data.candidate) {
        return;
    }

    const candidate =
        new RTCIceCandidate(
            data.candidate
        );


    /*
     * ICE candidates can sometimes arrive before
     * the remote description has been set.
     */

    if (
        peerConnection &&
        peerConnection.remoteDescription
    ) {

        await peerConnection.addIceCandidate(
            candidate
        );

    } else {

        pendingIceCandidates.push(
            candidate
        );

    }

}


// ======================================================
// FLUSH PENDING ICE
// ======================================================

async function flushPendingIceCandidates() {

    if (
        !peerConnection ||
        !peerConnection.remoteDescription
    ) {
        return;
    }

    while (
        pendingIceCandidates.length > 0
    ) {

        const candidate =
            pendingIceCandidates.shift();

        try {

            await peerConnection.addIceCandidate(
                candidate
            );

        } catch (error) {

            console.error(
                "Error adding queued ICE candidate:",
                error
            );

        }

    }

}


// ======================================================
// SHOW ACTIVE CALL
// ======================================================

function showActiveCall() {

    const activeCallCard =
        document.getElementById(
            "activeCallCard"
        );

    const callPartnerName =
        document.getElementById(
            "callPartnerName"
        );

    if (activeCallCard) {

        activeCallCard.style.display =
            "block";

    }

    if (callPartnerName) {

        callPartnerName.textContent =
            currentPartnerName ||
            "Connected User";

    }

    const startButton =
        document.getElementById(
            "startCallButton"
        );

    if (startButton) {

        startButton.disabled = true;

        startButton.innerHTML =
            "<span>◉</span> In Call";

    }

}


// ======================================================
// UPDATE CALL STATUS
// ======================================================

function updateCallStatus(status) {

    const callStatus =
        document.getElementById(
            "callStatus"
        );

    if (callStatus) {

        callStatus.textContent =
            status;

    }

}


// ======================================================
// SHOW CALL MESSAGE
// ======================================================

function showCallMessage(message) {

    const callMessage =
        document.getElementById(
            "callMessage"
        );

    if (callMessage) {

        callMessage.textContent =
            message;

    }

}


// ======================================================
// SET START BUTTON STATE
// ======================================================

function setStartButtonState(isLoading) {

    const button =
        document.getElementById(
            "startCallButton"
        );

    if (!button) {
        return;
    }

    if (isLoading) {

        button.disabled = true;

        button.innerHTML =
            "<span>◉</span> Starting...";

    } else {

        button.disabled = false;

        button.innerHTML =
            "<span>◉</span> Start Video Call";

    }

}


// ======================================================
// INCOMING CALL POPUP
// ======================================================

function showIncomingCall(callData) {

    removeIncomingCall();

    const overlay =
        document.createElement("div");

    overlay.id =
        "incomingCallOverlay";

    overlay.style.position =
        "fixed";

    overlay.style.inset =
        "0";

    overlay.style.background =
        "rgba(0, 0, 0, 0.72)";

    overlay.style.backdropFilter =
        "blur(8px)";

    overlay.style.display =
        "flex";

    overlay.style.alignItems =
        "center";

    overlay.style.justifyContent =
        "center";

    overlay.style.zIndex =
        "9999";


    overlay.innerHTML = `

        <div style="
            width: min(420px, 90%);
            background: #171522;
            border: 1px solid rgba(139, 92, 246, 0.35);
            border-radius: 20px;
            padding: 32px;
            text-align: center;
            box-shadow: 0 25px 80px rgba(0,0,0,.5);
        ">

            <div style="
                width: 70px;
                height: 70px;
                margin: 0 auto 18px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(
                    135deg,
                    #7c3aed,
                    #a78bfa
                );
                color: white;
                font-size: 28px;
                font-weight: 700;
            ">
                ${callData.caller_name
                    .charAt(0)
                    .toUpperCase()}
            </div>

            <div style="
                color: #a78bfa;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 1.5px;
                margin-bottom: 8px;
            ">
                INCOMING VIDEO CALL
            </div>

            <h2 style="
                color: white;
                margin: 0 0 8px;
            ">
                ${callData.caller_name}
            </h2>

            <p style="
                color: #a1a1aa;
                margin-bottom: 26px;
            ">
                is calling you
            </p>

            <div style="
                display: flex;
                gap: 12px;
                justify-content: center;
            ">

                <button
                    id="rejectIncomingCallButton"
                    style="
                        border: 1px solid rgba(255,255,255,.12);
                        background: #252331;
                        color: #fff;
                        padding: 12px 22px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: 600;
                    "
                >
                    Reject
                </button>

                <button
                    id="acceptIncomingCallButton"
                    style="
                        border: none;
                        background: #7c3aed;
                        color: white;
                        padding: 12px 22px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: 600;
                    "
                >
                    Accept
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(
        overlay
    );


    document
        .getElementById(
            "acceptIncomingCallButton"
        )
        .addEventListener(
            "click",
            acceptIncomingCall
        );


    document
        .getElementById(
            "rejectIncomingCallButton"
        )
        .addEventListener(
            "click",
            rejectIncomingCall
        );

}


// ======================================================
// REMOVE INCOMING CALL POPUP
// ======================================================

function removeIncomingCall() {

    const overlay =
        document.getElementById(
            "incomingCallOverlay"
        );

    if (overlay) {

        overlay.remove();

    }

}


// ======================================================
// TOGGLE MICROPHONE
// ======================================================

function toggleMicrophone() {

    if (!localStream) {
        return;
    }

    const audioTracks =
        localStream.getAudioTracks();

    if (audioTracks.length === 0) {
        return;
    }

    const audioTrack =
        audioTracks[0];

    audioTrack.enabled =
        !audioTrack.enabled;

    const button =
        document.getElementById(
            "toggleMicButton"
        );

    if (!button) {
        return;
    }

    if (audioTrack.enabled) {

        button.innerHTML =
            "🎤 <span>Mute</span>";

    } else {

        button.innerHTML =
            "🔇 <span>Unmute</span>";

    }

}


// ======================================================
// TOGGLE CAMERA
// ======================================================

function toggleCamera() {

    if (!localStream) {
        return;
    }

    const videoTracks =
        localStream.getVideoTracks();

    if (videoTracks.length === 0) {
        return;
    }

    const videoTrack =
        videoTracks[0];

    videoTrack.enabled =
        !videoTrack.enabled;

    const button =
        document.getElementById(
            "toggleCameraButton"
        );

    if (!button) {
        return;
    }

    if (videoTrack.enabled) {

        button.innerHTML =
            "📹 <span>Camera</span>";

    } else {

        button.innerHTML =
            "🚫 <span>Camera Off</span>";

    }

}


// ======================================================
// END CALL
// ======================================================

async function endCall() {

    if (!currentCallId) {
        return;
    }

    try {

        /*
         * Tell the other user first.
         */

        if (currentPartnerId) {

            sendSignal(
                "hangup",
                {
                    call_id: currentCallId
                }
            );

        }


        /*
         * End the call in the backend.
         */

        await apiRequest(
            `/api/calls/${currentCallId}/end`,
            {
                method: "POST"
            }
        );


        showCallMessage(
            "Call ended."
        );


    } catch (error) {

        console.error(
            "End call error:",
            error
        );

    }


    cleanupCall();

    await loadCallHistory();

}


// ======================================================
// CLEANUP CALL
// ======================================================

function cleanupCall() {

    console.log(
        "Cleaning up call."
    );


    // ----------------------------------------------
    // REMOVE INCOMING POPUP
    // ----------------------------------------------

    removeIncomingCall();


    // ----------------------------------------------
    // STOP LOCAL MEDIA
    // ----------------------------------------------

    if (localStream) {

        localStream
            .getTracks()
            .forEach(function (track) {

                track.stop();

            });

        localStream = null;

    }


    // ----------------------------------------------
    // CLOSE PEER CONNECTION
    // ----------------------------------------------

    if (peerConnection) {

        try {

            peerConnection.close();

        } catch (error) {

            console.error(
                "Peer close error:",
                error
            );

        }

        peerConnection = null;

    }


    // ----------------------------------------------
    // CLEAR VIDEOS
    // ----------------------------------------------

    const localVideo =
        document.getElementById(
            "localVideo"
        );

    const remoteVideo =
        document.getElementById(
            "remoteVideo"
        );

    if (localVideo) {

        localVideo.srcObject =
            null;

    }

    if (remoteVideo) {

        remoteVideo.srcObject =
            null;

    }


    // ----------------------------------------------
    // RESET STATE
    // ----------------------------------------------

    currentCallId = null;

    currentPartnerId = null;

    currentPartnerName = "";

    incomingCallData = null;

    isCaller = false;

    pendingIceCandidates = [];


    // ----------------------------------------------
    // HIDE ACTIVE CALL
    // ----------------------------------------------

    const activeCallCard =
        document.getElementById(
            "activeCallCard"
        );

    if (activeCallCard) {

        activeCallCard.style.display =
            "none";

    }


    // ----------------------------------------------
    // RESET START BUTTON
    // ----------------------------------------------

    setStartButtonState(false);

}


// ======================================================
// LOGOUT
// ======================================================

function logout() {

    if (websocket) {

        try {

            websocket.close();

        } catch (error) {

            console.error(
                "WebSocket close error:",
                error
            );

        }

    }

    localStorage.removeItem(
        "access_token"
    );

    window.location.href =
        "login.html";

}


// ======================================================
// BUTTON EVENTS
// ======================================================

const startCallButton =
    document.getElementById(
        "startCallButton"
    );

if (startCallButton) {

    startCallButton.addEventListener(
        "click",
        startCall
    );

}


const endCallButton =
    document.getElementById(
        "endCallButton"
    );

if (endCallButton) {

    endCallButton.addEventListener(
        "click",
        endCall
    );

}


const toggleMicButton =
    document.getElementById(
        "toggleMicButton"
    );

if (toggleMicButton) {

    toggleMicButton.addEventListener(
        "click",
        toggleMicrophone
    );

}


const toggleCameraButton =
    document.getElementById(
        "toggleCameraButton"
    );

if (toggleCameraButton) {

    toggleCameraButton.addEventListener(
        "click",
        toggleCamera
    );

}