const socket = io();

const lobby = document.getElementById("lobby");
const gameUI = document.getElementById("game-ui");
const arena = document.getElementById("arena");
const lobbyStatus = document.getElementById("lobby-status");
const btnFindMatch = document.getElementById("btn-find-match");

// 1. 매칭 시작 버튼 클릭
btnFindMatch.addEventListener("click", () => {
    socket.emit("find_match");
    btnFindMatch.disabled = true; // 중복 클릭 방지
    lobbyStatus.innerText = "서버와 연결 중...";
});

// 2. 서버에서 대기 중이라고 알려줄 때
socket.on("waiting", () => {
    lobbyStatus.innerText = "상대방을 기다리는 중... (1/2)";
});

// 3. 상대방이 들어와서 게임이 시작될 때
socket.on("game_start", (players) => {
    // 대기실을 숨기고 게임 화면을 보여줌
    lobby.style.display = "none";
    gameUI.style.display = "block";
    renderState(players); // 초기 화면 그리기
});

// 4. 상태 업데이트
socket.on("state", (players) => {
    renderState(players);
});

// 5. 게임 중 상대방이 나갔을 때
socket.on("opponent_left", () => {
    alert("상대방이 도망쳤습니다! (승리)\n대기실로 돌아갑니다.");
    location.reload(); // 새로고침해서 대기실로 원상 복구
});

// 화면 렌더링 함수
function renderState(players) {
    arena.innerHTML = "";

    for (const id in players) {
        const player = players[id];
        const isMe = id === socket.id;

        const card = document.createElement("div");
        card.classList.add("player-card");
        
        if (player.hp <= 0) {
            card.classList.add("dead");
        } else {
            card.classList.add(isMe ? "my-card" : "enemy-card");
        }

        const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);

        card.innerHTML = `
            <h2>${isMe ? "나" : "상대방"} (${player.age}살)</h2>
            <div class="hp-bar-container">
                <div class="hp-bar" style="width: ${hpPercent}%; background-color: ${hpPercent > 20 ? '#4caf50' : '#f44336'};"></div>
            </div>
            <p><strong>HP:</strong> ${player.hp} / ${player.maxHp}</p>
            <p><strong>돈:</strong> 🪙 ${player.money}</p>
            <p><strong>전투력:</strong> ⚔️ ${player.power}</p>
            ${player.hp <= 0 ? "<h3 style='color:red;'>사망...</h3>" : ""}
        `;

        arena.appendChild(card);
    }
}

// 인게임 버튼 클릭 이벤트
document.getElementById("btn-grow").addEventListener("click", () => {
    socket.emit("action", "grow");
});
document.getElementById("btn-train").addEventListener("click", () => {
    socket.emit("action", "train");
});
document.getElementById("btn-attack").addEventListener("click", () => {
    socket.emit("action", "attack");
});