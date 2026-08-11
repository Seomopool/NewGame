const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let waitingPlayer = null; // 대기 중인 플레이어 (1명만 임시 저장)
const rooms = {}; // 진행 중인 게임 방 목록

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // 1. 매칭 시스템
    socket.on("find_match", () => {
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            // 대기 중인 사람이 있으면 매칭 성사!
            const roomId = "room_" + socket.id; // 고유 방 이름 생성
            
            // 두 플레이어를 같은 방에 입장시킴
            socket.join(roomId);
            waitingPlayer.join(roomId);

            // 각 소켓에 현재 방 ID 저장
            socket.roomId = roomId;
            waitingPlayer.roomId = roomId;

            // 방의 초기 게임 상태 세팅
            rooms[roomId] = {
                players: {
                    [socket.id]: { age: 0, hp: 100, maxHp: 100, money: 0, power: 10 },
                    [waitingPlayer.id]: { age: 0, hp: 100, maxHp: 100, money: 0, power: 10 }
                }
            };

            // 두 사람에게 게임 시작 알림 및 초기 상태 전송
            io.to(roomId).emit("game_start", rooms[roomId].players);
            
            console.log(`Match found! Room: ${roomId}`);
            waitingPlayer = null; // 대기열 초기화
        } else {
            // 대기 중인 사람이 없으면 내가 대기열에 등록
            waitingPlayer = socket;
            socket.emit("waiting");
        }
    });

    // 2. 인게임 행동 처리 (해당 방 안에서만 작동하도록 수정)
    socket.on("action", (type) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return; // 방이 없으면 무시

        const room = rooms[roomId];
        const player = room.players[socket.id];
        
        if (!player || player.hp <= 0) return; // 죽으면 행동 불가

        if (type === "grow") {
            player.age += 1;
            player.money += 20;
            player.maxHp += 10;
            player.hp = player.maxHp; 
        } else if (type === "train") {
            if (player.money >= 30) {
                player.money -= 30;
                player.power += 15;
            }
        } else if (type === "attack") {
            for (const id in room.players) {
                if (id !== socket.id) {
                    const enemy = room.players[id];
                    if (enemy.hp > 0) {
                        enemy.hp -= player.power;
                        if (enemy.hp < 0) enemy.hp = 0;
                    }
                }
            }
        }
        
        // 해당 방에 있는 두 명에게만 변경된 상태 전송
        io.to(roomId).emit("state", room.players);
    });

    // 3. 연결 해제 처리 (탈주 처리)
    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
        
        // 대기 중에 나갔을 경우
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        }
        
        // 게임 중에 나갔을 경우
        const roomId = socket.roomId;
        if (roomId && rooms[roomId]) {
            // 상대방에게 게임 종료 알림
            socket.to(roomId).emit("opponent_left");
            delete rooms[roomId]; // 방 삭제
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});