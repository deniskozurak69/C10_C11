document.addEventListener('DOMContentLoaded', () => {
    setupWebSocket();
    loadTasks();
    enableDragAndDrop();
});

let socket;

function setupWebSocket() {
    socket = new WebSocket('wss://localhost:44365/ws');

    socket.addEventListener('open', () => {
        console.log('Connected to WebSocket server');
    });

    socket.addEventListener('message', (event) => {
        const taskAction = JSON.parse(event.data);
        if (taskAction.action === 'add') {
            addTaskToList(taskAction.task, false);
        } else if (taskAction.action === 'remove') {
            removeTaskFromList(taskAction.taskId, false);
        } else if (taskAction.action === 'reorder') {
            reorderTasks(taskAction.taskOrder, false);
        }
        console.log('Message from server:', taskAction);
    });

    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
    });

    socket.addEventListener('close', () => {
        console.log('WebSocket connection closed');
    });
}

function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    } else {
        console.error('WebSocket is not open');
    }
}

function addTask() {
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value.trim();
    if (taskText === '') return;

    const taskId = `task-${Date.now()}`;
    addTaskToList({ id: taskId, text: taskText }, true);

    const message = {
        action: 'add',
        task: { id: taskId, text: taskText }
    };
    sendMessage(message);
    taskInput.value = '';
}

function addTaskToList(task, save = true) {
    const taskList = document.getElementById('taskList');
    const taskItem = document.createElement('li');
    taskItem.textContent = task.text;
    taskItem.setAttribute('draggable', true);
    taskItem.id = task.id;

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Видалити';
    removeButton.onclick = () => removeTask(taskItem);
    taskItem.appendChild(removeButton);

    taskList.appendChild(taskItem);
    highlightTask(taskItem);

    if (save) {
        saveTasks();
    }

    enableDragAndDrop();
}

function removeTask(taskItem) {
    const taskId = taskItem.id;
    highlightTask(taskItem);

    setTimeout(() => {
        taskItem.remove();
        saveTasks();

        const message = {
            action: 'remove',
            taskId: taskId
        };
        sendMessage(message);
    }, 500);
}

function removeTaskFromList(taskId, save = true) {
    const taskItem = document.getElementById(taskId);
    if (taskItem) {
        highlightTask(taskItem);
        setTimeout(() => {
            taskItem.remove();
            if (save) {
                saveTasks();
            }
        }, 500);
    }
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
        addTaskToList(task, false);
    });
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

        const taskOrder = Array.from(taskList.children).map(li => li.id);
        const message = {
            action: 'reorder',
            taskOrder: taskOrder
        };
        sendMessage(message);
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

function reorderTasks(taskOrder, save = true) {
    const taskList = document.getElementById('taskList');
    taskOrder.forEach(taskId => {
        const taskItem = document.getElementById(taskId);
        if (taskItem) {
            taskList.appendChild(taskItem);
        }
    });
    if (save) {
        saveTasks();
    }
}

function highlightTask(taskItem) {
    taskItem.classList.add('highlight');
    setTimeout(() => {
        taskItem.classList.remove('highlight');
    }, 1000);
}