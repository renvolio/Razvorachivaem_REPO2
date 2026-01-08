//const API_BASE = "/api";

let appData = {
    subjects: [],
    projects: [],
    tasks: [],
    users: {},
    dependencies: [],
    teamMembers: {}
};
let selectedTeams = new Set();

const statusStyles = {
    "Planned": "planned",
    "InProgress": "inprogress",
    "Ready": "ready",
    "Expired": "expired",
    "Completed": "ready"
};

function renderTeamFilters() {
    const container = document.getElementById("team-filters-container");
    const list = document.getElementById("team-checkboxes");
    list.innerHTML = "";

    const teamMap = new Map();
    appData.tasks.forEach(t => {
        if (t.teamId && !teamMap.has(t.teamId)) {
            teamMap.set(t.teamId, {
                id: t.teamId,
                number: t.teamNumber,
                name: t.teamName
            });
        }
    });
    const teams = Array.from(teamMap.values());
    teams.sort((a, b) => a - b);
    if (teams.length === 0) {
        container.style.display = "none";
        return;
    }
    container.style.display = "block";
    const allDiv = document.createElement('div');
    allDiv.className = 'team-filter-item';
    allDiv.innerHTML = `
        <input type="checkbox" id="filter-all" ${selectedTeams.size === 0 ? 'checked' : ''}>
        <label for="filter-all"><strong>Все команды</strong></label>
    `;
    list.appendChild(allDiv);

    document.getElementById('filter-all').addEventListener('change', (e) => {
        if (e.target.checked) {
            selectedTeams.clear();
            document.querySelectorAll('.group-check').forEach(cb => cb.checked = false);
        } else {
            // Если сняли "Все", то по логике ничего не выбрано -> пусто -> опять все? 
            // Или можно сделать, чтобы ничего не показывалось. Обычно удобнее оставить "Все".
            e.target.checked = true; 
        }
        applyFiltersAndRender(); // Вызываем вашу основную функцию отрисовки
    });
    teams.forEach(team => {
        const div = document.createElement('div');
        div.className = 'team-filter-item';
        
        // Красивое имя: "Команда №X (Название)" или просто "Команда №X"
        const displayName = team.name 
            ? `Команда №${team.number} (${team.name})` 
            : `Команда №${team.number}`;

        div.innerHTML = `
            <input type="checkbox" class="group-check" id="team-${team.id}" value="${team.id}" ${selectedTeams.has(team.id) ? 'checked' : ''}>
            <label for="team-${team.id}">${displayName}</label>
        `;
        list.appendChild(div);

        div.querySelector('input').onchange = (e) => {
            if (e.target.checked) {
                selectedTeams.add(e.target.value);
                document.getElementById('filter-all').checked = false;
            } else {
                selectedTeams.delete(e.target.value);
                if (selectedTeams.size === 0) document.getElementById('filter-all').checked = true;
            }
            applyFiltersAndRender();
        };
    });
}

function applyFiltersAndRender() {
    let tasksToDraw = appData.tasks;

    // Если что-то выбрано в фильтре, фильтруем
    if (selectedTeams.size > 0) {
        tasksToDraw = appData.tasks.filter(task => {
            // Если у задачи нет команды (null), решаем, показывать её или нет.
            // Обычно общие задачи лучше оставлять. Если надо скрыть - уберите проверку на !task.teamId
            if (!task.teamId) return true; 
            return selectedTeams.has(task.teamId);
        });
    }

    // Вызываем вашу реальную функцию отрисовки
    renderTaskNodes(tasksToDraw);
}

function toInputLocalDateTime(isoString) {
    if (!isoString) return "";
    
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const tzOffsetMs = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - tzOffsetMs);
    return local.toISOString().slice(0, 16);
}

function normalizeStatus(status) {
    if (typeof status === "number") {
        switch (status) {
            case 0: return "Planned";
            case 1: return "InProgress";
            case 2: return "Ready";
            case 3: return "Expired";
            case 4: return "Completed";
            default: return "Planned";
        }
    }
    if (typeof status === "string") {
        return status;
    }
    return "Planned";
}

function parseTimeSpan(timespanStr) {
    if (!timespanStr)
        return {
            days: 0,
            hours: 0
        };
    let days = 0, timePart = timespanStr;
    if (timespanStr.includes(".")) {
        const parts = timespanStr.split(".");
        days = parseInt(parts[0]);
        timePart = parts[1];
    }
    const timeParts = timePart.split(":");
    const hours = parseInt(timeParts[0]);
    return {
        days: days,
        hours: hours
    }
}

function createTimeSpan(days, hours) {
    const h = String(parseInt(hours) || 0).padStart(2, "0");
    const d = parseInt(days) || 0;
    return `${d}.${h}:00:00`;
}

const statusEnumMap = {
    Planned: 0,
    InProgress: 1,
    Ready: 2,
    Expired: 3,
    Completed: 4
};

function statusToEnum(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
        // if numeric string
        const num = Number(val);
        if (!Number.isNaN(num)) return num;
        // if string name
        if (statusEnumMap.hasOwnProperty(val)) return statusEnumMap[val];
    }
    return null;
}

function formatDatePretty(isoString) {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleString('ru-RU', { 
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
    });
}

const statusLabels = {
    "Planned": "Запланировано",
    "InProgress": "В процессе",
    "Ready": "Готово",
    "Expired": "Просрочено",
    "Completed": "Завершено"
};

let curUser = null;
const modal = document.getElementById("modal");
const modalContent = modal.querySelector(".content");
let currentProjectId = null;

function openModal(title, html, onsave, showSaveButton = true) {
    modalContent.innerHTML = `
        <span class="close" onclick="document.getElementById('modal').style.display='none'">&times;</span>
        <h2 style="margin-top: 0;">${title}</h2>
        ${html}
        <div style="margin-top: 15px; text-align: right;">
            <button id="modal-save-btn">Сохранить</button>
        </div>
    `;
    
    const endInput = document.getElementById("task-end-date");
    const daysInput = document.getElementById("task-duration-days");
    const hoursInput = document.getElementById("task-duration-hours");

    [endInput, daysInput, hoursInput].forEach(input => {
        if (input) {
            input.addEventListener('change', updateCalculatedStartDateLabel);
            input.addEventListener('input', updateCalculatedStartDateLabel);
        }
    });

    document.getElementById("modal-save-btn").onclick = async () => {
        const result = await onsave();
        if (result === true) {
            modal.style.display = "none";
        }
    };
    modal.style.display = "block";
    updateCalculatedStartDateLabel();
}

