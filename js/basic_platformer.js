var canvas;
var context;
var timer;
var interval;
var player;
var gameState = "title";

var traps = [];
var explosions = [];
var bullets = [];


canvas = document.getElementById("canvas");
context = canvas.getContext("2d");
// ====================== LEVEL DATA ======================
const tileSize = 40;

const levelMap = [
    "000000000000000000000000000000",   // row 0
    "020000000000000000000000000003",   // row 1 - player and enemy
    "111111111111111000011111111111",   // row 2
    "150000000000000000010000000000",   // row 3
    "111111111111111000010301000000",   // row 4 - wider corridors
    "401000000000001000010001111000",   // row 5
    "101003000003001030010000001000",   // row 6
    "101000010000001000010001111000",   // row 7
    "100000000000000000000001000000",   // row 8
    "100000000000000000000001000000",    // row 9
    "111111111111111111111111000000",
    "100000000000000000000000000000",
    "100300000000111000001000001111",
    "100000000000111000000000000111",
    "100006000000111000300003000011",
    "111111111111111000000000000011",
    "170100000000111111110001111111",
    "100100300000111000000000000000",
    "100000003000010000011000300011",
    "100100000000000030000000000011",
    "100000100000010000000100100011",
    "100100000000000000000000000090",
    "111111111111111111111111111000", // LAST ROW

];

// === CREATE LEVEL FROM ARRAY ===
var walls = [];
var enemies = [];
var vent1, vent2;
var vent3, vent4;
var winGoal;

player = new GameObject({ width: 20, height: 20, color: "#00ff88" });

for (let row = 0; row < levelMap.length; row++) {
    for (let col = 0; col < levelMap[row].length; col++) {
        let x = col * tileSize + tileSize / 2;
        let y = row * tileSize + tileSize / 2;
        let symbol = levelMap[row][col];

        if (symbol === "1") {
            let wall = new GameObject({
                x: x,
                y: y,
                width: tileSize,
                height: tileSize,
                color: "#555577"
            });
            walls.push(wall);
        }
        else if (symbol === "2") {
            player.x = x;
            player.y = y;
            player.startX = x;
            player.startY = y;
        }
        else if (symbol === "3") {
            let e = new GameObject({
                x: x,
                y: y,
                width: 20,
                height: 20,
                color: "#ff4444"
            });

            e.startX = x;
            e.startY = y;
            e.lastKnownX = x;
            e.lastKnownY = y;
            e.speed = 2.5;
            e.state = "patrol";
            e.alertTimer = 0;
            e.pauseTime = 200;
            e.reactionTime = 30;
            e.reactionTimer = 0;
            e.isStuck = false;
            e.stuckTimer = 0;
            e.visionLength = 800;
            e.isSeeingPlayer = false;

            enemies.push(e);
        }
        else if (symbol === "4") {
            vent1 = new GameObject({ x: x, y: y, width: 30, height: 30, color: "#777777" });
            vent1.name = "ventA1";
        }
        else if (symbol === "5") {
            vent2 = new GameObject({ x: x, y: y, width: 30, height: 30, color: "#777777" });
            vent2.name = "ventA2";
        }
        else if (symbol === "6") {
            vent3 = new GameObject({ x: x, y: y, width: 30, height: 30, color: "#777777" });
            vent3.name = "ventB1";
        }
        else if (symbol === "7") {
            vent4 = new GameObject({ x: x, y: y, width: 30, height: 30, color: "#777777" });
            vent4.name = "ventB2";
        }

        else if (symbol === "9") {
            winGoal = new GameObject({
                x: x,
                y: y,
                width: 60,
                height: 60,
                color: "#44ddff"   
            });
            winGoal.isGoal = true;
        }

    }
}

// Connect vents to each other
if (vent1 && vent2) {
    vent1.partner = vent2;
    vent2.partner = vent1;
}

if (vent3 && vent4) {
    vent3.partner = vent4;
    vent4.partner = vent3;
}
//////////////

var fX = .8;
var fY = .8;

// Vision settings for the enemy
// enemy.visionLength = 500;     // how far the guard can see
// enemy.visionColor = "#ffff00"; // yellow for testing
// enemy.isSeeingPlayer = false;


///////////////////

