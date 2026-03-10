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

io.on('connection', (socket) => {
    console.log('Un nuevo socket conectado. Esperando nombre...', socket.id);

    // Guardamos al jugador pero no avisamos a nadie hasta que envíe su nombre
    players[socket.id] = {
        x: Math.random() * 600 + 100, // Posición aleatoria inicial
        y: Math.random() * 400 + 100,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`, // Color pseudo-aleatorio para distinguirlos
        id: socket.id,
        name: "Capibara Nuevo",
        message: '',
        messageTimer: 0,
        facingLeft: false // Dirección de la mirada
    };

    socket.on('joinGame', (name) => {
        players[socket.id].name = name || "Capibara S/N";

        // Si nadie la trae, este jugador es el elegido
        if (!itPlayerId) {
            itPlayerId = socket.id;
        }

        // Enviar a este cliente todos los jugadores actuales
        socket.emit('currentPlayers', players);
        socket.emit('itUpdate', itPlayerId); // Avisar quién la trae

        // Avisar a todos los demás clientes sobre el nuevo capibara
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    // --- Lógica de Las Agarradas ---
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

    // Cuando un jugador se mueve
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].facingLeft = movementData.facingLeft;
            // Enviar la nueva posición a todos los demás capibaras
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // Cuando un jugador envía un mensaje de chat
    socket.on('chatMessage', (msg) => {
        if (players[socket.id]) {
            players[socket.id].message = msg;
            // Enviar a todos para que la burbuja flote sobre el capibara
            io.emit('playerChat', { id: socket.id, message: msg });
        }
    });

    // --- Lógica de Planes ---
    socket.emit('currentPlans', plans);

    socket.on('createPlan', (planData) => {
        const newPlan = {
            id: Date.now(),
            owner: players[socket.id]?.name || 'Anónimo',
            title: planData.title,
            desc: planData.desc,
            img: planData.img || null,
            emoji: planData.emoji || '🔥',
            time: new Date().toLocaleTimeString()
        };
        plans.unshift(newPlan);
        if (plans.length > 50) plans.pop();
        io.emit('newPlan', newPlan);
    });

    // --- Lógica de Encuestas ---
    socket.emit('currentPolls', activePolls);

    socket.on('createPoll', (pollData) => {
        const newPoll = {
            id: Date.now(),
            owner: players[socket.id]?.name || 'Anónimo',
            question: pollData.question,
            options: pollData.options,
            votes: pollData.options.map(() => 0)
        };
        activePolls.unshift(newPoll);
        if (activePolls.length > 10) activePolls.pop();
        io.emit('newPoll', newPoll);
    });

    socket.on('votePoll', (data) => {
        const poll = activePolls.find(p => p.id === data.pollId);
        if (poll && poll.votes[data.optionIndex] !== undefined) {
            poll.votes[data.optionIndex]++;
            io.emit('updatePolls', activePolls);
        }
    });

    // Cuando un capibara se desconecta
    socket.on('disconnect', () => {
        console.log('Un capibara se fue de la plaza:', socket.id);

        // Si el que se fue traía las agarradas, pasarlas a otro
        if (itPlayerId === socket.id) {
            delete players[socket.id];
            const remainingIds = Object.keys(players);
            itPlayerId = remainingIds.length > 0 ? remainingIds[0] : null;
            io.emit('itUpdate', itPlayerId);
        } else {
            delete players[socket.id];
        }

        // Avisar a todos para borrar este capibara de sus pantallas
        io.emit('disconnectPlayer', socket.id);
    });
});

const plans = [
    { id: 1, owner: 'Admin', title: 'Voley en la Plaza', desc: 'Mañana a las 5pm en la plaza de armas. ¡Faltan 2!', emoji: '🏐' },
    { id: 2, owner: 'Admin', title: 'Ceviche en el Puerto', desc: 'Saliendo de clase vamos por un cebichito. ¿Quién se une?', emoji: '🐟' }
];

const activePolls = [
    { id: 1, owner: 'Admin', question: '¿Qué se cena hoy? 🍴', options: ['Tacacho con Cecina', 'Juane Especial'], votes: [12, 10] }
];

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`🚀 ¡La Plaza del Chisme está abierta en http://localhost:${PORT}!`);
});
