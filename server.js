const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {};

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // 새 플레이어 생성
    players[socket.id] = {
        x: Math.floor(Math.random() * 500),
        y: Math.floor(Math.random() * 300)
    };

    // 현재 전체 플레이어 상태 전송
    io.emit("state", players);

    socket.on("move", (direction) => {
        const player = players[socket.id];

        if (!player) return;

        const speed = 10;

        if (direction === "up") {
            player.y -= speed;
        }

        if (direction === "down") {
            player.y += speed;
        }

        if (direction === "left") {
            player.x -= speed;
        }

        if (direction === "right") {
            player.x += speed;
        }

        // 모든 플레이어에게 최신 상태 전송
        io.emit("state", players);
    });

    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);

        delete players[socket.id];

        io.emit("state", players);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});