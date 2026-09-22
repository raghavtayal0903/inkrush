import { io } from "socket.io-client";

const SERVER_URL =
    "https://ink-rush.onrender.com";

console.log(
    "Connecting to backend:",
    SERVER_URL
);

const socket = io(SERVER_URL);

socket.on("connect", () => {
    console.log(
        "SOCKET CONNECTED:",
        socket.id
    );
});

socket.on("connect_error", (error) => {
    console.error(
        "SOCKET ERROR:",
        error.message
    );
});

export default socket;