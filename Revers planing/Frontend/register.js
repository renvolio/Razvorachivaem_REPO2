const form = document.getElementById("registerForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passInput = document.getElementById("password");
const confirmPassInput = document.getElementById("confirm-password");
const roleSelect = document.getElementById("role");
const positionGroup = document.getElementById("position-group");
const positionInput = document.getElementById("position");
const groupNumberGroup = document.getElementById("group-number-group");
const groupNumberInput = document.getElementById("group-number");
const errorMsg = document.getElementById("error");
const API_BASE = 'http://localhost:5228/api'; 

if (localStorage.getItem("authToken")) 
    window.location.href = "index.html";

roleSelect.addEventListener('change', () => {
    const isTeacher = roleSelect.value === 'teacher';
    const isStudent = roleSelect.value === 'student';
    
    // Показываем/скрываем поля в зависимости от роли
    positionGroup.style.display = isTeacher ? 'block' : 'none';
    groupNumberGroup.style.display = isStudent ? 'block' : 'none';
    
    // Делаем поля обязательными/необязательными
    positionInput.required = isTeacher;
    groupNumberInput.required = isStudent;
    
    // Очищаем значения при смене роли
    if (!isTeacher) positionInput.value = '';
    if (!isStudent) groupNumberInput.value = '';
});

async function attemptRegister(userData) {
    try {
        const response = await fetch(`${API_BASE}/Auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            return true;
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Ошибка сервера' }));
            if (errorData.errors && Object.values(errorData.errors).length > 0) {
                 errorMsg.textContent = "Ошибка регистрации: " + Object.values(errorData.errors).flat().join('; ');
            } else {
                 const errorText = await response.text();
                 if (errorText.includes('емаил')) {
                     errorMsg.textContent = "Ошибка: такой Email уже занят.";
                 } else if (errorText.includes('групп')) {
                     errorMsg.textContent = "Ошибка: студент должен указать номер группы.";
                 } else {
                     errorMsg.textContent = "Ошибка регистрации: " + (errorData.message || 'Неизвестная ошибка.');
                 }
            }
            return false;
        }
    } catch (error) {
        errorMsg.textContent = "Ошибка сети. Проверьте адрес API.";
        return false;
    }
}


form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";

    const password = passInput.value;
    const confirmPassword = confirmPassInput.value;
    const role = roleSelect.value;
    const isTeacher = role === 'teacher';
    
    if (password !== confirmPassword) {
        errorMsg.textContent = "Пароли не совпадают.";
        return;
    }
    
    const userData = {
        name: nameInput.value,
        email: emailInput.value,
        password: password,
        isTeacher: isTeacher,
        position: isTeacher ? positionInput.value : null,
        groupNumber: !isTeacher && groupNumberInput.value ? parseInt(groupNumberInput.value) : null
    };

    const success = await attemptRegister(userData);
    
    if (success) {
        alert("Регистрация прошла успешно! Вы будете перенаправлены на страницу входа.");
        window.location.href = "login.html";
    }
});