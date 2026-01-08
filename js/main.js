/* ==========================================================================
   RETRO BLOG - MAIN JAVASCRIPT
   Handles content loading, markdown rendering, and page initialization
   ========================================================================== */

// ==========================================================================
// CONFIGURATION
// ==========================================================================

const CONFIG = {
    contentBase: '/content',
    dateFormat: { year: 'numeric', month: 'long', day: 'numeric' }
};

// ==========================================================================
// FRONTMATTER PARSER
// ==========================================================================

/**
 * Parse YAML frontmatter from markdown content
 * @param {string} markdown - Raw markdown with frontmatter
 * @returns {Object} - { data: Object, content: string }
 */
function parseFrontmatter(markdown) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = markdown.match(frontmatterRegex);

    if (!match) {
        return { data: {}, content: markdown };
    }

    const yamlString = match[1];
    const content = match[2];
    const data = {};

    // Simple YAML parser for common fields
    yamlString.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
            const key = line.slice(0, colonIndex).trim();
            let value = line.slice(colonIndex + 1).trim();

            // Skip array/object values (like tags)
            if (value.startsWith('-') || value === '') {
                return;
            }

            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            data[key] = value;
        }
    });

    return { data, content };
}

// ==========================================================================
// CONTENT LOADING
// ==========================================================================

/**
 * Load a single markdown file
 * @param {string} path - Path to the markdown file
 * @returns {Promise<Object|null>} - Parsed content or null on error
 */
