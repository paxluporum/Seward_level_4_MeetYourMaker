var canvas;
var context;
var timer;
var interval;
var player;
var enemy;

var wall;

canvas = document.getElementById("canvas");
context = canvas.getContext("2d");

player = new GameObject({
    x: 200,
    y: 400,
    width: 40,
    height: 40,
    color: "#00ff88"
});

enemy = new GameObject({
    x: 700,
    y: 400,
    width: 40,
    height: 40,
    color: "#ff4444"
});

wall = new GameObject({
    x: 450,
    y: 400,
    width: 60,
    height: 300,
    color: "#555577"
});
//////////////////////////////////////////

var fX = .8;
var fY = .8;

// Vision settings for the enemy
enemy.visionLength = 500;     // how far the guard can see
enemy.visionColor = "#ffff00"; // yellow for testing
enemy.isSeeingPlayer = false;
///////////////////

interval = 1000 / 60;
timer = setInterval(animate, interval);

function animate() {

    context.clearRect(0, 0, canvas.width, canvas.height);

    // --- MOVEMENT ---
    if (w) player.vy -= player.ay * player.force;
    if (s) player.vy += player.ay * player.force;
    if (a) player.vx -= player.ax * player.force;
    if (d) player.vx += player.ax * player.force;
    player.vx *= fX;
    player.vy *= fY;
    // ---------------------


    player.x += Math.round(player.vx);
    player.y += Math.round(player.vy);

    /////Collisions------------------------------------------------

    while (wall.hitTestPoint(player.bottom()) && player.vy >= 0) {
        player.y--;
        player.vy = 0;
    }
    while (wall.hitTestPoint(player.left()) && player.vx <= 0) {
        player.x++;
        player.vx = 0;
    }
    while (wall.hitTestPoint(player.right()) && player.vx >= 0) {
        player.x--;
        player.vx = 0;
    }
    while (wall.hitTestPoint(player.top()) && player.vy <= 0) {
        player.y++;
        player.vy = 0;
    }

    //----------------------------------------------------------

    //VISION CHECK
    checkVision();
    drawVisionLine();
    //------


    player.drawRect();
    enemy.drawRect();
    wall.drawRect();
}

// ====================== VISION SYSTEM ======================

function checkVision() {
    enemy.isSeeingPlayer = false;

    // Distance check first (cheap)
    var dx = player.x - enemy.x;
    var dy = player.y - enemy.y;
    var distance = Math.sqrt(dx*dx + dy*dy);

    if (distance > enemy.visionLength) return;

    // Check if wall blocks the line of sight
    if (lineIntersectsRect(enemy.x, enemy.y, player.x, player.y, wall)) {
        return; // wall is in the way
    }

    // No wall in between → guard sees player!
    enemy.isSeeingPlayer = true;
}

function drawVisionLine() {
    // Draw the vision ray toward the player (for testing)
    var dx = player.x - enemy.x;
    var dy = player.y - enemy.y;
    var distance = Math.sqrt(dx*dx + dy*dy);

    if (distance > enemy.visionLength) return;

    var endX = enemy.x + (dx / distance) * enemy.visionLength;
    var endY = enemy.y + (dy / distance) * enemy.visionLength;

    context.save();
    context.strokeStyle = enemy.isSeeingPlayer ? "#ff0000" : "#ffff00"; // red = sees you!
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(enemy.x, enemy.y);
    context.lineTo(endX, endY);
    context.stroke();
    context.restore();
}

// Very simple line vs rectangle intersection (good enough for one wall)
function lineIntersectsRect(x1, y1, x2, y2, rect) {
    // Check if line crosses any of the 4 sides of the rectangle
    return (
        lineIntersectsLine(x1,y1,x2,y2, rect.left().x, rect.top().y, rect.right().x, rect.top().y) ||
        lineIntersectsLine(x1,y1,x2,y2, rect.right().x, rect.top().y, rect.right().x, rect.bottom().y) ||
        lineIntersectsLine(x1,y1,x2,y2, rect.right().x, rect.bottom().y, rect.left().x, rect.bottom().y) ||
        lineIntersectsLine(x1,y1,x2,y2, rect.left().x, rect.bottom().y, rect.left().x, rect.top().y)
    );
}

// Helper: does one line segment intersect another?
function lineIntersectsLine(x1,y1,x2,y2, x3,y3,x4,y4) {
    var den = (x4 - x3) * (y2 - y1) - (x2 - x1) * (y4 - y3);
    if (Math.abs(den) < 0.0001) return false; // parallel

    var t = ((y3 - y1) * (x2 - x1) - (x3 - x1) * (y2 - y1)) / den;
    var u = -((y2 - y1) * (x3 - x1) - (y3 - y1) * (x2 - x1)) / den;

    return (t >= 0 && t <= 1 && u >= 0 && u <= 1);
}