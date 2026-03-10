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

function renderPlanCard() {
    const container = document.getElementById('plan-card-container');
    if (!container) return;
    if (plansQueue.length === 0) {
        container.innerHTML = `
            <div class="plan-card" style="justify-content:center;">
                <p style="margin:0;">No hay anuncios nuevos por ahora... 🌱</p>
            </div>`;
        return;
    }
    const plan = plansQueue[0];
    const posterImg = plan.img ? `<img src="${plan.img}" class="plan-poster">` : `<div class="plan-poster-placeholder">🌴</div>`;

    container.innerHTML = `
        <div class="plan-card" style="animation: bannerIn 0.5s ease-out forwards">
            ${posterImg}
            <div class="plan-info">
                <h3>${plan.title}</h3>
                <p class="tiny-desc">${plan.desc}</p>
                <div class="card-meta">Por: <span class="tiny-owner">${plan.owner}</span> • 🕒 ${plan.time || ''}</div>
            </div>
            <div class="card-footer">
                <button class="like-btn">✅ Me uno</button>
                <button class="dislike-btn">❌ Paso</button>
            </div>
        </div>
    `;
}

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
    const card = document.querySelector('.plan-card');

    // Tinder Swipe
    if (e.target.classList.contains('like-btn')) {
        if (playerName === 'Capibara Anónimo' || !playerName) {
            alert("⚠️ ¡Solo con cuenta!");
        } else {
            if (card) card.classList.add('swiping-right');
            setTimeout(() => {
                alert("✅ ¡Anotado " + playerName + "!");
                const swiped = plansQueue.shift();
                plansQueue.push(swiped);
                renderPlanCard();
            }, 400);
        }
    }

    if (e.target.classList.contains('dislike-btn')) {
        if (card) card.classList.add('swiping-left');
        setTimeout(() => {
            const swiped = plansQueue.shift();
            plansQueue.push(swiped);
            renderPlanCard();
        }, 400);
    }

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

if (document.getElementById('join-btn')) {
    document.getElementById('join-btn').addEventListener('click', () => {
        const nameInput = document.getElementById('username-input');
        playerName = nameInput.value.trim() || 'Capibara Anónimo';
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('ui-overlay').style.display = 'flex';
        socket.emit('joinGame', playerName);
    });
}

