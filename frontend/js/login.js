const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    errorMessage.textContent = "";

    try {

        const data = await apiRequest("/api/login", {
            method: "POST",
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        // Save JWT token
        localStorage.setItem("access_token", data.access_token);

        // Go to dashboard
        const profile = await apiRequest("/api/profile");

            if (profile.role === "admin") {
            window.location.href = "admin.html";
        } else {
                window.location.href = "dashboard.html";
        }

    } catch (error) {

        errorMessage.textContent = error.message;

    }

});