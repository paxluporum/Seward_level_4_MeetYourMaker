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

// === ENEMY AI SETTINGS ===
enemy.startX = enemy.x;           // Remember where guard started
enemy.startY = enemy.y;
enemy.lastKnownX = enemy.x;
enemy.lastKnownY = enemy.y;
enemy.speed = 2.5;
enemy.state = "patrol";           // patrol, alert, return
enemy.alertTimer = 0;
enemy.pauseTime = 60;             // frames to pause at last known position

//////////////

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
    //Enemy AI
    updateEnemy();


    player.drawRect();
    enemy.drawRect();
    wall.drawRect();
}

// ====================== VISION SYSTEM ======================

function checkVision() {
    enemy.isSeeingPlayer = false;

   // Step 1: Calculate the difference between enemy and player
    var dx = player.x - enemy.x; // How far player is from enemy on X axis
    var dy = player.y - enemy.y; // How far player is from enemy on Y axis

    // Step 2: Calculate the straight-line distance using Pythagorean math
    var distance = Math.sqrt(dx*dx + dy*dy);
    // This is the actual distance in pixels between the two objects.
    // Math.sqrt(dx*dx + dy*dy) is the distance formula

    // Stop if player is too far away to matter
    if (distance > enemy.visionLength) return;

    // Check if wall blocks the line of sight
    if (lineIntersectsRect(enemy.x, enemy.y, player.x, player.y, wall)) {
        return; // wall is in the way
    }

    // No wall in between → guard sees player!
    enemy.isSeeingPlayer = true;
    // Remember where player was seen
    enemy.lastKnownX = player.x;
    enemy.lastKnownY = player.y;
}

function drawVisionLine() {
    // Draw the vision ray toward the player (for testing)
    var dx = player.x - enemy.x;
    var dy = player.y - enemy.y;
    var distance = Math.sqrt(dx*dx + dy*dy);

    if (distance > enemy.visionLength) return;

    // Step 3: Normalize the direction and extend it to visionLength
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

// Line vs rectangle intersection (good enough for one wall)
function lineIntersectsRect(x1, y1, x2, y2, rect) {
    // Check if line crosses any of the 4 sides of the rectangle
    return (
        lineIntersectsLine(x1,y1,x2,y2, rect.left().x, rect.top().y, rect.right().x, rect.top().y) ||
        lineIntersectsLine(x1,y1,x2,y2, rect.right().x, rect.top().y, rect.right().x, rect.bottom().y) ||
        lineIntersectsLine(x1,y1,x2,y2, rect.right().x, rect.bottom().y, rect.left().x, rect.bottom().y) ||
        lineIntersectsLine(x1,y1,x2,y2, rect.left().x, rect.bottom().y, rect.left().x, rect.top().y)
    );
}

// Does oes one line segment intersect another?
// Line 1: from (x1,y1) to (x2,y2)----enemy to player
// Line 2: from (x3,y3) to (x4,y4)---- one side of the wall
function lineIntersectsLine(x1,y1,x2,y2, x3,y3,x4,y4) {
    var den = (x4 - x3) * (y2 - y1) - (x2 - x1) * (y4 - y3);
    if (Math.abs(den) < 0.0001) return false; // parallel

    var t = ((y3 - y1) * (x2 - x1) - (x3 - x1) * (y2 - y1)) / den;
    var u = -((y2 - y1) * (x3 - x1) - (y3 - y1) * (x2 - x1)) / den;

    return (t >= 0 && t <= 1 && u >= 0 && u <= 1);
}



///-----------------ENEMY AI STUFF

function updateEnemy() {
    if (enemy.isSeeingPlayer) {
        enemy.state = "alert";
        enemy.alertTimer = 0;
    } else if (enemy.state === "alert") {
        enemy.alertTimer++;
        if (enemy.alertTimer > enemy.pauseTime) {
            enemy.state = "return";
        }
    }

    // Move enemy based on state
    if (enemy.state === "alert") {
        moveToward(enemy, enemy.lastKnownX, enemy.lastKnownY, enemy.speed);
    } 
    else if (enemy.state === "return") {
        moveToward(enemy, enemy.startX, enemy.startY, enemy.speed * 0.8);
        
        // If close enough to start position, go back to patrol
        var dx = enemy.startX - enemy.x;
        var dy = enemy.startY - enemy.y;
        if (Math.sqrt(dx*dx + dy*dy) < 10) {
            enemy.state = "patrol";
            enemy.x = enemy.startX;
            enemy.y = enemy.startY;
        }
    }
    // "patrol" state does nothing for now (guard stays still)
}

// Simple movement helper
function moveToward(obj, targetX, targetY, speed) {
    var dx = targetX - obj.x;
    var dy = targetY - obj.y;
    var dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist > 5) {
        obj.x += (dx / dist) * speed;
        obj.y += (dy / dist) * speed;
    }
}