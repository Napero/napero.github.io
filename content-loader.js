// Content loader - File-based database system
const ContentDB = {
    posts: [],
    projects: [],
    postsBasePath: 'data/posts/',
    
    // Helper to fetch with cache busting for JSON files
    async fetchJSON(url) {
        const cacheBuster = `?v=${Date.now()}`;
        const response = await fetch(url + cacheBuster);
        return response.json();
    },
    
    async loadPosts() {
        try {
            // Load index of all posts
            const index = await this.fetchJSON(this.postsBasePath + 'index.json');
            
            // Load each post's data
            const postPromises = index.posts.map(async (postId) => {
                const post = await this.fetchJSON(`${this.postsBasePath}${postId}/post.json`);
                // Store the base path for images
                post.basePath = `${this.postsBasePath}${postId}/`;
                return post;
            });
            
            this.posts = await Promise.all(postPromises);
            // Sort by date, newest first
            this.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            return this.posts;
        } catch (error) {
            console.error('Error loading posts:', error);
            return [];
        }
    },
    
    async loadPost(postId) {
        try {
            const post = await this.fetchJSON(`${this.postsBasePath}${postId}/post.json`);
            post.basePath = `${this.postsBasePath}${postId}/`;
            return post;
        } catch (error) {
            console.error('Error loading post:', error);
            return null;
        }
    },
    
    async loadProjects() {
        try {
            const data = await this.fetchJSON('data/projects.json');
            this.projects = data.projects || data;
            return this.projects;
        } catch (error) {
            console.error('Error loading projects:', error);
            return [];
        }
    },
    
    filterByTag(items, tag) {
        if (!tag || tag === 'all') return items;
        return items.filter(item => item.tags.includes(tag));
    },
    
    filterByStatus(items, status) {
        if (!status || status === 'all') return items;
        return items.filter(item => item.status === status);
    },
    
    getAllTags(items) {
        const tags = new Set();
        items.forEach(item => {
            item.tags.forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    },
    
    getAllStatuses(items) {
        const statuses = new Set();
        items.forEach(item => {
            if (item.status) statuses.add(item.status);
        });
        return Array.from(statuses);
    },
    
    search(items, query) {
        if (!query) return items;
        const lowerQuery = query.toLowerCase();
        return items.filter(item => 
            item.title.toLowerCase().includes(lowerQuery) ||
            (item.description && item.description.toLowerCase().includes(lowerQuery)) ||
            (item.summary && item.summary.toLowerCase().includes(lowerQuery)) ||
            item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }
};

// Blog renderer
const BlogRenderer = {
    container: null,
    filtersContainer: null,
    currentTag: 'all',
    
    init(containerId, filtersId) {
        this.container = document.getElementById(containerId);
        this.filtersContainer = document.getElementById(filtersId);
        if (this.container) this.load();
    },
    
    async load() {
        const posts = await ContentDB.loadPosts();
        this.renderFilters(posts);
        this.render(posts);
    },
    
    renderFilters(posts) {
        if (!this.filtersContainer) return;
        
        const tags = ContentDB.getAllTags(posts);
        
        let html = `
            <div class="filter-group">
                <button class="filter-btn active" data-tag="all">All</button>
                ${tags.map(tag => `
                    <button class="filter-btn" data-tag="${tag}">${tag}</button>
                `).join('')}
            </div>
        `;
        
        this.filtersContainer.innerHTML = html;
        
        // Add event listeners
        this.filtersContainer.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filtersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTag = e.target.dataset.tag;
                this.render(ContentDB.filterByTag(ContentDB.posts, this.currentTag));
            });
        });
    },
    
    render(posts) {
        if (!this.container) return;
        
        if (posts.length === 0) {
            this.container.innerHTML = '<p class="no-results">No posts found.</p>';
            return;
        }
        
        this.container.innerHTML = posts.map(post => `
            <article class="blog-post" data-id="${post.id}">
                <a href="#post/${post.id}" class="post-link" data-post-id="${post.id}">
                    <div class="post-header">
                        <h2 class="post-title">${post.title}</h2>
                        <time class="post-date">${this.formatDate(post.date)}</time>
                    </div>
                    <div class="post-summary">
                        <p>${post.summary}</p>
                    </div>
                    <div class="post-tags">
                        ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <span class="read-more">Read more →</span>
                </a>
            </article>
        `).join('');
        
        // Bind click handlers for post links
        this.container.querySelectorAll('.post-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const postId = e.currentTarget.dataset.postId;
                window.location.hash = `post/${postId}`;
                // Force router to handle the route immediately
                if (typeof Router !== 'undefined') {
                    Router.handleRoute();
                }
            });
        });
    },
    
    expandPost(postId) {
        const content = document.getElementById(`content-${postId}`);
        const article = content.closest('.blog-post');
        const btn = article.querySelector('.read-more-btn');
        const summary = article.querySelector('.post-summary');
        
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            summary.classList.add('hidden');
            btn.textContent = 'Show less';
        } else {
            content.classList.add('hidden');
            summary.classList.remove('hidden');
            btn.textContent = 'Read more';
        }
    },
    
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
};

