import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import words from "./words.js";

const app = express();

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://ink-rush-gold.vercel.app"
        ],
        methods: ["GET", "POST"]
    }
});


const rooms = {};

const MAX_PLAYERS = 4;
const MAX_ROUNDS = 3;
const TURN_TIME = 60;
const HINT_INTERVAL = 15;
const POINTS_PER_GUESS = 20;
const MAX_GUESS_POINTS = 100;


// ======================================================
// ROOM CODE
// ======================================================

function generateRoomCode() {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let code = "";

    for (let i = 0; i < 6; i++) {

        const randomIndex =
            Math.floor(
                Math.random() *
                characters.length
            );

        code +=
            characters[randomIndex];
    }

    return code;
}


// ======================================================
// WORD CHOICES
// ======================================================

function getWordChoices(room) {

    const availableWords =
        words.filter(
            (word) =>
                !room.usedWords.has(word)
        );


    const choices = [];


    while (
        choices.length < 3 &&
        availableWords.length > 0
    ) {

        const randomIndex =
            Math.floor(
                Math.random() *
                availableWords.length
            );


        const word =
            availableWords[randomIndex];


        choices.push(word);

        room.usedWords.add(word);


        availableWords.splice(
            randomIndex,
            1
        );
    }


    return choices;
}


// ======================================================
// HINT SYSTEM
// ======================================================

function createHintPositions(word) {

    const positions = [];


    for (
        let i = 0;
        i < word.length;
        i++
    ) {

        if (word[i] !== " ") {
            positions.push(i);
        }

    }


    // Shuffle positions
    for (
        let i = positions.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        const temp =
            positions[i];

        positions[i] =
            positions[j];

        positions[j] =
            temp;
    }


    const maxHints =
        word.length <= 3
            ? 1
            : Math.min(
                3,
                positions.length
            );


    return positions.slice(
        0,
        maxHints
    );
}


function getMaskedWord(room) {

    if (!room.word) {
        return "";
    }


    return room.word
        .split("")
        .map(
            (character, index) => {

                if (
                    character === " "
                ) {
                    return " ";
                }


                if (
                    room.revealedIndices
                        .has(index)
                ) {

                    return character;
                }


                return "_";
            }
        )
        .join("");
}


// ======================================================
// TIMER HELPERS
// ======================================================

function clearRoomTimer(room) {

    if (room.timer) {

        clearInterval(
            room.timer
        );

        room.timer = null;
    }
}


// ======================================================
// GAME OVER
// ======================================================

function finishGame(roomCode) {

    const room =
        rooms[roomCode];


    if (!room) {
        return;
    }


    clearRoomTimer(room);


    room.gameStarted =
        false;


    const finalPlayers =
        [...room.players].sort(
            (a, b) =>
                b.score - a.score
        );


    io.to(roomCode).emit(
        "gameOver",
        {
            roomCode,
            players: finalPlayers
        }
    );
}


// ======================================================
// START TURN
// ======================================================

function startTurn(roomCode) {

    const room =
        rooms[roomCode];


    if (!room) {
        return;
    }


    // Everyone completed this round
    if (
        room.currentTurnIndex >=
        room.players.length
    ) {

        room.currentTurnIndex = 0;

        room.currentRound++;
    }


    // Finished 3 rounds
    if (
        room.currentRound >
        MAX_ROUNDS
    ) {

        finishGame(roomCode);

        return;
    }


    clearRoomTimer(room);


    const drawer =
        room.players[
            room.currentTurnIndex
        ];


    if (!drawer) {
        return;
    }


    room.drawerId =
        drawer.id;

    room.word =
        null;

    room.wordOptions =
        [];

    room.correctGuessers =
        new Set();

    room.revealedIndices =
        new Set();

    room.hintPositions =
        [];

    room.nextHintIndex =
        0;

    room.timeLeft =
        TURN_TIME;

    room.turnEnding =
        false;


    const choices =
        getWordChoices(room);


    room.wordOptions =
        choices;


    // New turn = clean board
    io.to(roomCode).emit(
        "clearCanvas"
    );


    // Everyone knows current drawer
    io.to(roomCode).emit(
        "turnPreparing",
        {

            round:
                room.currentRound,

            maxRounds:
                MAX_ROUNDS,

            drawerId:
                drawer.id,

            drawerUsername:
                drawer.username,

            players:
                room.players

        }
    );


    // Only drawer sees options
    io.to(drawer.id).emit(
        "wordChoices",
        choices
    );
}


// ======================================================
// END TURN
// ======================================================

