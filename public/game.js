const socket = io();

// Configuración del Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Configuración del Mundo y Cámara
const WORLD_SIZE = 1500; // El mundo es un cuadrado de 1500x1500px
const camera = { x: 0, y: 0 };

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Datos del juego
let players = {};
const speed = 5;
const myPlayerSize = 50; // Tamaño del capibara en pantalla

// Controles de movimiento
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    e: false
};

const fireflies = [];
for (let i = 0; i < 60; i++) {
    fireflies.push({
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 3 + 1,
        life: Math.random() * Math.PI * 2
    });
}
const particles = [];
function spawnParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1.0,
            color
        });
    }
}

// Apps eliminadas del centro, ahora están en el Sidebar
let appToOpen = null;
let playerName = '';
let selectedChar = 'capibara'; // Personaje elegido por defecto
let plansQueue = [];
let activePolls = [];
let itPlayerId = null; // Quien "la trae" en las agarradas
let lastTagTime = 0; // Cooldown para no re-agarrar instantáneo

// Escuchar teclas presionadas
window.addEventListener('keydown', (e) => {
    if (document.activeElement.id === 'chat-input') {
        if (e.key === 'Enter') enviarMensaje();
        return; // No mover si estamos escribiendo
    }
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if (keys.hasOwnProperty(key)) keys[key] = true;

    // Si presionamos 'e' y estamos cerca de una app
    if (key === 'e' && appToOpen) {
        abrirApp(appToOpen);
    }
});

// Lógica de Música
const bgMusic = document.getElementById('bg-music');
const musicToggle = document.getElementById('music-toggle');
if (musicToggle) {
    musicToggle.onclick = () => {
        if (bgMusic.paused) {
            bgMusic.play().then(() => {
                musicToggle.innerText = "🎵 Música: ON";
                document.getElementById('now-playing').style.display = "block";
            }).catch(e => alert("Interactúa con la página primero para poner música."));
        } else {
            bgMusic.pause();
            musicToggle.innerText = "🎵 Música: OFF";
            document.getElementById('now-playing').style.display = "none";
        }
    };
}

// Cerrar modales
if (document.querySelector('.close-btn')) document.querySelector('.close-btn').onclick = () => document.getElementById('planes-modal').style.display = 'none';
if (document.querySelector('.close-create-btn')) document.querySelector('.close-create-btn').onclick = () => document.getElementById('create-plan-modal').style.display = 'none';
if (document.querySelector('.close-poll-btn')) document.querySelector('.close-poll-btn').onclick = () => document.getElementById('poll-modal').style.display = 'none';
if (document.getElementById('create-plan-btn')) document.getElementById('create-plan-btn').onclick = () => {
    if (playerName === 'Capibara Anónimo' || !playerName) {
        alert("¡Necesitas una cuenta para crear planes! Por favor, recarga y pon tu nombre real.");
        return;
    }
    document.getElementById('create-plan-modal').style.display = 'flex';
};

// --- LÓGICA DE LAS AGARRADAS ---
socket.on('itUpdate', (id) => {
    itPlayerId = id;
    if (players[id]) {
        spawnParticles(players[id].x + 35, players[id].y + 20, '#ff5555', 20);
    }
});

socket.on('gameEvent', (data) => {
    showNotification(data.text, data.type);
});

function showNotification(text, type = 'default') {
    const container = document.getElementById('game-notifications');
    if (!container) return;
    const notif = document.createElement('div');
    notif.className = `notif ${type}`;
    notif.innerText = text;
    container.appendChild(notif);
    setTimeout(() => notif.remove(), 4500);
}

// --- LÓGICA DE PLANES (Tinder) ---
socket.on('currentPlans', (plans) => {
    plansQueue = plans;
    renderPlanCard();
});

socket.on('newPlan', (plan) => {
    plansQueue.unshift(plan);
    renderPlanCard();
});
// Función para renderizar planes movida o eliminada porque el banner ha sido quitado.

if (document.getElementById('submit-plan-btn')) {
    document.getElementById('submit-plan-btn').onclick = () => {
        const title = document.getElementById('plan-title').value;
        const desc = document.getElementById('plan-desc').value;
        const img = document.getElementById('plan-img').value;
        if (title && desc) {
            socket.emit('createPlan', { title, desc, img });
            document.getElementById('create-plan-modal').style.display = 'none';
            document.getElementById('plan-title').value = "";
            document.getElementById('plan-desc').value = "";
            document.getElementById('plan-img').value = "";
        }
    };
}

