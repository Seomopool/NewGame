const socket = io();

function move(direction) {

    socket.emit("move", {
        direction: direction
    });

}

socket.on("playerMoved", (data) => {

    const messages = document.getElementById("messages");

    const item = document.createElement("li");

    item.textContent =
        `${data.playerId} moved ${data.direction}`;

    messages.appendChild(item);

});