interval = 1000 / 60;
timer = setInterval(animate, interval);

function animate() {

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === "title") {
        drawTitleScreen();
        return;   // stop the rest of the game from running
    }

    if (gameState === "gameOver") {
        drawGameOver();
        return;
    }

    if (gameState === "instructions") {
        drawInstructions();
        return;
    }

    if (gameState === "win") {
        drawWinScreen();
        return;
    }

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

    // === COLLISION WITH ALL WALLS ===
    for (let i = 0; i < walls.length; i++) {
        let wall = walls[i];
        if (player.hitTestObject(wall)) {
            player.x -= Math.sign(player.vx) * 4;
            player.y -= Math.sign(player.vy) * 4;
            player.vx = 0;
            player.vy = 0;
        }
    }

    //----------------------------------------------------------

    //----Drop Traps----

    if (spacebar) {
        dropTrap();
        spacebar = false;        // One trap per press
    }

    //// Vent Teleport check=========================
    checkVents();


    // 4. Vision (must come after player movement)
    // checkVision();
    // Draw enemies (logic + drawing)
    updateEnemies();                    // handles AI + stuck flashing
    for (let i = 0; i < enemies.length; i++) {
        enemies[i].drawRect();
    }

// === WIN CONDITION ===
    if (winGoal && player.hitTestObject(winGoal)) {
        gameState = "win";
    }

    updateTraps();
    updateBullets();

    // 6. DRAW (only once each)
    // Draw all walls
    for (let i = 0; i < walls.length; i++) {
        walls[i].drawRect();
    }

    // Draw vents
    if (vent1) drawVent(vent1);
    if (vent2) drawVent(vent2);
    if (vent3) drawVent(vent3);
    if (vent4) drawVent(vent4);

    drawTraps();
    drawExplosions();
    player.drawRect();

    drawExclamation();      // exclamation marks above alert enemies
    drawBullets();
    drawLives();

    // Draw win goal
    if (winGoal) {
        winGoal.drawRect();
        
        // "WIN" text on the goal
        context.fillStyle = "#ffffff";
        context.font = "bold 24px Arial";
        context.textAlign = "center";
        context.fillText("WIN", winGoal.x, winGoal.y + 8);
    }
}

// VISION SYSTEM =============================

// Line vs rectangle intersection (good enough for one wall)
function lineIntersectsRect(x1, y1, x2, y2, rect) {
    // Check if line crosses any of the 4 sides of the rectangle
    return (
        lineIntersectsLine(x1, y1, x2, y2, rect.left().x, rect.top().y, rect.right().x, rect.top().y) ||
        lineIntersectsLine(x1, y1, x2, y2, rect.right().x, rect.top().y, rect.right().x, rect.bottom().y) ||
        lineIntersectsLine(x1, y1, x2, y2, rect.right().x, rect.bottom().y, rect.left().x, rect.bottom().y) ||
        lineIntersectsLine(x1, y1, x2, y2, rect.left().x, rect.bottom().y, rect.left().x, rect.top().y)
    );
}

// Does oes one line segment intersect another?
// Line 1: from (x1,y1) to (x2,y2)----enemy to player
// Line 2: from (x3,y3) to (x4,y4)---- one side of the wall
function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    var den = (x4 - x3) * (y2 - y1) - (x2 - x1) * (y4 - y3);
    if (Math.abs(den) < 0.0001) return false; // parallel

    var t = ((y3 - y1) * (x2 - x1) - (x3 - x1) * (y2 - y1)) / den;
    var u = -((y2 - y1) * (x3 - x1) - (y3 - y1) * (x2 - x1)) / den;

    return (t >= 0 && t <= 1 && u >= 0 && u <= 1);
}


// Simple movement helper
function moveToward(obj, targetX, targetY, speed) {
    var dx = targetX - obj.x;
    var dy = targetY - obj.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
        obj.x += (dx / dist) * speed;
        obj.y += (dy / dist) * speed;
    }
}


// ====================== TRAP SYSTEM ======================

function dropTrap() {
    if (traps.length >= 3) {
        // Remove oldest trap
        traps.shift();
    }

    var newTrap = {
        x: player.x,
        y: player.y,
        size: 28,
        active: true
    };
    traps.push(newTrap);
}