// --- LÓGICA DE ENCUESTAS ---
socket.on('currentPolls', (polls) => {
    activePolls = polls;
    renderPolls();
});

socket.on('newPoll', (poll) => {
    activePolls.unshift(poll);
    renderPolls();
});

socket.on('updatePolls', (polls) => {
    activePolls = polls;
    renderPolls();
});

function renderPolls() {
    const listWrapper = document.getElementById('polls-list-wrapper');
    if (!listWrapper) return;
    if (activePolls.length === 0) {
        listWrapper.innerHTML = `<p>No hay encuestas activas.</p>`;
        return;
    }
    listWrapper.innerHTML = activePolls.map(poll => {
        const total = poll.votes.reduce((a, b) => a + b, 0) || 1;
        return `
            <div class="poll-item" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding: 10px 0;">
                <h4 style="margin:0; color:#bd93f9;">${poll.question}</h4>
                <div class="poll-actions" style="margin-top:10px;">
                    ${poll.options.map((opt, idx) => `
                        <button class="poll-vote-btn" data-poll-id="${poll.id}" data-opt-idx="${idx}" style="width:100%; margin:3px 0; padding:8px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.2); color:white; cursor:pointer;">
                            ${opt} (${Math.round(poll.votes[idx] / total * 100)}%)
                            <div class="progress-bar" style="height:3px; margin-top:4px;"><div style="width:${(poll.votes[idx] / total * 100)}%; height:100%; background:#50fa7b;"></div></div>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

if (document.getElementById('open-create-poll-btn')) {
    document.getElementById('open-create-poll-btn').onclick = () => {
        if (playerName === 'Capibara Anónimo' || !playerName) {
            alert("¡Identifícate con cuenta!");
            return;
        }
        document.getElementById('create-poll-modal').style.display = 'flex';
    };
}

if (document.getElementById('submit-poll-btn')) {
    document.getElementById('submit-poll-btn').onclick = () => {
        const q = document.getElementById('poll-q-input').value;
        const o1 = document.getElementById('poll-opt1-input').value;
        const o2 = document.getElementById('poll-opt2-input').value;
        if (q && o1 && o2) {
            socket.emit('createPoll', { question: q, options: [o1, o2] });
            document.getElementById('create-poll-modal').style.display = 'none';
            document.getElementById('poll-q-input').value = "";
            document.getElementById('poll-opt1-input').value = "";
            document.getElementById('poll-opt2-input').value = "";
        }
    };
}

if (document.querySelector('.close-create-poll-btn')) document.querySelector('.close-create-poll-btn').onclick = () => document.getElementById('create-poll-modal').style.display = 'none';

// Evento único para manejar CLICS en botones dinámicos
document.addEventListener('click', (e) => {
    // Eventos de Votación y Swipe de la interfaz eliminados para liberar espacio.

    // Votación
    if (e.target.closest('.poll-vote-btn')) {
        const btn = e.target.closest('.poll-vote-btn');
        const pollId = parseInt(btn.getAttribute('data-poll-id'));
        const optionIndex = parseInt(btn.getAttribute('data-opt-idx'));
        if (playerName === 'Capibara Anónimo' || !playerName) {
            alert("⚠️ ¡Solo con cuenta!");
        } else {
            socket.emit('votePoll', { pollId, optionIndex });
        }
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (keys.hasOwnProperty(key)) keys[key] = false;
});

// Lógica de Joystick (Dial)
let joystickActive = false;
let joystickData = { x: 0, y: 0 };

const setupJoystick = () => {
    const container = document.getElementById('joystick-container');
    const base = document.getElementById('joystick-base');
    const stick = document.getElementById('joystick-stick');
    if (!container || !base || !stick) return;

    window.addEventListener('touchstart', () => { container.style.display = 'flex'; }, { once: true });

    const handleMove = (e) => {
        if (!joystickActive) return;
        const touch = e.touches ? e.touches[0] : e;
        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = rect.width / 2;
        if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
        joystickData = { x: dx / maxDist, y: dy / maxDist };
        keys.a = joystickData.x < -0.3; keys.d = joystickData.x > 0.3;
        keys.w = joystickData.y < -0.3; keys.s = joystickData.y > 0.3;
    };

    base.addEventListener('touchstart', (e) => { e.preventDefault(); joystickActive = true; });
    window.addEventListener('touchmove', (e) => { handleMove(e); });
    window.addEventListener('touchend', () => {
        joystickActive = false;
        stick.style.transform = `translate(0, 0)`;
        joystickData = { x: 0, y: 0 };
        keys.a = keys.d = keys.w = keys.s = false;
    });

    const btnInteract = document.getElementById('btn-interact');
    if (btnInteract) {
        btnInteract.addEventListener('touchstart', (e) => { e.preventDefault(); if (appToOpen) abrirApp(appToOpen); });
    }
};
setupJoystick();

function abrirApp(app) {
    if (app.name === "Muro de Planes") {
        document.getElementById('planes-modal').style.display = 'flex';
        renderPlanCard();
    } else if (app.name === "Encuestas") {
        document.getElementById('poll-modal').style.display = 'flex';
        renderPolls();
    } else if (app.name === "Minijuegos") {
        const sidebar = document.getElementById('games-sidebar');
        if (sidebar) sidebar.classList.add('open');
    }
}

const charOptions = document.querySelectorAll('.char-option');
charOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        charOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        selectedChar = opt.getAttribute('data-char');
        console.log("Personaje seleccionado:", selectedChar);
    });
});

