document.addEventListener("DOMContentLoaded", async function () {

    // =========================
    // CHECK LOGIN
    // =========================

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }


    try {

        // =========================
        // LOAD PROFILE
        // =========================

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


        // =========================
        // LOAD WALLET
        // =========================

        const wallet =
            await apiRequest("/api/wallet");


        const walletBalance =
            document.getElementById(
                "walletBalance"
            );


        if (walletBalance) {

            walletBalance.textContent =
                wallet.balance;

        }


        // =========================
        // LOAD TRANSACTIONS
        // =========================

        const transactionData =
            await apiRequest(
                "/api/wallet/transactions"
            );


        const transactionsList =
            document.getElementById(
                "transactionsList"
            );


        transactionsList.innerHTML = "";


        // =========================
        // CHECK TRANSACTIONS
        // =========================

        if (
            !transactionData.transactions ||
            transactionData.transactions.length === 0
        ) {

            transactionsList.innerHTML = `
                <div class="empty-message">
                    No transactions yet.
                </div>
            `;

            return;
        }


        // =========================
        // DISPLAY TRANSACTIONS
        // =========================

        transactionData.transactions.forEach(
            function (transaction) {

                const item =
                    document.createElement("div");


                item.className =
                    "transaction-item";


                // =========================
                // TRANSACTION TYPE
                // =========================

                const isCredit =
                    transaction.transaction_type
                        ?.toLowerCase()
                        .includes("credit");


                const amountClass =
                    isCredit
                        ? "credit"
                        : "debit";


                const amountSymbol =
                    isCredit
                        ? "+"
                        : "-";


                // =========================
                // DATE
                // =========================

                const formattedDate =
                    formatTransactionDate(
                        transaction.created_at
                    );


                // =========================
                // DESCRIPTION
                // =========================

                const description =
                    transaction.description ||
                    "Wallet transaction";


                // =========================
                // HTML
                // =========================

                item.innerHTML = `

                    <div class="transaction-left">

                        <div class="transaction-icon">

                            ${isCredit ? "+" : "−"}

                        </div>


                        <div class="transaction-info">

                            <p class="transaction-description">
                                ${description}
                            </p>

                            <div class="transaction-date">
                                ${formattedDate}
                            </div>

                        </div>

                    </div>


                    <div class="transaction-right">

                        <div class="transaction-amount ${amountClass}">

                            ${amountSymbol}
                            ${transaction.amount}

                            credits

                        </div>


                        <div class="transaction-type">

                            ${transaction.transaction_type}

                        </div>

                    </div>

                `;


                transactionsList.appendChild(
                    item
                );

            }
        );


    } catch (error) {

        console.error(
            "Wallet page error:",
            error
        );


        // =========================
        // INVALID TOKEN
        // =========================

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

        }

    }

});



/* =========================
   FORMAT DATE
========================= */

function formatTransactionDate(
    dateString
) {

    if (!dateString) {
        return "Unknown date";
    }


    const date =
        new Date(dateString);


    if (isNaN(date.getTime())) {
        return dateString;
    }


    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",

            hour: "2-digit",
            minute: "2-digit",

            hour12: true
        }
    );

}



/* =========================
   LOGOUT
========================= */

function logout() {

    localStorage.removeItem(
        "access_token"
    );

    window.location.href =
        "login.html";
}