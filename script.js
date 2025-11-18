// ===================================
// BACKGROUND CANVAS - Mathematical Pattern
// ===================================

const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
let time = 0;
let mouse = { x: 0, y: 0 };

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

class Particle {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.life = Math.random() * 100;
        this.maxLife = 100;
        // Randomly assign cyan or blue color
        this.color = Math.random() > 0.5 ? '0, 255, 128' : '128, 128, 255';
    }
    
    update() {
        // Calculate distance to mouse
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Repel from mouse if close
        if (distance < 150) {
            const force = (150 - distance) / 150;
            this.x += (dx / distance) * force * 2;
            this.y += (dy / distance) * force * 2;
        }
        
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        
        // Wrap around edges
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
        
        if (this.life <= 0) {
            this.reset();
        }
    }
    
    draw() {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = `rgba(${this.color}, ${alpha * 0.4})`;
        ctx.fillRect(this.x, this.y, 2, 2);
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < 100; i++) {
        particles.push(new Particle());
    }
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(90, 90, 107, 0.15)';
    ctx.lineWidth = 0.5;
    
    const gridSize = 50;
    const offsetX = (time * 0.5) % gridSize;
    const offsetY = (time * 0.5) % gridSize;
    
    // Vertical lines
    for (let x = offsetX; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = offsetY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

function drawMathSymbols() {
    ctx.font = '20px Fira Code';
    
    const symbols = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'λ', 'μ', 'π', 'σ', 'φ', 'ψ', 'ω', '∫', '∑', '∏', '∇', '∂', '∞', '≈', '≠', '≤', '≥'];
    
    for (let i = 0; i < 20; i++) {
        const x = (Math.sin(time * 0.001 + i) * 0.5 + 0.5) * width;
        const y = (Math.cos(time * 0.002 + i) * 0.5 + 0.5) * height;
        const symbol = symbols[Math.floor((time * 0.01 + i) % symbols.length)];
        
        // Alternate colors for symbols
        const color = i % 2 === 0 ? '0, 255, 128' : '128, 128, 255';
        
        // Check distance to mouse and make symbols react
        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 200) {
            const scale = 1 + (200 - distance) / 400;
            const alpha = 0.15 + (200 - distance) / 800;
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.fillStyle = `rgba(${color}, ${alpha})`;
            ctx.fillText(symbol, 0, 0);
            ctx.restore();
        } else {
            ctx.fillStyle = `rgba(${color}, 0.1)`;
            ctx.fillText(symbol, x, y);
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);
    
    drawGrid();
    drawMathSymbols();
    
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });
    
    // Connect mouse to nearby particles
    particles.forEach(particle => {
        const dx = particle.x - mouse.x;
        const dy = particle.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) {
            const opacity = 1 - (distance / 150);
            ctx.strokeStyle = `rgba(${particle.color}, ${opacity * 0.8})`;
            ctx.lineWidth = 1 + opacity;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(particle.x, particle.y);
            ctx.stroke();
        }
    });
    
    // Connect nearby particles
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 150) {
                // Check if either particle is near the mouse
                const distToMouse1 = Math.sqrt(Math.pow(particles[i].x - mouse.x, 2) + Math.pow(particles[i].y - mouse.y, 2));
                const distToMouse2 = Math.sqrt(Math.pow(particles[j].x - mouse.x, 2) + Math.pow(particles[j].y - mouse.y, 2));
                const nearMouse = Math.min(distToMouse1, distToMouse2) < 200;
                
                // Use color based on particles and increase opacity near mouse
                const color1 = particles[i].color;
                const color2 = particles[j].color;
                const avgColor = color1 === color2 ? color1 : '104, 192, 192'; // Mix to teal if different
                
                if (nearMouse) {
                    const mouseProximity = 1 - (Math.min(distToMouse1, distToMouse2) / 200);
                    ctx.strokeStyle = `rgba(${avgColor}, ${0.3 + mouseProximity * 0.5})`;
                    ctx.lineWidth = 1 + mouseProximity;
                } else {
                    ctx.strokeStyle = `rgba(${avgColor}, 0.15)`;
                    ctx.lineWidth = 0.5;
                }
                
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
    
    time++;
    requestAnimationFrame(animate);
}

// Initialize
resizeCanvas();
initParticles();
animate();

window.addEventListener('resize', () => {
    resizeCanvas();
    initParticles();
});

// Track mouse movement for particle interaction
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Touch support for mobile
window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }
});

// ===================================
// NAVIGATION
// ===================================

const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section, .hero');

function setActiveLink() {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('scroll', setActiveLink);

// Smooth scroll
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        window.scrollTo({
            top: targetSection.offsetTop - 80,
            behavior: 'smooth'
        });
    });
});

// ===================================
// TYPING ANIMATION
// ===================================

