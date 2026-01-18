const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const groupNumberInput = document.getElementById("group-number");
const errorMsg = document.getElementById("error");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";

    const email = emailInput.value;
    const password = passInput.value;
    const groupNumber = groupNumberInput.value ? parseInt(groupNumberInput.value) : null;
    
    const res = await attemptLogin(email, password, groupNumber);
    if (res.success) {
        localStorage.setItem("authToken", res.token);
        window.location.href = "index.html";
    }
    else {
        errorMsg.style.whiteSpace = "pre-wrap";
        errorMsg.textContent = (res.error) ? `Ошибка: ${res.error}` : "Неизвестная ошибка";
    }
});

if (localStorage.getItem("authToken"))
    window.location.href = "index.html";