const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public 폴더의 파일들을 브라우저에 제공
app.use(express.static("public"));

// 누군가 서버에 접속했을 때
io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // 플레이어가 move 메시지를 보냈을 때
    socket.on("move", (data) => {
        console.log("Received:", data);

        // 모든 플레이어에게 전달
        io.emit("playerMoved", {
            playerId: socket.id,
            direction: data.direction
        });
    });

    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});