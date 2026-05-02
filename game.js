class HillClimbGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.gameState = 'start';
        this.lastTime = 0;
        this.deltaTime = 0;
        
        this.initGame();
        this.setupEventListeners();
        this.gameLoop(0);
    }
    
    initGame() {
        this.camera = { x: 0, y: 0 };
        this.distance = 0;
        this.coins = 0;
        this.fuel = 100;
        this.maxFuel = 100;
        
        this.terrainPoints = [];
        this.terrainSegments = [];
        this.generateTerrain();
        
        this.coinObjects = [];
        this.fuelPickups = [];
        this.generateCollectibles();
        
        this.backgroundTrees = this.generateBackgroundTrees();
        this.backgroundHills = this.generateBackgroundHills();
        this.clouds = this.generateClouds();
        
        this.car = {
            x: 150,
            y: this.getTerrainY(150) - 50,
            vx: 0,
            vy: 0,
            angle: 0,
            width: 100,
            height: 55,
            maxSpeed: 14,
            acceleration: 0.35,
            brakeForce: 0.2,
            gravity: 0.55,
            friction: 0.98,
            groundFriction: 0.94,
            wheelBase: 70,
            frontWheel: { x: 0, y: 0, radius: 18 },
            rearWheel: { x: 0, y: 0, radius: 18 },
            suspension: { stiffness: 0.3, damping: 0.5 },
            wheelVelocity: { front: 0, rear: 0 },
            isOnGround: true,
            headlightOn: true
        };
        
        this.updateWheelPositions();
        
        this.particles = [];
        this.exhaustParticles = [];
        this.dustParticles = [];
        this.skidMarks = [];
    }
    
    generateClouds() {
        const clouds = [];
        for (let i = 0; i < 15; i++) {
            clouds.push({
                x: Math.random() * 4000,
                y: 30 + Math.random() * 120,
                width: 80 + Math.random() * 120,
                height: 35 + Math.random() * 35,
                opacity: 0.6 + Math.random() * 0.4
            });
        }
        return clouds;
    }
    
    generateBackgroundHills() {
        const hills = [];
        for (let layer = 0; layer < 3; layer++) {
            const layerHills = [];
            const hillCount = 6 + layer * 2;
            for (let i = 0; i < hillCount; i++) {
                layerHills.push({
                    x: i * (600 - layer * 100) + Math.random() * 100,
                    height: 80 + Math.random() * 80 + layer * 40,
                    width: 400 + Math.random() * 200 - layer * 50
                });
            }
            hills.push({ hills: layerHills, speed: 0.1 + layer * 0.1 });
        }
        return hills;
    }
    
    generateBackgroundTrees() {
        const trees = [];
        for (let i = 0; i < 100; i++) {
            trees.push({
                x: i * 150 + Math.random() * 80,
                height: 60 + Math.random() * 80,
                width: 40 + Math.random() * 30,
                type: Math.floor(Math.random() * 3)
            });
        }
        return trees;
    }
    
    generateTerrain() {
        this.terrainPoints = [];
        this.terrainSegments = [];
        
        const baseY = this.canvas.height - 180;
        const segmentWidth = 25;
        const totalSegments = 6000;
        
        let noise = 0;
        let noiseSpeed = 0.018;
        
        let hillPhase = 0;
        
        for (let i = 0; i < totalSegments; i++) {
            const x = i * segmentWidth;
            
            noise += (Math.random() - 0.5) * noiseSpeed;
            noise = Math.max(-1.2, Math.min(1.2, noise));
            
            const distanceFactor = i / 400;
            const amplitude = 45 + Math.sin(distanceFactor * 0.5) * 25 + distanceFactor * 15;
            
            hillPhase += 0.02;
            const hillShape = Math.sin(hillPhase) * 30 + Math.sin(hillPhase * 0.7) * 20;
            
            let terrainY = baseY + Math.sin(i * 0.06) * 25 + 
                           Math.sin(i * 0.025) * 40 + 
                           noise * amplitude +
                           hillShape;
            
            if (i > 300 && Math.random() < 0.015) {
                const hillHeight = 100 + Math.random() * 80;
                const hillWidth = 25 + Math.floor(Math.random() * 15);
                for (let j = 0; j < hillWidth; j++) {
                    const hillX = x + j * segmentWidth;
                    const hillProgress = j / hillWidth;
                    const hillNoise = Math.sin(hillProgress * Math.PI) * hillHeight;
                    this.terrainPoints.push({ x: hillX, y: terrainY - hillNoise });
                }
                i += hillWidth - 1;
                continue;
            }
            
            this.terrainPoints.push({ x, y: terrainY });
        }
        
        for (let i = 0; i < this.terrainPoints.length - 1; i++) {
            this.terrainSegments.push({
                p1: this.terrainPoints[i],
                p2: this.terrainPoints[i + 1],
                index: i
            });
        }
    }
    
    generateCollectibles() {
        this.coinObjects = [];
        this.fuelPickups = [];
        
        for (let i = 0; i < 300; i++) {
            const x = 500 + i * 220 + Math.random() * 80;
            const terrainY = this.getTerrainY(x);
            
            if (Math.random() < 0.18) {
                this.fuelPickups.push({
                    x: x,
                    y: terrainY - 70 - Math.random() * 50,
                    collected: false,
                    radius: 22,
                    rotation: 0
                });
            } else {
                const coinCount = Math.random() < 0.3 ? Math.floor(Math.random() * 3) + 2 : 1;
                for (let c = 0; c < coinCount; c++) {
                    this.coinObjects.push({
                        x: x + c * 30,
                        y: terrainY - 55 - Math.random() * 70,
                        collected: false,
                        radius: 14,
                        rotation: 0,
                        bounce: Math.random() * Math.PI * 2,
                        value: 1
                    });
                }
            }
        }
    }
    
    getTerrainY(x) {
        const segmentWidth = 25;
        const index = Math.floor(x / segmentWidth);
        
        if (index < 0 || index >= this.terrainSegments.length) {
            return this.canvas.height - 180;
        }
        
        const segment = this.terrainSegments[index];
        const t = (x - segment.p1.x) / (segment.p2.x - segment.p1.x);
        
        return segment.p1.y + (segment.p2.y - segment.p1.y) * t;
    }
    
    getTerrainAngle(x) {
        const segmentWidth = 25;
        const index = Math.floor(x / segmentWidth);
        
        if (index < 0 || index >= this.terrainSegments.length) {
            return 0;
        }
        
        const segment = this.terrainSegments[index];
        const dx = segment.p2.x - segment.p1.x;
        const dy = segment.p2.y - segment.p1.y;
        
        return Math.atan2(dy, dx);
    }
    
    updateWheelPositions() {
        const halfWidth = this.car.wheelBase / 2;
        const carBottom = this.car.y + this.car.height / 2;
        
        this.car.rearWheel.x = this.car.x - halfWidth;
        this.car.rearWheel.y = carBottom + this.car.rearWheel.radius * 0.3;
        
        this.car.frontWheel.x = this.car.x + halfWidth;
        this.car.frontWheel.y = carBottom + this.car.frontWheel.radius * 0.3;
    }
    
    setupEventListeners() {
        this.keys = {};
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            e.preventDefault();
            
            if (e.code === 'Space') {
                if (this.gameState === 'playing') {
                    this.pauseGame();
                } else if (this.gameState === 'paused') {
                    this.resumeGame();
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('restartBtn2').addEventListener('click', () => {
            this.restartGame();
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('startScreen').style.display = 'none';
    }
    
    pauseGame() {
        this.gameState = 'paused';
        document.getElementById('pauseScreen').style.display = 'flex';
    }
    
    resumeGame() {
        this.gameState = 'playing';
        document.getElementById('pauseScreen').style.display = 'none';
    }
    
    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('gameOverScreen').style.display = 'flex';
        document.getElementById('scoreValue').textContent = Math.floor(this.distance / 10);
        document.getElementById('finalCoinValue').textContent = this.coins;
    }
    
    restartGame() {
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('pauseScreen').style.display = 'none';
        this.initGame();
        this.gameState = 'playing';
    }
    
    update(dt) {
        if (this.gameState !== 'playing') return;
        
        this.handleInput(dt);
        this.updatePhysics(dt);
        this.checkCollisions();
        this.updateCamera();
        this.updateParticles(dt);
        this.updateUI();
        
        if (this.fuel <= 0) {
            this.gameOver();
        }
        
        if (this.car.y > this.canvas.height + 150) {
            this.gameOver();
        }
    }
    
    handleInput(dt) {
        const accelerating = this.keys['ArrowUp'] || this.keys['KeyW'];
        const braking = this.keys['ArrowDown'] || this.keys['KeyS'];
        
        if (accelerating && this.car.isOnGround && this.fuel > 0) {
            const terrainAngle = this.getTerrainAngle(this.car.x);
            
            this.car.vx += Math.cos(this.car.angle) * this.car.acceleration * dt * 60;
            this.car.vy += Math.sin(this.car.angle) * this.car.acceleration * 0.25 * dt * 60;
            
            this.fuel -= 0.018 * dt * 60;
            this.fuel = Math.max(0, this.fuel);
            
            if (Math.random() < 0.35) {
                this.addExhaustParticle();
            }
            
            if (Math.abs(this.car.vx) > 2 && Math.random() < 0.2) {
                this.addDustParticle();
            }
        }
        
        if (braking && this.car.isOnGround) {
            this.car.vx *= 0.93;
            
            if (Math.abs(this.car.vx) > 1 && Math.random() < 0.3) {
                this.addDustParticle();
            }
        }
    }
    
    updatePhysics(dt) {
        const frameRate = 1 / 60;
        const steps = Math.ceil(dt / frameRate);
        
        for (let step = 0; step < steps; step++) {
            const stepDt = Math.min(frameRate, dt / steps);
            
            this.car.vy += this.car.gravity * stepDt * 60;
            
            this.car.vx *= this.car.friction;
            this.car.vy *= 0.99;
            
            this.car.x += this.car.vx * stepDt * 60;
            this.car.y += this.car.vy * stepDt * 60;
            
            this.updateWheelPositions();
            
            const frontTerrainY = this.getTerrainY(this.car.frontWheel.x);
            const rearTerrainY = this.getTerrainY(this.car.rearWheel.x);
            
            const frontWheelGroundY = frontTerrainY - this.car.frontWheel.radius;
            const rearWheelGroundY = rearTerrainY - this.car.rearWheel.radius;
            
            const carAngle = Math.atan2(frontTerrainY - rearTerrainY, this.car.wheelBase);
            
            this.car.isOnGround = false;
            
            if (this.car.frontWheel.y > frontWheelGroundY || this.car.rearWheel.y > rearWheelGroundY) {
                const avgGroundY = (frontWheelGroundY + rearWheelGroundY) / 2;
                const carBottom = (this.car.frontWheel.y + this.car.rearWheel.y) / 2;
                
                if (carBottom > avgGroundY) {
                    const penetration => {
            if (!coin.collected) {
                const dx = carCenterX - coin.x;
                const dy = carCenterY - coin.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 50) {
                    coin.collected = true;
                    this.coins++;
                    this.addCoinParticles(coin.x, coin.y);
                }
            }
        });
        
        this.fuelPickups.forEach(fuel => {
            if (!fuel.collected) {
                const dx = carCenterX - fuel.x;
                const dy = carCenterY - fuel.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 50) {
                    fuel.collected = true;
                    this.fuel = Math.min(this.maxFuel, this.fuel + 30);
                    this.addFuelParticles(fuel.x, fuel.y);
                }
            }
        });
    }
    
    addExhaustParticle() {
        const angle = this.car.angle;
        const exhaustX = this.car.x - Math.cos(angle) * 40;
        const exhaustY = this.car.y + Math.sin(angle) * 20;
        
        this.exhaustParticles.push({
            x: exhaustX,
            y: exhaustY,
            vx: -Math.cos(angle) * 2 + (Math.random() - 0.5),
            vy: -Math.sin(angle) * 0.5 - 1,
            life: 1,
            maxLife: 1,
            size: 3 + Math.random() * 3
        });
    }
    
    addCoinParticles(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 / 10) * i;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                life: 1,
                color: '#FFD700',
                size: 4
            });
        }
    }
    
    addFuelParticles(x, y) {
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 1,
                color: '#00FF00',
                size: 5
            });
        }
    }
    
    updateParticles(dt) {
        this.exhaustParticles = this.exhaustParticles.filter(p => {
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.life -= 0.02 * dt * 60;
            p.size += 0.1 * dt * 60;
            return p.life > 0;
        });
        
        this.particles = this.particles.filter(p => {
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.vy += 0.1 * dt * 60;
            p.life -= 0.03 * dt * 60;
            return p.life > 0;
        });
    }
    
    updateCamera() {
        const targetX = this.car.x - this.canvas.width * 0.3;
        const targetY = this.car.y - this.canvas.height * 0.5;
        
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.05;
        
        this.camera.x = Math.max(0, this.camera.x);
        this.camera.y = Math.min(100, Math.max(-200, this.camera.y));
    }
    
    updateUI() {
        document.getElementById('distanceValue').textContent = Math.floor(this.distance / 10);
        document.getElementById('coinValue').textContent = this.coins;
        
        const speedKmh = Math.abs(this.car.vx) * 3.6;
        document.getElementById('speedValue').textContent = Math.floor(speedKmh);
        
        const fuelPercent = (this.fuel / this.maxFuel) * 100;
        document.getElementById('fuelFill').style.width = `${fuelPercent}%`;
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.renderBackground();
        this.renderTerrain();
        this.renderCollectibles();
        this.renderCar();
        this.renderParticles();
    }
    
    renderBackground() {
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(0.6, '#B0E0E6');
        skyGradient.addColorStop(1, '#90EE90');
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.background.clouds.forEach(cloud => {
            const screenX = (cloud.x - this.camera.x * 0.1) % (this.canvas.width * 2);
            const adjustedX = screenX < 0 ? screenX + this.canvas.width * 2 : screenX;
            
            if (adjustedX < this.canvas.width + cloud.width) {
                this.drawCloud(adjustedX, cloud.y, cloud.width, cloud.height);
            }
        });
        
        this.ctx.fillStyle = 'rgba(100, 150, 100, 0.5)';
        this.background.mountains.forEach((mountain, index) => {
            const screenX = (mountain.x - this.camera.x * 0.2) % (this.canvas.width * 3);
            const adjustedX = screenX < 0 ? screenX + this.canvas.width * 3 : screenX;
            
            if (adjustedX < this.canvas.width + mountain.width) {
                this.drawMountain(adjustedX, this.canvas.height - 250, mountain.width, mountain.height);
            }
        });
    }
    
    drawCloud(x, y, width, height) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, height * 0.5, 0, Math.PI * 2);
        this.ctx.arc(x + width * 0.3, y - height * 0.2, height * 0.6, 0, Math.PI * 2);
        this.ctx.arc(x + width * 0.6, y, height * 0.5, 0, Math.PI * 2);
        this.ctx.arc(x + width * 0.9, y - height * 0.1, height * 0.45, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawMountain(x, baseY, width, height) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, baseY);
        this.ctx.lineTo(x + width * 0.5, baseY - height);
        this.ctx.lineTo(x + width, baseY);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    renderTerrain() {
        const startX = this.camera.x - 100;
        const endX = this.camera.x + this.canvas.width + 100;
        const segmentWidth = 30;
        
        const startIndex = Math.max(0, Math.floor(startX / segmentWidth));
        const endIndex = Math.min(this.terrainPoints.length - 1, Math.ceil(endX / segmentWidth));
        
        if (startIndex >= endIndex) return;
        
        this.ctx.beginPath();
        
        const firstPoint = this.terrainPoints[startIndex];
        this.ctx.moveTo(firstPoint.x - this.camera.x, this.canvas.height);
        this.ctx.lineTo(firstPoint.x - this.camera.x, firstPoint.y - this.camera.y);
        
        for (let i = startIndex + 1; i <= endIndex; i++) {
            const point = this.terrainPoints[i];
            this.ctx.lineTo(point.x - this.camera.x, point.y - this.camera.y);
        }
        
        const lastPoint = this.terrainPoints[endIndex];
        this.ctx.lineTo(lastPoint.x - this.camera.x, this.canvas.height);
        this.ctx.closePath();
        
        const terrainGradient = this.ctx.createLinearGradient(0, 200, 0, this.canvas.height);
        terrainGradient.addColorStop(0, '#228B22');
        terrainGradient.addColorStop(0.3, '#32CD32');
        terrainGradient.addColorStop(0.5, '#8B4513');
        terrainGradient.addColorStop(1, '#654321');
        
        this.ctx.fillStyle = terrainGradient;
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#1a6b1a';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }
    
    renderCollectibles() {
        const time = Date.now() / 1000;
        
        this.coinObjects.forEach(coin => {
            if (!coin.collected) {
                const screenX = coin.x - this.camera.x;
                const screenY = coin.y - this.camera.y + Math.sin(time * 3 + coin.bounce) * 5;
                
                if (screenX > -50 && screenX < this.canvas.width + 50) {
                    this.drawCoin(screenX, screenY, coin.radius, time);
                }
            }
        });
        
        this.fuelPickups.forEach(fuel => {
            if (!fuel.collected) {
                const screenX = fuel.x - this.camera.x;
                const screenY = fuel.y - this.camera.y + Math.sin(time * 2) * 3;
                
                if (screenX > -50 && screenX < this.canvas.width + 50) {
                    this.drawFuelPickup(screenX, screenY, fuel.radius);
                }
            }
        });
    }
    
    drawCoin(x, y, radius, time) {
        const scaleX = 0.3 + Math.abs(Math.cos(time * 5)) * 0.7;
        
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(scaleX, 1);
        
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.7, '#FFA500');
        gradient.addColorStop(1, '#B8860B');
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#DAA520';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawFuelPickup(x, y, radius) {
        this.ctx.save();
        this.ctx.translate(x, y);
        
        const gradient = this.ctx.createRadialGradient(-5, -5, 0, 0, 0, radius);
        gradient.addColorStop(0, '#00FF00');
        gradient.addColorStop(0.7, '#228B22');
        gradient.addColorStop(1, '#006400');
        
        this.ctx.beginPath();
        this.ctx.roundRect(-radius, -radius, radius * 2, radius * 2, 5);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#00AA00';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⛽', 0, 0);
        
        this.ctx.restore();
    }
    
    renderCar() {
        const screenX = this.car.x - this.camera.x;
        const screenY = this.car.y - this.camera.y;
        
        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.rotate(this.car.angle);
        
        const wheelRadius = this.car.frontWheel.radius;
        const wheelBase = this.car.wheelBase;
        
        this.drawWheel(-wheelBase / 2, this.car.height / 2, wheelRadius);
        this.drawWheel(wheelBase / 2, this.car.height / 2, wheelRadius);
        
        this.drawCarBody();
        
        this.drawDriver();
        
        this.ctx.restore();
    }
    
    drawWheel(x, y, radius) {
        this.ctx.save();
        this.ctx.translate(x, y);
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#333';
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#888';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        const rotation = (Date.now() / 100) * (this.car.vx > 0 ? 1 : -1);
        for (let i = 0; i < 4; i++) {
            const angle = rotation + (Math.PI / 2) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(Math.cos(angle) * radius * 0.5, Math.sin(angle) * radius * 0.5);
            this.ctx.strokeStyle = '#666';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    drawCarBody() {
        const bodyWidth = this.car.width;
        const bodyHeight = this.car.height;
        
        this.ctx.save();
        
        this.ctx.fillStyle = '#8B4513';
        this.ctx.beginPath();
        this.ctx.roundRect(-bodyWidth / 2, -bodyHeight / 4, bodyWidth, bodyHeight / 2, 5);
        this.ctx.fill();
        
        const cabinGradient = this.ctx.createLinearGradient(0, -bodyHeight / 2, 0, 0);
        cabinGradient.addColorStop(0, '#DC143C');
        cabinGradient.addColorStop(1, '#8B0000');
        
        this.ctx.fillStyle = cabinGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(-bodyWidth / 3, -bodyHeight / 4);
        this.ctx.lineTo(-bodyWidth / 4, -bodyHeight / 2);
        this.ctx.lineTo(bodyWidth / 6, -bodyHeight / 2);
        this.ctx.lineTo(bodyWidth / 4, -bodyHeight / 4);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.fillStyle = 'rgba(135, 206, 250, 0.7)';
        this.ctx.beginPath();
        this.ctx.moveTo(-bodyWidth / 3 + 5, -bodyHeight / 4 + 2);
        this.ctx.lineTo(-bodyWidth / 4 + 5, -bodyHeight / 2 + 5);
        this.ctx.lineTo(bodyWidth / 6 - 5, -bodyHeight / 2 + 5);
        this.ctx.lineTo(bodyWidth / 4 - 5, -bodyHeight / 4 + 2);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.beginPath();
        this.ctx.arc(bodyWidth / 2 - 5, 0, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FF0000';
        this.ctx.beginPath();
        this.ctx.arc(-bodyWidth / 2 + 5, 0, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawDriver() {
        const driverX = -this.car.width / 6;
        const driverY = -this.car.height / 2;
        
        this.ctx.save();
        this.ctx.translate(driverX, driverY);
        
        this.ctx.fillStyle = '#4169E1';
        this.ctx.beginPath();
        this.ctx.arc(0, 8, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFDAB9';
        this.ctx.beginPath();
        this.ctx.arc(0, -5, 8, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(-3, -6, 1.5, 0, Math.PI * 2);
        this.ctx.arc(3, -6, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, -5, 9, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    renderParticles() {
        this.exhaustParticles.forEach(p => {
            const screenX = p.x - this.camera.x;
            const screenY = p.y - this.camera.y;
            
            const alpha = p.life;
            this.ctx.fillStyle = `rgba(150, 150, 150, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.particles.forEach(p => {
            const screenX = p.x - this.camera.x;
            const screenY = p.y - this.camera.y;
            
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });
    }
    
    gameLoop(currentTime) {
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.deltaTime = Math.min(this.deltaTime, 0.1);
        this.lastTime = currentTime;
        
        this.update(this.deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

window.addEventListener('load', () => {
    new HillClimbGame();
});