function unirJuego() {
    const nameInput = document.getElementById('username-input');
    playerName = nameInput.value.trim() || 'Capibara Anónimo';
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('ui-overlay').style.display = 'flex';
    socket.emit('joinGame', { name: playerName, charType: selectedChar });
}

if (document.getElementById('join-btn')) {
    document.getElementById('join-btn').addEventListener('click', unirJuego);
}

document.getElementById('username-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') unirJuego();
});

// EVENTOS MULTIJUGADOR
socket.on('currentPlayers', (serverPlayers) => { players = serverPlayers; });
socket.on('newPlayer', (playerInfo) => { players[playerInfo.id] = playerInfo; });
socket.on('playerMoved', (playerInfo) => {
    if (players[playerInfo.id]) {
        // Actualizar todo el objeto para incluir charType, nombre, etc.
        players[playerInfo.id] = playerInfo;
    }
});
socket.on('disconnectPlayer', (playerId) => { delete players[playerId]; });
socket.on('playerChat', (data) => {
    if (players[data.id]) {
        players[data.id].message = data.message;
        players[data.id].messageTimer = Date.now();
    }
});

// --- LÓGICA DE MOVIMIENTO Y CÁMARA ---
function updateMovement() {
    if (!players[socket.id]) return;
    let moved = false;
    let me = players[socket.id];

    let oldX = me.x;

    if (keys.ArrowLeft || keys.a) { me.x -= speed; moved = true; me.facingLeft = true; }
    if (keys.ArrowRight || keys.d) { me.x += speed; moved = true; me.facingLeft = false; }
    if (keys.ArrowUp || keys.w) { me.y -= speed; moved = true; }
    if (keys.ArrowDown || keys.s) { me.y += speed; moved = true; }

    me.y = Math.max(0, Math.min(WORLD_SIZE - 50, me.y));

    // Lógica del muelle y botes en el río
    const inDockY = me.y > WORLD_SIZE / 2 - 50 && me.y < WORLD_SIZE / 2 + 50;
    if (me.x >= 1250) {
        if (oldX < 1250 && !inDockY) {
            me.x = 1249; // Bloqueado al agua si no es el muelle
        } else {
            me.x = Math.max(0, Math.min(WORLD_SIZE - 50, me.x));
        }
    } else if (me.x < 1250) {
        if (oldX >= 1250 && !inDockY) {
            me.x = 1250; // Bloqueado a tierra si no es el muelle
        } else {
            me.x = Math.max(0, Math.min(1249, me.x));
        }
    }

    camera.x = me.x - canvas.width / 2 + 25;
    camera.y = me.y - canvas.height / 2 + 25;
    camera.x = Math.max(0, Math.min(WORLD_SIZE - canvas.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_SIZE - canvas.height, camera.y));

    if (moved) {
        socket.emit('playerMove', { x: me.x, y: me.y, facingLeft: me.facingLeft });
        if (itPlayerId === socket.id) {
            const now = Date.now();
            if (now - lastTagTime > 3000) {
                Object.keys(players).forEach(id => {
                    if (id !== socket.id) {
                        const other = players[id];
                        if (getDist(me.x + 25, me.y + 20, other.x + 25, other.y + 20) < 45) {
                            socket.emit('tagPlayer', id);
                            lastTagTime = now;
                        }
                    }
                });
            }
        }
    }

    const stands = [
        { x: WORLD_SIZE / 2 - 200, y: WORLD_SIZE / 2 - 120, name: "Muro de Planes" },
        { x: WORLD_SIZE / 2 + 200, y: WORLD_SIZE / 2 - 120, name: "Encuestas" },
        { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 + 200, name: "Minijuegos" }
    ];

    appToOpen = null;
    stands.forEach(stand => { if (getDist(me.x + 25, me.y + 20, stand.x, stand.y) < 80) appToOpen = stand; });
    const interactBtn = document.getElementById('interact-btn') || document.getElementById('btn-interact');
    if (interactBtn) {
        interactBtn.style.opacity = appToOpen ? "1" : "0.5";
        interactBtn.style.transform = appToOpen ? "scale(1.1)" : "scale(1.0)";
    }
}