function endTurn(roomCode) {

    const room =
        rooms[roomCode];


    if (!room) {
        return;
    }


    if (room.turnEnding) {
        return;
    }


    room.turnEnding =
        true;


    clearRoomTimer(room);


    const drawer =
        room.players.find(
            (player) =>
                player.id ===
                room.drawerId
        );


    if (drawer && room.correctGuessers.size > 0) {

        const missedGuesses =
            room.players.length -
            1 -
            room.correctGuessers.size;


        drawer.score +=
            Math.max(
                0,
                MAX_GUESS_POINTS -
                    missedGuesses *
                    POINTS_PER_GUESS
            );
    }


    io.to(roomCode).emit(
        "scoresUpdated",
        room.players
    );


    const oldWord =
        room.word;


    io.to(roomCode).emit(
        "turnEnded",
        {
            word: oldWord
        }
    );


    room.word =
        null;


    setTimeout(
        () => {

            const currentRoom =
                rooms[roomCode];


            if (!currentRoom) {
                return;
            }


            currentRoom
                .currentTurnIndex++;


            currentRoom.turnEnding =
                false;


            startTurn(
                roomCode
            );

        },
        1200
    );
}


// ======================================================
// START TIMER
// ======================================================

function startTimer(roomCode) {

    const room =
        rooms[roomCode];


    if (!room) {
        return;
    }


    clearRoomTimer(room);


    room.timeLeft =
        TURN_TIME;


    io.to(roomCode).emit(
        "timerUpdate",
        room.timeLeft
    );


    room.timer =
        setInterval(
            () => {

                const currentRoom =
                    rooms[roomCode];


                if (!currentRoom) {
                    return;
                }


                currentRoom.timeLeft--;


                const elapsed =
                    TURN_TIME -
                    currentRoom.timeLeft;


                // =================================
                // HINT EVERY 15 SECONDS
                // =================================

                if (
                    elapsed > 0 &&
                    elapsed %
                        HINT_INTERVAL ===
                        0 &&
                    currentRoom
                        .nextHintIndex <
                        currentRoom
                            .hintPositions
                            .length
                ) {

                    const position =
                        currentRoom
                            .hintPositions[
                                currentRoom
                                    .nextHintIndex
                            ];


                    currentRoom
                        .revealedIndices
                        .add(position);


                    currentRoom
                        .nextHintIndex++;


                    io.to(roomCode).emit(
                        "wordHint",
                        getMaskedWord(
                            currentRoom
                        )
                    );

                }


                io.to(roomCode).emit(
                    "timerUpdate",
                    currentRoom.timeLeft
                );


                if (
                    currentRoom.timeLeft <=
                    0
                ) {

                    endTurn(
                        roomCode
                    );
                }

            },
            1000
        );
}


// ======================================================
// TEST ROUTE
// ======================================================

app.get("/", (req, res) => {

    res.send(
        "Ink Rush server is running"
    );
});


// ======================================================
// SOCKET.IO
// ======================================================

