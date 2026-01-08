# Retro Blog Website - Documentation

## Project Structure
```
megWebsite/
├── index.html          # Home page
├── diary.html          # Diary entries
├── photos.html         # Photo gallery
├── art-music.html      # Art & Music
├── archive.html        # Archive
├── random.html         # Experimental page
├── css/style.css       # Retro styling (dusty purples, pixel fonts)
├── js/main.js          # Content loading & markdown rendering
├── netlify.toml        # Deployment config
├── admin/
│   ├── index.html      # Decap CMS entry point
│   └── config.yml      # CMS collections config
├── content/
│   ├── diary/          # Diary entries (markdown)
│   ├── photos/         # Photo posts
│   ├── music/          # Art & music items
│   ├── archive/        # Archive posts
│   └── settings/       # Site settings
└── assets/
    ├── images/         # Uploaded images
    ├── icons/          # Icons
    ├── textures/       # Background textures
    └── fonts/          # Custom fonts
```

## Local Testing
Run a local server to preview:
```bash
python3 -m http.server 3000
```
Then open **http://localhost:3000** in your browser.

## Deployment Steps
1. Initialize git: `git init && git add . && git commit -m "Initial commit"`
2. Push to GitHub
3. Connect the repo to Netlify
4. In Netlify, enable **Identity** and **Git Gateway** under Site Settings
5. Invite yourself as a user to access `/admin`

## Design Features
- Dusty purple/grey color palette
- Press Start 2P & VT323 pixel fonts
- Boxy borders with hard drop shadows
- Polaroid-style image frames
- 960px fixed-width centered layout
- Mobile-responsive sidebar that collapses to horizontal nav

## Technology Stack
- **Frontend**: HTML5, CSS3, vanilla JavaScript
- **CMS**: Decap CMS (formerly Netlify CMS)
- **Markdown**: Marked.js for rendering, DOMPurify for sanitization
- **Hosting**: Netlify with Git Gateway

## Content Management
Access the CMS at `/admin` after deployment. You can:
- Write diary entries (markdown)
- Upload photos with captions
- Add art & music with embed codes
- Manage archive items
- Update site settings

## Adding Content Manually
Each content type uses markdown files with YAML frontmatter:

### Diary Entry
```markdown
---
title: "Entry Title"
date: 2024-01-15
tags:
  - personal
---

Your diary content here...
```

### Photo
```markdown
---
image: /assets/images/uploads/photo.jpg
caption: "Photo description"
date: 2024-01-15
---
```

### Art & Music
```markdown
---
title: "Track Name"
type: music
description: "Brief description"
link: https://bandcamp.com/example
embed: "<iframe>...</iframe>"
date: 2024-01-15
featured: true
---
```

## Updating Content Index
When adding content manually (not via CMS), update the corresponding `index.json` file:
```json
["newest-post.md", "older-post.md"]
```

## Color Palette
| Variable | Color | Hex |
|----------|-------|-----|
| Background Primary | Warm off-white | `#f5f0eb` |
| Background Secondary | Dusty cream | `#e8e0d8` |
| Border | Muted brown | `#9a8c7c` |
| Text Primary | Near-black | `#2d2926` |
| Accent Purple | Dusty purple | `#6b5b7a` |
| Accent Lavender | Light purple | `#9b8ba0` |
