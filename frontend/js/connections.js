document.addEventListener("DOMContentLoaded", async function () {

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const requestsList = document.getElementById("requestsList");
    const connectionsList = document.getElementById("connectionsList");
    const connectionsMessage = document.getElementById("connectionsMessage");


    // =========================
    // LOGOUT
    // =========================

    window.logout = function () {
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    };


    // =========================
    // ESCAPE HTML
    // =========================

    function escapeHtml(value) {

        const div = document.createElement("div");

        div.textContent = value ?? "";

        return div.innerHTML;
    }


    // =========================
    // AUTH ERROR
    // =========================

    function handleAuthError(error) {

        const message = error?.message?.toLowerCase() || "";

        if (
            message.includes("token") ||
            message.includes("invalid") ||
            message.includes("expired") ||
            message.includes("unauthorized")
        ) {
            localStorage.removeItem("access_token");
            window.location.href = "login.html";
        }
    }


    // =========================
    // SHOW MESSAGE
    // =========================

    function showMessage(message) {

        if (!connectionsMessage) {
            return;
        }

        connectionsMessage.textContent = message;

        connectionsMessage.classList.add("show");

        setTimeout(function () {

            connectionsMessage.classList.remove("show");

        }, 3000);
    }


    // =========================
    // LOAD PROFILE
    // =========================

    async function loadProfile() {

        try {

            const profile = await apiRequest("/api/profile");

            const userName = document.getElementById("userName");
            const userRole = document.getElementById("userRole");
            const userAvatar = document.getElementById("userAvatar");


            if (userName) {
                userName.textContent = profile.full_name;
            }


            if (userRole) {
                userRole.textContent = profile.role || "User";
            }


            if (userAvatar) {
                userAvatar.textContent =
                    profile.full_name.charAt(0).toUpperCase();
            }


        } catch (error) {

            console.error("Profile error:", error);

            handleAuthError(error);
        }
    }


    // =========================
    // LOAD PENDING REQUESTS
    // =========================

    async function loadRequests() {

        try {

            requestsList.innerHTML = `
                <div class="connections-loading">
                    Loading requests...
                </div>
            `;


            const data = await apiRequest(
                "/api/connections/requests"
            );


            /*
                Backend returns an array directly:

                [
                    {
                        "connection_id": 2,
                        "sender_id": 2,
                        "sender_name": "Rohit",
                        "status": "pending"
                    }
                ]
            */

            const requests = Array.isArray(data)
                ? data
                : (data.requests || []);


            console.log("Pending requests:", requests);


            // =========================
            // NO REQUESTS
            // =========================

            if (requests.length === 0) {

                requestsList.innerHTML = `
                    <div class="connections-empty">

                        <div class="connections-empty-icon">
                            ↔
                        </div>

                        <h3>
                            No pending requests
                        </h3>

                        <p>
                            You don't have any
                            connection requests right now.
                        </p>

                    </div>
                `;

                return;
            }


            // Clear loading state

            requestsList.innerHTML = "";


            // =========================
            // CREATE REQUEST CARDS
            // =========================

            requests.forEach(function (request) {

                const item = document.createElement("div");

                item.className = "connection-item";


                const senderName =
                    request.sender_name || "Unknown User";


                const firstLetter =
                    senderName.charAt(0).toUpperCase();


                item.innerHTML = `

                    <div class="connection-user">

                        <div class="connection-avatar">
                            ${escapeHtml(firstLetter)}
                        </div>

                        <div class="connection-user-info">

                            <p class="connection-user-name">
                                ${escapeHtml(senderName)}
                            </p>

                            <p class="connection-user-meta">
                                Wants to connect with you
                            </p>

                        </div>

                    </div>


                    <div class="connection-actions">

                        <button
                            class="accept-button"
                            data-request-id="${request.connection_id}"
                        >
                            Accept
                        </button>


                        <button
                            class="reject-button"
                            data-request-id="${request.connection_id}"
                        >
                            Reject
                        </button>

                    </div>

                `;


                const acceptButton =
                    item.querySelector(".accept-button");


                const rejectButton =
                    item.querySelector(".reject-button");


                // =========================
                // ACCEPT
                // =========================

                acceptButton.addEventListener(
                    "click",
                    function () {

                        handleRequest(
                            request.connection_id,
                            "accept",
                            acceptButton,
                            rejectButton
                        );

                    }
                );


                // =========================
                // REJECT
                // =========================

                rejectButton.addEventListener(
                    "click",
                    function () {

                        handleRequest(
                            request.connection_id,
                            "reject",
                            acceptButton,
                            rejectButton
                        );

                    }
                );


                requestsList.appendChild(item);

            });


        } catch (error) {

            console.error(
                "Requests error:",
                error
            );


            requestsList.innerHTML = `
                <div class="connections-empty">

                    <h3>
                        Failed to load requests
                    </h3>

                    <p>
                        ${escapeHtml(
                            error.message ||
                            "Something went wrong."
                        )}
                    </p>

                </div>
            `;


            handleAuthError(error);
        }
    }


    // =========================
    // ACCEPT / REJECT REQUEST
    // =========================

    async function handleRequest(
        connectionId,
        action,
        acceptButton,
        rejectButton
    ) {

        try {

            // Disable both buttons

            acceptButton.disabled = true;
            rejectButton.disabled = true;


            if (action === "accept") {

                acceptButton.textContent =
                    "Accepting...";

            } else {

                rejectButton.textContent =
                    "Rejecting...";
            }


            // Backend request

            await apiRequest(
                `/api/connections/${connectionId}/${action}`,
                {
                    method: "POST"
                }
            );


            // =========================
            // SUCCESS MESSAGE
            // =========================

            if (action === "accept") {

                showMessage(
                    "Connection accepted successfully."
                );

            } else {

                showMessage(
                    "Connection request rejected."
                );
            }


            // Reload both sections

            await loadRequests();

            await loadConnections();


        } catch (error) {

            console.error(
                "Connection action error:",
                error
            );


            // Re-enable buttons

            acceptButton.disabled = false;
            rejectButton.disabled = false;

            acceptButton.textContent = "Accept";
            rejectButton.textContent = "Reject";


            showMessage(
                error.message ||
                "Something went wrong."
            );


            handleAuthError(error);
        }
    }


    // =========================
    // LOAD ACCEPTED CONNECTIONS
    // =========================

    async function loadConnections() {

        try {

            connectionsList.innerHTML = `
                <div class="connections-loading">
                    Loading connections...
                </div>
            `;


            const data = await apiRequest(
                "/api/connections"
            );


            /*
                Backend returns:

                {
                    "connections": [
                        {
                            "user_id": 3,
                            "full_name": "Sayandeep",
                            "connection_id": 1
                        }
                    ]
                }
            */

            const connections =
                data.connections || [];


            console.log(
                "Accepted connections:",
                connections
            );


            // =========================
            // NO CONNECTIONS
            // =========================

            if (connections.length === 0) {

                connectionsList.innerHTML = `
                    <div class="connections-empty">

                        <div class="connections-empty-icon">
                            ◉
                        </div>

                        <h3>
                            No connections yet
                        </h3>

                        <p>
                            Visit the Users page
                            to connect with people.
                        </p>

                    </div>
                `;

                return;
            }


            connectionsList.innerHTML = "";


            // =========================
            // CREATE CONNECTION CARDS
            // =========================

            connections.forEach(function (connection) {

                const item = document.createElement("div");

                item.className = "connection-item";


                const userName =
                    connection.full_name || "Unknown User";


                const firstLetter =
                    userName.charAt(0).toUpperCase();


                item.innerHTML = `

                    <div class="connection-user">

                        <div class="connection-avatar">
                            ${escapeHtml(firstLetter)}
                        </div>


                        <div class="connection-user-info">

                            <p class="connection-user-name">
                                ${escapeHtml(userName)}
                            </p>

                            <p class="connection-user-meta">
                                User ID: ${connection.user_id}
                            </p>

                        </div>

                    </div>


                    <div class="connection-actions">

                        <span class="connected-status">
                            Connected
                        </span>

                    </div>

                `;


                connectionsList.appendChild(item);

            });


        } catch (error) {

            console.error(
                "Connections error:",
                error
            );


            connectionsList.innerHTML = `
                <div class="connections-empty">

                    <h3>
                        Failed to load connections
                    </h3>

                    <p>
                        ${escapeHtml(
                            error.message ||
                            "Something went wrong."
                        )}
                    </p>

                </div>
            `;


            handleAuthError(error);
        }
    }


    // =========================
    // INITIAL PAGE LOAD
    // =========================

    await loadProfile();

    await loadRequests();

    await loadConnections();

});