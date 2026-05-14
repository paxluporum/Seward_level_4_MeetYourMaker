var canvas;
var context;
var timer;
var interval;
var player;
var enemy;

var wall;
var traps = [];
var explosions = [];

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
        spacebar = false;        // So you drop only ONE trap per key press
    }

// === UPDATE TRAPS & ENEMY INTERACTION ===
    updateTraps();

    // === DRAW TRAPS ===
    drawTraps();
    //======
    drawExplosions();

//===============

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
    var wasSeeing = enemy.isSeeingPlayer;   // Remember previous state
    
    enemy.isSeeingPlayer = false;

    var dx = player.x - enemy.x;
    var dy = player.y - enemy.y;
    var distance = Math.sqrt(dx*dx + dy*dy);

    if (distance > enemy.visionLength) {
        enemy.reactionTimer = 0;   // reset timer when out of sight
        return;
    }

    if (lineIntersectsRect(enemy.x, enemy.y, player.x, player.y, wall)) {
        enemy.reactionTimer = 0;
        return;
    }

    enemy.isSeeingPlayer = true;
    
    //  Reaction Delay ===
    if (!wasSeeing) {
        enemy.reactionTimer = 0;           // Start counting when player FIRST enters vision
    }
    
    enemy.reactionTimer++;
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

    if(enemy.isStuck) {
        enemy.stuckTimer--;
        if(enemy.stuckTimer <= 0) {
            enemy.isStuck = false;
        }

        //flash red while stuck
        enemy.color = (Math.floor(Date.now() / 150) % 2 === 0) ? "#ff0000" : "#ff8800";
        return;
    } else {
        enemy.color = "#ff4444";   // normal color
    }
      
    // Only go into alert AFTER reaction delay
    if (enemy.isSeeingPlayer && enemy.reactionTimer >= enemy.reactionTime) {
        enemy.state = "alert";
        enemy.lastKnownX = player.x;
        enemy.lastKnownY = player.y;
    } 
    else if (!enemy.isSeeingPlayer && enemy.state === "alert") {
        // Player disappeared → start pause timer
        enemy.alertTimer++;
        if (enemy.alertTimer > enemy.pauseTime) {
            enemy.state = "return";
            enemy.alertTimer = 0;
        }
    }

    // === Movement based on state ===
    if (enemy.state === "alert") {
        moveToward(enemy, enemy.lastKnownX, enemy.lastKnownY, enemy.speed);
    } 
    else if (enemy.state === "return") {
        moveToward(enemy, enemy.startX, enemy.startY, enemy.speed * 0.8);
        
        var dx = enemy.startX - enemy.x;
        var dy = enemy.startY - enemy.y;
        if (Math.sqrt(dx*dx + dy*dy) < 12) {
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
    var dist = Math.sqrt(dx*dx + dy*dy);
    
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
        var trapDistance = Math.sqrt(tdx*tdx + tdy*tdy);

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
        var killDistance = Math.sqrt(pdx*pdx + pdy*pdy);

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
        context.arc(e.x, e.y, 25 * (e.life/30), 0, Math.PI*2);
        context.fill();
        context.restore();
    }
}