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

    const lines = yamlString.split('\n');
    let currentKey = null;
    let currentArray = null;
    let currentObject = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for array item with nested key (e.g., "  - sticker: /path")
        const nestedArrayMatch = line.match(/^\s+-\s+(\w+):\s*(.*)$/);
        if (nestedArrayMatch && currentKey) {
            if (!currentArray) currentArray = [];
            const nestedKey = nestedArrayMatch[1];
            let nestedValue = nestedArrayMatch[2].trim();
            // Remove quotes if present
            if ((nestedValue.startsWith('"') && nestedValue.endsWith('"')) ||
                (nestedValue.startsWith("'") && nestedValue.endsWith("'"))) {
                nestedValue = nestedValue.slice(1, -1);
            }
            currentArray.push({ [nestedKey]: nestedValue });
            continue;
        }

        // Check for simple array item (e.g., "  - value")
        const simpleArrayMatch = line.match(/^\s+-\s+(.*)$/);
        if (simpleArrayMatch && currentKey) {
            if (!currentArray) currentArray = [];
            let value = simpleArrayMatch[1].trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            currentArray.push(value);
            continue;
        }

        // Check for key: value pair at root level
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1 && !line.startsWith(' ') && !line.startsWith('\t')) {
            // Save previous array if exists
            if (currentKey && currentArray) {
                data[currentKey] = currentArray;
                currentArray = null;
            }

            const key = line.slice(0, colonIndex).trim();
            let value = line.slice(colonIndex + 1).trim();

            // Empty value means array or object follows
            if (value === '') {
                currentKey = key;
                currentArray = [];
                continue;
            }

            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            currentKey = null;
            data[key] = value;
        }
    }

    // Save final array if exists
    if (currentKey && currentArray) {
        data[currentKey] = currentArray;
    }

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
 * Render stickers for an entry
 * @param {Array} stickers - Array of sticker objects or strings
 * @returns {string} - HTML string
 */
function renderStickers(stickers) {
    if (!stickers || stickers.length === 0) return '';

    return `<div class="stickers-container">${stickers.map(s => {
        const src = escapeHtml(typeof s === 'string' ? s : (s.sticker || ''));
        return src ? `<img src="${src}" alt="" class="sticker" loading="lazy">` : '';
    }).join('')}</div>`;
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
    const stickers = entry.data.stickers || [];

    return `
        <article class="diary-entry content-box">
            ${renderStickers(stickers)}
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
    const stickers = photo.data.stickers || [];

    return `
        <figure class="photo-item">
            <div class="photo-frame">
                ${renderStickers(stickers)}
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

/**
 * Render a treasure item
 * @param {Object} item - Parsed item data
 * @returns {string} - HTML string
 */
function renderTreasureItem(item) {
    const title = escapeHtml(item.data.title || 'Untitled');
    const image = escapeHtml(item.data.image || '');
    const description = escapeHtml(item.data.description || '');
    const link = escapeHtml(item.data.link || '#');
    const price = escapeHtml(item.data.price || '');
    const available = item.data.available !== 'false';
    const stickers = item.data.stickers || [];

    const stickersHtml = stickers.length > 0
        ? `<div class="stickers-container">${stickers.map(s =>
            `<img src="${escapeHtml(s.sticker || s)}" alt="" class="sticker" loading="lazy">`
          ).join('')}</div>`
        : '';

    return `
        <article class="treasure-item${available ? '' : ' treasure-unavailable'}">
            ${stickersHtml}
            <img src="${image}"
                 alt="${title}"
                 class="treasure-image"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22><rect fill=%22%23e8e0d8%22 width=%22100%%22 height=%22100%%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 fill=%22%239a8c7c%22>~</text></svg>'">
            <div class="treasure-details">
                <h3 class="treasure-title">${title}</h3>
                <p class="treasure-description">${description}</p>
                ${price ? `<p class="treasure-price">${price}</p>` : ''}
                <a href="${link}"
                   class="treasure-link"
                   target="_blank"
                   rel="noopener noreferrer">
                    ${available ? 'get it' : 'sold out'}
                </a>
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

/**
 * Initialize treasures page
 */
async function initTreasuresPage() {
    const container = document.getElementById('treasures-container');
    if (!container) return;

    const files = await loadContentList('treasures');
    const items = await Promise.all(
        files.map(file => loadMarkdownFile(`${CONFIG.contentBase}/treasures/${file}`))
    );

    const validItems = items.filter(item => item !== null);

    if (validItems.length > 0) {
        // Sort by date (newest first)
        validItems.sort((a, b) =>
            new Date(b.data.date) - new Date(a.data.date)
        );
        container.innerHTML = validItems.map(renderTreasureItem).join('');
    } else {
        container.innerHTML = '<p class="no-content">no treasures yet... check back soon!</p>';
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
        case 'treasures':
            initTreasuresPage();
            break;
        // 'random' and 'messages' pages are static/use external embeds
    }
});