function updateTraps() {
    for (var i = traps.length - 1; i >= 0; i--) {
        var trap = traps[i];
        if (!trap.active) continue;

        // Check every enemy for trap collision
        for (var j = 0; j < enemies.length; j++) {
            var e = enemies[j];

            var tdx = e.x - trap.x;
            var tdy = e.y - trap.y;
            var trapDistance = Math.sqrt(tdx * tdx + tdy * tdy);

            if (!e.isStuck && trapDistance < 35) {
                e.isStuck = true;
                e.stuckTimer = 180;
                trap.active = false;
                console.log("Enemy caught in trap!");
                break;
            }
        }
    }

    // Check if player kills any stuck enemy
    for (var j = 0; j < enemies.length; j++) {
        var e = enemies[j];
        if (e.isStuck) {
            var pdx = player.x - e.x;
            var pdy = player.y - e.y;
            var killDistance = Math.sqrt(pdx * pdx + pdy * pdy);

            if (killDistance < 45) {
                console.log("Enemy eliminated!");
                createExplosion(e.x, e.y);
                e.x = -9999;           // remove enemy
                e.isStuck = false;
            }
        }
    }
}
function drawTraps() {
    for (var i = 0; i < traps.length; i++) {
        var t = traps[i];
        if (!t.active) continue;

        context.save();
        context.translate(t.x, t.y);

        // Draw a simple star shape
        context.fillStyle = "#000000";
        context.strokeStyle = "#14a857";
        context.lineWidth = 3;

        context.beginPath();
        for (let a = 0; a < 10; a++) {     // 5-point star
            let ang = a * Math.PI / 5 - Math.PI / 2;
            let r = (a % 2 === 0) ? t.size : t.size / 2;
            context.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        }
        context.closePath();
        context.fill();
        context.stroke();

        context.restore();
    }
}

// ====explosions!


function createExplosion(x, y) {
    explosions.push({
        x: x,
        y: y,
        life: 30
    });
}