io.on("connection", (socket) => {

    console.log(
        "Connected:",
        socket.id
    );


    // ==================================================
    // USERNAME
    // ==================================================

    socket.on(
        "setUsername",
        (username) => {

            if (
                typeof username !==
                "string"
            ) {
                return;
            }


            socket.data.username =
                username.trim();
        }
    );


    // ==================================================
    // CREATE ROOM
    // ==================================================

    socket.on(
        "createRoom",
        (callback) => {

            if (
                !socket.data.username
            ) {

                callback({
                    success: false,
                    message:
                        "Username not set"
                });

                return;
            }


            let roomCode =
                generateRoomCode();


            while (
                rooms[roomCode]
            ) {

                roomCode =
                    generateRoomCode();
            }


            rooms[roomCode] = {

                hostId:
                    socket.id,

                players: [
                    {

                        id:
                            socket.id,

                        username:
                            socket.data
                                .username,

                        isHost:
                            true,

                        score:
                            0
                    }
                ],

                gameStarted:
                    false,

                currentRound:
                    1,

                currentTurnIndex:
                    0,

                drawerId:
                    null,

                word:
                    null,

                wordOptions:
                    [],

                usedWords:
                    new Set(),

                correctGuessers:
                    new Set(),

                revealedIndices:
                    new Set(),

                hintPositions:
                    [],

                nextHintIndex:
                    0,

                timer:
                    null,

                timeLeft:
                    TURN_TIME,

                readyPlayers:
                    new Set(),

                turnsStarted:
                    false,

                turnEnding:
                    false
            };


            socket.join(
                roomCode
            );


            socket.data.roomCode =
                roomCode;


            callback({
                success: true,
                roomCode,
                players:
                    rooms[roomCode]
                        .players
            });
        }
    );


    // ==================================================
    // JOIN ROOM
    // ==================================================

    socket.on(
        "joinRoom",

        (
            roomCode,
            callback
        ) => {

            if (
                !socket.data.username
            ) {

                callback({
                    success: false,
                    message:
                        "Username not set"
                });

                return;
            }


            roomCode =
                roomCode
                    .trim()
                    .toUpperCase();


            const room =
                rooms[roomCode];


            if (!room) {

                callback({
                    success: false,
                    message:
                        "Room does not exist"
                });

                return;
            }


            if (
                room.gameStarted
            ) {

                callback({
                    success: false,
                    message:
                        "Game already started"
                });

                return;
            }


            if (
                room.players.length >=
                MAX_PLAYERS
            ) {

                callback({
                    success: false,
                    message:
                        "Room is full"
                });

                return;
            }


            room.players.push({

                id:
                    socket.id,

                username:
                    socket.data.username,

                isHost:
                    false,

                score:
                    0

            });


            socket.join(
                roomCode
            );


            socket.data.roomCode =
                roomCode;


            io.to(roomCode).emit(
                "playersUpdated",
                room.players
            );


            callback({
                success: true,
                roomCode,
                players:
                    room.players
            });
        }
    );


    // ==================================================
    // START GAME
    // ==================================================

    socket.on(
        "startGame",

        (
            roomCode,
            callback
        ) => {

            const room =
                rooms[roomCode];


            if (!room) {

                callback({
                    success: false,
                    message:
                        "Room does not exist"
                });

                return;
            }


            if (
                room.hostId !==
                socket.id
            ) {

                callback({
                    success: false,
                    message:
                        "Only host can start"
                });

                return;
            }


            if (
                room.players.length < 2
            ) {

                callback({
                    success: false,
                    message:
                        "At least 2 players required"
                });

                return;
            }


            room.players.forEach(
                (player) => {

                    player.score = 0;

                }
            );


            room.gameStarted =
                true;

            room.currentRound =
                1;

            room.currentTurnIndex =
                0;

            room.drawerId =
                null;

            room.word =
                null;

            room.usedWords =
                new Set();

            room.readyPlayers =
                new Set();

            room.turnsStarted =
                false;


            io.to(roomCode).emit(
                "gameStarted",
                {
                    roomCode,
                    players:
                        room.players
                }
            );


            callback({
                success: true
            });
        }
    );


    // ==================================================
    // PLAYER LOADED GAME PAGE
    // ==================================================

    socket.on(
        "gameReady",
        () => {

            const roomCode =
                socket.data.roomCode;


            const room =
                rooms[roomCode];


            if (
                !room ||
                !room.gameStarted
            ) {
                return;
            }


            room.readyPlayers.add(
                socket.id
            );


            if (
                room.readyPlayers.size >=
                    room.players.length &&
                !room.turnsStarted
            ) {

                room.turnsStarted =
                    true;


                startTurn(
                    roomCode
                );
            }
        }
    );


    // ==================================================
    // CHOOSE WORD
    // ==================================================

    socket.on(
        "chooseWord",
        (selectedWord) => {

            const roomCode =
                socket.data.roomCode;


            const room =
                rooms[roomCode];


            if (!room) {
                return;
            }


            if (
                room.drawerId !==
                socket.id
            ) {
                return;
            }


            if (
                !room.wordOptions.includes(
                    selectedWord
                )
            ) {
                return;
            }


            room.word =
                selectedWord;


            room.wordOptions =
                [];


            room.revealedIndices =
                new Set();


            room.hintPositions =
                createHintPositions(
                    selectedWord
                );


            room.nextHintIndex =
                0;


            io.to(socket.id).emit(
                "wordSelected",
                {
                    word:
                        selectedWord
                }
            );


            const drawer =
                room.players.find(
                    (player) =>
                        player.id ===
                        room.drawerId
                );


            io.to(roomCode).emit(
                "turnStarted",
                {

                    round:
                        room.currentRound,

                    maxRounds:
                        MAX_ROUNDS,

                    drawerId:
                        room.drawerId,

                    drawerUsername:
                        drawer
                            ?.username,

                    duration:
                        TURN_TIME,

                    hint:
                        getMaskedWord(
                            room
                        )

                }
            );


            startTimer(
                roomCode
            );
        }
    );


    // ==================================================
    // DRAWING
    // ==================================================

    socket.on(
        "draw",
        (data) => {

            const room =
                rooms[
                    socket.data
                        .roomCode
                ];


            if (!room) {
                return;
            }


            if (
                socket.id !==
                room.drawerId
            ) {
                return;
            }


            if (!room.word) {
                return;
            }


            socket
                .to(
                    socket.data
                        .roomCode
                )
                .emit(
                    "draw",
                    data
                );
        }
    );


    // ==================================================
    // FILL CANVAS
    // ==================================================

    socket.on(
        "fillCanvas",
        (data) => {

            const roomCode =
                socket.data.roomCode;


            const room =
                rooms[roomCode];


            if (!room) {
                return;
            }


            if (socket.id !== room.drawerId || !room.word) {
                return;
            }


            if (
                !data ||
                typeof data.x !== "number" ||
                typeof data.y !== "number" ||
                typeof data.color !== "string"
            ) {
                return;
            }


            socket.to(roomCode).emit(
                "fillCanvas",
                data
            );
        }
    );


    // ==================================================
    // CLEAR CANVAS
    // ==================================================

    socket.on(
        "clearCanvasRequest",
        () => {

            const roomCode =
                socket.data.roomCode;


            const room =
                rooms[roomCode];


            if (!room) {
                return;
            }


            if (
                socket.id !==
                room.drawerId
            ) {
                return;
            }


            io.to(roomCode).emit(
                "clearCanvas"
            );
        }
    );


    // ==================================================
    // GUESS
    // ==================================================

    socket.on(
        "sendGuess",
        (guess) => {

            const roomCode =
                socket.data.roomCode;


            const room =
                rooms[roomCode];


            if (
                !room ||
                !room.word
            ) {
                return;
            }


            if (
                socket.id ===
                room.drawerId
            ) {
                return;
            }


            const cleanGuess =
                guess
                    .trim()
                    .toLowerCase();


            if (!cleanGuess) {
                return;
            }


            // =====================================
            // CORRECT
            // =====================================

            if (
                cleanGuess ===
                room.word
                    .toLowerCase()
            ) {

                if (
                    room.correctGuessers
                        .has(
                            socket.id
                        )
                ) {
                    return;
                }


                room.correctGuessers.add(
                    socket.id
                );


                const player =
                    room.players.find(
                        (player) =>
                            player.id ===
                            socket.id
                    );


                if (player) {

                    const guessRank =
                        room.correctGuessers.size;


                    const guessPoints =
                        Math.max(
                            0,
                            MAX_GUESS_POINTS -
                                (guessRank - 1) *
                                POINTS_PER_GUESS
                        );


                    player.score +=
                        guessPoints;
                }


                io.to(roomCode).emit(
                    "chatMessage",
                    {
                        system: true,

                        text:
                            socket.data
                                .username +
                            " guessed the word"
                    }
                );


                io.to(socket.id).emit(
                    "youGuessedCorrectly"
                );


                const requiredCorrect =
                    room.players.length -
                    1;


                if (
                    room.correctGuessers
                        .size >=
                    requiredCorrect
                ) {
                    endTurn(
                        roomCode
                    );
                }


                if (
                    room.correctGuessers
                        .size <
                    requiredCorrect
                ) {
                    io.to(roomCode).emit(
                        "scoresUpdated",
                        room.players
                    );
                }


                return;
            }


            // Wrong guess
            io.to(roomCode).emit(
                "chatMessage",
                {
                    username:
                        socket.data
                            .username,

                    text:
                        guess
                }
            );
        }
    );


    // ==================================================
    // DISCONNECT
    // ==================================================

    socket.on(
        "disconnect",
        () => {

            const roomCode =
                socket.data.roomCode;


            const room =
                rooms[roomCode];


            if (!room) {
                return;
            }


            const removedIndex =
                room.players.findIndex(
                    (player) =>
                        player.id ===
                        socket.id
                );


            room.players =
                room.players.filter(
                    (player) =>
                        player.id !==
                        socket.id
                );


            room.readyPlayers
                ?.delete(
                    socket.id
                );


            room.correctGuessers
                ?.delete(
                    socket.id
                );


            if (
                room.players.length ===
                0
            ) {

                clearRoomTimer(
                    room
                );


                delete rooms[
                    roomCode
                ];

                return;
            }


            // Change host
            if (
                room.hostId ===
                socket.id
            ) {

                room.hostId =
                    room.players[0].id;


                room.players.forEach(
                    (player) => {

                        player.isHost =
                            player.id ===
                            room.hostId;

                    }
                );
            }


            if (
                removedIndex >= 0 &&
                removedIndex <
                    room.currentTurnIndex
            ) {

                room.currentTurnIndex--;
            }


            if (
                room.gameStarted &&
                room.drawerId ===
                    socket.id
            ) {

                clearRoomTimer(
                    room
                );


                room.turnEnding =
                    false;


                startTurn(
                    roomCode
                );
            }


            io.to(roomCode).emit(
                "playersUpdated",
                room.players
            );


            io.to(roomCode).emit(
                "scoresUpdated",
                room.players
            );


            // If all remaining guessers
            // already guessed
            if (
                room.gameStarted &&
                room.word &&
                room.correctGuessers.size >=
                    room.players.length -
                        1
            ) {

                endTurn(
                    roomCode
                );
            }
        }
    );
});


const PORT =
    process.env.PORT || 3001;

server.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `Server running on port ${PORT}`
        );
    }
);