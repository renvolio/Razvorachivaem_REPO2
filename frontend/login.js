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
    
    const authToken = await attemptLogin(email, password, groupNumber);
    if (authToken) {
        localStorage.setItem("authToken", authToken);
        window.location.href = "index.html";
    }
    else errorMsg.textContent = "Неверный email и/или пароль. Для студентов укажите номер группы.";
});

if (localStorage.getItem("authToken"))
    window.location.href = "index.html";