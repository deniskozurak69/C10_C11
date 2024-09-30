document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    loadTasks();
    enableDragAndDrop();
    setupSignalR();
});

function setupSignalR() {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/todoHub")
        .build();
    connection.start()
        .then(() => {
            console.log("Connected to SignalR hub!");
            connection.on("ReceiveTaskUpdate", (taskId) => {
                console.log("Received task update for task:", taskId);
                loadTasks();
                const taskItem = document.getElementById(taskId);
                if (taskItem) {
                    highlightTask(taskItem);
                }
            });
        })
        .catch(err => {
            console.error("SignalR connection error:", err.toString());
        });
}

function sendTaskUpdate(taskId) {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/todoHub")
        .build();
    connection.start()
        .then(() => {
            console.log("Sending task update for task:", taskId);
            return connection.invoke("SendTaskUpdate", taskId);
        })
        .then(() => {
            console.log("Task update sent successfully");
        })
        .catch(err => {
            console.error("Error sending task update:", err.toString());
        });
}

function highlightTask(taskItem) {
    taskItem.classList.add('highlight');
    setTimeout(() => {
        taskItem.classList.remove('highlight');
    }, 1000);
}

function addTask() {
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value.trim();
    if (taskText === '') return;
    const taskList = document.getElementById('taskList');
    const taskItem = document.createElement('li');
    taskItem.textContent = taskText;
    taskItem.setAttribute('draggable', true);
    taskItem.id = `task-${Date.now()}`;
    taskList.appendChild(taskItem);

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Видалити';
    removeButton.onclick = () => removeTask(taskItem);
    taskItem.appendChild(removeButton);

    highlightTask(taskItem);
    saveTasks();
    taskInput.value = '';
    enableDragAndDrop();
    sendTaskUpdate(taskItem.id);
}

function removeTask(taskItem) {
    highlightTask(taskItem);
    setTimeout(() => {
        taskItem.remove();
        saveTasks();
        sendTaskUpdate(taskItem.id);
    }, 500);
}

function saveTasks() {
    const tasks = [];
    document.querySelectorAll('#taskList li').forEach(taskItem => {
        tasks.push({ id: taskItem.id, text: taskItem.firstChild.textContent });
    });
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = '';
    tasks.forEach(task => {
        const taskItem = document.createElement('li');
        taskItem.textContent = task.text;
        taskItem.setAttribute('draggable', true);
        taskItem.id = task.id;
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Видалити';
        removeButton.onclick = () => removeTask(taskItem);
        taskItem.appendChild(removeButton);
        taskList.appendChild(taskItem);
    });
    enableDragAndDrop();
}

function enableDragAndDrop() {
    const taskList = document.getElementById('taskList');
    let draggedItem = null;

    taskList.addEventListener('dragstart', (e) => {
        draggedItem = e.target;
        e.target.classList.add('draggable');
        e.target.style.opacity = 0.5;
        highlightTask(draggedItem);
    });

    taskList.addEventListener('dragend', (e) => {
        e.target.classList.remove('draggable');
        e.target.style.opacity = '';
        saveTasks();
        sendTaskUpdate(draggedItem.id);
    });

    taskList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(taskList, e.clientY);
        if (afterElement == null) {
            taskList.appendChild(draggedItem);
        } else {
            taskList.insertBefore(draggedItem, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}