function getDist(x1, y1, x2, y2) { return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2); }

// --- RENDERIZADO ---
function DrawCapibara(ctx, x, y, color, walkTime, facingLeft, name, isIT, inBoat = false) {
    const isMoving = walkTime > 0;
    const bounce = isMoving ? Math.abs(Math.sin(walkTime * 8)) * 3 : Math.sin(Date.now() * 0.003) * 1.5;
    const breathe = Math.sin(Date.now() * 0.002) * 1.5;
    ctx.save();
    ctx.translate(x + 25, y + 20);
    if (isIT) {
        const glow = Math.sin(Date.now() * 0.01) * 15 + 15;
        ctx.shadowBlur = glow; ctx.shadowColor = '#ff5555';
        ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 35, 25, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (facingLeft) ctx.scale(-1, 1);

    if (!inBoat) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(0, 18, 25, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
    const bodyColor = '#9e7647'; ctx.fillStyle = bodyColor;
    const legOffset = isMoving ? Math.sin(walkTime * 10) * 5 : 0;

    if (!inBoat) {
        const toeColor = '#795548';
        ctx.save();
        ctx.translate(-15, 12 + legOffset);
        ctx.fillStyle = bodyColor;
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = toeColor;
        ctx.beginPath(); ctx.arc(-3, 8, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, 8, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(15, 12 - legOffset);
        ctx.fillStyle = bodyColor;
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = toeColor;
        ctx.beginPath(); ctx.arc(-3, 8, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, 8, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.ellipse(0, 0, 32 + breathe, 24 + bounce, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(24, -14 + bounce / 2); ctx.rotate(-0.1);
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#212121'; 
    const isBlinking = (Math.sin(Date.now() * 0.005) > 0.98); // Parpadeo aleatorio basado en el tiempo
    if (isBlinking) {
        ctx.fillRect(4, -6, 5, 2); // Ojo cerrado
    } else {
        ctx.beginPath(); ctx.arc(7, -5, 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(8, -6.5, 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#795548'; ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.ellipse(12, 3, 8, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.arc(16, 1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bodyColor; ctx.beginPath(); ctx.ellipse(-2, -14, 6, 8, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
}

function DrawMono(ctx, x, y, color, walkTime, facingLeft, name, isIT, inBoat = false) {
    const isMoving = walkTime > 0;
    const bounce = isMoving ? Math.abs(Math.sin(walkTime * 8)) * 4 : Math.sin(Date.now() * 0.003) * 2;
    const breathe = Math.sin(Date.now() * 0.002) * 1.2;
    
    ctx.save();
    ctx.translate(x + 25, y + 20);
    
    if (isIT) {
        const glow = Math.sin(Date.now() * 0.01) * 15 + 15;
        ctx.shadowBlur = glow; ctx.shadowColor = '#ff5555';
        ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
    }
    
    if (facingLeft) ctx.scale(-1, 1);

    if (!inBoat) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(0, 18, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
    }

    const monkeyColor = '#6d4c41'; 
    const faceColor = '#ffccbc';   
    const legOffset = isMoving ? Math.sin(walkTime * 10) * 8 : 0;

    if (!inBoat) {
        ctx.lineWidth = 6; ctx.strokeStyle = monkeyColor; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-10, 5); ctx.lineTo(-18, 15 + legOffset); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(18, 15 - legOffset); ctx.stroke();
    }

    ctx.fillStyle = monkeyColor;
    ctx.beginPath(); ctx.ellipse(0, 0, 18 + breathe, 22 + bounce, 0, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.translate(0, -25 + bounce / 2);
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-15, -2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(15, -2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = faceColor;
    ctx.beginPath(); ctx.arc(-15, -2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(15, -2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 2, 11, 9, 0, 0, Math.PI * 2); ctx.fill(); // CARA DEL MONO
    
    // Ojos
    ctx.fillStyle = '#212121';
    const isBlinkingMono = (Math.sin(Date.now() * 0.004) > 0.97); 
    if (isBlinkingMono) {
        ctx.fillRect(-7, -2, 6, 2); 
        ctx.fillRect(1, -2, 6, 2);  
    } else {
        ctx.beginPath(); ctx.arc(-4, -1, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(4, -1, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = monkeyColor; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-10, 10); ctx.bezierCurveTo(-30, 10, -30, -20, -15, -25); ctx.stroke();

    ctx.restore();
}

function drawPlayerLabel(ctx, p) {
    ctx.fillStyle = 'white'; ctx.font = 'bold 12px Fredoka'; ctx.textAlign = 'center';
    ctx.shadowBlur = 4; ctx.shadowColor = 'black';
    const cleanName = (typeof p.name === 'string') ? p.name : (p.name?.name || "Anónimo");
    const label = p.charType === 'monito' ? '🐒 ' + cleanName : '🦫 ' + cleanName;
    ctx.fillText(label, p.x + 25, p.y - 48);
    ctx.shadowBlur = 0;
}

function drawPalmTree(x, y, scale = 1.0) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.fillStyle = '#4e342e';
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.lineTo(4, -55); ctx.lineTo(-4, -55); ctx.fill();
    ctx.translate(0, -55); ctx.fillStyle = '#2e7d32';
    for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / 6 + Math.sin(Date.now() * 0.001 + i) * 0.1);
        ctx.beginPath(); ctx.ellipse(20, 10, 30, 12, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    ctx.restore();
}

function drawForestFloor() {
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, WORLD_SIZE);
    oceanGrad.addColorStop(0, '#0277bd'); oceanGrad.addColorStop(1, '#01579b');
    ctx.fillStyle = oceanGrad; ctx.fillRect(-500, -500, WORLD_SIZE + 1000, WORLD_SIZE + 1000);
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath(); drawRoundedRect(ctx, 0, 0, 1300, WORLD_SIZE, 80); ctx.fill();
    ctx.fillStyle = '#2e7d32';
    drawRoundedRect(ctx, WORLD_SIZE / 2 - 45, 50, 90, WORLD_SIZE - 100, 25); ctx.fill();
    drawRoundedRect(ctx, 50, WORLD_SIZE / 2 - 45, 1250, 90, 25); ctx.fill();
    ctx.fillStyle = '#388e3c';
    ctx.beginPath(); ctx.arc(WORLD_SIZE / 2, WORLD_SIZE / 2, 120, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 4; ctx.stroke();

    // Muelle interactivo para los botes
    ctx.fillStyle = '#5d4037';
    drawRoundedRect(ctx, 1250, WORLD_SIZE / 2 - 30, 80, 60, 5); ctx.fill();

    // Botes anclados a la espera
    drawStaticBoat(1310, WORLD_SIZE / 2 - 80);
    drawStaticBoat(1310, WORLD_SIZE / 2 + 80);

    // Boulevard de Yarinacocha (Parque junto al agua)
    // Pavimento decorativo del parque
    ctx.fillStyle = '#9e9e9e'; // Gris cemento/piedra
    ctx.beginPath(); drawRoundedRect(ctx, 1100, WORLD_SIZE / 2 - 200, 150, 400, 20); ctx.fill();
    ctx.fillStyle = '#757575'; // Borde oscuro
    ctx.lineWidth = 4; ctx.stroke();

    // Caminos internos del parque
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(1150, WORLD_SIZE / 2 - 180, 50, 360);
    ctx.fillRect(1120, WORLD_SIZE / 2 - 25, 110, 50);

    // Letrero "Boulevard Capibacocha" (Estilo cartel de madera)
    // Poste central
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(1192, WORLD_SIZE / 2 - 160, 16, 40);

    // Panel de madera
    ctx.fillStyle = '#5d4037';
    ctx.beginPath(); drawRoundedRect(ctx, 1100, WORLD_SIZE / 2 - 185, 200, 35, 12); ctx.fill();
    ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#4e342e'; // Detalle de sombra interior
    ctx.beginPath(); drawRoundedRect(ctx, 1105, WORLD_SIZE / 2 - 180, 190, 25, 8); ctx.fill();

    // Texto del letrero
    ctx.fillStyle = '#ffecb3'; // Color crema elegante
    ctx.font = 'bold 15px Fredoka';
    ctx.textAlign = 'center';
    ctx.fillText("BOULEVARD CAPIBACOCHA", 1200, WORLD_SIZE / 2 - 162);

    // Bancas para sentarse mirando al lago
    drawParkBench(1220, WORLD_SIZE / 2 - 100);
    drawParkBench(1220, WORLD_SIZE / 2 + 100);
    drawParkBench(1220, WORLD_SIZE / 2 + 30);
    drawParkBench(1220, WORLD_SIZE / 2 - 30);
}

function drawParkBench(x, y) {
    ctx.fillStyle = '#4e342e'; // Madera oscura
    ctx.fillRect(x, y, 8, 20); // Pata izq
    ctx.fillRect(x + 22, y, 8, 20); // Pata der
    ctx.fillStyle = '#795548'; // Madera clara asiento
    ctx.fillRect(x - 5, y + 5, 40, 10); // Asiento
    ctx.fillRect(x - 5, y - 5, 40, 6); // Respaldo
}

function drawStaticBoat(x, y) {
    const bob = Math.sin(Date.now() * 0.002 + x) * 2;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(-5, 8, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#795548';
    ctx.beginPath(); ctx.ellipse(-5, 5, 30, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3e2723';
    ctx.beginPath(); ctx.ellipse(-5, 3, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawPlayerBoat(ctx, x, y, facingLeft) {
    const bob = Math.sin(Date.now() * 0.003) * 2;
    ctx.save();
    ctx.translate(x + 25, y + 25 + bob);
    if (facingLeft) ctx.scale(-1, 1);

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(-5, 8, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#795548';
    ctx.beginPath(); ctx.ellipse(-5, 5, 30, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3e2723';
    ctx.beginPath(); ctx.ellipse(-5, 3, 22, 8, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(15, 15); ctx.stroke();
    ctx.restore();
}

function drawDayAtmosphere(now) {
    ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = 'white';
    for (let i = 0; i < 6; i++) {
        const cx = ((now * (0.05 + i * 0.01) + i * 350) % (canvas.width + 400)) - 200;
        const cy = 60 + Math.sin(i + now * 0.001) * 20;
        ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.arc(cx + 25, cy + 5, 25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

function drawMinimap() {
    const s = (window.innerWidth < 768 ? 80 : 120) / WORLD_SIZE;
    const mx = canvas.width - (window.innerWidth < 768 ? 90 : 135);
    const my = 15;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#01579b'; ctx.beginPath(); drawRoundedRect(ctx, mx, my, s * WORLD_SIZE, s * WORLD_SIZE, 12); ctx.fill();
    ctx.fillStyle = '#2e7d32'; ctx.beginPath(); drawRoundedRect(ctx, mx + 2, my + 2, s * WORLD_SIZE - 4, s * WORLD_SIZE - 4, 8); ctx.fill();
    Object.values(players).forEach(p => {
        ctx.fillStyle = p.id === socket.id ? '#50fa7b' : 'white';
        ctx.beginPath(); ctx.arc(mx + p.x * s, my + p.y * s, p.id === socket.id ? 5 : 2.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
}

function drawPublicClock(x, y) {
    // Reloj Público de Pucallpa
    const scale = 1.3;

    // Base ancha
    ctx.fillStyle = '#f5f5f5'; // Blanco hueso
    ctx.fillRect(x - 25 * scale, y - 20 * scale, 50 * scale, 30 * scale);
    ctx.fillStyle = '#e0e0e0'; // Sombra base
    ctx.fillRect(x - 20 * scale, y - 20 * scale, 40 * scale, 30 * scale);

    // Torre principal (Alta y blanca)
    ctx.fillStyle = '#ffffff'; // Blanco puro
    ctx.fillRect(x - 15 * scale, y - 140 * scale, 30 * scale, 120 * scale);

    // Líneas arquitectónicas (Ribetes)
    ctx.fillStyle = '#b0bec5'; // Gris azulado
    ctx.fillRect(x - 18 * scale, y - 140 * scale, 36 * scale, 5 * scale); // Cornisa superior
    ctx.fillRect(x - 18 * scale, y - 80 * scale, 36 * scale, 5 * scale); // Cornisa media
    ctx.fillRect(x - 18 * scale, y - 25 * scale, 36 * scale, 5 * scale); // Cornisa base

    // Reloj (Esfera)
    ctx.fillStyle = '#263238'; // Marco negro
    ctx.beginPath(); ctx.arc(x, y - 110 * scale, 14 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; // Esfera interior blanca
    ctx.beginPath(); ctx.arc(x, y - 110 * scale, 12 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff5722'; // Punto central naranja
    ctx.beginPath(); ctx.arc(x, y - 110 * scale, 2 * scale, 0, Math.PI * 2); ctx.fill();

    // Manecillas
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath(); ctx.moveTo(x, y - 110 * scale); ctx.lineTo(x, y - 118 * scale); ctx.stroke(); // Minutero
    ctx.lineWidth = 3 * scale;
    ctx.beginPath(); ctx.moveTo(x, y - 110 * scale); ctx.lineTo(x + 6 * scale, y - 110 * scale); ctx.stroke(); // Horario

    // Cúpula superior (Techo azulino clásico)
    ctx.fillStyle = '#0277bd';
    ctx.beginPath();
    ctx.moveTo(x - 15 * scale, y - 140 * scale);
    ctx.lineTo(x + 15 * scale, y - 140 * scale);
    ctx.lineTo(x, y - 165 * scale);
    ctx.fill();

    // Veleta / Antena
    ctx.strokeStyle = '#607d8b';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y - 165 * scale); ctx.lineTo(x, y - 180 * scale); ctx.stroke();
    // Bolita arriba
    ctx.fillStyle = '#ffc107';
    ctx.beginPath(); ctx.arc(x, y - 180 * scale, 3 * scale, 0, Math.PI * 2); ctx.fill();
}

function drawMarketStall(x, y, color, title) {
    // Portal / Arco de Ingreso a la categoría
    // Suelo místico brillante (Tapete de entrada)
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.ellipse(x, y + 10, 50, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.ellipse(x, y + 10, 35, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1.0;

    // Pilares rústicos
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(x - 35, y - 40, 12, 50); // Pilar Izquierdo
    ctx.fillRect(x + 23, y - 40, 12, 50); // Pilar Derecho

    // Bases de piedra
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(x - 40, y + 5, 22, 10);
    ctx.fillRect(x + 18, y + 5, 22, 10);

    // Viga superior brillante (Color de Categoría)
    ctx.fillStyle = color;
    ctx.fillRect(x - 45, y - 55, 90, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x - 45, y - 35, 90, 4); // Sombra debajo de la viga

    // Texto de la categoría
    ctx.fillStyle = '#282a36'; // Texto oscuro contrastante
    ctx.font = '900 11px Fredoka';
    ctx.textAlign = 'center';
    ctx.fillText(title, x, y - 42);
}

function drawBeachUmbrella(x, y, color) {
    ctx.strokeStyle = '#d7ccc8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 30); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y - 30, 25, Math.PI, 0); ctx.fill();
}

function drawTropicalBush(x, y) {
    ctx.fillStyle = '#0a3d0d'; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b5e20'; ctx.beginPath(); ctx.arc(x - 8, y - 5, 12, 0, Math.PI * 2); ctx.fill();
}

function draw() {
    const now = Date.now();
    const me = players[socket.id];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(-camera.x, -camera.y);
    drawForestFloor();
    drawPublicClock(WORLD_SIZE / 2, WORLD_SIZE / 2);

    const bColors = ['#ffd740', '#ff4081', '#40c4ff'];
    fireflies.forEach((f, i) => {
        f.x += f.vx; f.y += f.vy;
        if (f.x < 0) f.x = WORLD_SIZE; if (f.x > WORLD_SIZE) f.x = 0;
        if (f.y < 0) f.y = WORLD_SIZE; if (f.y > WORLD_SIZE) f.y = 0;
        ctx.fillStyle = bColors[i % 3]; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.size + 2, f.size / 2, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    for (let i = 0; i < 40; i++) {
        const tx = Math.abs(Math.sin(i * 123)) * WORLD_SIZE, ty = Math.abs(Math.cos(i * 456)) * WORLD_SIZE;
        if (getDist(tx, ty, WORLD_SIZE / 2, WORLD_SIZE / 2) > 150 && tx < 1050) drawPalmTree(tx, ty, 0.8);
    }
    for (let i = 0; i < 45; i++) {
        const bx = Math.abs(Math.sin(i * 789)) * WORLD_SIZE, by = Math.abs(Math.cos(i * 321)) * WORLD_SIZE;
        if (getDist(bx, by, WORLD_SIZE / 2, WORLD_SIZE / 2) > 150 && bx < 1050) drawTropicalBush(bx, by);
    }

    drawMarketStall(WORLD_SIZE / 2 - 200, WORLD_SIZE / 2 - 120, '#ff9800', "MURO DE PLANES");
    drawMarketStall(WORLD_SIZE / 2 + 200, WORLD_SIZE / 2 - 120, '#bd93f9', "ENCUESTAS");
    drawMarketStall(WORLD_SIZE / 2, WORLD_SIZE / 2 + 200, '#50fa7b', "MINIJUEGOS");

    Object.keys(players).forEach(id => {
        let p = players[id];
        const isMov = p.lastX !== p.x || p.lastY !== p.y;
        if (isMov) { p.walkTime = (p.walkTime || 0) + 0.3; p.lastX = p.x; p.lastY = p.y; } else { p.walkTime = 0; }

        const inBoat = p.x >= 1250;
        if (inBoat) {
            drawPlayerBoat(ctx, p.x, p.y, p.facingLeft);
        }

        const isIT = itPlayerId === id;
        if (p.charType === 'monito') {
            DrawMono(ctx, p.x, p.y + (inBoat ? 5 : 0), p.color, p.walkTime, p.facingLeft, p.name, isIT, inBoat);
        } else {
            DrawCapibara(ctx, p.x, p.y + (inBoat ? 5 : 0), p.color, p.walkTime, p.facingLeft, p.name, isIT, inBoat);
        }
        
        drawPlayerLabel(ctx, p);

        if (p.message && now - p.messageTimer < 6000) {
            ctx.fillStyle = 'white'; ctx.beginPath(); drawRoundedRect(ctx, p.x - 15, p.y - 95, 120, 35, 10); ctx.fill();
            ctx.fillStyle = '#282a36'; ctx.font = "bold 13px Fredoka"; ctx.textAlign = 'center'; ctx.fillText(p.message, p.x + 45, p.y - 75);
        }
    });

    if (appToOpen && me) {
        ctx.fillStyle = 'white'; ctx.beginPath(); drawRoundedRect(ctx, me.x - 20, me.y - 130, 110, 30, 15); ctx.fill();
        ctx.fillStyle = '#282a36'; ctx.font = 'bold 11px Fredoka'; ctx.textAlign = 'center'; ctx.fillText(`🎮 ABRIR ${appToOpen.name.split(' ')[0]}`, me.x + 35, me.y - 110);
    }
    ctx.restore();
    drawDayAtmosphere(now);
    drawMinimap();
    updateMovement();
    requestAnimationFrame(draw);
}

function enviarMensaje() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const msg = input.value.trim();
    if (msg.length > 0) { socket.emit('chatMessage', msg); input.value = ''; input.blur(); }
    canvas.focus();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (ctx.roundRect) { ctx.roundRect(x, y, width, height, radius); return; }
    ctx.beginPath();
    ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

const sendBtn = document.getElementById('send-btn');
if (sendBtn) sendBtn.addEventListener('click', enviarMensaje);

document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('games-sidebar');
    if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target.id !== 'games-sidebar-btn') {
        sidebar.classList.remove('open');
    }
});

requestAnimationFrame(draw);
