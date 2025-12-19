const API_BASE = "/api";

async function attemptLogin(email, pwd, groupNumber = null) {
    try {
        const requestBody = {
            email: email,
            password: pwd
        };
        
        // Добавляем groupNumber только если оно указано
        if (groupNumber !== null && groupNumber !== undefined) {
            requestBody.groupNumber = groupNumber;
        }
        
        const response = await fetch(`${API_BASE_URL}/Auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.token;
        }
        else {
            // Пытаемся получить текст ошибки для более информативного сообщения
            const errorText = await response.text().catch(() => '');
            console.error("Login error:", response.status, errorText);
            return null;
        }
    }
    catch (error) {
        console.error("Authorization error: ", error);
        return null;
    }
}

function decodeJWT(token) {
    try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(atob(base64).split("").map((c) => {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(""));
        const claims = JSON.parse(jsonPayload);

        // В JWT бэкенда нет поля "name", используем email
        // Роли: "Student" или "Teacher" (английские)
        // В ASP.NET Core роль может быть в разных форматах
        const role = claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] 
                  || claims["role"] 
                  || claims.role 
                  || "Unknown";
        
        return {
            id: claims.userId,
            email: claims.email,
            role: role,
            name: claims.email // Используем email, так как name нет в JWT
        };
    }
    catch (error) {
        console.error("Cannot decode JWT: ", error);
        return null;
    }
}

function getCurUser() {
    const token = localStorage.getItem("authToken");
    if (token) return decodeJWT(token);
    return null;
}