// Projects renderer
const ProjectsRenderer = {
    container: null,
    filtersContainer: null,
    currentTag: 'all',
    currentStatus: 'all',
    
    init(containerId, filtersId) {
        this.container = document.getElementById(containerId);
        this.filtersContainer = document.getElementById(filtersId);
        if (this.container) this.load();
    },
    
    async load() {
        const projects = await ContentDB.loadProjects();
        this.renderFilters(projects);
        this.render(projects);
    },
    
    renderFilters(projects) {
        if (!this.filtersContainer) return;
        
        const tags = ContentDB.getAllTags(projects);
        const statuses = ContentDB.getAllStatuses(projects);
        
        let html = `
            <div class="filter-section">
                <span class="filter-label">Category:</span>
                <div class="filter-group">
                    <button class="filter-btn active" data-tag="all">All</button>
                    ${tags.map(tag => `
                        <button class="filter-btn" data-tag="${tag}">${tag}</button>
                    `).join('')}
                </div>
            </div>
            <div class="filter-section">
                <span class="filter-label">Status:</span>
                <div class="filter-group status-filters">
                    <button class="filter-btn active" data-status="all">All</button>
                    ${statuses.map(status => `
                        <button class="filter-btn" data-status="${status}">${this.formatStatus(status)}</button>
                    `).join('')}
                </div>
            </div>
        `;
        
        this.filtersContainer.innerHTML = html;
        
        // Tag filter listeners
        this.filtersContainer.querySelectorAll('[data-tag]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filtersContainer.querySelectorAll('[data-tag]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTag = e.target.dataset.tag;
                this.applyFilters();
            });
        });
        
        // Status filter listeners
        this.filtersContainer.querySelectorAll('[data-status]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filtersContainer.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentStatus = e.target.dataset.status;
                this.applyFilters();
            });
        });
    },
    
    applyFilters() {
        let filtered = ContentDB.projects;
        filtered = ContentDB.filterByTag(filtered, this.currentTag);
        filtered = ContentDB.filterByStatus(filtered, this.currentStatus);
        this.render(filtered);
    },
    
    render(projects) {
        if (!this.container) return;
        
        if (projects.length === 0) {
            this.container.innerHTML = '<p class="no-results">No projects found matching the filters.</p>';
            return;
        }
        
        // Sort: featured first
        const sorted = [...projects].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        
        this.container.innerHTML = sorted.map(project => `
            <div class="project-card ${project.featured ? 'featured' : ''}">
                ${project.image ? `
                <div class="project-image">
                    <img src="${project.image}" alt="${project.title}">
                </div>
                ` : ''}
                <div class="project-info">
                    <div class="project-header">
                        <h3 class="project-title">${project.title}</h3>
                        <span class="status-badge status-${project.status}">${this.formatStatus(project.status)}</span>
                    </div>
                    <p class="project-description">${project.description}</p>
                    <div class="project-tags">
                        ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    ${project.link ? `<a href="${project.link}" target="_blank" class="project-link">View Project →</a>` : ''}
                </div>
            </div>
        `).join('');
    },
    
    formatStatus(status) {
        const statusMap = {
            'active': 'Active',
            'completed': 'Completed',
            'in-progress': 'In Progress',
            'archived': 'Archived'
        };
        return statusMap[status] || status;
    }
};

