var canvas;
var context;
var timer;
var interval;
var player;
var gameState = "title";

var enemy;

var wall;
var traps = [];
var explosions = [];
var bullets = [];



canvas = document.getElementById("canvas");
context = canvas.getContext("2d");

player = new GameObject({
    x: 200,
    y: 400,
    width: 20,
    height: 20,
    color: "#00ff88",
});

///Player lives======
player.lives = 3;
player.startX = player.x;
player.startY = player.y;
player.teleportCooldown = 0;

enemy = new GameObject({
    x: 700,
    y: 400,
    width: 20,
    height: 20,
    color: "#ff4444"
});

////////////VENTS (Teleport mechanic)==============================

var vent1 = new GameObject({
    x: 150,
    y: 200,
    width: 30,
    height: 30,
    color: "#777777"   // grey
});

var vent2 = new GameObject({
    x: 750,
    y: 600,
    width: 30,
    height: 30,
    color: "#777777"
});


vent1.name = "ventA1";
vent2.name = "ventA2";
vent1.partner = vent2;   // vent1 teleports to vent2
vent2.partner = vent1;   // vent2 teleports to vent1



wall = new GameObject({
    x: 450,
    y: 400,
    width: 60,
    height: 300,
    color: "#555577"
});
//////////////////////////////////////////

// === ENEMY AI SETTINGS ===
enemy.startX = enemy.x;
enemy.startY = enemy.y;
enemy.lastKnownX = enemy.x;
enemy.lastKnownY = enemy.y;
enemy.speed = 2.5;
enemy.state = "patrol";
enemy.alertTimer = 0;
enemy.pauseTime = 200;               // frames to pause at last known spot
enemy.reactionTime = 90;            // ≈ 0.75 seconds at 60fps
enemy.reactionTimer = 0;
enemy.isStuck = false;
enemy.stuckTimer = 0;

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

    //----Drop Traps----

    if (spacebar) {
        dropTrap();
        spacebar = false;        // One trap per press
    }

    //// Vent Teleport check=========================
    checkVents();


    // 4. Vision (must come after player movement)
    checkVision();

    // 5. Enemy AI + systems
    updateEnemy();
    updateTraps();
    updateBullets();

    // 6. DRAW (only once each)
    wall.drawRect();
    drawVent(vent1);
    drawVent(vent2);
    drawTraps();
    drawExplosions();
    player.drawRect();
    enemy.drawRect();
    drawExclamation();
   // drawVisionLine(); //for debugging enemy vision
    drawBullets();
    drawLives();
}

// ====================== VISION SYSTEM ======================