function drawExplosions() {
    for (var i = explosions.length - 1; i >= 0; i--) {
        var e = explosions[i];
        e.life--;

        if (e.life <= 0) {
            explosions.splice(i, 1);
            continue;
        }

        var alpha = e.life / 30;
        context.save();
        context.globalAlpha = alpha;
        context.fillStyle = "#ffff00";
        context.beginPath();
        context.arc(e.x, e.y, 25 * (e.life / 30), 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
}

// ====================== BULLET SYSTEM ======================

function createBullet(startX, startY, targetX, targetY, speed = 6) {
    var dx = targetX - startX;
    var dy = targetY - startY;
    var distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize direction
    var vx = (dx / distance) * speed;
    var vy = (dy / distance) * speed;

    var bullet = {
        x: startX,
        y: startY,
        vx: vx,
        vy: vy,
        size: 6,
        active: true
    };

    bullets.push(bullet);
}

function shootAtPlayer() {
    // Enemy fires one bullet toward current player position
    createBullet(enemy.x, enemy.y, player.x, player.y, 7);

    console.log("Enemy fired!");
}

function updateBullets() {
    for (var i = bullets.length - 1; i >= 0; i--) {
        var b = bullets[i];
        if (!b.active) continue;

        b.x += b.vx;
        b.y += b.vy;

        // === Forgiving wall collision ===
        var hitWall = false;
        for (var j = 0; j < walls.length; j++) {
            // Only check if bullet is actually inside a wall (more reliable)
            if (walls[j].hitTestPoint({x: b.x, y: b.y})) {
                hitWall = true;
                break;
            }
        }

        if (hitWall) {
            b.active = false;
            continue;
        }

        // Player hit
        var pdx = player.x - b.x;
        var pdy = player.y - b.y;
        if (Math.sqrt(pdx*pdx + pdy*pdy) < 22) {
            console.log("Player hit by bullet!");
            b.active = false;
            player.lives--;
            if (player.lives > 0) {
                player.x = player.startX;
                player.y = player.startY;
                player.vx = 0;
                player.vy = 0;
            } else {
                gameState = "gameOver";
            }
        }

        // Off-screen cleanup
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            b.active = false;
        }
    }

    // Cleanup
    for (var i = bullets.length - 1; i >= 0; i--) {
        if (!bullets[i].active) bullets.splice(i, 1);
    }
}

function drawBullets() {
    context.shadowBlur = 12;
    context.shadowColor = "#ff00ff";

    for (var i = 0; i < bullets.length; i++) {
        var b = bullets[i];
        if (!b.active) continue;

        context.fillStyle = "#ff00f28e";   // bright yellow
        context.beginPath();
        context.arc(b.x, b.y, 8, 0, Math.PI * 2);   // larger
        context.fill();
    }

    context.shadowBlur = 0; // reset
}

function drawLives() {
    var startX = 30;
    var startY = 30;
    var size = 18;

    context.save();
    context.fillStyle = "#ff2222";
    context.strokeStyle = "#aa0000";
    context.lineWidth = 2;

    // Draw red triangles (one per life)
    for (var i = 0; i < player.lives; i++) {
        var x = startX + (i * 28);

        context.beginPath();
        context.moveTo(x, startY - size / 2);           // top point
        context.lineTo(x - size / 2, startY + size / 2);  // bottom left
        context.lineTo(x + size / 2, startY + size / 2);  // bottom right
        context.closePath();
        context.fill();
        context.stroke();
    }

    // Draw the number
    context.fillStyle = "#ff0202";
    context.font = "bold 20px Arial";
    context.fillText("× " + player.lives, startX + (player.lives * 28) + 5, startY + 6);

    context.restore();
}

// ====================== DRAW VENT ======================

function drawVent(vent) {
    context.save();

    // main vent body (slightly smaller than the hitbox)
    var inset = 6;
    context.fillStyle = "#555555";           // darker grey
    context.fillRect(
        vent.x - vent.width / 2 + inset,
        vent.y - vent.height / 2 + inset,
        vent.width - inset * 2,
        vent.height - inset * 2
    );

    //vent grate lines (horizontal)
    context.strokeStyle = "#222222";
    context.lineWidth = 4;

    var lineSpacing = 2;
    var startY = vent.y - vent.height / 2 + inset + 8;

    for (let i = 0; i < 5; i++) {
        var y = startY + (i * lineSpacing);
        context.beginPath();
        context.moveTo(vent.x - vent.width / 2 + inset + 4, y);
        context.lineTo(vent.x + vent.width / 2 - inset - 4, y);
        context.stroke();
    }

    //  border
    context.strokeStyle = "#333333";
    context.lineWidth = 3;
    context.strokeRect(
        vent.x - vent.width / 2 + inset,
        vent.y - vent.height / 2 + inset,
        vent.width - inset * 2,
        vent.height - inset * 2
    );

    context.restore();
}

// ====================== VENT TELEPORT SYSTEM ======================

function checkVents() {
    if (player.teleportCooldown > 0) {
        player.teleportCooldown--;
        return;
    }

    // Pair A
    if (vent1 && player.hitTestObject(vent1)) { teleportPlayer(vent1.partner); return; }
    if (vent2 && player.hitTestObject(vent2)) { teleportPlayer(vent2.partner); return; }

    // Pair B
    if (vent3 && player.hitTestObject(vent3)) { teleportPlayer(vent3.partner); return; }
    if (vent4 && player.hitTestObject(vent4)) { teleportPlayer(vent4.partner); return; }
}

function teleportPlayer(targetVent) {
    // Teleport to the center of the partner vent
    player.x = targetVent.x + 45;
    player.y = targetVent.y;

    //prevent constant teleporting====
    player.teleportCooldown = 45;

    console.log("Teleported through vent!");
}





///////////////////////////////Restart Game Stuff=================================================

function drawGameOver() {
    // Dark overlay
    context.fillStyle = "rgba(0, 0, 0, 0.75)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Big GAME OVER text
    context.fillStyle = "#ff2222";
    context.font = "bold 72px Arial";
    context.textAlign = "center";
    context.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);

    // Restart instruction
    context.fillStyle = "#ffffff";
    context.font = "24px Arial";
    context.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 30);

    context.textAlign = "left"; // reset alignment
}

// Restart when pressing R
document.addEventListener("keydown", function (e) {
    if ((gameState === "gameOver" || gameState === "win") && e.key.toLowerCase() === "r") {
        restartGame();
    }
});

