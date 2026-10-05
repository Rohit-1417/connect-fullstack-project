document.addEventListener("DOMContentLoaded", async function () {

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const usersList =
        document.getElementById("usersList");

    const usersMessage =
        document.getElementById("usersMessage");


    // =========================
    // LOGOUT
    // =========================

    window.logout = function () {

        localStorage.removeItem("access_token");

        window.location.href = "login.html";
    };


    // =========================
    // AUTH ERROR
    // =========================

    function handleAuthError(error) {

        const message =
            error?.message?.toLowerCase() || "";

        if (
            message.includes("token") ||
            message.includes("invalid") ||
            message.includes("expired") ||
            message.includes("unauthorized")
        ) {

            localStorage.removeItem(
                "access_token"
            );

            window.location.href =
                "login.html";
        }
    }


    // =========================
    // HTML SAFETY
    // =========================

    function escapeHtml(value) {

        const div =
            document.createElement("div");

        div.textContent =
            value ?? "";

        return div.innerHTML;
    }


    // =========================
    // SHOW MESSAGE
    // =========================

    function showMessage(message) {

        if (!usersMessage) {
            return;
        }

        usersMessage.textContent =
            message;

        usersMessage.classList.add(
            "show"
        );

        setTimeout(function () {

            usersMessage.classList.remove(
                "show"
            );

        }, 3000);
    }


    // =========================
    // LOAD PROFILE
    // =========================

    try {

        const profile =
            await apiRequest("/api/profile");


        const userName =
            document.getElementById("userName");

        const userRole =
            document.getElementById("userRole");

        const userAvatar =
            document.getElementById("userAvatar");


        if (userName) {

            userName.textContent =
                profile.full_name;
        }


        if (userRole) {

            userRole.textContent =
                profile.role || "User";
        }


        if (userAvatar) {

            userAvatar.textContent =
                profile.full_name
                    .charAt(0)
                    .toUpperCase();
        }


    } catch (error) {

        console.error(
            "Profile error:",
            error
        );

        handleAuthError(error);

        return;
    }


    // =========================
    // LOAD USERS
    // =========================

    async function loadUsers() {

        try {

            usersList.innerHTML = `
                <div class="users-loading">
                    Loading users...
                </div>
            `;


            // -------------------------
            // GET USERS
            // -------------------------

            const userData =
                await apiRequest("/api/users");


            const users =
                Array.isArray(userData)
                    ? userData
                    : (userData.users || []);


            // -------------------------
            // GET ACCEPTED CONNECTIONS
            // -------------------------

            const connectionData =
                await apiRequest(
                    "/api/connections"
                );


            const connections =
                connectionData.connections || [];


            // -------------------------
            // STORE CONNECTED USER IDS
            // -------------------------

            const connectedUserIds =
                new Set();


            connections.forEach(
                function (connection) {

                    connectedUserIds.add(
                        Number(connection.user_id)
                    );

                }
            );


            console.log(
                "Connected users:",
                connectedUserIds
            );


            // -------------------------
            // NO USERS
            // -------------------------

            if (users.length === 0) {

                usersList.innerHTML = `
                    <div class="users-empty">

                        <h3>
                            No other users found
                        </h3>

                        <p>
                            There are currently no
                            other registered users
                            available to connect with.
                        </p>

                    </div>
                `;

                return;
            }


            // -------------------------
            // CLEAR LIST
            // -------------------------

            usersList.innerHTML = "";


            // -------------------------
            // CREATE USER CARDS
            // -------------------------

            users.forEach(
                function (user) {

                    const userItem =
                        document.createElement(
                            "div"
                        );


                    userItem.className =
                        "user-item";


                    const firstLetter =
                        user.full_name
                            ? user.full_name
                                .charAt(0)
                                .toUpperCase()
                            : "U";


                    // -------------------------
                    // CHECK CONNECTION
                    // -------------------------

                    const isConnected =
                        connectedUserIds.has(
                            Number(user.id)
                        );


                    // -------------------------
                    // BUTTON
                    // -------------------------

                    let buttonHtml;


                    if (isConnected) {

                        buttonHtml = `
                            <button
                                class="connect-button connected"
                                disabled
                            >
                                Connected
                            </button>
                        `;

                    } else {

                        buttonHtml = `
                            <button
                                class="connect-button"
                                data-user-id="${user.id}"
                            >
                                Connect
                            </button>
                        `;
                    }


                    // -------------------------
                    // USER CARD
                    // -------------------------

                    userItem.innerHTML = `

                        <div class="user-details">

                            <div class="user-avatar-large">
                                ${escapeHtml(
                                    firstLetter
                                )}
                            </div>

                            <div class="user-text">

                                <p class="user-name">
                                    ${escapeHtml(
                                        user.full_name
                                    )}
                                </p>

                                <p class="user-email">
                                    User ID: ${user.id}
                                </p>

                            </div>

                        </div>

                        ${buttonHtml}

                    `;


                    // -------------------------
                    // CONNECT BUTTON
                    // -------------------------

                    const connectButton =
                        userItem.querySelector(
                            ".connect-button"
                        );


                    if (
                        connectButton &&
                        !isConnected
                    ) {

                        connectButton.addEventListener(
                            "click",
                            function () {

                                sendConnectionRequest(
                                    user.id,
                                    connectButton
                                );

                            }
                        );
                    }


                    usersList.appendChild(
                        userItem
                    );

                }
            );


        } catch (error) {

            console.error(
                "Users loading error:",
                error
            );


            usersList.innerHTML = `
                <div class="users-empty">

                    <h3>
                        Failed to load users
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
    // SEND CONNECTION REQUEST
    // =========================

    async function sendConnectionRequest(
        userId,
        button
    ) {

        try {

            button.disabled = true;

            button.textContent =
                "Sending...";


            await apiRequest(
                "/api/connect",
                {
                    method: "POST",

                    body: JSON.stringify({
                        receiver_id: userId
                    })
                }
            );


            button.textContent =
                "Request Sent";


            button.classList.add(
                "pending"
            );


            showMessage(
                "Connection request sent successfully."
            );


        } catch (error) {

            console.error(
                "Connection request error:",
                error
            );


            button.disabled = false;

            button.textContent =
                "Connect";


            showMessage(
                error.message ||
                "Failed to send connection request."
            );


            handleAuthError(error);
        }
    }


    // =========================
    // INITIAL LOAD
    // =========================

    await loadUsers();

});