function checkVision() {
    enemy.isSeeingPlayer = false;

    var dx = player.x - enemy.x;
    var dy = player.y - enemy.y;
    var distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > enemy.visionLength) {
        enemy.reactionTimer = 0;
        return;
    }

    // Wall blocking check with small buffer
    var wallBlocking = lineIntersectsRect(enemy.x, enemy.y, player.x, player.y, wall);

    if (wallBlocking) {
        // 
        // For this vertical wall, we check X position
        var enemySide;
        if (enemy.x < wall.x) {
            enemySide = "left";
        } else {
            enemySide = "right";
        }
        var playerSide;
        if (player.x < wall.x) {
            playerSide = "left"
        } else {
            playerSide = "right"
        }

        if (enemySide !== playerSide) {
            console.log("WALL BLOCKING - Player behind wall");
            enemy.reactionTimer = 0;
            return;
        }
    }

    // Clear line of sight
    enemy.isSeeingPlayer = true;

    if (enemy.reactionTimer < 1) {
        enemy.reactionTimer = 1;
    } else {
        enemy.reactionTimer++;
    }
}
function drawVisionLine() {
    // Draw the vision ray toward the player (for testing)
    var dx = player.x - enemy.x;
    var dy = player.y - enemy.y;
    var distance = Math.sqrt(dx * dx + dy * dy);

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



///-----------------ENEMY AI STUFF

function updateEnemy() {
    // ==================== STUCK LOGIC ====================
    if (enemy.isStuck) {
        enemy.stuckTimer--;
        if (enemy.stuckTimer <= 0) {
            enemy.isStuck = false;
            enemy.color = "#ff4444";
        }
        if (Math.floor(Date.now() / 120) % 2 === 0) {
            enemy.color = "#ff0000";
        } else {
            enemy.color = "#ffaa00";
        }
        return;
    } else {
        enemy.color = "#ff4444";
    }

    // ==================== VISION ALERT ====================
    if (enemy.isSeeingPlayer && enemy.reactionTimer >= enemy.reactionTime) {

        // Only trigger once when first entering alert
        if (enemy.state !== "alert") {
            enemy.state = "alert";
            enemy.alertTimer = 0;

            // === SHOOT FIRST (before moving) ===
            shootAtPlayer();           // First shot
            shootAtPlayer();
            shootAtPlayer();

        }

        enemy.lastKnownX = player.x;
        enemy.lastKnownY = player.y;
    }
    else if (!enemy.isSeeingPlayer && enemy.state === "alert") {
        enemy.alertTimer++;
        if (enemy.alertTimer > enemy.pauseTime) {
            enemy.state = "return";
            enemy.alertTimer = 0;
        }
    }

    // ==================== MOVEMENT ====================
    if (enemy.state === "alert") {
        moveToward(enemy, enemy.lastKnownX, enemy.lastKnownY, enemy.speed);

        // Optional: Shoot again occasionally while chasing
        if (enemy.isSeeingPlayer && Math.random() < 0.015) {
            shootAtPlayer();
        }
    }
    else if (enemy.state === "return") {
        moveToward(enemy, enemy.startX, enemy.startY, enemy.speed * 0.8);

        var dx = enemy.startX - enemy.x;
        var dy = enemy.startY - enemy.y;
        if (Math.sqrt(dx * dx + dy * dy) < 12) {
            enemy.state = "patrol";
            enemy.x = enemy.startX;
            enemy.y = enemy.startY;
        }
    }
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

        // Trap catches enemy
        var tdx = enemy.x - trap.x;
        var tdy = enemy.y - trap.y;
        var trapDistance = Math.sqrt(tdx * tdx + tdy * tdy);

        if (!enemy.isStuck && trapDistance < 35) {
            enemy.isStuck = true;
            enemy.stuckTimer = 180;
            trap.active = false;
            console.log("Enemy caught in trap!");
        }
    }

    // === PAC-MAN STYLE KILL===
    if (enemy.isStuck) {
        var pdx = player.x - enemy.x;
        var pdy = player.y - enemy.y;
        var killDistance = Math.sqrt(pdx * pdx + pdy * pdy);

        if (killDistance < 45) {          // big hitbox while stuck
            console.log("Enemy eliminated!");
            createExplosion(enemy.x, enemy.y);

            // Remove enemy
            enemy.x = -9999;
            enemy.isStuck = false;
            enemy.color = "#ff4444";
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
        context.fillStyle = "#ff00ff";
        context.strokeStyle = "#ffff00";
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

        // Move bullet
        b.x += b.vx;
        b.y += b.vy;

        // Simple wall collision (bullet disappears)
        if (lineIntersectsRect(b.x, b.y, b.x + b.vx, b.y + b.vy, wall)) {
            b.active = false;
        }

        // Player hit detection
        var pdx = player.x - b.x;
        var pdy = player.y - b.y;
        if (Math.sqrt(pdx * pdx + pdy * pdy) < 20) {
            console.log("Player hit by bullet!");
            b.active = false;
            player.lives--;

            if (player.lives > 0) {
                // Respawn at starting position
                player.x = player.startX;
                player.y = player.startY;
                player.vx = 0;
                player.vy = 0;
            } else {
                gameState = "gameOver";
            }
        }
        // Remove bullet if off screen or inactive
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            b.active = false;
        }
    }

    // Clean up inactive bullets
    for (var i = bullets.length - 1; i >= 0; i--) {
        if (!bullets[i].active) {
            bullets.splice(i, 1);
        }
    }
}

function drawBullets() {
    context.fillStyle = "#000000";   // Black bullets
    for (var i = 0; i < bullets.length; i++) {
        var b = bullets[i];
        if (!b.active) continue;

        context.beginPath();
        context.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        context.fill();
    }
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
        return;   // ignore vents while cooling down
    }

    if (player.hitTestObject(vent1)) {
        teleportPlayer(vent1.partner);
        return;
    }

    if (player.hitTestObject(vent2)) {
        teleportPlayer(vent2.partner);
        return;
    }
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
    if (gameState === "gameOver" && e.key.toLowerCase() === "r") {
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

    // Reset enemy
    enemy.x = enemy.startX;
    enemy.y = enemy.startY;
    enemy.state = "patrol";
    enemy.isStuck = false;
    enemy.isSeeingPlayer = false;
    enemy.reactionTimer = 0;
    enemy.alertTimer = 0;

    // Clear arrays
    bullets = [];
    traps = [];
    explosions = [];

    // gamestate update
    gameState = "playing";

    console.log("Game Restarted");
}

// ====================== MOUSE SUPPORT ======================
var mouseX = 0;
var mouseY = 0;

canvas.addEventListener("mousemove", function(e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener("click", function(e) {
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

    context.fillText("W / A / S / D     Move",          250, startY);
    context.fillText("SPACE             Drop Trap",      250, startY + lineHeight);
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
    // Only show when enemy is actively alert
    if (enemy.state !== "alert") return;

    context.save();
    
   
    context.fillStyle = "#ff0000";
    // context.strokeStyle = "#000000";
    context.lineWidth = 4;
    context.font = "bold 42px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    
    // Draw the !
    context.fillText("!", enemy.x, enemy.y - enemy.height/2 - 35);
    //context.strokeText("!", enemy.x, enemy.y - enemy.height/2 - 35);
    
    context.restore();
}