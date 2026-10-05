document.addEventListener("DOMContentLoaded", function () {

    const registerForm = document.getElementById("registerForm");
    const registerBtn = document.getElementById("registerBtn");
    const registerMessage = document.getElementById("registerMessage");

    registerForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        registerMessage.textContent = "";

        const fullName = document.getElementById("fullName").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;


        // ================= VALIDATION =================

        if (!fullName || !email || !password || !confirmPassword) {
            registerMessage.textContent = "Please fill in all fields.";
            return;
        }

        if (password !== confirmPassword) {
            registerMessage.textContent = "Passwords do not match.";
            return;
        }


        // ================= LOADING =================

        registerBtn.disabled = true;
        registerBtn.textContent = "Creating account...";


        try {

            const response = await apiRequest("/api/registration", {
                method: "POST",
                body: JSON.stringify({
                    full_name: fullName,
                    email: email,
                    password: password
                })
            });


            // Save email for OTP page
            localStorage.setItem("otp_email", email);


            // Go to OTP verification
            window.location.href = "verify-otp.html";


        } catch (error) {

            registerMessage.textContent =
                error.message || "Registration failed.";

            registerBtn.disabled = false;
            registerBtn.textContent = "Create Account";
        }

    });

});