function updateCalculatedStartDateLabel() {
    const endInput = document.getElementById("task-end-date");
    const daysInput = document.getElementById("task-duration-days");
    const hoursInput = document.getElementById("task-duration-hours");
    const resultLabel = document.getElementById("calc-start-display");

    if (!endInput || !resultLabel) return;

    if (!endInput.value || !(daysInput?.value || hoursInput?.value)) {
        resultLabel.innerHTML = `<span style="color:#777">Укажите дедлайн и длительность</span>`;
        return;
    }

    const endDate = new Date(endInput.value);
    const days = parseInt(daysInput?.value || 0) || 0;
    const hours = parseInt(hoursInput?.value || 0) || 0;

    const durationMs = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000);
    const startDate = new Date(endDate.getTime() - durationMs);

    const now = new Date();
    let color = "green";
    let warning = "";

    if (startDate < now) {
        color = "red";
        warning = " (Нужно было начать раньше!)";
    }

    resultLabel.innerHTML = `Расчетный старт: <b style="color:${color}">${formatDatePretty(startDate)}</b>${warning}`;
}

function getAuthHeaders() {
    const token = localStorage.getItem("authToken");
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        if (res.status === 401) {
            handleLogout();
            return null;
        }
        throw new Error(`API Error: ${res.statusText} (${res.status})`);
    }
    return await res.json();
}

async function initApp() {
    const token = localStorage.getItem("authToken");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    curUser = decodeJWT(token);
    if (!curUser || !curUser.id) {
        handleLogout();
        return;
    }

    renderUserDisplay();
    await loadUsersDict();
    await loadSubjects();
}

function handleLogout() {
    localStorage.removeItem("authToken");
    window.location.href = "login.html";
}

function renderUserDisplay() {
    const curUserDisplay = document.getElementById("curuser-display");
    const addTaskBtn = document.getElementById("add-task");

    // Роли в бэкенде: "Student" или "Teacher"
    const roleLabel = curUser.role === 'Teacher' ? 'Преподаватель' : (curUser.role === 'Student' ? 'Студент' : curUser.role);
    curUserDisplay.textContent = `Сейчас в сети: ${curUser.name} (${roleLabel})`;

    // Тимлид - это студент, который может быть лидером команды, но в бэкенде это просто Student
    addTaskBtn.style.display = (curUser.role === 'Student') ? 'block' : 'none';
    document.getElementById('add-subject').style.display = curUser.role === 'Teacher' ? 'block' : 'none';
    document.getElementById('add-project').style.display = curUser.role === 'Teacher' ? 'block' : 'none';
    document.getElementById('view-subject').style.display = 'block';
}

async function loadUsersDict() {
    try {
        const response = await fetchJson(`${API_BASE}/User`, { headers: getAuthHeaders() });
        appData.users = {};
        if (response) {
            const allUsers = [...(response.teachers || []), ...(response.students || [])];
            allUsers.forEach(u => {
                appData.users[u.id] = u;
            });
        }
    } catch (e) {
        console.error("Failed to load users", e);
        appData.users = {};
    }
}

async function loadSubjects() {
    try {
        const url = curUser.role === "Teacher" ? `${API_BASE}/Subject/teacher` : `${API_BASE}/Subject/available`
        appData.subjects = await fetchJson(url, { headers: getAuthHeaders() });
        await renderSubjectSelector();
    } catch (e) {
        console.error("Failed to load subjects", e);
        alert("Ошибка загрузки предметов. Проверьте запуск бэкенда.");
    }
}

async function loadProjects(subjectId) {
    try {
        appData.projects = await fetchJson(`${API_BASE}/subjects/${subjectId}/projects`, { headers: getAuthHeaders() });
        renderProjectSelector(subjectId);
    } catch (e) {
        console.error("Failed to load projects", e);
        appData.projects = [];
        renderProjectSelector(subjectId);
    }
}

async function loadGraphForProject(projectId, subjectId) {
    const project = appData.projects.find(p => p.id === projectId);
    document.getElementById("project-name").textContent = project ? project.name : "";
    currentProjectId = projectId;

    if (curUser.role === 'Student') {
        const joined = await ensureTeamForSubject(subjectId);
        if (!joined) return;
        await loadTeamMembers(subjectId);
    }

    try {
        const tasks = await fetchJson(`${API_BASE}/subjects/${subjectId}/projects/${projectId}/tasks`, { headers: getAuthHeaders() });
        appData.tasks = (tasks || []).map(t => ({ ...t, status: normalizeStatus(t.status) }));
        
        appData.dependencies = [];
        appData.tasks.forEach(t => {
            if (t.parentTaskId) {
                appData.dependencies.push({ predecessorId: t.parentTaskId, successorId: t.id });
            }
        });
        selectedTeams.clear();
        renderTeamFilters();
        applyFiltersAndRender();
    } catch (e) {
        appData.tasks = [];
        renderTaskNodes([]);
        document.getElementById("team-filters-container").style.display = "none";
        console.error(e);
    }
}

const selectSubject = document.getElementById("subject");
const selectProject = document.getElementById("project");
const tasksContainer = document.getElementById("nodes");
const dependencyLines = document.getElementById("lines");

async function renderSubjectSelector() {
    selectSubject.innerHTML = '<option value="" disabled selected>Выберите предмет...</option>';
    appData.subjects.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = s.name;
        selectSubject.appendChild(option);
    });
}

function renderProjectSelector(subjectId) {
    selectProject.innerHTML = '';
    const filteredProjects = appData.projects.filter(p => p.subjectId === subjectId);

    if (filteredProjects.length === 0) {
        selectProject.innerHTML = '<option disabled selected>Нет проектов</option>';
        document.getElementById("project-name").textContent = "Нет проектов";
        tasksContainer.innerHTML = '';
        dependencyLines.innerHTML = '';
        return;
    }

    filteredProjects.forEach((proj, i) => {
        const option = document.createElement('option');
        option.value = proj.id;
        option.textContent = proj.name;
        selectProject.appendChild(option);
        if (i === 0) option.selected = true;
    });

    loadGraphForProject(filteredProjects[0].id, subjectId);
}