async function loadMarkdownFile(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load ${path}: ${response.status}`);
        }
        const markdown = await response.text();
        return parseFrontmatter(markdown);
    } catch (error) {
        console.warn('Error loading markdown:', error.message);
        return null;
    }
}

/**
 * Load content list from index.json
 * @param {string} folder - Content folder name
 * @returns {Promise<string[]>} - Array of filenames
 */
async function loadContentList(folder) {
    try {
        const response = await fetch(`${CONFIG.contentBase}/${folder}/index.json`);
        if (!response.ok) {
            throw new Error(`Failed to load index for ${folder}`);
        }
        const files = await response.json();
        return files;
    } catch (error) {
        console.warn('Error loading content list:', error.message);
        return [];
    }
}

// ==========================================================================
// RENDERING FUNCTIONS
// ==========================================================================

/**
 * Safely render markdown to HTML
 * @param {string} content - Markdown content
 * @returns {string} - Sanitized HTML
 */
function renderMarkdown(content) {
    if (typeof marked === 'undefined') {
        console.warn('Marked library not loaded');
        return escapeHtml(content);
    }
    const html = marked.parse(content);
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(html);
    }
    return html;
}

/**
 * Escape HTML entities
 * @param {string} text - Raw text
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format a date string
 * @param {string} dateStr - Date string
 * @returns {string} - Formatted date
 */
function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', CONFIG.dateFormat);
    } catch {
        return dateStr;
    }
}

/**
 * Render a diary entry
 * @param {Object} entry - Parsed entry data
 * @returns {string} - HTML string
 */
function renderDiaryEntry(entry) {
    const title = escapeHtml(entry.data.title || 'Untitled');
    const date = formatDate(entry.data.date);
    const content = renderMarkdown(entry.content);

    return `
        <article class="diary-entry content-box">
            <header class="entry-header">
                <h3 class="entry-title">${title}</h3>
                <time class="entry-date" datetime="${entry.data.date}">${date}</time>
            </header>
            <div class="entry-content">
                ${content}
            </div>
        </article>
    `;
}

/**
 * Render a photo item
 * @param {Object} photo - Parsed photo data
 * @returns {string} - HTML string
 */
function renderPhotoItem(photo) {
    const image = escapeHtml(photo.data.image || '');
    const caption = escapeHtml(photo.data.caption || '');
    const date = formatDate(photo.data.date);

    return `
        <figure class="photo-item">
            <div class="photo-frame">
                <img src="${image}"
                     alt="${caption}"
                     loading="lazy"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22><rect fill=%22%23e8e0d8%22 width=%22100%%22 height=%22100%%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 fill=%22%239a8c7c%22>Image not found</text></svg>'">
            </div>
            <figcaption class="photo-caption">
                ${caption}
                <time class="photo-date">${date}</time>
            </figcaption>
        </figure>
    `;
}

/**
 * Render a music/art item
 * @param {Object} item - Parsed item data
 * @returns {string} - HTML string
 */
function renderMusicItem(item) {
    const title = escapeHtml(item.data.title || 'Untitled');
    const type = escapeHtml(item.data.type || 'misc');
    const description = escapeHtml(item.data.description || '');
    const link = escapeHtml(item.data.link || '#');
    const embed = item.data.embed || '';

    return `
        <article class="music-item content-box">
            <span class="music-type">${type}</span>
            <h3 class="music-title">${title}</h3>
            <p class="music-description">${description}</p>
            ${embed ? `<div class="music-embed">${embed}</div>` : ''}
            <a href="${link}"
               class="music-link"
               target="_blank"
               rel="noopener noreferrer">
                View / Listen
            </a>
        </article>
    `;
}

/**
 * Render an archive item
 * @param {Object} item - Parsed item data
 * @returns {string} - HTML string
 */
function renderArchiveItem(item) {
    const title = escapeHtml(item.data.title || 'Untitled');
    const category = escapeHtml(item.data.category || 'misc');
    const date = formatDate(item.data.date);
    const content = renderMarkdown(item.content);

    return `
        <article class="archive-item">
            <h3 class="archive-item-title">${title}</h3>
            <div class="archive-item-meta">
                <span class="archive-category">${category}</span>
                <time>${date}</time>
            </div>
            <div class="archive-item-content">
                ${content}
            </div>
        </article>
    `;
}

// ==========================================================================
// PAGE INITIALIZERS
// ==========================================================================

/**
 * Initialize home page
 */
async function initHomePage() {
    // Load latest diary entries
    const diaryPreview = document.getElementById('diary-preview');
    if (diaryPreview) {
        const files = await loadContentList('diary');
        const entries = await Promise.all(
            files.slice(0, 3).map(file =>
                loadMarkdownFile(`${CONFIG.contentBase}/diary/${file}`)
            )
        );

        const validEntries = entries.filter(e => e !== null);

        if (validEntries.length > 0) {
            // Sort by date (newest first)
            validEntries.sort((a, b) =>
                new Date(b.data.date) - new Date(a.data.date)
            );
            diaryPreview.innerHTML = validEntries.map(renderDiaryEntry).join('');
        } else {
            diaryPreview.innerHTML = '<p class="no-content">No diary entries yet.</p>';
        }
    }

    // Load featured content
    const featuredContent = document.getElementById('featured-content');
    if (featuredContent) {
        const files = await loadContentList('music');
        const items = await Promise.all(
            files.map(file =>
                loadMarkdownFile(`${CONFIG.contentBase}/music/${file}`)
            )
        );

        const featured = items.filter(item =>
            item !== null && item.data.featured === 'true'
        );

        if (featured.length > 0) {
            featuredContent.innerHTML = featured.map(renderMusicItem).join('');
        } else {
            featuredContent.innerHTML = '<p class="no-content">Nothing featured yet.</p>';
        }
    }
}

/**
 * Initialize diary page
 */
async function initDiaryPage() {
    const container = document.getElementById('diary-container');
    if (!container) return;

    const files = await loadContentList('diary');
    const entries = await Promise.all(
        files.map(file => loadMarkdownFile(`${CONFIG.contentBase}/diary/${file}`))
    );

    const validEntries = entries.filter(e => e !== null);

    if (validEntries.length > 0) {
        // Sort by date (newest first)
        validEntries.sort((a, b) =>
            new Date(b.data.date) - new Date(a.data.date)
        );
        container.innerHTML = validEntries.map(renderDiaryEntry).join('');
    } else {
        container.innerHTML = '<p class="no-content">No diary entries yet. Check back soon!</p>';
    }
}

/**
 * Initialize photos page
 */
async function initPhotosPage() {
    const container = document.getElementById('photos-container');
    if (!container) return;

    const files = await loadContentList('photos');
    const photos = await Promise.all(
        files.map(file => loadMarkdownFile(`${CONFIG.contentBase}/photos/${file}`))
    );

    const validPhotos = photos.filter(p => p !== null);

    if (validPhotos.length > 0) {
        // Sort by date (newest first)
        validPhotos.sort((a, b) =>
            new Date(b.data.date) - new Date(a.data.date)
        );
        container.innerHTML = validPhotos.map(renderPhotoItem).join('');
    } else {
        container.innerHTML = '<p class="no-content">No photos yet. Check back soon!</p>';
    }
}

/**
 * Initialize art & music page
 */
async function initMusicPage() {
    const container = document.getElementById('music-container');
    if (!container) return;

    const files = await loadContentList('music');
    const items = await Promise.all(
        files.map(file => loadMarkdownFile(`${CONFIG.contentBase}/music/${file}`))
    );

    const validItems = items.filter(item => item !== null);

    if (validItems.length > 0) {
        // Sort by date (newest first)
        validItems.sort((a, b) =>
            new Date(b.data.date) - new Date(a.data.date)
        );
        container.innerHTML = validItems.map(renderMusicItem).join('');
    } else {
        container.innerHTML = '<p class="no-content">No art or music yet. Check back soon!</p>';
    }
}

/**
 * Initialize archive page
 */
async function initArchivePage() {
    const container = document.getElementById('archive-container');
    if (!container) return;

    const files = await loadContentList('archive');
    const items = await Promise.all(
        files.map(file => loadMarkdownFile(`${CONFIG.contentBase}/archive/${file}`))
    );

    const validItems = items.filter(item => item !== null);

    if (validItems.length > 0) {
        // Sort by date (newest first)
        validItems.sort((a, b) =>
            new Date(b.data.date) - new Date(a.data.date)
        );
        container.innerHTML = validItems.map(renderArchiveItem).join('');
    } else {
        container.innerHTML = '<p class="no-content">The archive is empty... for now.</p>';
    }
}

// ==========================================================================
// NETLIFY IDENTITY INTEGRATION
// ==========================================================================

if (window.netlifyIdentity) {
    window.netlifyIdentity.on('init', user => {
        if (!user) {
            window.netlifyIdentity.on('login', () => {
                document.location.href = '/admin/';
            });
        }
    });
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;

    switch (page) {
        case 'home':
            initHomePage();
            break;
        case 'diary':
            initDiaryPage();
            break;
        case 'photos':
            initPhotosPage();
            break;
        case 'art-music':
            initMusicPage();
            break;
        case 'archive':
            initArchivePage();
            break;
        // 'random' page is static, no initialization needed
    }
});
