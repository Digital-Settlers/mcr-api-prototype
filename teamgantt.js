/**
 * API endpoints
 */
const authEndpoint = `https://auth.teamgantt.com/oauth2/token`;
const apiBaseEndpoint = "https://api.teamgantt.com/v1";

/**
 * TeamGantt credentials
 */
// const authUsername = "username utente TeamGantt";
// const authPassword = "password utente TeamGantt";
const companyID = 1973722;

/**
 * Teamgantt API authentication
 */
// const clientID = "ClientID App TeamGantt";
// const clientSecret =	"ClientSecret App TeamGantt";
const authHeader = `Basic ${btoa([clientID, clientSecret].join(":"))}`;

/**
 * Authentication token
 */
let authData = null;

/**
 * DOM elements
 */
const buttonAuthenticate = document.getElementById("authenticate");
const buttonAllProjects = document.getElementById("projects");
const buttonCreateProject = document.getElementById("create-project");
const buttonAllTasks = document.getElementById("tasks");
const buttonCreateTask = document.getElementById("create-task");
const buttonAddHours = document.getElementById("add-hours");
const canvas = document.getElementById("canvas");

/**
 * Event listeners
 */
buttonAllProjects.addEventListener("click", async () => {
	const data = await getProjects();
	const projects = data.projects;
	let message = `<p>Progetti:</p><ul>`;
	for (const project of projects) {
		message += `<li>${project.name} - ${project.id}</li>`;
	}
	message += `</ul>`;
	displayMessage(message);
});

buttonCreateProject.addEventListener("click", async () => {
	const projectName = prompt("Inserisci il nome del progetto");
	const project = await createProject(projectName);
	let message = `<p>Progetto creato:</p><ul>`;
	message += `<li>Nome: ${project.name}</li>`;
	message += `<li>ID: ${project.id}</li>`;
	message += `</ul>`;
	displayMessage(message);
});

buttonAllTasks.addEventListener("click", async () => {
	const projectID = prompt("Inserisci l'id del progetto");
	const tasks = await getTasks(projectID);
	let message = `<p>Tasks:</p><ul>`;
	for (const task of tasks) {
		const estimated_hours = parseFloat(task.estimated_hours).toFixed(2);
		const worked_hours = await (await getHours(task.id)).toFixed(2);
		message += `<li>${task.name}(${task.id}) - Ore stimate: ${estimated_hours} - Ore lavorate: ${worked_hours}</li>`;
	}
	message += `</ul>`;
	displayMessage(message);
});

buttonCreateTask.addEventListener("click", async () => {
	const projectID = prompt("Inserisci l'ID del progetto");
	const taskName = prompt("Inserisci il nome del task");
	const taskType = "task";
	const task = await createTask(projectID, taskName, taskType);
	let message = `<p>Progetto creato:</p><ul>`;
	message += `<li>Nome: ${task.name}</li>`;
	message += `<li>ID: ${task.id}</li>`;
	message += `</ul>`;
	displayMessage(message);
});

buttonAddHours.addEventListener("click", async () => {
	const taskID = prompt("Inserisci l'id del task");
	const hours = prompt("Inserisci le ore da aggiungere");
	const endDate = new Date();
	const startDate = new Date(endDate - hours * 60 * 60 * 1000);
	const task = await addHours(taskID, startDate, endDate);
	const worked_hours = await (await getHours(taskID)).toFixed(2);
	let message = `<p>Task aggiornato:</p><ul>`;
	message += `<li>Nome: ${task.task_name}</li>`;
	message += `<li>ID: ${task.id}</li>`;
	message += `<li>Ore lavorate: ${worked_hours}</li>`;
	message += `</ul>`;
	displayMessage(message);
});

/**
 * API functions
 */
async function callApi(endpoint, method = "GET", body = null) {
	console.log(authData);
	if (!authData) {
		authData = await authenticate();
		if (authData.id_token) {
			const message = `Autenticazione riuscita; ricevuto token: ${authData.id_token}`;
			console.info(message);
		} else {
			const message = "Autenticazione fallita.";
			displayMessage(message, "error");
			throw new Error(message);
		}
	}
	const response = await fetch(apiBaseEndpoint + endpoint, {
		method: method,
		headers: new Headers({
			Authorization: `Bearer ${authData.id_token}`,
			"Content-Type": "application/json",
		}),
		body: body,
	});
	if (!response.ok) {
		const message = `An error has occured: ${response.status}`;
		displayMessage(message, "error");
		throw new Error(message);
	}
	const data = await response.json();
	return data;
}

function displayMessage(message, logLevel = null) {
	canvas.innerHTML = message;
	if (logLevel) {
		switch (logLevel) {
			case "error":
				console.error(message);
				break;
			case "warn":
				console.warn(message);
				break;
			case "info":
				console.info(message);
				break;
			default:
				console.log(message);
				break;
		}
	}
}

async function authenticate() {
	const response = await fetch(authEndpoint, {
		method: "POST",
		headers: new Headers({
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: authHeader,
		}),
		body: new URLSearchParams({
			grant_type: "password",
			username: authUsername,
			password: authPassword,
		}),
	});
	if (!response.ok) {
		const message = `An error has occured: ${response.status}`;
		displayMessage(message, "error");
		throw new Error(message);
	}
	const data = await response.json();
	return data;
}

async function getProjects() {
	const data = await callApi("/projects/all?fields=name");
	return data;
}

async function createProject(name) {
	const data = await callApi(
		"/projects",
		"POST",
		JSON.stringify({
			name: name,
			company_id: companyID,
		})
	);
	return data;
}

async function getTasks(projectID) {
	const data = await callApi(`/tasks?project_ids=${projectID}`);
	return data;
}

async function createTask(projectID, taskName, taskType) {
	const data = await callApi(
		"/tasks",
		"POST",
		JSON.stringify({
			project_id: parseInt(projectID),
			name: taskName,
			type: taskType,
		})
	);
	return data;
}

async function addHours(taskID, startDate, endDate) {
	const data = await callApi(
		"/times",
		"POST",
		JSON.stringify({
			task_id: taskID,
			start_time: apiFormatDate(startDate),
			end_time: apiFormatDate(endDate),
		})
	);
	return data;
}

async function getHours(taskID) {
	const timeblocks = await getTimeblocks(taskID);
	let seconds = 0;
	timeblocks.forEach((timeblock) => {
		if (timeblock.end_time && timeblock.start_time) {
			const endTime = new Date(timeblock.end_time);
			const startTime = new Date(timeblock.start_time);
			const timeDiff = endTime - startTime;
			seconds += timeDiff;
		}
	});
	return parseFloat(seconds / 1000 / 60 / 60);
}

async function getTimeblocks(taskID) {
	const data = await callApi(`/tasks/${taskID}/timeblocks`);
	return data;
}

function apiFormatDate(date) {
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
