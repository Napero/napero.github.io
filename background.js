// Interactive particle background
(function() {
    const canvas = document.createElement('canvas');
    canvas.id = 'particleCanvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:-1;';
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let mouse = { x: null, y: null, radius: 150 };
    
    const config = {
        particleCount: 80,
        particleSize: { min: 1, max: 3 },
        speed: 0.3,
        connectionDistance: 150,
        mouseInfluence: 0.02,
        colors: ['#ff00ff', '#00ffff', '#ffffff']
    };

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.size = Math.random() * (config.particleSize.max - config.particleSize.min) + config.particleSize.min;
            this.speedX = (Math.random() - 0.5) * config.speed;
            this.speedY = (Math.random() - 0.5) * config.speed;
            this.color = config.colors[Math.floor(Math.random() * config.colors.length)];
            this.opacity = Math.random() * 0.5 + 0.2;
        }

        update() {
            // Mouse interaction
            if (mouse.x !== null && mouse.y !== null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / mouse.radius;
                    const angle = Math.atan2(dy, dx);
                    this.speedX -= Math.cos(angle) * force * config.mouseInfluence;
                    this.speedY -= Math.sin(angle) * force * config.mouseInfluence;
                }
            }

            // Apply velocity with damping
            this.x += this.speedX;
            this.y += this.speedY;
            this.speedX *= 0.99;
            this.speedY *= 0.99;

            // Add slight random movement
            this.speedX += (Math.random() - 0.5) * 0.01;
            this.speedY += (Math.random() - 0.5) * 0.01;

            // Boundary wrapping
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    function createParticles() {
        particles = [];
        const count = Math.min(config.particleCount, Math.floor((width * height) / 15000));
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < config.connectionDistance) {
                    const opacity = (1 - distance / config.connectionDistance) * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    
                    // Gradient line between particles
                    const gradient = ctx.createLinearGradient(
                        particles[i].x, particles[i].y,
                        particles[j].x, particles[j].y
                    );
                    gradient.addColorStop(0, particles[i].color);
                    gradient.addColorStop(1, particles[j].color);
                    
                    ctx.strokeStyle = gradient;
                    ctx.globalAlpha = opacity;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }
    }

    function drawMouseGlow() {
        if (mouse.x !== null && mouse.y !== null) {
            const gradient = ctx.createRadialGradient(
                mouse.x, mouse.y, 0,
                mouse.x, mouse.y, mouse.radius
            );
            gradient.addColorStop(0, 'rgba(0, 255, 255, 0.03)');
            gradient.addColorStop(0.5, 'rgba(255, 0, 255, 0.01)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        drawMouseGlow();
        drawConnections();
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        requestAnimationFrame(animate);
    }

    // Event listeners
    window.addEventListener('resize', () => {
        resize();
        createParticles();
    });

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Touch support
    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            mouse.x = e.touches[0].clientX;
            mouse.y = e.touches[0].clientY;
        }
    });

    window.addEventListener('touchend', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Initialize
    resize();
    createParticles();
    animate();
})();