function renderTaskNodes(tasks) {
    tasksContainer.innerHTML = "";

    const svg = document.getElementById("lines");
    const defs = svg.querySelector("defs");
    svg.innerHTML = '';
    if(defs) svg.appendChild(defs);

    tasks.forEach(t => {
        const node = document.createElement("div");
        node.id = t.id;
        const normStatus = normalizeStatus(t.status);
        // Статус приходит как enum (Planned, InProgress, Ready, Expired, Completed)
        const statusClass = `status-${statusStyles[normStatus] || 'planned'}`;
        node.className = `node ${statusClass}`;

        const posX = t.x || 100;
        const posY = t.y || 100;

        node.style.left = `${posX}px`;
        node.style.top = `${posY}px`;

        // Роли: "Teacher" или "Student"
        if (curUser.role === "Teacher" || curUser.role === "Student") node.classList.add("drag");

        let respName = "Не назначен";
        if (t.responsibleStudentName) {
            respName = t.responsibleStudentName;
            if (t.responsibleStudentEmail) {
                respName += ` (${t.responsibleStudentEmail})`;
            }
        }
        else if (t.responsibleStudentId) {
            const teamList = appData.teamMembers[selectSubject.value] || [];
            const respFromTeam = teamList.find(m => m.id === t.responsibleStudentId);
            respName = respFromTeam ? respFromTeam.name
                : (appData.users[t.responsibleStudentId] ? appData.users[t.responsibleStudentId].name : t.responsibleStudentId);
        }

        // В бэкенде поля называются startDate и endDate (DateTime), а не plannedStartTime/plannedDeadline
        const startDate = t.startDate ? new Date(t.startDate).toLocaleDateString('ru-RU') : 'Не указано';
        const endDate = t.endDate ? new Date(t.endDate).toLocaleDateString('ru-RU') : 'Не указано';

        node.innerHTML = `
            <div class="task-header">${t.name || t.description || "Без названия"}</div>
            <div>Ответственный: <b>${respName}</b></div>
            <div class="task-dates">Начало: ${startDate}</div>
            <div class="task-dates">Конец: ${endDate}</div>
        `;

        node.addEventListener('click', (e) => {
            e.stopPropagation();
            if (suppressNextClickTaskOpen) {
                suppressNextClickTaskOpen = false;
                return;
            }
            showTaskDetails(t);
        });
        tasksContainer.appendChild(node);
    });

    setTimeout(showDependencies, 0);
}

function showDependencies() {
    const svg = document.getElementById("lines");
    Array.from(svg.querySelectorAll('line')).forEach(line => line.remove());

    appData.dependencies.forEach(d => {
        const startNode = document.getElementById(d.predecessorId);
        const endNode = document.getElementById(d.successorId);

        if (startNode && endNode) {
            const start = getTaskCenter(startNode);
            const end = getTaskCenter(endNode);

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', start.x);
            line.setAttribute('y1', start.y);
            line.setAttribute('x2', end.x);
            line.setAttribute('y2', end.y);
            line.setAttribute('stroke', '#333333');
            line.setAttribute('stroke-width', 2);
            line.setAttribute('marker-end', 'url(#arrowhead)');
            svg.appendChild(line);
        }
    });
}

function getTaskCenter(node) {
    const rect = node.getBoundingClientRect();
    const containerRect = document.querySelector(".nodes-wrapper").getBoundingClientRect();
    return {
        x: (rect.left - containerRect.left) + rect.width / 2,
        y: (rect.top - containerRect.top) + rect.height / 2
    };
}

selectSubject.addEventListener('change', async (e) => {
    await handleSubjectSelection(e.target.value);
});

selectProject.addEventListener('change', (e) => {
    const currentSubjectId = selectSubject.value;
    if (currentSubjectId) {
        loadGraphForProject(e.target.value, currentSubjectId);
    }
});

document.getElementById("logout-btn").addEventListener("click", handleLogout);

document.getElementById("add-subject").addEventListener("click", () => {
    showAddSubjectForm();
});

document.getElementById("add-project").addEventListener("click", async () => {
    const currentSubjectId = selectSubject.value;
    if (!currentSubjectId) {
        alert("Сначала выберите предмет");
        return;
    }
    const joined = await ensureTeamForSubject(currentSubjectId);
    if (!joined) return;
    showAddProjectForm(currentSubjectId);
});

document.getElementById("add-task").addEventListener("click", async () => {
    const currentProjectId = selectProject.value;
    const currentSubjectId = selectSubject.value;

    if (!currentProjectId || !currentSubjectId) {
        alert("Сначала выберите предмет и проект");
        return;
    }
    const joined = await ensureTeamForSubject(currentSubjectId);
    if (!joined) {
        alert("Необходимо присоединиться к команде предмета перед созданием задач");
        return;
    }
    showAddTaskForm(currentSubjectId, currentProjectId);
});

document.getElementById("view-subject").addEventListener("click", () => {
    showSubjectInfo();
});

