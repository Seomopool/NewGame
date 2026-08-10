const socket = io();

const game = document.getElementById("game");

socket.on("state", (players) => {

    // 기존 네모 전부 삭제
    game.innerHTML = "";

    for (const id in players) {

        const player = players[id];

        const div = document.createElement("div");

        div.classList.add("player");

        div.style.left = player.x + "px";
        div.style.top = player.y + "px";

        // 자기 캐릭터는 파란색
        if (id === socket.id) {
            div.style.backgroundColor = "blue";
        }

        game.appendChild(div);
    }

});

document.addEventListener("keydown", (event) => {

    if (event.key === "w") {
        socket.emit("move", "up");
    }

    if (event.key === "s") {
        socket.emit("move", "down");
    }

    if (event.key === "a") {
        socket.emit("move", "left");
    }

    if (event.key === "d") {
        socket.emit("move", "right");
    }

});