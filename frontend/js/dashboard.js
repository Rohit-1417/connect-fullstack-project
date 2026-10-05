document.addEventListener("DOMContentLoaded", async function () {

    const token = localStorage.getItem("access_token");

    // No token = user is not logged in
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {

        // =========================
        // USER PROFILE
        // =========================

        const profile = await apiRequest("/api/profile");

        const userName = document.getElementById("userName");
        const welcomeName = document.getElementById("welcomeName");
        const userAvatar = document.getElementById("userAvatar");
        const userRole = document.getElementById("userRole");

        if (userName) {
            userName.textContent = profile.full_name;
        }

        if (welcomeName) {
            welcomeName.textContent = profile.full_name;
        }

        // First letter of name for avatar
        if (userAvatar) {
            userAvatar.textContent = profile.full_name
                .charAt(0)
                .toUpperCase();
        }

        // User role
        if (userRole) {
            userRole.textContent = profile.role || "User";
        }


        // =========================
        // WALLET
        // =========================

        const wallet = await apiRequest("/api/wallet");

        const walletBalance =
            document.getElementById("walletBalance");

        if (walletBalance) {
            walletBalance.textContent = wallet.balance;
        }

        // Wallet balance in the lower wallet card
        const walletBalanceBottom =
            document.getElementById("walletBalanceBottom");

        if (walletBalanceBottom) {
            walletBalanceBottom.textContent = wallet.balance;
        }


        // =========================
        // CONNECTIONS
        // =========================

        const connections =
            await apiRequest("/api/connections");

        const connectionCount =
            document.getElementById("connectionCount");

        if (connectionCount) {
            connectionCount.textContent =
                connections.connections.length;
        }


        // =========================
        // CALL HISTORY
        // =========================

        const calls =
            await apiRequest("/api/calls/history");

        const callCount =
            document.getElementById("callCount");

        if (callCount) {
            callCount.textContent =
                calls.calls.length;
        }


        // =========================
        // AI DOCUMENTS
        // =========================

        const documents =
            await apiRequest("/api/documents");

        const documentCount =
            document.getElementById("documentCount");

        if (documentCount) {
            documentCount.textContent =
                documents.documents.length;
        }


        // =========================
        // CURRENT SUBSCRIPTION
        // =========================

        const subscription =
            await apiRequest("/api/subscription");

        const subscriptionPlan =
            document.getElementById("subscriptionPlan");

        const subscriptionStatus =
            document.getElementById("subscriptionStatus");

        const subscriptionCredits =
            document.getElementById("subscriptionCredits");


        if (subscription.active) {

            if (subscriptionPlan) {
                subscriptionPlan.textContent =
                    subscription.plan_name;
            }

            if (subscriptionStatus) {
                subscriptionStatus.textContent =
                    "Active subscription";
            }

            if (subscriptionCredits) {
                subscriptionCredits.textContent =
                    subscription.credits;
            }

        } else {

            if (subscriptionPlan) {
                subscriptionPlan.textContent =
                    "No active plan";
            }

            if (subscriptionStatus) {
                subscriptionStatus.textContent =
                    "Choose a plan to get started";
            }

            if (subscriptionCredits) {
                subscriptionCredits.textContent =
                    "—";
            }
        }


    } catch (error) {

        console.error("Dashboard error:", error);

        // If token becomes invalid/expired
        if (
            error.message.includes("token") ||
            error.message.includes("Invalid") ||
            error.message.includes("expired")
        ) {
            localStorage.removeItem("access_token");
            window.location.href = "login.html";
        }
    }
});


/* =========================
   LOGOUT
========================= */

function logout() {

    localStorage.removeItem("access_token");

    window.location.href = "login.html";
}