// EVENTOS MULTIJUGADOR
socket.on('currentPlayers', (serverPlayers) => { players = serverPlayers; });
socket.on('newPlayer', (playerInfo) => { players[playerInfo.id] = playerInfo; });
socket.on('playerMoved', (playerInfo) => {
    if (players[playerInfo.id]) {
        players[playerInfo.id].x = playerInfo.x;
        players[playerInfo.id].y = playerInfo.y;
        players[playerInfo.id].facingLeft = playerInfo.facingLeft;
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

    if (keys.ArrowLeft || keys.a) { me.x -= speed; moved = true; me.facingLeft = true; }
    if (keys.ArrowRight || keys.d) { me.x += speed; moved = true; me.facingLeft = false; }
    if (keys.ArrowUp || keys.w) { me.y -= speed; moved = true; }
    if (keys.ArrowDown || keys.s) { me.y += speed; moved = true; }

    me.x = Math.max(0, Math.min(WORLD_SIZE - 50, me.x));
    me.y = Math.max(0, Math.min(WORLD_SIZE - 50, me.y));

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
function DrawCapibara(ctx, x, y, color, walkTime, facingLeft, name, isIT) {
    const isMoving = walkTime > 0;
    const bounce = isMoving ? Math.abs(Math.sin(walkTime * 8)) * 3 : Math.sin(Date.now() * 0.003) * 1.5;
    const breathe = Math.sin(Date.now() * 0.002) * 1.5;
    ctx.save();
    ctx.translate(x + 25, y + 20);
    if (isIT) {
        const glow = Math.sin(Date.now() * 0.01) * 15 + 15;
        ctx.shadowBlur = glow; ctx.shadowColor = '#50fa7b';
        ctx.strokeStyle = '#50fa7b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 35, 25, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (facingLeft) ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(0, 18, 25, 8, 0, 0, Math.PI * 2); ctx.fill();
    const bodyColor = '#9e7647'; ctx.fillStyle = bodyColor;
    const legOffset = isMoving ? Math.sin(walkTime * 10) * 5 : 0;

    // Patas con pesuñitas (Detalle tierno)
    const toeColor = '#795548'; // Marroncito para las uñas/pesuñitas

    // Pata izquierda (atrás)
    ctx.save();
    ctx.translate(-15, 12 + legOffset);
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = toeColor;
    ctx.beginPath(); ctx.arc(-3, 8, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, 8, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Pata derecha (adelante)
    ctx.save();
    ctx.translate(15, 12 - legOffset);
    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = toeColor;
    ctx.beginPath(); ctx.arc(-3, 8, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, 8, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, 0, 32 + breathe, 24 + bounce, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(24, -14 + bounce / 2); ctx.rotate(-0.1);
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#212121'; ctx.beginPath(); ctx.arc(7, -5, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(8, -6.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#795548'; ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.ellipse(12, 3, 8, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.arc(16, 1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bodyColor; ctx.beginPath(); ctx.ellipse(-2, -14, 6, 8, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.fillStyle = 'white'; ctx.font = 'bold 12px Fredoka'; ctx.textAlign = 'center';
    ctx.shadowBlur = 4; ctx.shadowColor = 'black';
    ctx.fillText(name || '🦫', x + 25, y - 48);
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
    ctx.beginPath(); drawRoundedRect(ctx, 0, 0, WORLD_SIZE, WORLD_SIZE, 80); ctx.fill();
    ctx.fillStyle = '#2e7d32';
    drawRoundedRect(ctx, WORLD_SIZE / 2 - 45, 50, 90, WORLD_SIZE - 100, 25); ctx.fill();
    drawRoundedRect(ctx, 50, WORLD_SIZE / 2 - 45, WORLD_SIZE - 100, 90, 25); ctx.fill();
    ctx.fillStyle = '#388e3c';
    ctx.beginPath(); ctx.arc(WORLD_SIZE / 2, WORLD_SIZE / 2, 120, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 4; ctx.stroke();
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
    const scale = 1.2;
    ctx.fillStyle = '#2d5a27'; ctx.fillRect(x - 12 * scale, y - 120 * scale, 24 * scale, 110 * scale);
    ctx.fillStyle = '#50fa7b'; ctx.fillRect(x - 14 * scale, y - 40 * scale, 28 * scale, 4 * scale);
    ctx.fillStyle = '#e8f5e9'; ctx.beginPath(); ctx.arc(x, y - 105 * scale, 10 * scale, 0, Math.PI * 2); ctx.fill();
}

function drawMarketStall(x, y, color, title) {
    ctx.fillStyle = '#5d4037'; ctx.fillRect(x - 30, y - 10, 60, 20);
    ctx.fillStyle = color; ctx.fillRect(x - 35, y - 55, 70, 15);
    ctx.fillStyle = 'white'; ctx.font = 'bold 10px Fredoka'; ctx.textAlign = 'center'; ctx.fillText(title, x, y - 65);
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
        if (getDist(tx, ty, WORLD_SIZE / 2, WORLD_SIZE / 2) > 150) drawPalmTree(tx, ty, 0.8);
    }
    for (let i = 0; i < 45; i++) {
        const bx = Math.abs(Math.sin(i * 789)) * WORLD_SIZE, by = Math.abs(Math.cos(i * 321)) * WORLD_SIZE;
        if (getDist(bx, by, WORLD_SIZE / 2, WORLD_SIZE / 2) > 150) drawTropicalBush(bx, by);
    }

    drawMarketStall(WORLD_SIZE / 2 - 200, WORLD_SIZE / 2 - 120, '#ff9800', "MURO DE PLANES");
    drawMarketStall(WORLD_SIZE / 2 + 200, WORLD_SIZE / 2 - 120, '#bd93f9', "ENCUESTAS");
    drawMarketStall(WORLD_SIZE / 2, WORLD_SIZE / 2 + 200, '#50fa7b', "MINIJUEGOS");

    Object.keys(players).forEach(id => {
        let p = players[id];
        const isMov = p.lastX !== p.x || p.lastY !== p.y;
        if (isMov) { p.walkTime = (p.walkTime || 0) + 0.3; p.lastX = p.x; p.lastY = p.y; } else { p.walkTime = 0; }
        DrawCapibara(ctx, p.x, p.y, p.color, p.walkTime, p.facingLeft, p.name, itPlayerId === id);
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
