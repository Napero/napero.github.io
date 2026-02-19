// Simple SPA Router with Hash-based navigation
const Router = {
    contentContainer: null,
    currentPage: null,
    
    init() {
        this.contentContainer = document.getElementById('page-content');
        
        // Handle navigation clicks
        this.bindNavLinks();
        
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
                break;
        }
    },
    
    initNyanCatEasterEgg() {
        const name = document.getElementById('nameTitle');
        if (!name) return;
        
        name.style.cursor = 'pointer';
        name.addEventListener('click', () => {
            if (typeof window.spawnRandomNyanCat === 'function') {
                window.spawnRandomNyanCat();
            }
        });
    }
};

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Router.init();
});