function restartGame() {
    // Reset player
    player.x = player.startX;
    player.y = player.startY;
    player.vx = 0;
    player.vy = 0;
    player.lives = 3;
    player.teleportCooldown = 0;   // important for vents

    // === Reset ALL enemies ===
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];   // "e" = current enemy

        e.x = e.startX;
        e.y = e.startY;
        e.state = "patrol";
        e.isStuck = false;
        e.isSeeingPlayer = false;
        e.reactionTimer = 0;
        e.alertTimer = 0;
        e.color = "#ff4444";          // back to normal color
    }

    // Clear arrays
    bullets = [];
    traps = [];
    explosions = [];

    // Reset game state
    gameState = "playing";

    console.log("Game Restarted");
}

// ====================== MOUSE SUPPORT ======================
var mouseX = 0;
var mouseY = 0;

canvas.addEventListener("mousemove", function (e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener("click", function (e) {
    if (gameState === "title") {
        if (isButtonClicked(200, 380, 600, 80)) {        // START
            gameState = "playing";
        }
        else if (isButtonClicked(200, 480, 600, 80)) {   // CONTROLS
            gameState = "instructions";
        }
        else if (isButtonClicked(200, 580, 600, 80)) {   // QUIT
            location.reload();
        }
    }
    else if (gameState === "instructions") {
        // Clicking anywhere on instructions screen goes back to title
        gameState = "title";
    }
});

function isButtonClicked(btnX, btnY, btnW, btnH) {
    return mouseX > btnX && mouseX < btnX + btnW &&
        mouseY > btnY && mouseY < btnY + btnH;
}

function drawTitleScreen() {
    // Dark background
    context.fillStyle = "#111133";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Title text
    context.fillStyle = "#ffcc00";
    context.font = "bold 92px Arial";
    context.textAlign = "center";
    context.fillText("STEALTH SPIDER", canvas.width / 2, 220);

    // Subtitle
    context.fillStyle = "#aaaaaa";
    context.font = "28px Arial";
    context.fillText("a tiny Metal Gear prototype", canvas.width / 2, 280);

    // Buttons
    drawButton("START", 200, 380, 600, 80);
    drawButton("CONTROLS", 200, 480, 600, 80);
    drawButton("QUIT", 200, 580, 600, 80);

    context.textAlign = "left"; // reset
}

function drawButton(text, x, y, w, h) {
    // Button background
    context.fillStyle = "#222255";
    context.fillRect(x, y, w, h);

    // Button border
    context.strokeStyle = "#ffcc00";
    context.lineWidth = 6;
    context.strokeRect(x, y, w, h);

    // Button text
    context.fillStyle = "#ffffff";
    context.font = "bold 36px Arial";
    context.textAlign = "center";
    context.fillText(text, x + w / 2, y + h / 2 + 12);
}

/////////////INSTRUCTIONS==============================


function drawInstructions() {
    // Dark background
    context.fillStyle = "#111133";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    context.fillStyle = "#ffcc00";
    context.font = "bold 60px Arial";
    context.textAlign = "center";
    context.fillText("CONTROLS", canvas.width / 2, 140);

    // Instructions list
    context.fillStyle = "#ffffff";
    context.font = "bold 28px Arial";
    context.textAlign = "left";

    var startY = 220;
    var lineHeight = 45;

    context.fillText("W / A / S / D     Move", 250, startY);
    context.fillText("SPACE             Drop Trap", 250, startY + lineHeight);
    context.fillText("Walk into flashing enemy = Kill", 250, startY + lineHeight * 2);
    context.fillText("Step on grey vents to escape fast!", 250, startY + lineHeight * 3);

    // Back instruction
    context.fillStyle = "#aaaaaa";
    context.font = "24px Arial";
    context.textAlign = "center";
    context.fillText("Click anywhere or press ESC to go back", canvas.width / 2, 620);

    context.textAlign = "left"; // reset
}

// ====================== ALERT EXCLAMATION MARK ======================

function drawExclamation() {
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        if (e.state !== "alert") continue;

        context.save();
        context.fillStyle = "#ff0000";
        context.font = "bold 42px Arial";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("!", e.x, e.y - e.height / 2 - 35);
        context.restore();
    }
}
// ====================== VISION FOR EACH ENEMY ======================
function checkVisionForEnemy(e) {
    e.isSeeingPlayer = false;

    var dx = player.x - e.x;
    var dy = player.y - e.y;
    var distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > e.visionLength || distance < 10) {
        e.reactionTimer = 0;
        return;
    }

    // === CLOSE-RANGE BYPASS ===
    // If the player is very close, assume clear line of sight
    // (prevents false blocking when standing right next to the enemy)
    if (distance < 120) {
        e.isSeeingPlayer = true;
        if (e.reactionTimer < 1) e.reactionTimer = 1;
        else e.reactionTimer++;
        return;
    }

    // === NORMAL WALL BLOCKING CHECK ===
    var wallBlocking = false;
    for (let i = 0; i < walls.length; i++) {
        if (lineIntersectsRect(e.x, e.y, player.x, player.y, walls[i])) {
            wallBlocking = true;
            break;
        }
    }

    if (wallBlocking) {
        e.reactionTimer = 0;
        return;
    }

    // Clear line of sight
    e.isSeeingPlayer = true;

    if (e.reactionTimer < 1) {
        e.reactionTimer = 1;
    } else {
        e.reactionTimer++;
    }
}
// ====================== SHOOT FROM ANY ENEMY ======================
function shootAtPlayerFromEnemy(e) {
    createBullet(e.x, e.y, player.x, player.y, 7);
    console.log("Enemy fired!");
}

