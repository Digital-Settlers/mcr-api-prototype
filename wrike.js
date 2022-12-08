/**
 * API endpoints
 */
const authEndpoint = "https://login.wrike.com/oauth2/token";
const apiBaseEndpoint = "https://www.wrike.com/api/v4";

/**
 * Wrike credentials
 */
// const wrikeAuthUsername = "username utente Wrike";
// const wrikeAuthPassword = "password utente Wrike";
const rootFolderID = "IEAFTKXTI46MGBYJ";
const testUserID = "KUAPJSQV";

/**
 * Wrike API authentication
 */
// const wrikeClientID = "wrikeClientID App Wrike";
// const wrikeClientSecret = "wrikeClientSecret App Wrike";
const authHeader = `Basic ${btoa(
	[wrikeClientID, wrikeClientSecret].join(":")
)}`;

/**
 * Authentication token
 */
// let authData = null;
let authData = {
	id_token: wrikeAuthToken,
};

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
	console.log(data);
	const projects = data.data;
	let message = `<p>Progetti:</p><ul>`;
	for (const project of projects) {
		message += `<li>${project.title} - ${project.id}</li>`;
	}
	message += `</ul>`;
	displayMessage(message);
});

buttonCreateProject.addEventListener("click", async () => {
	const projectName = prompt("Inserisci il nome del progetto");
	const data = await createProject(projectName);
	const project = data.data[0];
	let message = `<p>Progetto creato:</p><ul>`;
	message += `<li>Nome: ${project.title}</li>`;
	message += `<li>ID: ${project.id}</li>`;
	message += `</ul>`;
	displayMessage(message);
});

buttonAllTasks.addEventListener("click", async () => {
	const projectID = prompt("Inserisci l'id del progetto");
	const data = await getTasks(projectID);
	const tasks = data.data;
	let message = `<p>Tasks:</p><ul>`;
	for (const task of tasks) {
		// const estimated_hours = parseFloat(task.estimated_hours).toFixed(2);
		const estimated_hours = 0;
		const worked_hours = await (await getHours(task.id)).toFixed(2);
		message += `<li>${task.title}(${task.id}) - Ore stimate: ${estimated_hours} - Ore lavorate: ${worked_hours}</li>`;
	}
	message += `</ul>`;
	displayMessage(message);
});

buttonCreateTask.addEventListener("click", async () => {
	const projectID = prompt("Inserisci l'ID del progetto");
	const taskName = prompt("Inserisci il nome del task");
	const data = await createTask(projectID, taskName);
	const task = data.data[0];
	let message = `<p>Progetto creato:</p><ul>`;
	message += `<li>Nome: ${task.title}</li>`;
	message += `<li>ID: ${task.id}</li>`;
	message += `</ul>`;
	displayMessage(message);
});

buttonAddHours.addEventListener("click", async () => {
	const taskID = prompt("Inserisci l'id del task");
	const hours = prompt("Inserisci le ore da aggiungere");
	const trackedDate = apiFormatDate(new Date());
	const data = await addHours(taskID, hours, trackedDate);
	const task = data.data[0];
	const worked_hours = await (await getHours(taskID)).toFixed(2);
	let message = `<p>Task aggiornato:</p><ul>`;
	message += `<li>ID: ${task.id}</li>`;
	message += `<li>Ore aggiunte: ${task.hours}</li>`;
	message += `<li>Totale ore lavorate: ${worked_hours}</li>`;
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
			username: wrikeAuthUsername,
			password: wrikeAuthPassword,
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
	const data = await callApi("/folders?project=true");
	return data;
}

async function createProject(name) {
	const params = new URLSearchParams({
		title: name,
		project: JSON.stringify({
			// ownerIds: ["KUAPJQZJ"],
			// startDate: "2021-01-01",
			// endDate: "2021-12-31",
			// status: "Green",
		}),
	});
	const apiURL = `/folders/${rootFolderID}/folders?${params.toString()}`;
	const data = await callApi(apiURL, "POST");
	console.log(data);
	return data;
}

async function getTasks(projectID) {
	const data = await callApi(`/folders/${projectID}/tasks?descendants=true`);
	return data;
}

async function createTask(projectID, taskName) {
	const params = new URLSearchParams({
		title: taskName,
	});
	const data = await callApi(
		`/folders/${projectID}/tasks?${params.toString()}`,
		"POST"
	);
	return data;
}

async function addHours(taskID, hours, trackedDate) {
	const params = new URLSearchParams({
		hours: hours,
		trackedDate: trackedDate,
		onBehalfOf: testUserID,
	});
	const data = await callApi(
		`/tasks/${taskID}/timelogs?${params.toString()}`,
		"POST"
	);
	return data;
}

async function getHours(taskID) {
	const data = await getTimeblocks(taskID);
	const timeblocks = data.data;
	let hours = 0;
	timeblocks.forEach((timeblock) => {
		if (timeblock.hours) {
			hours += timeblock.hours;
		}
	});
	return parseFloat(hours);
}

async function getTimeblocks(taskID) {
	const data = await callApi(`/tasks/${taskID}/timelogs`);
	return data;
}

function apiFormatDate(date) {
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	return `${year}-${month}-${day}`;
}
