const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Servir archivos estáticos de la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Almacenar el estado de los jugadores
const players = {};
let itPlayerId = null; // Quien "la trae" en las agarradas

// Simulación de planes y encuestas (en memoria para este ejemplo)
let plans = [];
let activePolls = [];

io.on('connection', (socket) => {
    console.log('Un nuevo socket conectado:', socket.id);

    // Guardamos al jugador pero no avisamos a nadie hasta que envíe su nombre
    players[socket.id] = {
        x: Math.random() * 100 + 700, // Posición central
        y: Math.random() * 100 + 700,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        id: socket.id,
        name: "Nuevo",
        charType: "capibara", // Por defecto
        message: '',
        messageTimer: 0,
        facingLeft: false
    };

    socket.on('joinGame', (data) => {
        const name = typeof data === 'string' ? data : data.name;
        const charType = data.charType || "capibara";

        const nameStr = String(name || "Anónimo");
        players[socket.id].name = nameStr;
        players[socket.id].charType = charType;
        
        console.log(`🎮 Jugador se unió: ${nameStr} como ${charType}`);

        if (!itPlayerId) itPlayerId = socket.id;

        socket.emit('currentPlayers', players);
        socket.emit('itUpdate', itPlayerId);
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    socket.on('tagPlayer', (targetId) => {
        if (socket.id === itPlayerId && players[targetId]) {
            itPlayerId = targetId;
            io.emit('itUpdate', itPlayerId);
            io.emit('gameEvent', {
                text: `🏃‍♂️ ¡${players[socket.id].name} atrapó a ${players[targetId].name}! Ahora la trae ${players[targetId].name}.`,
                type: 'tag'
            });
        }
    });

    socket.on('playerMove', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].facingLeft = movementData.facingLeft;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('chatMessage', (msg) => {
        if (players[socket.id]) {
            players[socket.id].message = msg;
            players[socket.id].messageTimer = Date.now();
            io.emit('playerChat', { id: socket.id, message: msg });
        }
    });

    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        if (socket.id === itPlayerId) {
            const nextId = Object.keys(players).find(id => id !== socket.id);
            itPlayerId = nextId || null;
            io.emit('itUpdate', itPlayerId);
        }
        delete players[socket.id];
        io.emit('disconnectPlayer', socket.id);
    });

    // Envío inicial de planes y encuestas
    socket.emit('currentPlans', plans);
    socket.emit('currentPolls', activePolls);

    socket.on('createPlan', (planData) => {
        const newPlan = {
            id: Date.now(),
            owner: players[socket.id]?.name || 'Anónimo',
            title: planData.title,
            desc: planData.desc,
            img: planData.img || null,
            time: new Date().toLocaleTimeString()
        };
        plans.unshift(newPlan);
        if (plans.length > 50) plans.pop();
        io.emit('newPlan', newPlan);
    });

    socket.on('createPoll', (pollData) => {
        const newPoll = {
            id: Date.now(),
            question: pollData.question,
            options: pollData.options,
            votes: pollData.options.map(() => 0),
            voters: [] // Para evitar votos dobles si quisiéramos
        };
        activePolls.unshift(newPoll);
        io.emit('newPoll', newPoll);
    });

    socket.on('votePoll', (voteData) => {
        const poll = activePolls.find(p => p.id === voteData.pollId);
        if (poll && poll.votes[voteData.optionIndex] !== undefined) {
            poll.votes[voteData.optionIndex]++;
            io.emit('updatePolls', activePolls);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`🚀 Capi City funcionando en http://localhost:${PORT}`);
});