// ====================== MULTI-ENEMY AI ======================
function updateEnemies() {
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];

        // Stuck logic
        if (e.isStuck) {
            e.stuckTimer--;
            if (e.stuckTimer <= 0) e.isStuck = false;
            e.color = (Math.floor(Date.now() / 120) % 2 === 0) ? "#ff0000" : "#ffaa00";
            continue;
        } else {
            e.color = "#ff4444";
        }

        // Vision
        checkVisionForEnemy(e);

        // ==================== IMPROVED ALERT + SHOOTING ====================
        if (e.isSeeingPlayer && e.reactionTimer >= e.reactionTime) {
            
            // First time entering alert → guaranteed burst
            if (e.state !== "alert") {
                e.state = "alert";
                e.alertTimer = 0;
                
                console.log("🚨 ENEMY ALERTED - FIRING INITIAL BURST");
                shootAtPlayerFromEnemy(e);
                shootAtPlayerFromEnemy(e);
                shootAtPlayerFromEnemy(e);   // 3-shot burst on detection
            }

            e.lastKnownX = player.x;
            e.lastKnownY = player.y;
        } 
        else if (!e.isSeeingPlayer && e.state === "alert") {
            e.alertTimer++;
            if (e.alertTimer > e.pauseTime) {
                e.state = "return";
                e.alertTimer = 0;
            }
        }

        // ==================== MOVEMENT + RELIABLE SHOOTING WHILE CHASING ====================
        if (e.state === "alert") {
            moveToward(e, e.lastKnownX, e.lastKnownY, e.speed);

            // Much more reliable shooting while alert (even in tight spaces)
            if (Math.random() < 0.06) {        // ≈ every 1 second on average
                shootAtPlayerFromEnemy(e);
            }
        } 
        else if (e.state === "return") {
            moveToward(e, e.startX, e.startY, e.speed * 0.8);
            
            let dx = e.startX - e.x;
            let dy = e.startY - e.y;
            if (Math.sqrt(dx*dx + dy*dy) < 12) {
                e.state = "patrol";
                e.x = e.startX;
                e.y = e.startY;
            }
        }
    }
}

function drawWinScreen() {
    context.fillStyle = "rgba(0, 50, 0, 0.9)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#00ff88";
    context.font = "bold 90px Arial";
    context.textAlign = "center";
    context.fillText("MISSION COMPLETE", canvas.width/2, 280);

    context.fillStyle = "#ffffff";
    context.font = "bold 36px Arial";
    context.fillText("You Escaped!", canvas.width/2, 380);

    context.font = "24px Arial";
    context.fillText("Press R to Play Again", canvas.width/2, 480);

    context.textAlign = "left";
}