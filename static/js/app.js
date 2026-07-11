document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let allUpdates = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedUpdate = null;

    // DOM Elements
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshIcon = document.getElementById('refreshIcon');
    const searchInput = document.getElementById('searchInput');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const retryBtn = document.getElementById('retryBtn');
    const feedList = document.getElementById('feedList');
    const lastUpdatedVal = document.getElementById('lastUpdatedVal');

    // Modal Elements
    const tweetModal = document.getElementById('tweetModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const tweetSubmitBtn = document.getElementById('tweetSubmitBtn');
    const tweetText = document.getElementById('tweetText');
    const charCounter = document.getElementById('charCounter');
    const charWarning = document.getElementById('charWarning');
    const modalUpdateTag = document.getElementById('modalUpdateTag');
    const modalUpdateDate = document.getElementById('modalUpdateDate');
    const modalUpdateDesc = document.getElementById('modalUpdateDesc');

    // Toast
    const toast = document.getElementById('toast');

    // Helper: Show Toast
    function showToast(message, isError = false) {
        toast.innerText = message;
        if (isError) {
            toast.classList.add('error');
        } else {
            toast.classList.remove('error');
        }
        toast.classList.remove('hidden');
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 3000);
    }

    // Helper: Get Tag Style Class
    function getTagClass(type) {
        const t = type.toLowerCase();
        if (t.includes('feature')) return 'tag-feature';
        if (t.includes('change')) return 'tag-change';
        if (t.includes('deprecation')) return 'tag-deprecation';
        if (t.includes('announcement')) return 'tag-announcement';
        return 'tag-other';
    }

    // Parse feed HTML into separate updates grouped by h3
    function parseEntryUpdates(entry) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(entry.content, 'text/html');
        const updates = [];
        let currentUpdate = null;

        Array.from(doc.body.children).forEach(child => {
            if (child.tagName === 'H3') {
                if (currentUpdate) {
                    updates.push(currentUpdate);
                }
                currentUpdate = {
                    id: entry.id + '_' + Math.random().toString(36).substr(2, 5),
                    date: entry.title,
                    link: entry.link,
                    type: child.innerText.trim(),
                    content: ''
                };
            } else {
                if (!currentUpdate) {
                    currentUpdate = {
                        id: entry.id + '_' + Math.random().toString(36).substr(2, 5),
                        date: entry.title,
                        link: entry.link,
                        type: 'Update',
                        content: ''
                    };
                }
                currentUpdate.content += child.outerHTML;
            }
        });

        if (currentUpdate) {
            updates.push(currentUpdate);
        }
        return updates;
    }

    // Fetch release notes from backend
    async function fetchReleaseNotes(force = false) {
        // Show loading state
        loadingState.classList.remove('hidden');
        errorState.classList.add('hidden');
        feedList.classList.add('hidden');
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;

        try {
            const response = await fetch(`/api/release-notes?force=${force}`);
            const data = await response.json();
            
            if (data.success) {
                // Parse entries into updates
                allUpdates = [];
                data.entries.forEach(entry => {
                    const entryUpdates = parseEntryUpdates(entry);
                    allUpdates.push(...entryUpdates);
                });

                // Update UI state
                lastUpdatedVal.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                if (data.warning) {
                    showToast(data.warning, true);
                } else if (force) {
                    showToast('Release notes updated successfully!');
                }
                
                renderFeed();
            } else {
                throw new Error(data.error || 'Unknown error occurred while fetching release notes.');
            }
        } catch (err) {
            console.error(err);
            errorMessage.innerText = err.message;
            errorState.classList.remove('hidden');
            loadingState.classList.add('hidden');
        } finally {
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    // Render feed updates based on search and filters
    function renderFeed() {
        feedList.innerHTML = '';
        feedList.classList.remove('hidden');
        loadingState.classList.add('hidden');

        // Apply filters
        const filteredUpdates = allUpdates.filter(update => {
            // Type filter
            if (currentFilter !== 'all') {
                const typeMatches = update.type.toLowerCase().includes(currentFilter);
                if (!typeMatches) return false;
            }
            
            // Search query filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const typeMatches = update.type.toLowerCase().includes(query);
                const contentMatches = update.content.toLowerCase().includes(query);
                const dateMatches = update.date.toLowerCase().includes(query);
                if (!typeMatches && !contentMatches && !dateMatches) return false;
            }

            return true;
        });

        if (filteredUpdates.length === 0) {
            feedList.innerHTML = `
                <div class="glass-panel text-center" style="padding: 3rem; text-align: center; color: var(--text-muted);">
                    <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--text-muted);"></i>
                    <h3>No Updates Found</h3>
                    <p>Try modifying your search query or filter selection.</p>
                </div>
            `;
            return;
        }

        // Group filtered updates by Date for display
        const groups = {};
        filteredUpdates.forEach(update => {
            if (!groups[update.date]) {
                groups[update.date] = [];
            }
            groups[update.date].push(update);
        });

        // Generate and append groups DOM
        Object.keys(groups).forEach(dateStr => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';

            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.innerText = dateStr;
            dateGroup.appendChild(dateHeader);

            const updatesContainer = document.createElement('div');
            updatesContainer.className = 'updates-container';

            groups[dateStr].forEach(update => {
                const card = document.createElement('article');
                card.className = 'update-card glass-panel';

                const tagClass = getTagClass(update.type);
                
                card.innerHTML = `
                    <div class="update-meta">
                        <span class="tag-badge ${tagClass}">${update.type}</span>
                    </div>
                    <div class="update-card-content">
                        ${update.content}
                    </div>
                    <div class="update-actions">
                        <button class="btn btn-secondary btn-share-card" data-update-id="${update.id}">
                            <i class="fa-brands fa-x-twitter"></i> Tweet Update
                        </button>
                    </div>
                `;

                // Add tweet handler
                card.querySelector('.btn-share-card').addEventListener('click', () => {
                    openTweetModal(update);
                });

                updatesContainer.appendChild(card);
            });

            dateGroup.appendChild(updatesContainer);
            feedList.appendChild(dateGroup);
        });
    }

    // Modal Control: Open Tweet Modal
    function openTweetModal(update) {
        selectedUpdate = update;
        modalUpdateTag.innerText = update.type;
        modalUpdateTag.className = `preview-tag ${getTagClass(update.type)}`;
        modalUpdateDate.innerText = update.date;
        
        // Extract preview description text (plain text)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = update.content;
        modalUpdateDesc.innerText = tempDiv.innerText.trim();

        // Pre-fill composer
        const initialTweetText = generateTweetText(update);
        tweetText.value = initialTweetText;
        updateCharCount();

        // Show Modal
        tweetModal.classList.remove('hidden');
        tweetText.focus();
    }

    // Modal Control: Close Tweet Modal
    function closeTweetModal() {
        tweetModal.classList.add('hidden');
        selectedUpdate = null;
    }

    // Generate Tweet content formatted nicely
    function generateTweetText(update) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = update.content;
        let plainText = tempDiv.innerText.trim();
        
        // Clean double spacing
        plainText = plainText.replace(/\s+/g, ' ');

        const dateStr = update.date;
        const prefix = `BigQuery ${update.type} (${dateStr}): `;
        const hashtags = ` #BigQuery #GoogleCloud`;
        const link = `\nRead more: ${update.link}`;
        
        // Twitter URL length wraps to 23 chars
        const urlLengthInTweet = 23;
        const linkEquivalentLength = 12 + urlLengthInTweet;
        const reservedLength = prefix.length + hashtags.length + linkEquivalentLength;
        const maxDescLength = 280 - reservedLength - 5; // 5 char buffer

        let truncatedDesc = plainText;
        if (plainText.length > maxDescLength) {
            truncatedDesc = plainText.substring(0, maxDescLength) + '...';
        }

        return `${prefix}${truncatedDesc}${link}${hashtags}`;
    }

    // Character counter logic
    function updateCharCount() {
        const text = tweetText.value;
        
        // Count length mimicking Twitter's URL count logic
        // Any link in the text is treated as 23 characters.
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let charCount = text.length;
        
        const urls = text.match(urlRegex);
        if (urls) {
            urls.forEach(url => {
                charCount = charCount - url.length + 23;
            });
        }

        charCounter.innerText = `${charCount} / 280`;

        if (charCount > 280) {
            charCounter.style.color = 'var(--deprecation-color)';
            charWarning.classList.remove('hidden');
            tweetSubmitBtn.disabled = true;
            tweetSubmitBtn.style.opacity = '0.5';
        } else {
            charCounter.style.color = 'var(--text-muted)';
            charWarning.classList.add('hidden');
            tweetSubmitBtn.disabled = false;
            tweetSubmitBtn.style.opacity = '1';
        }
    }

    // Submit Tweet (Opens Web Intent)
    function submitTweet() {
        if (!selectedUpdate) return;
        const text = tweetText.value;
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
        showToast('Opened X (Twitter) Composer!');
    }

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderFeed();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderFeed();
        });
    });

    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelModalBtn.addEventListener('click', closeTweetModal);
    tweetSubmitBtn.addEventListener('click', submitTweet);
    tweetText.addEventListener('input', updateCharCount);

    // Close modal on click outside content
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // ESC key closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
            closeTweetModal();
        }
    });

    // Initial Fetch
    fetchReleaseNotes(false);
});
