document.addEventListener("DOMContentLoaded", async function () {

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {

        // =========================================
        // VERIFY ADMIN
        // =========================================

        const profile = await apiRequest("/api/profile");

        if (profile.role !== "admin") {
            alert("Admin access required.");
            window.location.href = "dashboard.html";
            return;
        }


        // =========================================
        // ADMIN PROFILE
        // =========================================

        const adminName = document.getElementById("adminName");
        const adminAvatar = document.getElementById("adminAvatar");

        if (adminName) {
            adminName.textContent = profile.full_name;
        }

        if (adminAvatar) {
            adminAvatar.textContent =
                profile.full_name.charAt(0).toUpperCase();
        }


        // =========================================
        // LOAD ALL ADMIN DATA
        // =========================================

        const [
            usersData,
            subscriptionsData,
            walletsData,
            documentsData,
            connectionsData,
            callsData,
            usageData
        ] = await Promise.all([

            apiRequest("/api/admin/users"),

            apiRequest("/api/admin/subscriptions"),

            apiRequest("/api/admin/wallets"),

            apiRequest("/api/admin/documents"),

            apiRequest("/api/admin/connections"),

            apiRequest("/api/admin/calls"),

            apiRequest("/api/admin/usage")

        ]);


        // =========================================
        // OVERVIEW
        // =========================================

        const users =
            usersData.users || [];

        const subscriptions =
            subscriptionsData.subscriptions || [];

        const wallets =
            walletsData.wallets || [];

        const documents =
            documentsData.documents || [];

        const connections =
            connectionsData.connections || [];

        const calls =
            callsData.calls || [];

        const usage =
            usageData.usage || [];


        const totalWalletBalance = wallets.reduce(
            (total, wallet) =>
                total + Number(wallet.balance || 0),
            0
        );


        document.getElementById("totalUsers").textContent =
            usersData.total_users ?? users.length;

        document.getElementById("totalSubscriptions").textContent =
            subscriptions.length;

        document.getElementById("totalWalletBalance").textContent =
            totalWalletBalance;

        document.getElementById("totalDocuments").textContent =
            documents.length;

        document.getElementById("totalConnections").textContent =
            connections.length;

        document.getElementById("totalCalls").textContent =
            calls.length;

        document.getElementById("totalAIQuestions").textContent =
            usageData.total_questions ?? usage.length;


        // =========================================
        // USERS TABLE
        // =========================================

        const usersTable =
            document.getElementById("usersTableBody");

        usersTable.innerHTML = "";

        if (users.length === 0) {

            usersTable.innerHTML = `
                <tr>
                    <td colspan="5">
                        No users found.
                    </td>
                </tr>
            `;

        } else {

            users.forEach(user => {

                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${escapeHTML(user.full_name)}</td>

                    <td>${escapeHTML(user.email)}</td>

                    <td>
                        <span class="admin-status ${user.role}">
                            ${escapeHTML(user.role)}
                        </span>
                    </td>

                    <td>
                        <span class="admin-status ${
                            user.is_verified
                                ? "verified"
                                : "pending"
                        }">
                            ${
                                user.is_verified
                                    ? "Verified"
                                    : "Unverified"
                            }
                        </span>
                    </td>

                    <td>
                        ${formatDate(user.created_at)}
                    </td>
                `;

                usersTable.appendChild(row);

            });

        }


        // =========================================
        // SUBSCRIPTIONS TABLE
        // =========================================

        const subscriptionsTable =
            document.getElementById(
                "subscriptionsTableBody"
            );

        subscriptionsTable.innerHTML = "";

        if (subscriptions.length === 0) {

            subscriptionsTable.innerHTML = `
                <tr>
                    <td colspan="5">
                        No subscriptions found.
                    </td>
                </tr>
            `;

        } else {

            subscriptions.forEach(subscription => {

                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>
                        ${escapeHTML(subscription.user_name)}
                    </td>

                    <td>
                        ${escapeHTML(subscription.plan_name)}
                    </td>

                    <td>
                        ${subscription.credits}
                    </td>

                    <td>
                        ₹${subscription.amount}
                    </td>

                    <td>
                        <span class="admin-status ${
                            subscription.status
                        }">
                            ${escapeHTML(subscription.status)}
                        </span>
                    </td>
                `;

                subscriptionsTable.appendChild(row);

            });

        }


        // =========================================
        // WALLETS TABLE
        // =========================================

        const walletsTable =
            document.getElementById(
                "walletsTableBody"
            );

        walletsTable.innerHTML = "";

        if (wallets.length === 0) {

            walletsTable.innerHTML = `
                <tr>
                    <td colspan="3">
                        No wallets found.
                    </td>
                </tr>
            `;

        } else {

            wallets.forEach(wallet => {

                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>
                        ${escapeHTML(wallet.user_name)}
                    </td>

                    <td>
                        ${escapeHTML(wallet.email)}
                    </td>

                    <td>
                        <strong>
                            ${wallet.balance}
                        </strong>
                    </td>
                `;

                walletsTable.appendChild(row);

            });

        }


        // =========================================
        // DOCUMENTS TABLE
        // =========================================

        const documentsTable =
            document.getElementById(
                "documentsTableBody"
            );

        documentsTable.innerHTML = "";

        if (documents.length === 0) {

            documentsTable.innerHTML = `
                <tr>
                    <td colspan="4">
                        No documents found.
                    </td>
                </tr>
            `;

        } else {

            documents.forEach(documentItem => {

                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>
                        ${escapeHTML(documentItem.file_name)}
                    </td>

                    <td>
                        ${escapeHTML(documentItem.user_name)}
                    </td>

                    <td>
                        ${documentItem.user_id}
                    </td>

                    <td>
                        ${formatDate(documentItem.created_at)}
                    </td>
                `;

                documentsTable.appendChild(row);

            });

        }


        // =========================================
        // CONNECTIONS TABLE
        // =========================================

        const connectionsTable =
            document.getElementById(
                "connectionsTableBody"
            );

        connectionsTable.innerHTML = "";

        if (connections.length === 0) {

            connectionsTable.innerHTML = `
                <tr>
                    <td colspan="4">
                        No connections found.
                    </td>
                </tr>
            `;

        } else {

            connections.forEach(connection => {

                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>
                        ${escapeHTML(connection.sender_name)}
                    </td>

                    <td>
                        ${escapeHTML(connection.receiver_name)}
                    </td>

                    <td>
                        <span class="admin-status ${
                            connection.status
                        }">
                            ${escapeHTML(connection.status)}
                        </span>
                    </td>

                    <td>
                        ${formatDate(connection.created_at)}
                    </td>
                `;

                connectionsTable.appendChild(row);

            });

        }


        // =========================================
        // CALL HISTORY TABLE
        // =========================================

        const callsTable =
            document.getElementById(
                "callsTableBody"
            );

        callsTable.innerHTML = "";

        if (calls.length === 0) {

            callsTable.innerHTML = `
                <tr>
                    <td colspan="4">
                        No calls found.
                    </td>
                </tr>
            `;

        } else {

            calls.forEach(call => {

                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>
                        ${escapeHTML(call.caller_name)}
                    </td>

                    <td>
                        ${escapeHTML(call.receiver_name)}
                    </td>

                    <td>
                        ${formatDate(call.started_at)}
                    </td>

                    <td>
                        ${formatDuration(call.duration)}
                    </td>
                `;

                callsTable.appendChild(row);

            });

        }


        // =========================================
        // AI USAGE TABLE
        // =========================================

        const aiUsageTable =
            document.getElementById(
                "aiUsageTableBody"
            );

        aiUsageTable.innerHTML = "";

        if (usage.length === 0) {

            aiUsageTable.innerHTML = `
                <tr>
                    <td colspan="4">
                        No AI usage found.
                    </td>
                </tr>
            `;

        } else {

            usage.forEach(item => {

                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>
                        ${escapeHTML(item.user_name)}
                    </td>

                    <td>
                        ${escapeHTML(item.document_name)}
                    </td>

                    <td>
                        ${escapeHTML(item.question)}
                    </td>

                    <td>
                        ${formatDate(item.created_at)}
                    </td>
                `;

                aiUsageTable.appendChild(row);

            });

        }


    } catch (error) {

        console.error(
            "Admin dashboard error:",
            error
        );

        if (
            error.message.includes("Admin access") ||
            error.message.includes("403")
        ) {

            alert("Admin access required.");

            window.location.href =
                "dashboard.html";

            return;
        }

        if (
            error.message.includes("token") ||
            error.message.includes("Invalid") ||
            error.message.includes("expired")
        ) {

            localStorage.removeItem(
                "access_token"
            );

            window.location.href =
                "login.html";

            return;
        }

        showAdminMessage(
            "Failed to load admin dashboard."
        );

    }

});


// =========================================================
// LOGOUT
// =========================================================

function logout() {

    localStorage.removeItem(
        "access_token"
    );

    window.location.href =
        "login.html";
}


// =========================================================
// DATE FORMATTER
// =========================================================

function formatDate(dateString) {

    if (!dateString) {
        return "—";
    }

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


// =========================================================
// CALL DURATION
// =========================================================

function formatDuration(seconds) {

    if (
        seconds === null ||
        seconds === undefined
    ) {
        return "—";
    }

    seconds = Number(seconds);

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        seconds % 60;

    if (minutes === 0) {
        return `${remainingSeconds}s`;
    }

    return `${minutes}m ${remainingSeconds}s`;
}


// =========================================================
// HTML SAFETY
// =========================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =========================================================
// ADMIN MESSAGE
// =========================================================

function showAdminMessage(message) {

    const element =
        document.getElementById(
            "adminMessage"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.classList.add("show");

    setTimeout(() => {

        element.classList.remove(
            "show"
        );

    }, 3000);
}