document.addEventListener("DOMContentLoaded", function () {

    const otpForm = document.getElementById("otpForm");
    const otpInput = document.getElementById("otp");

    const verifyBtn = document.getElementById("verifyBtn");
    const resendBtn = document.getElementById("resendBtn");

    const otpMessage = document.getElementById("otpMessage");
    const userEmail = document.getElementById("userEmail");

    const email = localStorage.getItem("otp_email");


    // ================= CHECK EMAIL =================

    if (!email) {
        window.location.href = "register.html";
        return;
    }

    userEmail.textContent = email;


    // ================= OTP INPUT =================

    otpInput.addEventListener("input", function () {

        this.value = this.value
            .replace(/\D/g, "")
            .slice(0, 6);

    });


    // ================= VERIFY OTP =================

    otpForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        otpMessage.textContent = "";

        const otp = otpInput.value.trim();

        if (otp.length !== 6) {
            otpMessage.textContent =
                "Please enter the 6-digit OTP.";
            return;
        }


        verifyBtn.disabled = true;
        verifyBtn.textContent = "Verifying...";


        try {

            await apiRequest("/api/verify-otp", {
                method: "POST",
                body: JSON.stringify({
                    email: email,
                    otp: otp
                })
            });


            // Registration verification completed
            localStorage.removeItem("otp_email");

            alert("Email verified successfully!");

            window.location.href = "login.html";


        } catch (error) {

            otpMessage.textContent =
                error.message || "Invalid or expired OTP.";

            verifyBtn.disabled = false;
            verifyBtn.textContent = "Verify Email";

        }

    });


    // ================= RESEND OTP =================

    resendBtn.addEventListener("click", async function () {

        otpMessage.textContent = "";

        resendBtn.disabled = true;
        resendBtn.textContent = "Sending...";


        try {

            await apiRequest("/api/resend-otp", {
                method: "POST",
                body: JSON.stringify({
                    email: email
                })
            });


            otpMessage.style.color = "#4ade80";
            otpMessage.textContent =
                "A new OTP has been sent to your email.";


        } catch (error) {

            otpMessage.style.color = "#f87171";
            otpMessage.textContent =
                error.message || "Failed to resend OTP.";

        }


        resendBtn.disabled = false;
        resendBtn.textContent = "Resend OTP";

    });

});