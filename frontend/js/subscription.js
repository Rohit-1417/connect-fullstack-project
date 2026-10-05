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
        // LOAD USER PROFILE
        // =========================

        const profile = await apiRequest("/api/profile");

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
        // LOAD CURRENT SUBSCRIPTION
        // =========================

        const currentSubscription =
            await apiRequest("/api/subscription");


        // =========================
        // LOAD WALLET
        // =========================

        const wallet =
            await apiRequest("/api/wallet");


        // =========================
        // CURRENT PLAN ELEMENTS
        // =========================

        const currentPlanName =
            document.getElementById("currentPlanName");

        const currentPlanStatus =
            document.getElementById("currentPlanStatus");

        const currentPlanCredits =
            document.getElementById("currentPlanCredits");


        // =========================
        // DISPLAY CURRENT PLAN
        // =========================

        if (currentSubscription.active) {

            currentPlanName.textContent =
                currentSubscription.plan_name;

            currentPlanStatus.textContent =
                "Active subscription";

            // IMPORTANT:
            // Show actual available wallet credits,
            // NOT the original plan credits.

            currentPlanCredits.textContent =
                wallet.balance;

        } else {

            currentPlanName.textContent =
                "No active plan";

            currentPlanStatus.textContent =
                "Choose a plan below to get started.";

            currentPlanCredits.textContent =
                "—";
        }


        // =========================
        // LOAD AVAILABLE PLANS
        // =========================

        const planData =
            await apiRequest("/api/subscriptions");


        const plansContainer =
            document.getElementById("plansContainer");


        plansContainer.innerHTML = "";


        // =========================
        // CREATE PLAN CARDS
        // =========================

        planData.plans.forEach(function (plan) {

            const planCard =
                document.createElement("div");

            planCard.className =
                "plan-card";


            // Check whether this is
            // the user's current plan.

            const isActive =
                currentSubscription.active &&
                currentSubscription.plan_name === plan.name;


            if (isActive) {
                planCard.classList.add(
                    "active-plan"
                );
            }


            // =========================
            // PLAN FEATURES
            // =========================

            const features = [
                `${plan.credits} AI credits`,
                "PDF document analysis",
                "AI-powered questions",
                "Secure user workspace"
            ];


            const featuresHTML =
                features.map(function (feature) {

                    return `
                        <li>
                            ${feature}
                        </li>
                    `;

                }).join("");


            // =========================
            // BUTTON
            // =========================

            const buttonText =
                isActive
                    ? "Current Plan"
                    : "Subscribe";


            const disabledAttribute =
                isActive
                    ? "disabled"
                    : "";


            // =========================
            // PLAN CARD
            // =========================

            planCard.innerHTML = `

                <div class="plan-header">

                    <div class="plan-name">
                        ${plan.name}
                    </div>

                    ${
                        isActive
                            ? `
                                <div class="plan-badge">
                                    Active
                                </div>
                              `
                            : ""
                    }

                </div>


                <div class="plan-price">

                    <strong>
                        ₹${plan.amount}
                    </strong>

                    <span>
                        / plan
                    </span>

                </div>


                <div class="plan-credit-text">

                    Includes

                    <strong>
                        ${plan.credits} credits
                    </strong>

                </div>


                <ul class="plan-features">

                    ${featuresHTML}

                </ul>


                <button
                    class="subscribe-btn"
                    data-plan="${plan.name}"
                    ${disabledAttribute}
                >
                    ${buttonText}
                </button>

            `;


            plansContainer.appendChild(
                planCard
            );

        });


        // =========================
        // SUBSCRIBE BUTTONS
        // =========================

        const subscribeButtons =
            document.querySelectorAll(
                ".subscribe-btn"
            );


        subscribeButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const planName =
                            button.dataset.plan;

                        subscribeToPlan(
                            planName,
                            button
                        );

                    }
                );

            }
        );


    } catch (error) {

        console.error(
            "Subscription page error:",
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
   SUBSCRIBE TO PLAN
========================= */

async function subscribeToPlan(
    planName,
    button
) {

    try {

        // Disable button while
        // request is processing.

        button.disabled = true;

        button.textContent =
            "Processing...";


        // =========================
        // SEND SUBSCRIPTION REQUEST
        // =========================

        const response =
            await apiRequest(
                "/api/subscribe",
                {
                    method: "POST",

                    body: JSON.stringify({
                        plan_name: planName
                    })
                }
            );


        // =========================
        // SHOW SUCCESS MESSAGE
        // =========================

        showSubscriptionMessage(
            response.message ||
            "Subscription activated successfully."
        );


        // =========================
        // RELOAD PAGE
        // =========================

        setTimeout(
            function () {

                window.location.reload();

            },
            800
        );


    } catch (error) {

        console.error(
            "Subscription error:",
            error
        );


        // =========================
        // SHOW ERROR
        // =========================

        showSubscriptionMessage(
            error.message
        );


        // Restore button

        button.disabled = false;

        button.textContent =
            "Subscribe";
    }

}



/* =========================
   SHOW MESSAGE
========================= */

function showSubscriptionMessage(
    message
) {

    const messageElement =
        document.getElementById(
            "subscriptionMessage"
        );


    if (!messageElement) {
        return;
    }


    messageElement.textContent =
        message;


    messageElement.classList.add(
        "show"
    );


    setTimeout(
        function () {

            messageElement.classList.remove(
                "show"
            );

        },
        4000
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