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
        
        this.backgroundHills = this.generateBackgroundHills();
        this.clouds = this.generateClouds();
        this.backgroundTrees = this.generateBackgroundTrees();
        
        this.car = {
            x: 150,
            y: this.getTerrainY(150) - 45,
            vx: 0,
            vy: 0,
            angle: 0,
            width: 90,
            height: 50,
            maxSpeed: 13,
            acceleration: 0.32,
            brakeForce: 0.18,
            gravity: 0.5,
            friction: 0.985,
            groundFriction: 0.95,
            wheelBase: 65,
            frontWheel: { x: 0, y: 0, radius: 16 },
            rearWheel: { x: 0, y: 0, radius: 16 },
            isOnGround: true
        };
        
        this.updateWheelPositions();
        
        this.particles = [];
        this.exhaustParticles = [];
        this.dustParticles = [];
    }
    
    generateClouds() {
        const clouds = [];
        for (let i = 0; i < 12; i++) {
            clouds.push({
                x: Math.random() * 3500,
                y: 40 + Math.random() * 100,
                width: 70 + Math.random() * 100,
                height: 30 + Math.random() * 30
            });
        }
        return clouds;
    }
    
    generateBackgroundHills() {
        const hills = [];
        for (let layer = 0; layer < 2; layer++) {
            const layerHills = [];
            const hillCount = 8 + layer * 2;
            for (let i = 0; i < hillCount; i++) {
                layerHills.push({
                    x: i * (500 - layer * 80) + Math.random() * 80,
                    height: 60 + Math.random() * 60 + layer * 30,
                    width: 350 + Math.random() * 150 - layer * 40
                });
            }
            hills.push({ hills: layerHills, speed: 0.1 + layer * 0.08 });
        }
        return hills;
    }
    
    generateBackgroundTrees() {
        const trees = [];
        for (let i = 0; i < 80; i++) {
            trees.push({
                x: i * 180 + Math.random() * 60,
                height: 50 + Math.random() * 60,
                width: 35 + Math.random() * 25
            });
        }
        return trees;
    }
    
    generateTerrain() {
        this.terrainPoints = [];
        this.terrainSegments = [];
        
        const baseY = this.canvas.height - 190;
        const segmentWidth = 25;
        const totalSegments = 5500;
        
        let noise = 0;
        let noiseSpeed = 0.015;
        
        let hillPhase = 0;
        
        for (let i = 0; i < totalSegments; i++) {
            const x = i * segmentWidth;
            
            noise += (Math.random() - 0.5) * noiseSpeed;
            noise = Math.max(-1, Math.min(1, noise));
            
            const distanceFactor = i / 450;
            const amplitude = 40 + Math.sin(distanceFactor * 0.5) * 20 + distanceFactor * 12;
            
            hillPhase += 0.018;
            const hillShape = Math.sin(hillPhase) * 25 + Math.sin(hillPhase * 0.65) * 18;
            
            let terrainY = baseY + Math.sin(i * 0.055) * 22 + 
                           Math.sin(i * 0.022) * 35 + 
                           noise * amplitude +
                           hillShape;
            
            if (i > 250 && Math.random() < 0.012) {
                const hillHeight = 80 + Math.random() * 60;
                const hillWidth = 20 + Math.floor(Math.random() * 12);
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
        
        for (let i = 0; i < 250; i++) {
            const x = 450 + i * 240 + Math.random() * 70;
            const terrainY = this.getTerrainY(x);
            
            if (Math.random() < 0.16) {
                this.fuelPickups.push({
                    x: x,
                    y: terrainY - 65 - Math.random() * 45,
                    collected: false,
                    radius: 20
                });
            } else {
                const coinCount = Math.random() < 0.25 ? Math.floor(Math.random() * 3) + 2 : 1;
                for (let c = 0; c < coinCount; c++) {
                    this.coinObjects.push({
                        x: x + c * 28,
                        y: terrainY - 50 - Math.random() * 60,
                        collected: false,
                        radius: 13,
                        bounce: Math.random() * Math.PI * 2
                    });
                }
            }
        }
    }
    
    getTerrainY(x) {
        const segmentWidth = 25;
        const index = Math.floor(x / segmentWidth);
        
        if (index < 0 || index >= this.terrainSegments.length) {
            return this.canvas.height - 190;
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
        this.car.rearWheel.y = carBottom + this.car.rearWheel.radius * 0.25;
        
        this.car.frontWheel.x = this.car.x + halfWidth;
        this.car.frontWheel.y = carBottom + this.car.frontWheel.radius * 0.25;
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
        
        if (this.car.y > this.canvas.height + 120) {
            this.gameOver();
        }
    }
    
    handleInput(dt) {
        const accelerating = this.keys['ArrowUp'] || this.keys['KeyW'];
        const braking = this.keys['ArrowDown'] || this.keys['KeyS'];
        
        if (accelerating && this.car.isOnGround && this.fuel > 0) {
            this.car.vx += Math.cos(this.car.angle) * this.car.acceleration * dt * 60;
            this.car.vy += Math.sin(this.car.angle) * this.car.acceleration * 0.22 * dt * 60;
            
            this.fuel -= 0.017 * dt * 60;
            this.fuel = Math.max(0, this.fuel);
            
            if (Math.random() < 0.32) {
                this.addExhaustParticle();
            }
            
            if (Math.abs(this.car.vx) > 1.8 && Math.random() < 0.18) {
                this.addDustParticle();
            }
        }
        
        if (braking && this.car.isOnGround) {
            this.car.vx *= 0.94;
            
            if (Math.abs(this.car.vx) > 0.8 && Math.random() < 0.25) {
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
                    const penetration = carBottom - avgGroundY;
                    this.car.y -= penetration;
                    
                    const normalAngle = carAngle + Math.PI / 2;
                    const normalX = Math.cos(normalAngle);
                    const normalY = Math.sin(normalAngle);
                    
                    const dotProduct = this.car.vx * normalX + this.car.vy * normalY;
                    if (dotProduct < 0) {
                        this.car.vx -= dotProduct * normalX * 0.82;
                        this.car.vy -= dotProduct * normalY * 0.82;
                    }
                    
                    this.car.isOnGround = true;
                }
            }
            
            const targetAngle = carAngle;
            const angleDiff = targetAngle - this.car.angle;
            this.car.angle += angleDiff * 0.12;
            
            if (this.car.isOnGround) {
                this.car.vx *= this.car.groundFriction;
            }
            
            if (this.car.x > this.distance) {
                this.distance = this.car.x;
            }
        }
    }
    
    checkCollisions() {
        const carCenterX = this.car.x;
        const carCenterY = this.car.y;
        
        this.coinObjects.forEach(coin => {
            if (!coin.collected) {
                const dx = carCenterX - coin.x;
                const dy = carCenterY - coin.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 45) {
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
                
                if (dist < 48) {
                    fuel.collected = true;
                    this.fuel = Math.min(this.maxFuel, this.fuel + 28);
                    this.addFuelParticles(fuel.x, fuel.y);
                }
            }
        });
    }
    
    addExhaustParticle() {
        const angle = this.car.angle;
        const exhaustX = this.car.x - Math.cos(angle) * 38;
        const exhaustY = this.car.y + Math.sin(angle) * 18;
        
        this.exhaustParticles.push({
            x: exhaustX,
            y: exhaustY,
            vx: -Math.cos(angle) * 1.8 + (Math.random() - 0.5),
            vy: -Math.sin(angle) * 0.4 - 0.8,
            life: 1,
            size: 2.5 + Math.random() * 2.5
        });
    }
    
    addDustParticle() {
        const wheelX = this.car.vx > 0 ? this.car.rearWheel.x : this.car.frontWheel.x;
        const terrainY = this.getTerrainY(wheelX);
        
        this.dustParticles.push({
            x: wheelX + (Math.random() - 0.5) * 18,
            y: terrainY - 4,
            vx: (Math.random() - 0.5) * 2.5,
            vy: -Math.random() * 1.8 - 0.8,
            life: 1,
            size: 1.8 + Math.random() * 3.5
        });
    }
    
    addCoinParticles(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 / 10) * i;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 3.5,
                vy: Math.sin(angle) * 3.5 - 1.5,
                life: 1,
                color: '#FFD700',
                size: 4.5,
                type: 'coin'
            });
        }
        
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i + 0.3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 1.8,
                vy: Math.sin(angle) * 1.8 - 0.8,
                life: 1,
                color: '#FFF8DC',
                size: 2.5,
                type: 'sparkle'
            });
        }
    }
    
    addFuelParticles(x, y) {
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.8 + Math.random() * 3.5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2.5,
                life: 1,
                color: i % 2 === 0 ? '#32CD32' : '#7CFC00',
                size: 5.5,
                type: 'fuel'
            });
        }
    }
    
    updateParticles(dt) {
        this.exhaustParticles = this.exhaustParticles.filter(p => {
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.life -= 0.018 * dt * 60;
            p.size += 0.13 * dt * 60;
            return p.life > 0;
        });
        
        this.dustParticles = this.dustParticles.filter(p => {
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.vy -= 0.04 * dt * 60;
            p.life -= 0.022 * dt * 60;
            p.size += 0.07 * dt * 60;
            return p.life > 0;
        });
        
        this.particles = this.particles.filter(p => {
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.vy += 0.13 * dt * 60;
            p.life -= 0.023 * dt * 60;
            return p.life > 0;
        });
    }
    
    updateCamera() {
        const targetX = this.car.x - this.canvas.width * 0.32;
        const targetY = this.car.y - this.canvas.height * 0.48;
        
        this.camera.x += (targetX - this.camera.x) * 0.09;
        this.camera.y += (targetY - this.camera.y) * 0.04;
        
        this.camera.x = Math.max(0, this.camera.x);
        this.camera.y = Math.min(80, Math.max(-180, this.camera.y));
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
        
        this.renderSky();
        this.renderSun();
        this.renderBackgroundHills();
        this.renderClouds();
        this.renderBackgroundTrees();
        this.renderTerrain();
        this.renderCollectibles();
        this.renderDustParticles();
        this.renderCar();
        this.renderParticles();
        this.renderExhaustParticles();
    }
    
    renderSky() {
        const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        skyGradient.addColorStop(0, '#4FC3F7');
        skyGradient.addColorStop(0.4, '#81D4FA');
        skyGradient.addColorStop(0.7, '#B3E5FC');
        skyGradient.addColorStop(1, '#E1F5FE');
        this.ctx.fillStyle = skyGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    renderSun() {
        const sunX = this.canvas.width - 130;
        const sunY = 70;
        const sunRadius = 35;
        
        const sunGlow = this.ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 2.5);
        sunGlow.addColorStop(0, 'rgba(255, 248, 220, 0.9)');
        sunGlow.addColorStop(0.3, 'rgba(255, 235, 150, 0.5)');
        sunGlow.addColorStop(0.6, 'rgba(255, 200, 100, 0.2)');
        sunGlow.addColorStop(1, 'rgba(255, 180, 50, 0)');
        
        this.ctx.fillStyle = sunGlow;
        this.ctx.beginPath();
        this.ctx.arc(sunX, sunY, sunRadius * 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        const sunGradient = this.ctx.createRadialGradient(sunX - 8, sunY - 8, 0, sunX, sunY, sunRadius);
        sunGradient.addColorStop(0, '#FFF9C4');
        sunGradient.addColorStop(0.6, '#FFD54F');
        sunGradient.addColorStop(1, '#FFC107');
        
        this.ctx.fillStyle = sunGradient;
        this.ctx.beginPath();
        this.ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = 'rgba(255, 183, 77, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    
    renderBackgroundHills() {
        const colors = [
            ['#81C784', '#66BB6A', '#4CAF50'],
            ['#A5D6A7', '#81C784', '#66BB6A']
        ];
        
        this.backgroundHills.forEach((layerData, layerIndex) => {
            const { hills, speed } = layerData;
            
            hills.forEach(hill => {
                const screenX = (hill.x - this.camera.x * speed) % (this.canvas.width * 3);
                const adjustedX = screenX < 0 ? screenX + this.canvas.width * 3 : screenX;
                
                if (adjustedX < this.canvas.width + hill.width + 150) {
                    this.drawHill(adjustedX, hill.height, hill.width, colors[layerIndex], layerIndex);
                }
            });
        });
    }
    
    drawHill(x, height, width, colors, layerIndex) {
        const baseY = this.canvas.height - 210 - layerIndex * 20;
        
        const hillGradient = this.ctx.createLinearGradient(x, baseY - height, x, baseY);
        hillGradient.addColorStop(0, colors[0]);
        hillGradient.addColorStop(0.5, colors[1]);
        hillGradient.addColorStop(1, colors[2]);
        
        this.ctx.fillStyle = hillGradient;
        this.ctx.beginPath();
        
        this.ctx.moveTo(x - 40, baseY);
        this.ctx.quadraticCurveTo(x + width * 0.15, baseY - height * 0.7, x + width * 0.5, baseY - height);
        this.ctx.quadraticCurveTo(x + width * 0.85, baseY - height * 0.7, x + width + 40, baseY);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    renderClouds() {
        this.clouds.forEach(cloud => {
            const screenX = (cloud.x - this.camera.x * 0.04) % (this.canvas.width * 2);
            const adjustedX = screenX < 0 ? screenX + this.canvas.width * 2 : screenX;
            
            if (adjustedX < this.canvas.width + cloud.width) {
                this.drawCloud(adjustedX, cloud.y, cloud.width, cloud.height);
            }
        });
    }
    
    drawCloud(x, y, width, height) {
        this.ctx.save();
        
        const cloudGradient = this.ctx.createRadialGradient(
            x + width * 0.5, y, 0,
            x + width * 0.5, y, height * 1.3
        );
        cloudGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        cloudGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.75)');
        cloudGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.fillStyle = cloudGradient;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, height * 0.45, 0, Math.PI * 2);
        this.ctx.arc(x + width * 0.22, y - height * 0.18, height * 0.58, 0, Math.PI * 2);
        this.ctx.arc(x + width * 0.5, y - height * 0.28, height * 0.62, 0, Math.PI * 2);
        this.ctx.arc(x + width * 0.78, y - height * 0.08, height * 0.5, 0, Math.PI * 2);
        this.ctx.arc(x + width, y, height * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    renderBackgroundTrees() {
        this.backgroundTrees.forEach((tree, index) => {
            const parallax = 0.35;
            const screenX = (tree.x - this.camera.x * parallax) % (this.canvas.width * 2);
            const adjustedX = screenX < 0 ? screenX + this.canvas.width * 2 : screenX;
            
            if (adjustedX < this.canvas.width + tree.width) {
                const terrainY = this.canvas.height - 225 - tree.height * 0.25;
                this.drawTree(adjustedX, terrainY, tree.height, tree.width);
            }
        });
    }
    
    drawTree(x, baseY, height, width) {
        this.ctx.save();
        
        const trunkGradient = this.ctx.createLinearGradient(x - width * 0.08, baseY, x + width * 0.08, baseY);
        trunkGradient.addColorStop(0, '#6D4C41');
        trunkGradient.addColorStop(0.5, '#8D6E63');
        trunkGradient.addColorStop(1, '#6D4C41');
        
        this.ctx.fillStyle = trunkGradient;
        this.ctx.fillRect(x - width * 0.08, baseY - height * 0.35, width * 0.16, height * 0.35);
        
        const leafGradient = this.ctx.createRadialGradient(
            x, baseY - height * 0.55, 0,
            x, baseY - height * 0.55, width * 0.55
        );
        leafGradient.addColorStop(0, '#81C784');
        leafGradient.addColorStop(0.5, '#66BB6A');
        leafGradient.addColorStop(1, '#4CAF50');
        
        this.ctx.fillStyle = leafGradient;
        
        this.ctx.beginPath();
        this.ctx.arc(x, baseY - height * 0.55, width * 0.55, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#66BB6A';
        this.ctx.beginPath();
        this.ctx.arc(x - width * 0.18, baseY - height * 0.48, width * 0.32, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(x + width * 0.2, baseY - height * 0.45, width * 0.28, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    renderTerrain() {
        const startX = this.camera.x - 80;
        const endX = this.camera.x + this.canvas.width + 80;
        const segmentWidth = 25;
        
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
        
        const terrainGradient = this.ctx.createLinearGradient(0, 180, 0, this.canvas.height);
        terrainGradient.addColorStop(0, '#4CAF50');
        terrainGradient.addColorStop(0.08, '#66BB6A');
        terrainGradient.addColorStop(0.15, '#4CAF50');
        terrainGradient.addColorStop(0.25, '#795548');
        terrainGradient.addColorStop(0.5, '#6D4C41');
        terrainGradient.addColorStop(0.8, '#5D4037');
        terrainGradient.addColorStop(1, '#4E342E');
        
        this.ctx.fillStyle = terrainGradient;
        this.ctx.fill();
        
        this.renderTerrainTopLine(startIndex, endIndex);
        
        this.renderTerrainDetails(startIndex, endIndex);
        
        this.renderGrassBlades(startIndex, endIndex);
    }
    
    renderTerrainTopLine(startIndex, endIndex) {
        this.ctx.save();
        this.ctx.strokeStyle = '#388E3C';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        
        for (let i = startIndex; i <= endIndex; i++) {
            const point = this.terrainPoints[i];
            const screenX = point.x - this.camera.x;
            const screenY = point.y - this.camera.y;
            
            if (i === startIndex) {
                this.ctx.moveTo(screenX, screenY);
            } else {
                this.ctx.lineTo(screenX, screenY);
            }
        }
        
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    renderTerrainDetails(startIndex, endIndex) {
        this.ctx.save();
        
        for (let i = startIndex; i < endIndex; i += 4) {
            const point = this.terrainPoints[i];
            const screenX = point.x - this.camera.x;
            const screenY = point.y - this.camera.y;
            
            if (i % 18 === 0) {
                this.ctx.fillStyle = 'rgba(141, 110, 99, 0.5)';
                this.ctx.beginPath();
                this.ctx.ellipse(screenX - 8, screenY + 12, 18 + Math.random() * 12, 10 + Math.random() * 6, 0.25, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            if (i % 28 === 0) {
                this.ctx.fillStyle = 'rgba(121, 85, 72, 0.6)';
                this.ctx.beginPath();
                this.ctx.arc(screenX + 4, screenY + 7, 5 + Math.random() * 6, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        this.ctx.restore();
    }
    
    renderGrassBlades(startIndex, endIndex) {
        this.ctx.save();
        const time = Date.now() / 1000;
        
        for (let i = startIndex; i < endIndex; i += 2) {
            const point = this.terrainPoints[i];
            const screenX = point.x - this.camera.x;
            const screenY = point.y - this.camera.y;
            
            if (i % 6 === 0) {
                const sway = Math.sin(time * 1.8 + screenX * 0.08) * 2.5;
                
                this.ctx.strokeStyle = 'rgba(56, 142, 60, 0.7)';
                this.ctx.lineWidth = 1.5;
                
                for (let j = 0; j < 3; j++) {
                    const offsetX = (j - 1) * 3.5 + sway;
                    const height = 6 + Math.random() * 5;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenX + offsetX, screenY - 1.5);
                    this.ctx.quadraticCurveTo(
                        screenX + offsetX + 2.5, 
                        screenY - height * 0.45, 
                        screenX + offsetX + 0.8, 
                        screenY - height
                    );
                    this.ctx.stroke();
                }
            }
        }
        
        this.ctx.restore();
    }
    
    renderCollectibles() {
        const time = Date.now() / 1000;
        
        this.coinObjects.forEach(coin => {
            if (!coin.collected) {
                const screenX = coin.x - this.camera.x;
                const screenY = coin.y - this.camera.y + Math.sin(time * 2.8 + coin.bounce) * 4;
                
                if (screenX > -40 && screenX < this.canvas.width + 40) {
                    this.drawCoin(screenX, screenY, coin.radius, time);
                }
            }
        });
        
        this.fuelPickups.forEach(fuel => {
            if (!fuel.collected) {
                const screenX = fuel.x - this.camera.x;
                const screenY = fuel.y - this.camera.y + Math.sin(time * 1.8) * 2.5;
                
                if (screenX > -40 && screenX < this.canvas.width + 40) {
                    this.drawFuelPickup(screenX, screenY, fuel.radius, time);
                }
            }
        });
    }
    
    drawCoin(x, y, radius, time) {
        const scaleX = 0.25 + Math.abs(Math.cos(time * 4.5)) * 0.75;
        const glowIntensity = 0.25 + Math.sin(time * 3.5) * 0.18;
        
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(scaleX, 1);
        
        const glowGradient = this.ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, radius * 1.8);
        glowGradient.addColorStop(0, `rgba(255, 215, 0, ${glowIntensity})`);
        glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 1.8, 0, Math.PI * 2);
        this.ctx.fill();
        
        const coinGradient = this.ctx.createRadialGradient(-radius * 0.25, -radius * 0.25, 0, 0, 0, radius);
        coinGradient.addColorStop(0, '#FFF59D');
        coinGradient.addColorStop(0.25, '#FFEE58');
        coinGradient.addColorStop(0.6, '#FFD54F');
        coinGradient.addColorStop(1, '#FFB300');
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = coinGradient;
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#FF8F00';
        this.ctx.lineWidth = 1.8;
        this.ctx.stroke();
        
        this.ctx.fillStyle = 'rgba(184, 134, 11, 0.6)';
        this.ctx.font = `bold ${radius * 0.9}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('$', 0, 1);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        this.ctx.beginPath();
        this.ctx.arc(-radius * 0.25, -radius * 0.25, radius * 0.28, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawFuelPickup(x, y, radius, time) {
        const pulseScale = 1 + Math.sin(time * 2.8) * 0.08;
        const glowIntensity = 0.35 + Math.sin(time * 1.8) * 0.18;
        
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(pulseScale, pulseScale);
        
        const glowGradient = this.ctx.createRadialGradient(0, 0, radius, 0, 0, radius * 2.3);
        glowGradient.addColorStop(0, `rgba(50, 205, 50, ${glowIntensity})`);
        glowGradient.addColorStop(0.5, `rgba(76, 175, 80, ${glowIntensity * 0.45})`);
        glowGradient.addColorStop(1, 'rgba(27, 94, 32, 0)');
        
        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 2.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        const canGradient = this.ctx.createLinearGradient(-radius, -radius, radius, radius);
        canGradient.addColorStop(0, '#A5D6A7');
        canGradient.addColorStop(0.25, '#81C784');
        canGradient.addColorStop(0.6, '#66BB6A');
        canGradient.addColorStop(1, '#43A047');
        
        this.ctx.beginPath();
        this.ctx.roundRect(-radius, -radius, radius * 2, radius * 2, 7);
        this.ctx.fillStyle = canGradient;
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#2E7D32';
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#1B5E20';
        this.ctx.beginPath();
        this.ctx.roundRect(-radius * 0.28, -radius * 1.25, radius * 0.56, radius * 0.35, 2.5);
        this.ctx.fill();
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        this.ctx.beginPath();
        this.ctx.roundRect(-radius + 2.5, -radius + 2.5, radius * 0.38, radius * 2 - 5, 4);
        this.ctx.fill();
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = `bold ${radius * 0.95}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⛽', 0, 1.5);
        
        this.ctx.restore();
    }
    
    renderCar() {
        const screenX = this.car.x - this.camera.x;
        const screenY = this.car.y - this.camera.y;
        
        this.renderCarShadow(screenX, screenY);
        
        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.rotate(this.car.angle);
        
        const wheelRadius = this.car.frontWheel.radius;
        const wheelBase = this.car.wheelBase;
        
        this.drawWheel(-wheelBase / 2, this.car.height / 2, wheelRadius);
        this.drawWheel(wheelBase / 2, this.car.height / 2, wheelRadius);
        
        this.drawCarBody();
        
        this.drawDriver();
        
        this.drawHeadlights(wheelBase / 2, 0);
        
        this.ctx.restore();
    }
    
    renderCarShadow(screenX, screenY) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.28;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        
        this.ctx.beginPath();
        this.ctx.ellipse(screenX, screenY + this.car.height + 12, this.car.width * 0.55, 9, this.car.angle, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawWheel(x, y, radius) {
        this.ctx.save();
        this.ctx.translate(x, y);
        
        const tireGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        tireGradient.addColorStop(0, '#555');
        tireGradient.addColorStop(0.65, '#333');
        tireGradient.addColorStop(1, '#111');
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = tireGradient;
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#222';
        this.ctx.lineWidth = 1.8;
        this.ctx.stroke();
        
        const rimGradient = this.ctx.createRadialGradient(-radius * 0.18, -radius * 0.18, 0, 0, 0, radius * 0.65);
        rimGradient.addColorStop(0, '#9E9E9E');
        rimGradient.addColorStop(0.5, '#757575');
        rimGradient.addColorStop(1, '#616161');
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
        this.ctx.fillStyle = rimGradient;
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#424242';
        this.ctx.lineWidth = 1.8;
        this.ctx.stroke();
        
        const rotation = (Date.now() / 90) * (this.car.vx > 0 ? 1 : -1);
        this.ctx.rotate(rotation);
        
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i;
            
            const spokeGradient = this.ctx.createLinearGradient(0, 0, Math.cos(angle) * radius * 0.55, Math.sin(angle) * radius * 0.55);
            spokeGradient.addColorStop(0, '#9E9E9E');
            spokeGradient.addColorStop(1, '#616161');
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(Math.cos(angle) * radius * 0.55, Math.sin(angle) * radius * 0.55);
            this.ctx.strokeStyle = spokeGradient;
            this.ctx.lineWidth = 2.8;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        }
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
        this.ctx.fillStyle = '#424242';
        this.ctx.fill();
        this.ctx.strokeStyle = '#212121';
        this.ctx.lineWidth = 1.8;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawCarBody() {
        const bodyWidth = this.car.width;
        const bodyHeight = this.car.height;
        
        this.ctx.save();
        
        const undercarriageGradient = this.ctx.createLinearGradient(0, 0, 0, bodyHeight * 0.28);
        undercarriageGradient.addColorStop(0, '#424242');
        undercarriageGradient.addColorStop(1, '#212121');
        
        this.ctx.fillStyle = undercarriageGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(-bodyWidth / 2, -bodyHeight * 0.08, bodyWidth, bodyHeight * 0.38, 2.5);
        this.ctx.fill();
        
        const bodyGradient = this.ctx.createLinearGradient(0, -bodyHeight * 0.45, 0, bodyHeight * 0.15);
        bodyGradient.addColorStop(0, '#EF5350');
        bodyGradient.addColorStop(0.25, '#F44336');
        bodyGradient.addColorStop(0.6, '#E53935');
        bodyGradient.addColorStop(1, '#C62828');
        
        this.ctx.fillStyle = bodyGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(-bodyWidth / 2 + 4, -bodyHeight * 0.32, bodyWidth - 8, bodyHeight * 0.42, 7);
        this.ctx.fill();
        
        this.ctx.strokeStyle = 'rgba(183, 28, 28, 0.35)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        
        const cabinGradient = this.ctx.createLinearGradient(0, -bodyHeight * 0.58, 0, -bodyHeight * 0.18);
        cabinGradient.addColorStop(0, '#EF5350');
        cabinGradient.addColorStop(0.4, '#F44336');
        cabinGradient.addColorStop(1, '#D32F2F');
        
        this.ctx.fillStyle = cabinGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(-bodyWidth * 0.28, -bodyHeight * 0.32);
        this.ctx.lineTo(-bodyWidth * 0.18, -bodyHeight * 0.62);
        this.ctx.lineTo(bodyWidth * 0.18, -bodyHeight * 0.62);
        this.ctx.lineTo(bodyWidth * 0.32, -bodyHeight * 0.32);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.strokeStyle = 'rgba(183, 28, 28, 0.28)';
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
        
        const windowGradient = this.ctx.createLinearGradient(0, -bodyHeight * 0.58, 0, -bodyHeight * 0.28);
        windowGradient.addColorStop(0, 'rgba(144, 202, 249, 0.92)');
        windowGradient.addColorStop(0.5, 'rgba(100, 181, 246, 0.82)');
        windowGradient.addColorStop(1, 'rgba(66, 165, 245, 0.72)');
        
        this.ctx.fillStyle = windowGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(-bodyWidth * 0.26, -bodyHeight * 0.3);
        this.ctx.lineTo(-bodyWidth * 0.16, -bodyHeight * 0.57);
        this.ctx.lineTo(bodyWidth * 0.16, -bodyHeight * 0.57);
        this.ctx.lineTo(bodyWidth * 0.3, -bodyHeight * 0.3);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
        this.ctx.beginPath();
        this.ctx.moveTo(-bodyWidth * 0.23, -bodyHeight * 0.32);
        this.ctx.lineTo(-bodyWidth * 0.14, -bodyHeight * 0.55);
        this.ctx.lineTo(-bodyWidth * 0.04, -bodyHeight * 0.55);
        this.ctx.lineTo(-bodyWidth * 0.08, -bodyHeight * 0.32);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.fillStyle = '#5D4037';
        this.ctx.beginPath();
        this.ctx.roundRect(-bodyWidth * 0.36, -bodyHeight * 0.22, bodyWidth * 0.14, bodyHeight * 0.28, 2.5);
        this.ctx.fill();
        
        const headlightGradient = this.ctx.createRadialGradient(
            bodyWidth * 0.44, -bodyHeight * 0.08, 0,
            bodyWidth * 0.44, -bodyHeight * 0.08, 6.5
        );
        headlightGradient.addColorStop(0, '#FFFDE7');
        headlightGradient.addColorStop(0.5, '#FFF59D');
        headlightGradient.addColorStop(1, '#FFEE58');
        
        this.ctx.fillStyle = headlightGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(bodyWidth * 0.46, -bodyHeight * 0.08, 6, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#616161';
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
        
        const taillightGradient = this.ctx.createRadialGradient(
            -bodyWidth * 0.44, -bodyHeight * 0.08, 0,
            -bodyWidth * 0.44, -bodyHeight * 0.08, 5.5
        );
        taillightGradient.addColorStop(0, '#FF8A80');
        taillightGradient.addColorStop(0.5, '#F44336');
        taillightGradient.addColorStop(1, '#C62828');
        
        this.ctx.fillStyle = taillightGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(-bodyWidth * 0.46, -bodyHeight * 0.08, 5, 7, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#616161';
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.13)';
        this.ctx.beginPath();
        this.ctx.roundRect(-bodyWidth / 2 + 6, -bodyHeight * 0.3, bodyWidth * 0.28, bodyHeight * 0.13, 4);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawDriver() {
        const driverX = -this.car.width * 0.04;
        const driverY = -this.car.height * 0.52;
        
        this.ctx.save();
        this.ctx.translate(driverX, driverY);
        
        const bodyGradient = this.ctx.createRadialGradient(-1.5, 4, 0, 0, 7, 11);
        bodyGradient.addColorStop(0, '#5C6BC0');
        bodyGradient.addColorStop(0.65, '#3F51B5');
        bodyGradient.addColorStop(1, '#303F9F');
        
        this.ctx.fillStyle = bodyGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 9, 9, 0, Math.PI * 2);
        this.ctx.fill();
        
        const headGradient = this.ctx.createRadialGradient(-1.8, -2.8, 0, 0, -4.5, 9);
        headGradient.addColorStop(0, '#FFCCBC');
        headGradient.addColorStop(0.65, '#FFAB91');
        headGradient.addColorStop(1, '#FF8A65');
        
        this.ctx.fillStyle = headGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, -4.5, 8.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        const capGradient = this.ctx.createLinearGradient(-8, -10, 8, -10);
        capGradient.addColorStop(0, '#D32F2F');
        capGradient.addColorStop(0.5, '#F44336');
        capGradient.addColorStop(1, '#EF5350');
        
        this.ctx.fillStyle = capGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(0, -8, 9, 4.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#C62828';
        this.ctx.beginPath();
        this.ctx.moveTo(-7, -8);
        this.ctx.quadraticCurveTo(-8.5, -5, -7, -2);
        this.ctx.lineTo(-2, -2);
        this.ctx.lineTo(-1, -8);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.ellipse(-2.5, -4.5, 2.2, 2.8, 0, 0, Math.PI * 2);
        this.ctx.ellipse(2.5, -4.5, 2.2, 2.8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#212121';
        this.ctx.beginPath();
        this.ctx.arc(-2.5, -4.5, 1, 0, Math.PI * 2);
        this.ctx.arc(2.5, -4.5, 1, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = '#795548';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(0, -2, 2.5, 0.2, Math.PI - 0.2, false);
        this.ctx.stroke();
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, -4.5, 9.5, 6.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = 'rgba(96, 125, 139, 0.45)';
        this.ctx.lineWidth = 0.8;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawHeadlights(x, y) {
        if (Math.abs(this.car.vx) < 0.4) return;
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.25;
        
        const headlightGradient = this.ctx.createRadialGradient(x + 4, y - 4, 0, x + 45, y - 4, 70);
        headlightGradient.addColorStop(0, 'rgba(255, 248, 220, 0.75)');
        headlightGradient.addColorStop(0.45, 'rgba(255, 243, 224, 0.28)');
        headlightGradient.addColorStop(1, 'rgba(255, 224, 178, 0)');
        
        this.ctx.fillStyle = headlightGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4, y - 4);
        this.ctx.lineTo(x + 85, y - 25);
        this.ctx.lineTo(x + 85, y + 18);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    renderDustParticles() {
        this.dustParticles.forEach(p => {
            const screenX = p.x - this.camera.x;
            const screenY = p.y - this.camera.y;
            
            const alpha = p.life * 0.45;
            const dustGradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, p.size);
            dustGradient.addColorStop(0, `rgba(161, 136, 127, ${alpha})`);
            dustGradient.addColorStop(1, `rgba(121, 85, 72, 0)`);
            
            this.ctx.fillStyle = dustGradient;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    renderExhaustParticles() {
        this.exhaustParticles.forEach(p => {
            const screenX = p.x - this.camera.x;
            const screenY = p.y - this.camera.y;
            
            const alpha = p.life * 0.55;
            const exhaustGradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, p.size);
            exhaustGradient.addColorStop(0, `rgba(117, 117, 117, ${alpha})`);
            exhaustGradient.addColorStop(0.5, `rgba(97, 97, 97, ${alpha * 0.65})`);
            exhaustGradient.addColorStop(1, `rgba(66, 66, 66, 0)`);
            
            this.ctx.fillStyle = exhaustGradient;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    renderParticles() {
        this.particles.forEach(p => {
            const screenX = p.x - this.camera.x;
            const screenY = p.y - this.camera.y;
            
            this.ctx.globalAlpha = p.life;
            
            if (p.type === 'sparkle') {
                const sparkleSize = p.size * (0.45 + p.life);
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                
                for (let i = 0; i < 4; i++) {
                    const angle = (Math.PI / 2) * i;
                    const outerX = screenX + Math.cos(angle) * sparkleSize;
                    const outerY = screenY + Math.sin(angle) * sparkleSize;
                    const innerX = screenX + Math.cos(angle + Math.PI / 4) * sparkleSize * 0.38;
                    const innerY = screenY + Math.sin(angle + Math.PI / 4) * sparkleSize * 0.38;
                    
                    if (i === 0) {
                        this.ctx.moveTo(outerX, outerY);
                    } else {
                        this.ctx.lineTo(outerX, outerY);
                    }
                    this.ctx.lineTo(innerX, innerY);
                }
                this.ctx.closePath();
                this.ctx.fill();
            } else {
                const particleGradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, p.size);
                particleGradient.addColorStop(0, p.color);
                particleGradient.addColorStop(1, this.darkenColor(p.color, 0.28));
                
                this.ctx.fillStyle = particleGradient;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.globalAlpha = 1;
        });
    }
    
    darkenColor(color, amount) {
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgb(${Math.floor(r * (1 - amount))}, ${Math.floor(g * (1 - amount))}, ${Math.floor(b * (1 - amount))})`;
        }
        return color;
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