function showTaskDetails(task) {
    if (curUser.role === "Teacher") {
        const startDate = task.startDate ? new Date(task.startDate).toLocaleString('ru-RU') : '—';
        const endDate = task.endDate ? new Date(task.endDate).toLocaleString('ru-RU') : '—';
        let respName = 'Не назначен';
        if (task.responsibleStudentName) {
            respName = task.responsibleStudentName;
            if (task.responsibleStudentEmail) {
                respName += ` (${task.responsibleStudentEmail})`;
            }
        }
        else if (task.responsibleStudentId) {
            const teamList = appData.teamMembers[selectSubject.value] || [];
            const respFromTeam = teamList.find(m => m.id === task.responsibleStudentId);
            respName = respFromTeam ? `${respFromTeam.name} (${respFromTeam.email})` : task.responsibleStudentId;
        }
        modalContent.innerHTML = `
            <span class="close" onclick="document.getElementById('modal').style.display='none'">&times;</span>
            <h2 style="margin-top: 0;">Задача</h2>
            <p><b>Название:</b> ${task.name || task.description || ''}</p>
            <p><b>Описание:</b> ${task.description || '—'}</p>
            <p><b>Ответственный:</b> ${respName}</p>
            <p><b>Статус:</b> ${task.status}</p>
            <p><b>Начало:</b> ${startDate}</p>
            <p><b>Окончание:</b> ${endDate}</p>
        `;
        modal.style.display = "block";
        return;
    }
    const projectTasks = appData.tasks.filter(t => t.projectId === task.projectId && t.id !== task.id);
    const parentTaskOptions = projectTasks.map(t => 
        `<option value="${t.id}" ${task.parentTaskId === t.id ? 'selected' : ''}>${t.description || t.name}</option>`
    ).join('');

    const teamList = appData.teamMembers[selectSubject.value] || [];
    const responsibleOptions = teamList.length
        ? teamList.map(m => `<option value="${m.id}" ${task.responsibleStudentId === m.id ? 'selected' : ''}>${m.name} (${m.email})</option>`).join('')
        : '';

    const endValue = task.endDate ? toInputLocalDateTime(task.endDate) : '';
    let currentDays = 0;
    let currentHours = 0;
    if (task.startDate && task.endDate) {
        const diffMs = new Date(task.endDate) - new Date(task.startDate);
        const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
        currentDays = Math.floor(totalHours / 24);
        currentHours = totalHours % 24;
    }

    modalContent.innerHTML = `
        <span class="close" onclick="document.getElementById('modal').style.display='none'">&times;</span>
        <h2 style="margin-top: 0;">Редактировать задачу</h2>
        <label for="task-name">Название задачи:</label>
        <input type="text" id="task-name" required value="${task.name || ''}">
        
        <label for="task-description">Описание:</label>
        <textarea id="task-description" rows="3" style="width: 100%; padding: 10px; margin: 5px 0 20px 0; border: 1px solid lightgray; border-radius: 8px; font-size: 16px; box-sizing: border-box;">${task.description || ''}</textarea>
        
        <div style="background: #f0f8ff; padding: 10px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #cce5ff;">
            <label for="task-end-date">Дедлайн:</label>
            <input type="datetime-local" id="task-end-date" required value="${endValue}">
            
            <label style="margin-top:10px; display:block;">Длительность (сколько времени нужно):</label>
            <div style="display: flex; gap: 10px;">
                <div style="flex:1">
                    <input type="number" id="task-duration-days" min="0" step="1" value="${currentDays}" onkeypress="return event.charCode >= 48 && event.charCode <= 57"> <small>Дней</small>
                </div>
                <div style="flex:1">
                    <input type="number" id="task-duration-hours" min="0" max="23" step="1" value="${currentHours}" onkeypress="return event.charCode >= 48 && event.charCode <= 57"> <small>Часов</small>
                </div>
            </div>
            
            <div style="margin-top: 10px; text-align: right; color: #555;">
                Расчетный старт: <b id="calc-start-display">—</b>
                <input type="hidden" id="task-start-date"> 
            </div>
        </div>

        <label for="task-parent">Родительская задача:</label>
        <select id="task-parent" class="w-full" style="margin-bottom: 10px;">
            <option value="">Нет родительской задачи</option>
            ${parentTaskOptions}
        </select>
        
        <label for="task-responsible">Ответственный:</label>
        ${teamList.length
            ? `<select id="task-responsible" class="w-full">
                    <option value="">Не назначен</option>
                    ${responsibleOptions}
               </select>`
            : `<input type="text" id="task-responsible" placeholder="UUID студента" value="${task.responsibleStudentId || ''}">`}

        <label for="task-status">Статус:</label>
        <select id="task-status" class="w-full">
            <option value="0" ${task.status === 'Planned' || task.status === 0 ? 'selected' : ''}>Запланировано</option>
            <option value="1" ${task.status === 'InProgress' || task.status === 1 ? 'selected' : ''}>В процессе</option>
            <option value="2" ${task.status === 'Ready' || task.status === 2 ? 'selected' : ''}>Готово</option>
            <option value="3" ${task.status === 'Expired' || task.status === 3 ? 'selected' : ''}>Просрочено</option>
            <option value="4" ${task.status === 'Completed' || task.status === 4 ? 'selected' : ''}>Завершено</option>
        </select>
        
        <p id="task-error" style="color: red; margin-top: 10px;"></p>
        <div style="display: flex; gap: 10px; margin-top: 15px; justify-content: flex-end;">
            <button id="task-delete-btn" style="background: #c62828; color: white; border: none; padding: 8px 12px; border-radius: 6px;">Удалить</button>
            <button id="modal-save-btn">Сохранить</button>
        </div>
    `;

    const updateEditCalculation = () => {
        const eDateVal = document.getElementById("task-end-date").value;
        const dDays = parseInt(document.getElementById("task-duration-days").value || 0);
        const dHours = parseInt(document.getElementById("task-duration-hours").value || 0);
        const display = document.getElementById("calc-start-display");
        const hiddenStart = document.getElementById("task-start-date");

        if (eDateVal) {
            const endD = new Date(eDateVal);
            const durMs = (dDays * 24 * 60 * 60 * 1000) + (dHours * 60 * 60 * 1000);
            const startD = new Date(endD.getTime() - durMs);
            
            display.textContent = startD.toLocaleString('ru-RU');
            hiddenStart.value = startD.toISOString(); 
        }
    };

    document.getElementById("task-end-date").addEventListener('input', updateEditCalculation);
    document.getElementById("task-duration-days").addEventListener('input', updateEditCalculation);
    document.getElementById("task-duration-hours").addEventListener('input', updateEditCalculation);
    
    updateEditCalculation();
    document.getElementById("modal-save-btn").onclick = async () => {
        await updateTask(task);
    };
    document.getElementById("task-delete-btn").onclick = async () => {
        const cascade = true;
        if (confirm("Удалить задачу и все её потомки?")) {
            await deleteTask(task, cascade);
        }
    };
    modal.style.display = "block";
}