const typedTextSpan = document.querySelector('.typed-text');
const texts = [
    'CS Engineering Student',
    'Full-Stack Developer',
    'AI & ML Enthusiast',
    'Database Architect',
    'Problem Solver'
];
let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingDelay = 150;

function typeText() {
    const currentText = texts[textIndex];
    
    if (isDeleting) {
        typedTextSpan.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
        typingDelay = 75;
    } else {
        typedTextSpan.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
        typingDelay = 150;
    }
    
    if (!isDeleting && charIndex === currentText.length) {
        typingDelay = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
        typingDelay = 500;
    }
    
    setTimeout(typeText, typingDelay);
}

// Start typing animation after a short delay
setTimeout(typeText, 1000);

// ===================================
// SCROLL ANIMATIONS
// ===================================

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
}, observerOptions);

// Observe all project cards, skill categories, and sections
document.querySelectorAll('.project-card, .skill-category, .about-terminal, .contact-content').forEach(el => {
    observer.observe(el);
});

// ===================================
// SKILL BARS ANIMATION
// ===================================

const skillBars = document.querySelectorAll('.skill-fill');
const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fillBar 1s ease-out forwards';
        }
    });
}, { threshold: 0.5 });

skillBars.forEach(bar => {
    skillObserver.observe(bar);
});

// ===================================
// PARALLAX SCROLL EFFECT
// ===================================

window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero-content');
    
    if (hero && scrolled < window.innerHeight) {
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        hero.style.opacity = 1 - (scrolled / window.innerHeight) * 0.8;
    }
});

// ===================================
// PROJECT CARD TILT EFFECT
// ===================================

const projectCards = document.querySelectorAll('.project-card');

projectCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
});

// ===================================
// EASTER EGG - Console Message
// ===================================

console.log('%c█▀▀▄ █▀▀█ █▀▀█ █▀▀ █▀▀█ █▀▀█', 'color: #8b8b9a; font-weight: bold; font-size: 16px;');
console.log('%c█  █ █▄▄█ █  █ █▀▀ █▄▄▀ █  █', 'color: #8b8b9a; font-weight: bold; font-size: 16px;');
console.log('%c▀  ▀ ▀  ▀ █▀▀▀ ▀▀▀ ▀ ▀▀ ▀▀▀▀', 'color: #8b8b9a; font-weight: bold; font-size: 16px;');
console.log('%c\n👋 Hey there, fellow developer!\n\nLooks like you\'re curious about how this site works.\nFeel free to explore the code and reach out if you want to collaborate!\n\n∀x ∈ Code: x → Innovation\n', 'color: #a0a0ab; font-size: 14px; line-height: 1.5;');

// ===================================
// PERFORMANCE OPTIMIZATION
// ===================================

// Reduce animation complexity on lower-end devices
if (window.innerWidth < 768 || window.devicePixelRatio > 2) {
    particles = particles.slice(0, 50);
}

// Pause canvas animation when tab is not visible
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Tab is hidden, reduce resource usage
        particles.forEach(p => p.vx = p.vy = 0);
    } else {
        // Tab is visible again, restore movement
        particles.forEach(p => {
            p.vx = (Math.random() - 0.5) * 0.5;
            p.vy = (Math.random() - 0.5) * 0.5;
        });
    }
});

// ===================================
// KEYBOARD NAVIGATION
// ===================================

let currentSectionIndex = 0;
const sectionIds = ['home', 'about', 'projects', 'skills', 'contact'];

document.addEventListener('keydown', (e) => {
    // Navigate with arrow keys
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        currentSectionIndex = Math.min(currentSectionIndex + 1, sectionIds.length - 1);
        navigateToSection(currentSectionIndex);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        currentSectionIndex = Math.max(currentSectionIndex - 1, 0);
        navigateToSection(currentSectionIndex);
    }
});

function navigateToSection(index) {
    const section = document.getElementById(sectionIds[index]);
    if (section) {
        window.scrollTo({
            top: section.offsetTop - 80,
            behavior: 'smooth'
        });
    }
}

// ===================================
// INIT
// ===================================

window.addEventListener('load', () => {
    document.body.style.opacity = '1';
    setActiveLink();
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Initialize language
    if (typeof initLanguage === 'function') {
        initLanguage();
    }
    
    // Setup language toggle button
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle && typeof toggleLanguage === 'function') {
        langToggle.addEventListener('click', toggleLanguage);
    }
    
    // Discord username copy button
    const discordBtn = document.getElementById('discord-btn');
    if (discordBtn) {
        discordBtn.addEventListener('click', async () => {
            const username = 'napero';
            try {
                await navigator.clipboard.writeText(username);
                const originalText = discordBtn.querySelector('.btn-text').textContent;
                discordBtn.querySelector('.btn-text').textContent = 'Copied!';
                setTimeout(() => {
                    discordBtn.querySelector('.btn-text').textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
    }
});