// Simple Markdown parser
const MarkdownParser = {
    basePath: '',
    
    parse(text, basePath = '') {
        if (!text) return '';
        this.basePath = basePath;
        
        let html = text;
        
        // First, protect images and links by converting them to placeholders
        const images = [];
        const links = [];
        
        // Images with alt text: ![alt](url) - resolve relative paths
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
            const resolvedUrl = (url.startsWith('http') || url.startsWith('/')) ? url : this.basePath + url;
            images.push(`<img src="${resolvedUrl}" alt="${alt}" class="post-image">`);
            return `%%IMG${images.length - 1}%%`;
        });
        
        // Links: [text](url) - don't modify hash links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
            const target = url.startsWith('#') ? '' : ' target="_blank"';
            links.push(`<a href="${url}"${target}>${text}</a>`);
            return `%%LINK${links.length - 1}%%`;
        });
        
        // Escape HTML (except for our placeholders)
        html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Code blocks (```)
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`;
        });
        
        // Inline code (`code`)
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Headers
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Bold: **text** or __text__
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        
        // Italic: *text* or _text_ (only at word boundaries, not in middle of words)
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g, '<em>$1</em>');
        
        // Strikethrough: ~~text~~
        html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
        
        // Horizontal rule
        html = html.replace(/^---$/gm, '<hr>');
        
        // Blockquotes
        html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
        
        // Unordered lists
        html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        
        // Ordered lists
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
        
        // Paragraphs (double newlines)
        html = html.replace(/\n\n+/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        // Restore images and links
        images.forEach((img, i) => {
            html = html.replace(`%%IMG${i}%%`, img);
        });
        links.forEach((link, i) => {
            html = html.replace(`%%LINK${i}%%`, link);
        });
        
        // Clean up empty paragraphs
        html = html.replace(/<p>\s*<\/p>/g, '');
        html = html.replace(/<p>(<h[1-3]>)/g, '$1');
        html = html.replace(/(<\/h[1-3]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ul>)/g, '$1');
        html = html.replace(/(<\/ul>)<\/p>/g, '$1');
        html = html.replace(/<p>(<pre>)/g, '$1');
        html = html.replace(/(<\/pre>)<\/p>/g, '$1');
        html = html.replace(/<p>(<blockquote>)/g, '$1');
        html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
        html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
        
        return html;
    }
};

// Individual Post Renderer
const PostRenderer = {
    render(post) {
        const content = MarkdownParser.parse(post.content, post.basePath || '');
        const date = this.formatDate(post.date);
        
        return `
            <article class="post-full">
                <a href="#blog" class="back-link">← Back to Blog</a>
                
                <header class="post-full-header">
                    <h1 class="post-full-title">${post.title}</h1>
                    <time class="post-full-date">${date}</time>
                    <div class="post-full-tags">
                        ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </header>
                
                <div class="post-full-content">
                    ${content}
                </div>
            </article>
        `;
    },
    
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    },
    
    highlightCode() {
        // Simple syntax highlighting could be added here
        // For now, just add styling class
        document.querySelectorAll('pre code').forEach(block => {
            block.parentElement.classList.add('code-block');
        });
    },
    
    initLightbox() {
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const closeBtn = document.querySelector('.lightbox-close');
        
        // Make post images clickable
        document.querySelectorAll('.post-full-content .post-image').forEach(img => {
            img.addEventListener('click', () => {
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt;
                lightbox.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        });
        
        // Close lightbox on click
        lightbox.addEventListener('click', () => {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                lightbox.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
};