async function updateTask(task) {
    const errorP = document.getElementById("task-error");
    errorP.textContent = "";
    
    const name = document.getElementById("task-name").value.trim();
    const description = document.getElementById("task-description").value.trim();
    const startDateStr = document.getElementById("task-start-date").value;
    const endDateStr = document.getElementById("task-end-date").value;
    const days = document.getElementById("task-duration-days").value;
    const hours = document.getElementById("task-duration-hours").value;
    const parentTaskId = document.getElementById("task-parent").value || null;
    const responsibleId = document.getElementById("task-responsible").value?.trim() || null;
    const statusRaw = document.getElementById("task-status").value;
    const statusEnum = statusToEnum(statusRaw === "" ? task.status : statusRaw);

    if (!name || !startDateStr || !endDateStr) {
        errorP.textContent = "Заполните все обязательные поля";
        return;
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const project = appData.projects.find(p => p.id === task.projectId);
    if (!project) {
        errorP.textContent = "Проект не найден в данных клиента";
        return;
    }
    const parentTask = parentTaskId ? appData.tasks.find(t => t.id === parentTaskId) : null;
    const dateError = validateTaskDates(startDate, endDate, project, parentTask);
    if (dateError) {
        errorP.textContent = dateError;
        return;
    }
    const childTasks = appData.tasks.filter(t => t.parentTaskId == task.id);
    if ((statusEnum === 1 || statusEnum === 2 || statusEnum === 4) && childTasks.length > 0) {
        const unfinishedChildren = childTasks.filter(child => {
            const s = statusToEnum(child.status);
            return s !== 2 && s !== 4; // Не "Ready" и не "Completed"
        });

        if (unfinishedChildren.length > 0) {
            errorP.textContent = `Нельзя начать/завершить задачу, пока не выполнены все её подзадачи (${unfinishedChildren.length} шт. еще в работе)`;
            return;
        }
    }

    const subjectId = selectSubject.value;
    if (!subjectId) {
        errorP.textContent = "Выберите предмет";
        return;
    }

    const duration = createTimeSpan(days, hours);
    const payload = {
        name: name,
        description: description || null,
        // Отправляем в UTC (ISO), чтобы бэкенд принял timestamp with time zone
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        deadlineAssessment: duration,
        parentTaskId: parentTaskId || null,
        responsibleStudentId: responsibleId || null
    };
    if (statusEnum !== null && statusEnum !== undefined && !Number.isNaN(statusEnum)) {
        payload.status = statusEnum;
    }

    try {
        const response = await fetch(`${API_BASE}/subjects/${subjectId}/projects/${task.projectId}/tasks/${task.id}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorText = await response.text();
            errorP.textContent = `Ошибка: ${errorText}`;
            return;
        }
        await loadGraphForProject(task.projectId, subjectId);
        modal.style.display = "none";
    } catch (err) {
        errorP.textContent = `Ошибка сети: ${err.message}`;
    }
}

function updateDeadlines(isEditMode = false) {
    const selectParent = document.getElementById('task-parent');
    const endInput = document.getElementById('task-end-date');
    if (!selectParent || !endInput) return;
 
    const projectId = selectProject.value;
    const currentProject = appData.projects.find(p => p.id === projectId);

    endInput.removeAttribute('disabled');
    endInput.title = '';

    const parentId = selectParent.value;
    if (!isEditMode && appData.tasks.length === 0 && currentProject) {
        if (currentProject.endDate) {
            endInput.value = toInputLocalDateTime(currentProject.endDate);
            endInput.title = 'Дедлайн автоматически установлен по дедлайну предмета.';
        }
    }
    else if (parentId) {
        const parentTask = appData.tasks.find(t => t.id === parentId);
        if (parentTask && parentTask.startDate) {
            endInput.value = toInputLocalDateTime(parentTask.startDate);
            endInput.title = 'Дедлайн автоматически установлен как дата начала родительской задачи.';
        }
    }
    updateCalculatedStartDateLabel();
}

async function deleteTask(task, cascade = true) {
    const errorP = document.getElementById("task-error");
    const subjectId = selectSubject.value;
    if (!subjectId) {
        errorP.textContent = "Выберите предмет";
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/subjects/${subjectId}/projects/${task.projectId}/tasks/${task.id}?cascade=${cascade}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            const errorText = await response.text();
            errorP.textContent = `Ошибка: ${errorText}`;
            return;
        }
        await loadGraphForProject(task.projectId, subjectId);
        modal.style.display = "none";
    } catch (err) {
        errorP.textContent = `Ошибка сети: ${err.message}`;
    }
}

async function showAddTaskForm(subjectId, projectId) {
    const parentOptions = appData.tasks.filter(t => t.projectId === projectId)
        .map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    
    const teamList = appData.teamMembers[subjectId] || [];
    const respOptions = teamList.map(m => `<option value="${m.id}">${m.name}</option>`).join('');

    const html = `
        <label for="task-name">Название задачи:</label>
        <input type="text" id="task-name" required placeholder="Что нужно сделать?" class="w-full">
        
        <label for="task-description">Описание:</label>
        <textarea id="task-description" rows="3" style="width: 100%; padding: 10px; margin: 5px 0 20px 0; border: 1px solid lightgray; border-radius: 8px; font-size: 16px; box-sizing: border-box;"></textarea>
        
        <div style="background: #f0f8ff; padding: 10px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #cce5ff;">
            <label for="task-end-date">Дедлайн (Реверсивное планирование):</label>
            <input type="datetime-local" id="task-end-date" required>
            
            <label style="margin-top:10px; display:block;">Оценка времени (длительность):</label>
            <div style="display: flex; gap: 10px;">
                <div style="flex:1">
                    <input type="number" id="task-duration-days" min="0" step="1" value="0" placeholder="Дни" onkeypress="return event.charCode >= 48 && event.charCode <= 57"> 
                    <small>Дней</small>
                </div>
                <div style="flex:1">
                    <input type="number" id="task-duration-hours" min="0" max="23" step="1" value="1" placeholder="Часы" onkeypress="return event.charCode >= 48 && event.charCode <= 57">
                    <small>Часов</small>
                </div>
            </div>
            
            <div style="margin-top: 10px; text-align: right; color: #555;">
                <b id="calc-start-display">—</b>
            </div>
        </div>

        <label for="task-parent">Родительская задача:</label>
        <select id="task-parent" class="w-full" style="margin-bottom: 10px;">
            <option value="">-- Нет (Корневая задача) --</option>
            ${parentOptions}
        </select>
        
        <label for="task-responsible">Ответственный:</label>
        <select id="task-responsible" class="w-full">
            <option value="">-- Не назначен --</option>
            ${respOptions}
        </select>
        
        <p id="task-error" style="color: red; margin-top: 10px;"></p>
    `;
    openModal("Новая задача", html, async () => await createTask(subjectId, projectId));
    const parentSelect = document.getElementById("task-parent");    
    if (parentSelect) {
        parentSelect.addEventListener("change", () => {
            updateDeadlines(false);
        });
    }
    updateDeadlines(false);
}

function validateTaskDates(startDate, endDate, project, parentTask) {
    const today = new Date();
    today.setHours(0,0,0,0);
    if (startDate < today) return "Дата начала не может быть в прошлом";
    if (endDate <= startDate) return "Дата окончания должна быть позже даты начала";
    if (startDate < project.startDate || endDate > project.endDate) {
        return "Даты задачи должны быть внутри дат проекта";
    }
    if (parentTask) {
        if (endDate > new Date(parentTask.startDate)) {
            return "Задача должна быть завершена до того, как начнется родительская задача";
        }
    }
    return null;
}

async function createTask(subjectId, projectId) {
    const errorP = document.getElementById("task-error");
    const name = document.getElementById("task-name").value;
    const desc = document.getElementById("task-description").value;
    const endDateStr = document.getElementById("task-end-date").value;
    const days = document.getElementById("task-duration-days").value;
    const hours = document.getElementById("task-duration-hours").value;
    const parentId = document.getElementById("task-parent").value || null;
    const respId = document.getElementById("task-responsible").value || null;

    if (!name || !endDateStr || (!days && !hours)) {
        errorP.textContent = "Заполните название, дедлайн и длительность!";
        return false;
    }

    const duration = createTimeSpan(days, hours);
    const durationMs = (parseInt(days || 0) * 24 * 60 * 60 * 1000) + (parseInt(hours || 0) * 60 * 60 * 1000);
    const endDateObj = new Date(endDateStr);
    const calculatedStartDate = new Date(endDateObj.getTime() - durationMs);

    const payload = {
        name: name,
        description: desc,
        startDate: calculatedStartDate.toISOString(),
        endDate: endDateObj.toISOString(),
        deadlineAssessment: duration,
        teamId: (await getSubjectTeams())[subjectId]?.teamId, 
        projectId: projectId,
        parentTaskId: parentId,
        responsibleStudentId: respId
    };

    try {
        const res = await fetch(`${API_BASE}/subjects/${subjectId}/projects/${projectId}/tasks`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            errorP.textContent = `Ошибка: ${await res.text()}`;
            return false;
        }
        await loadGraphForProject(projectId, subjectId);
        return true;
    } catch (e) {
        errorP.textContent = `Непредвиденная ошибка: ${e.message}`;
        return false;
    }
}

async function showAddSubjectForm() {
    const html = `
        <label for="subject-name">Название предмета:</label>
        <input type="text" id="subject-name" required placeholder="Название предмета">
        
        <label for="subject-description">Описание:</label>
        <textarea id="subject-description" placeholder="Описание предмета" rows="3" style="width: 100%; padding: 10px; margin: 5px 0 20px 0; border: 1px solid lightgray; border-radius: 8px; font-size: 16px; box-sizing: border-box;"></textarea>
        
        <label for="subject-start-date">Дата начала:</label>
        <input type="date" id="subject-start-date" required>
        
        <label for="subject-end-date">Дата окончания:</label>
        <input type="date" id="subject-end-date" required>
        
        <label for="subject-groups">Разрешенные группы (через запятую, например: 101, 102, 103):</label>
        <input type="text" id="subject-groups" placeholder="101, 102, 103" required>
        
        <p id="subject-error" style="color: red; margin-top: 10px;"></p>
    `;
    
    openModal("Добавить предмет", html, async () => {
        return await createSubject();
    });
}

async function createSubject() {
    // Ищем элементы внутри модального окна
    const modalElement = document.getElementById("modal");
    if (!modalElement) {
        console.error("Modal element not found");
        return false;
    }
    
    const errorP = modalElement.querySelector("#subject-error");
    if (!errorP) {
        console.error("Subject error element not found");
        return false;
    }
    errorP.textContent = "";
    
    const nameInput = modalElement.querySelector("#subject-name");
    const descriptionInput = modalElement.querySelector("#subject-description");
    const startDateInput = modalElement.querySelector("#subject-start-date");
    const endDateInput = modalElement.querySelector("#subject-end-date");
    const groupsInput = modalElement.querySelector("#subject-groups");
    
    if (!nameInput || !startDateInput || !endDateInput || !groupsInput) {
        errorP.textContent = "Ошибка: элементы формы не найдены";
        return false;
    }
    
    const name = (nameInput.value || "").trim();
    const description = (descriptionInput?.value || "").trim();
    const startDateStr = startDateInput.value || "";
    const endDateStr = endDateInput.value || "";
    const groupsStr = (groupsInput.value || "").trim();
    
    if (!name || !startDateStr || !endDateStr || !groupsStr) {
        errorP.textContent = "Заполните все обязательные поля";
        return false;
    }
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    if (startDate >= endDate) {
        errorP.textContent = "Дата окончания должна быть позже даты начала";
        return;
    }
    
    // Парсим группы
    const allowedGroups = groupsStr.split(',').map(g => parseInt(g.trim())).filter(g => !isNaN(g));
    if (allowedGroups.length === 0) {
        errorP.textContent = "Укажите хотя бы одну группу";
        return;
    }
    
    const subjectData = {
        name: name,
        discription: description,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        allowedGroups: allowedGroups
    };
    
    try {
        const response = await fetch(`${API_BASE}/Subject`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(subjectData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            errorP.textContent = `Ошибка: ${errorText}`;
            return;
        }
        
        const newSubject = await response.json();
        
        // Перезагружаем список предметов
        await loadSubjects();
        
        return true;
    } catch (error) {
        errorP.textContent = `Ошибка сети: ${error.message}`;
        console.error("Failed to create subject", error);
        return false;
    }
}

async function showAddProjectForm(subjectId) {
    const subject = appData.subjects.find(s => s.id === subjectId);
    const subjectName = subject ? subject.name : "предмета";
    
    const html = `
        <label for="project-name">Название проекта:</label>
        <input type="text" id="project-name" required placeholder="Название проекта">
        
        <label for="project-description">Описание:</label>
        <textarea id="project-description" placeholder="Описание проекта" rows="3" style="width: 100%; padding: 10px; margin: 5px 0 20px 0; border: 1px solid lightgray; border-radius: 8px; font-size: 16px; box-sizing: border-box;"></textarea>
        
        <label for="project-start-date">Дата начала:</label>
        <input type="date" id="project-start-date" required>
        
        <label for="project-end-date">Дата окончания:</label>
        <input type="date" id="project-end-date" required>
        
        <p id="project-error" style="color: red; margin-top: 10px;"></p>
    `;
    
    openModal(`Добавить проект в ${subjectName}`, html, async () => {
        return await createProject(subjectId);
    });
}

async function createProject(subjectId) {
    // Ищем элементы внутри модального окна
    const modalElement = document.getElementById("modal");
    if (!modalElement) {
        console.error("Modal element not found");
        return false;
    }
    
    const errorP = modalElement.querySelector("#project-error");
    if (!errorP) {
        console.error("Project error element not found");
        return false;
    }
    errorP.textContent = "";
    
    // Ищем элементы внутри модального окна
    const nameInput = modalElement.querySelector("#project-name");
    const descriptionInput = modalElement.querySelector("#project-description");
    const startDateInput = modalElement.querySelector("#project-start-date");
    const endDateInput = modalElement.querySelector("#project-end-date");
    
    console.log("Found elements:", {
        nameInput: !!nameInput,
        descriptionInput: !!descriptionInput,
        startDateInput: !!startDateInput,
        endDateInput: !!endDateInput
    });
    
    if (!nameInput || !startDateInput || !endDateInput) {
        errorP.textContent = "Ошибка: элементы формы не найдены";
        console.error("Missing elements:", {
            nameInput: !nameInput,
            startDateInput: !startDateInput,
            endDateInput: !endDateInput
        });
        return false;
    }
    
    // Получаем значения напрямую
    const name = nameInput.value ? nameInput.value.trim() : "";
    const description = descriptionInput ? (descriptionInput.value || "").trim() : "";
    const startDateStr = startDateInput.value || "";
    const endDateStr = endDateInput.value || "";
    
    console.log("Form values check:", { 
        name: name, 
        nameLength: name.length,
        description: description, 
        startDateStr: startDateStr,
        startDateStrLength: startDateStr.length,
        endDateStr: endDateStr,
        endDateStrLength: endDateStr.length
    });
    console.log("Raw input values:", {
        nameInputValue: nameInput.value,
        startDateInputValue: startDateInput.value,
        endDateInputValue: endDateInput.value,
        startDateInputType: startDateInput.type,
        endDateInputType: endDateInput.type
    });
    
    // Проверяем каждое поле отдельно для более понятного сообщения об ошибке
    if (!name) {
        errorP.textContent = "Введите название проекта";
        return false;
    }
    if (!startDateStr) {
        errorP.textContent = "Выберите дату начала";
        return false;
    }
    if (!endDateStr) {
        errorP.textContent = "Выберите дату окончания";
        return false;
    }
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    if (startDate >= endDate) {
        errorP.textContent = "Дата окончания должна быть позже даты начала";
        return false;
    }
    
    const projectData = {
        name: name,
        description: description || "",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
    };
    
    console.log("Creating project with data:", projectData);
    console.log("SubjectId:", subjectId);
    console.log("URL:", `${API_BASE}/subjects/${subjectId}/projects`);
    
    try {
        const response = await fetch(`${API_BASE}/subjects/${subjectId}/projects`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(projectData)
        });
        
        console.log("Response status:", response.status);
        console.log("Response ok:", response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            errorP.textContent = `Ошибка (${response.status}): ${errorText}`;
            return false;
        }
        
        const newProject = await response.json();
        console.log("Created project:", newProject);
        
        // Перезагружаем список проектов
        await loadProjects(subjectId);
        
        return true;
    } catch (error) {
        console.error("Failed to create project", error);
        errorP.textContent = `Ошибка сети: ${error.message}`;
        return false;
    }
}

let activeItem = null;
let x0 = 0;
let y0 = 0;
let curX = 0;
let curY = 0;
let draggedDuringInteraction = false;
let suppressNextClickTaskOpen = false;

document.addEventListener('mousedown', (e) => {
    if ((curUser.role === 'Student' || curUser.role === 'Teacher') && e.target.closest('.node')) {
        const node = e.target.closest('.node');
        activeItem = node;
        x0 = e.clientX;
        y0 = e.clientY;

        curX = parseFloat(node.style.left || node.offsetLeft);
        curY = parseFloat(node.style.top || node.offsetTop);

        activeItem.style.zIndex = 20;
        draggedDuringInteraction = false;
    }
});

document.addEventListener('mousemove', (e) => {
    if (activeItem) {
        e.preventDefault();
        const dx = e.clientX - x0;
        const dy = e.clientY - y0;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            draggedDuringInteraction = true;
        }

        let newX = curX + dx;
        let newY = curY + dy;

        newX = Math.max(0, Math.min(newX, 2000 - 240));
        newY = Math.max(0, Math.min(newY, 1500 - 120));

        activeItem.style.left = newX + 'px';
        activeItem.style.top = newY + 'px';
        showDependencies();
    }
});

document.addEventListener('mouseup', async () => {
    if (activeItem) {
        activeItem.style.zIndex = 10;

        const taskId = activeItem.id;
        const task = appData.tasks.find(t => t.id === taskId);
        const newX = parseFloat(activeItem.style.left);
        const newY = parseFloat(activeItem.style.top);
        if (task) {
            task.x = newX;
            task.y = newY;
            const subjectId = selectSubject.value;
            const projectId = selectProject.value;
            if (subjectId && projectId) {
                try {
                    await fetch(`${API_BASE}/subjects/${subjectId}/projects/${projectId}/tasks/${taskId}/coords`, {
                        method: "PUT",
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ x: newX, y: newY })
                    });
                } catch (e) {
                    console.error("Не удалось сохранить координаты", e);
                }
            }
        }
        if (draggedDuringInteraction) {
            suppressNextClickTaskOpen = true;
        }
        activeItem = null;
    }
});

document.addEventListener('DOMContentLoaded', initApp);

document.getElementById("project-name").addEventListener("click", () => {
    showProjectInfo();
});

// ---------- Привязка студента к команде предмета ----------
function getSubjectTeams() {
    try {
        return JSON.parse(localStorage.getItem("subjectTeams") || "{}");
    } catch {
        return {};
    }
}

function setSubjectTeam(subjectId, team) {
    const map = getSubjectTeams();
    map[subjectId] = team;
    localStorage.setItem("subjectTeams", JSON.stringify(map));
}

async function ensureTeamForSubject(subjectId) {
    if (curUser.role !== "Student") return true;
    let serverMembers = [];
    try {
        serverMembers = await fetchJson(`${API_BASE}/Subject/${subjectId}/team/members`, { headers: getAuthHeaders() });
    } catch (e) {
        console.warn("Не удалось проверить статус команды, пробуем через localStorage", e);
    }

    const isActuallyJoined = serverMembers && serverMembers.length > 0;

    // 2. Если сервер говорит, что мы в команде - отлично.
    // Если сервер говорит "нет", но localStorage говорит "да" -> значит localStorage врет, удаляем запись.
    if (isActuallyJoined) {
        // Мы в команде. Но если у нас нет ID команды в localStorage (например, зашли с другого ПК),
        // нам может не хватить данных для создания задачи (teamId).
        // В идеале бэкенд должен возвращать ID команды, но пока просто считаем, что мы присоединены.
        return true; 
    } else {
        // Сервер сказал, что мы не в команде. Чистим локальный кеш, чтобы не путаться.
        const map = getSubjectTeams();
        if (map[subjectId]) {
            delete map[subjectId];
            localStorage.setItem("subjectTeams", JSON.stringify(map));
        }
    }

    return new Promise((resolve) => {
        const html = `
            <label for="team-number">Номер команды:</label>
            <input type="number" id="team-number" required placeholder="Например: 1">
            
            <label for="team-name">Название команды (необязательно):</label>
            <input type="text" id="team-name" placeholder="Например: Альфа">
            
            <p id="team-error" style="color: red; margin-top: 10px;"></p>
        `;

        openModal("Вход в команду предмета", html, async () => {
            const modalElement = document.getElementById("modal");
            const errorP = modalElement.querySelector("#team-error");
            errorP.textContent = "";
            const numInput = modalElement.querySelector("#team-number");
            const nameInput = modalElement.querySelector("#team-name");
            const teamNumber = parseInt((numInput.value || "").trim(), 10);
            const teamName = (nameInput.value || "").trim() || null;
            if (!teamNumber || teamNumber <= 0) {
                errorP.textContent = "Введите положительный номер команды";
                return false;
            }
            try {
                const resp = await fetch(`${API_BASE}/Subject/${subjectId}/join`, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ teamNumber: teamNumber, teamName: teamName })
                });
                if (!resp.ok) {
                    const errText = await resp.text();
                    errorP.textContent = `Ошибка: ${errText}`;
                    return false;
                }
                const data = await resp.json();
                setSubjectTeam(subjectId, { teamId: data.team.id, number: data.team.number, name: data.team.name });
                await loadTeamMembers(subjectId);
                return true;
            } catch (e) {
                errorP.textContent = `Ошибка сети: ${e.message}`;
                return false;
            }
        });
        
        const observer = new MutationObserver(() => {
            if (modal.style.display === "none") {
                observer.disconnect();
                resolve(getSubjectTeams()[subjectId] ? true : false);
            }
        });
        observer.observe(modal, { attributes: true, attributeFilter: ["style"] });
    });
}

async function handleSubjectSelection(subjectId) {
    if (!subjectId) return;
    if (curUser.role === "Student") {
        const joined = await ensureTeamForSubject(subjectId);
        if (!joined) {
            selectProject.innerHTML = '<option disabled selected>Нет проектов</option>';
            tasksContainer.innerHTML = '';
            dependencyLines.innerHTML = '';
            document.getElementById("project-name").textContent = "";
            return;
        }
        await loadTeamMembers(subjectId);
    }
    await loadProjects(subjectId);
}

async function loadTeamMembers(subjectId) {
    if (curUser.role !== "Student") return;
    try {
        const members = await fetchJson(`${API_BASE}/Subject/${subjectId}/team/members`, { headers: getAuthHeaders() });
        appData.teamMembers[subjectId] = members || [];
    } catch (e) {
        console.warn("Не удалось загрузить состав команды", e);
        appData.teamMembers[subjectId] = [];
    }
}

function showProjectInfo() {
    const projectId = currentProjectId || selectProject.value;
    const subjectId = selectSubject.value;
    if (!projectId || !subjectId) return;
    const project = appData.projects.find(p => p.id === projectId);
    if (!project) return;

    if (curUser.role !== "Teacher") {
        const start = project.startDate ? new Date(project.startDate).toLocaleString('ru-RU') : '—';
        const end = project.endDate ? new Date(project.endDate).toLocaleString('ru-RU') : '—';
        const html = `
            <p><b>Название:</b> ${project.name}</p>
            <p><b>Описание:</b> ${project.description || '—'}</p>
            <p><b>Начало:</b> ${start}</p>
            <p><b>Окончание:</b> ${end}</p>
        `;
        openModal("Информация о проекте", html, async () => true, false);
        return;
    }

    const startVal = project.startDate ? project.startDate.split('T')[0] : "";
    const endVal = project.endDate ? project.endDate.split('T')[0] : "";

    const html = `
        <label>Название проекта:</label>
        <input type="text" id="edit-proj-name" value="${project.name}" required>
        <br>
        <label>Описание:</label>
        <textarea id="edit-proj-desc" rows="3" style="width: 100%; box-sizing: border-box;">${project.description || ""}</textarea>
        <br>
        <label>Дата начала:</label>
        <input type="date" id="edit-proj-start" value="${startVal}" required>
        <br>
        <label>Дата окончания:</label>
        <input type="date" id="edit-proj-end" value="${endVal}" required>
        
        <p id="proj-edit-error" style="color: red;"></p>

        <div style="margin-top: 15px;">
             <button id="btn-delete-proj" style="background-color: #d32f2f; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; float: left;">Удалить проект</button>
        </div>
        <div style="clear: both;"></div>
    `;

    openModal("Редактирование проекта", html, async () => {
        return await updateProject(subjectId, projectId);
    });

    document.getElementById("btn-delete-proj").onclick = () => deleteProject(subjectId, projectId);
}

async function updateProject(subjectId, projectId) {
    const name = document.getElementById("edit-proj-name").value;
    const description = document.getElementById("edit-proj-desc").value;
    const startDate = document.getElementById("edit-proj-start").value;
    const endDate = document.getElementById("edit-proj-end").value;
    const errorP = document.getElementById("proj-edit-error");

    if (!name || !startDate || !endDate) {
        errorP.textContent = "Заполните обязательные поля";
        return false;
    }

    const payload = {
        name: name,
        description: description,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
    };

    try {
        const res = await fetch(`${API_BASE}/subjects/${subjectId}/projects/${projectId}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            errorP.textContent = await res.text();
            return false;
        }
        await loadProjects(subjectId); // Обновляем список и граф
        return true;
    } catch (e) {
        errorP.textContent = e.message;
        return false;
    }
}

async function deleteProject(subjectId, projectId) {
    if (!confirm("Вы уверены? Удаление проекта удалит все задачи внутри него.")) return;
    try {
        const res = await fetch(`${API_BASE}/subjects/${subjectId}/projects/${projectId}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        if (res.ok) {
            document.getElementById("modal").style.display = "none";
            await loadProjects(subjectId);
        } else {
            alert(await res.text());
        }
    } catch (e) {
        alert(e.message);
    }
}

async function showSubjectInfo() {
    const subjectId = selectSubject.value;
    if (!subjectId) return;
    try {
        const subject = await fetchJson(`${API_BASE}/Subject/${subjectId}`, { headers: getAuthHeaders() });
        if (curUser.role !== "Teacher") {
            const start = subject.startDate ? new Date(subject.startDate).toLocaleDateString('ru-RU') : '—';
            const end = subject.endDate ? new Date(subject.endDate).toLocaleDateString('ru-RU') : '—';
            const groups = subject.allowedGroups ? subject.allowedGroups.join(', ') : '—';
            const html = `
                <p><b>Название:</b> ${subject.name}</p>
                <p><b>Описание:</b> ${subject.discription || '—'}</p>
                <p><b>Даты:</b> ${start} — ${end}</p>
                <p><b>Группы:</b> ${groups}</p>
            `;
            openModal("О предмете", html, async () => true);
            return;
        }

        const startVal = subject.startDate ? subject.startDate.split('T')[0] : "";
        const endVal = subject.endDate ? subject.endDate.split('T')[0] : "";
        const groupsVal = subject.allowedGroups ? subject.allowedGroups.join(', ') : "";

        const html = `
            <label>Название предмета:</label>
            <input type="text" id="edit-subject-name" value="${subject.name}" required>
            <br>
            <label>Описание:</label>
            <textarea id="edit-subject-description" rows="3" style="width: 100%; box-sizing: border-box;">${subject.discription || ""}</textarea>
            <br>
            <label>Дата начала:</label>
            <input type="date" id="edit-subject-start" value="${startVal}" required>
            <br>
            <label>Дата окончания:</label>
            <input type="date" id="edit-subject-end" value="${endVal}" required>
            <br>
            <label>Группы (через запятую):</label>
            <input type="text" id="edit-subject-groups" value="${groupsVal}" required>
            <p id="subject-edit-error" style="color: red;"></p>
            <div style="margin-top: 15px;">
                <button id="btn-delete-subject" style="background-color: #d32f2f; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; float: left;">Удалить предмет</button>
            </div>
            <div style="clear: both;"></div>
        `;

        openModal("Редактирование предмета", html, async () => {
            return await updateSubject(subjectId);
        });

        document.getElementById("btn-delete-subject").onclick = () => deleteSubject(subjectId);
    } catch (e) {
        alert("Не удалось загрузить информацию о предмете");
    }
}

async function updateSubject(subjectId) {
    const name = document.getElementById("edit-subject-name").value;
    const description = document.getElementById("edit-subject-description").value;
    const startDate = document.getElementById("edit-subject-start").value;
    const endDate = document.getElementById("edit-subject-end").value;
    const groupsStr = document.getElementById("edit-subject-groups").value;
    const errorP = document.getElementById("subject-edit-error");

    const allowedGroups = groupsStr.split(',').map(g => parseInt(g.trim())).filter(g => !isNaN(g));

    if (!name || !startDate || !endDate || allowedGroups.length === 0) {
        errorP.textContent = "Заполните все обязательные поля";
        return false;
    }

    const payload = {
        name: name,
        discription: description,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        allowedGroups: allowedGroups
    };

    try {
        const res = await fetch(`${API_BASE}/Subject/${subjectId}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            errorP.textContent = await res.text();
            return false;
        }
        await loadSubjects();
        return true;
    } catch (e) {
        errorP.textContent = e.message;
        return false;
    }
}

async function deleteSubject(subjectId) {
    if (!confirm("Вы уверены? Это удалит предмет, все проекты и задачи внутри него!")) return;
    try {
        const res = await fetch(`${API_BASE}/Subject/${subjectId}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        if (res.ok) {
            document.getElementById("modal").style.display = "none";
            location.reload();
        } else {
            alert(await res.text());
        }
    } catch (e) {
        alert(e.message);
    }
}