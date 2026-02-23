// Simple SPA Router with Hash-based navigation
const Router = {
    contentContainer: null,
    currentPage: null,
    konamiIndex: 0,
    nameGifUnlocked: false,
    konamiSequence: [
        'ArrowUp',
        'ArrowUp',
        'ArrowDown',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'ArrowLeft',
        'ArrowRight',
        'b',
        'a',
        'Enter'
    ],
    
    init() {
        this.contentContainer = document.getElementById('page-content');
        
        // Handle navigation clicks
        this.bindNavLinks();
        this.bindKonamiSequence();
        
        // Handle hash changes (browser back/forward and direct links)
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });
        
        // Load initial page from hash
        this.handleRoute();
    },
    
    bindNavLinks() {
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.navigate(page);
            });
        });
    },
    
    handleRoute() {
        const hash = window.location.hash.slice(1) || 'home';
        
        // Check if it's a post route: #post/post-id
        if (hash.startsWith('post/')) {
            const postId = hash.split('/')[1];
            this.loadPost(postId);
        } else {
            this.loadPage(hash);
        }
    },
    
    navigate(page) {
        if (page === this.currentPage) return;
        window.location.hash = page === 'home' ? '' : page;
        if (page === 'home' && this.currentPage !== 'home') {
            this.loadPage('home');
        }
    },
    
    async loadPage(page) {
        // Update active nav link
        document.querySelectorAll('nav a[data-page]').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });
        
        // Show loading state
        this.contentContainer.innerHTML = '<p class="loading">Loading...</p>';
        this.contentContainer.classList.add('page-transition');
        
        try {
            // Fetch page content
            const response = await fetch(`pages/${page}.html`);
            if (!response.ok) throw new Error('Page not found');
            
            const html = await response.text();
            
            // Update content with fade effect
            setTimeout(() => {
                this.contentContainer.innerHTML = html;
                this.contentContainer.classList.remove('page-transition');
                
                // Initialize page-specific scripts
                this.initPageScripts(page);
                
                // Rebind nav links for newly loaded content
                this.bindNavLinks();
                
                this.currentPage = page;
                
                // Scroll to top
                window.scrollTo(0, 0);
            }, 150);
            
        } catch (error) {
            this.contentContainer.innerHTML = '<p class="error">Error loading page.</p>';
            this.contentContainer.classList.remove('page-transition');
            console.error('Router error:', error);
        }
    },
    
    async loadPost(postId) {
        // Highlight blog in nav
        document.querySelectorAll('nav a[data-page]').forEach(link => {
            link.classList.toggle('active', link.dataset.page === 'blog');
        });
        
        this.contentContainer.innerHTML = '<p class="loading">Loading...</p>';
        this.contentContainer.classList.add('page-transition');
        
        try {
            // Load post data directly
            const post = await ContentDB.loadPost(postId);
            
            if (!post) throw new Error('Post not found');
            
            setTimeout(() => {
                // Render the post page
                if (typeof PostRenderer !== 'undefined') {
                    this.contentContainer.innerHTML = PostRenderer.render(post);
                    PostRenderer.highlightCode();
                    PostRenderer.initLightbox();
                }
                this.contentContainer.classList.remove('page-transition');
                this.currentPage = `post/${postId}`;
                window.scrollTo(0, 0);
            }, 150);
            
        } catch (error) {
            this.contentContainer.innerHTML = `
                <section id="post-error">
                    <p class="subtitle">Post Not Found</p>
                    <p>The post you're looking for doesn't exist.</p>
                    <a href="#blog" class="back-link">← Back to Blog</a>
                </section>
            `;
            this.contentContainer.classList.remove('page-transition');
            console.error('Post error:', error);
        }
    },
    
    initPageScripts(page) {
        switch(page) {
            case 'blog':
                if (typeof BlogRenderer !== 'undefined') {
                    BlogRenderer.init('blog-posts', 'blog-filters');
                }
                break;
            case 'projects':
                if (typeof ProjectsRenderer !== 'undefined') {
                    ProjectsRenderer.init('projects-grid', 'project-filters');
                }
                break;
            case 'home':
                this.initNyanCatEasterEgg();
                if (this.nameGifUnlocked) {
                    this.applyKonamiGifName();
                }
                break;
        }
    },
    
    initNyanCatEasterEgg() {
        const name = document.getElementById('nameTitle');
        if (!name) return;
        
        name.style.cursor = 'pointer';
        name.title = 'Click for Nyan Cat';
        name.addEventListener('click', () => {
            if (typeof window.spawnRandomNyanCat === 'function') {
                window.spawnRandomNyanCat();
            }
        });
    },

    bindKonamiSequence() {
        window.addEventListener('keydown', (event) => {
            this.handleKonamiKey(event);
        });
    },

    handleKonamiKey(event) {
        if (this.currentPage !== 'home') {
            this.konamiIndex = 0;
            return;
        }

        const pressed = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        const expected = this.konamiSequence[this.konamiIndex];

        if (pressed === expected) {
            this.konamiIndex += 1;
            if (this.konamiIndex === this.konamiSequence.length) {
                this.konamiIndex = 0;
                this.nameGifUnlocked = true;
                this.applyKonamiGifName();
            }
            return;
        }

        this.konamiIndex = pressed === this.konamiSequence[0] ? 1 : 0;
    },

    applyKonamiGifName() {
        const name = document.getElementById('nameTitle');
        if (!name || name.dataset.konamiGif === '1') return;

        const rawText = (name.textContent || '').trim();
        if (!rawText) return;

        const row = document.createElement('span');
        row.className = 'konami-gif-row';

        [...rawText].forEach((char, index) => {
            if (char === ' ') {
                const spacer = document.createElement('span');
                spacer.className = 'konami-gif-space';
                spacer.textContent = ' ';
                row.appendChild(spacer);
                return;
            }

            const normalized = char.toLowerCase();
            const supportsGif = /^[a-z0-9]$/.test(normalized);
            const hueOffset = `${index * 36}deg`;
            const hueDelay = `${(index * 0.18).toFixed(2)}s`;

            if (!supportsGif) {
                row.appendChild(this.createGifFallback(char, hueOffset, hueDelay));
                return;
            }

            const gif = document.createElement('img');
            gif.className = 'konami-gif-letter';
            gif.src = `https://dance.the404.nl/img/${normalized}.gif`;
            gif.alt = char.toUpperCase();
            gif.loading = 'lazy';
            gif.style.setProperty('--hue-offset', hueOffset);
            gif.style.setProperty('--hue-delay', hueDelay);
            gif.addEventListener('error', () => {
                gif.replaceWith(this.createGifFallback(char, hueOffset, hueDelay));
            }, { once: true });
            row.appendChild(gif);
        });

        name.dataset.konamiGif = '1';
        name.classList.add('konami-gif-name');
        name.textContent = '';
        name.appendChild(row);
    },

    createGifFallback(char, hueOffset, hueDelay) {
        const fallback = document.createElement('span');
        fallback.className = 'konami-gif-fallback';
        fallback.textContent = char;
        fallback.style.setProperty('--hue-offset', hueOffset);
        fallback.style.setProperty('--hue-delay', hueDelay);
        return fallback;
    }
};

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Router.init();
});
