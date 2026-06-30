// GLOBAL APP STATE
let allProducts = [];
let filteredProducts = [];
let favorites = new Set();

// Active Filter States
let searchTokens = [];
let activeCategories = new Set();
let activeBrands = new Set();
let maxPrice = 2500;
let minRating = 0;
let inStockOnly = false;
let sortBy = 'featured';
let currentPage = 1;
let itemsPerPage = 12;

// Dynamic statistics from dataset
let catalogMinPrice = 0;
let catalogMaxPrice = 2500;

// FAVORITES MANAGED VIA LOCAL STORAGE
if (localStorage.getItem('stellarcart_favorites')) {
    try {
        favorites = new Set(JSON.parse(localStorage.getItem('stellarcart_favorites')));
        updateFavoritesUI();
    } catch(e) {
        console.error("Error parsing favorites", e);
    }
}

// DOM ELEMENTS REFERENCE
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const sortSelect = document.getElementById('sort-select');
const priceRange = document.getElementById('price-range');
const priceSliderVal = document.getElementById('price-slider-val');
const stockOnlyCheckbox = document.getElementById('stock-only');
const stockToggleBg = document.getElementById('stock-toggle-bg');
const stockToggleDot = document.getElementById('stock-toggle-dot');
const brandSearchInput = document.getElementById('brand-search');

const categoryFilterList = document.getElementById('category-filter-list');
const brandFilterList = document.getElementById('brand-filter-list');
const searchTokensContainer = document.getElementById('search-tokens-container');

const productGrid = document.getElementById('product-grid');
const emptyState = document.getElementById('empty-state');
const resultsCountLabel = document.getElementById('results-count');
const totalCountLabel = document.getElementById('total-count');
const paginationShowing = document.getElementById('pagination-showing');
const paginationNav = document.getElementById('pagination-nav');

const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
const mobileFilterChevron = document.getElementById('mobile-filter-chevron');
const filterPanel = document.getElementById('filter-panel');
const resetFiltersBtn = document.getElementById('reset-filters');

// INITIAL APPLICATION LOAD
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await fetchProducts();
});

// 1. FETCH PRODUCTS DATA
async function fetchProducts() {
    try {
        const response = await fetch('product.json');
        if (!response.ok) throw new Error('Network response was not OK');
        allProducts = await response.json();
        
        // Initialize the app with products
        initApp();
    } catch (error) {
        console.error('Error loading products:', error);
        productGrid.innerHTML = `
            <div class="col-span-full bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center">
                <i class="fa-solid fa-circle-exclamation text-2xl mb-2"></i>
                <h4 class="font-bold">Error loading product catalog</h4>
                <p class="text-sm mt-1">Please ensure product.json exists in the directory and is accessible.</p>
            </div>
        `;
    }
}

// 2. INITIALIZE APPLICATION PARAMETERS
function initApp() {
    filteredProducts = [...allProducts];

    // Set global totals
    document.getElementById('total-count-badge').textContent = formatNumber(allProducts.length);
    totalCountLabel.textContent = formatNumber(allProducts.length);
    document.getElementById('stat-products').textContent = formatNumber(allProducts.length);

    // Compute metrics and build sidebars
    computeCatalogMetrics();
    buildCategoryFilters();
    buildBrandFilters();

    // Check URL parameters for starting search
    parseURLParams();

    // Run initial filter and render
    applyFilters();
}

// Compute metrics like min/max price, count unique category/brand
function computeCatalogMetrics() {
    let minP = Infinity;
    let maxP = -Infinity;
    let inStockCount = 0;
    let ratingSum = 0;

    allProducts.forEach(p => {
        if (p.price < minP) minP = p.price;
        if (p.price > maxP) maxP = p.price;
        if (p.inStock) inStockCount++;
        ratingSum += p.rating || 0;
    });

    catalogMinPrice = Math.floor(minP);
    catalogMaxPrice = Math.ceil(maxP);
    
    // Set dynamic price slider limits
    priceRange.min = catalogMinPrice;
    priceRange.max = catalogMaxPrice;
    priceRange.value = catalogMaxPrice;
    maxPrice = catalogMaxPrice;

    document.getElementById('price-min-label').textContent = formatCurrency(catalogMinPrice);
    document.getElementById('price-max-label').textContent = formatCurrency(catalogMaxPrice);
    priceSliderVal.textContent = formatCurrency(catalogMaxPrice);

    // Set dynamic header statistics
    document.getElementById('stat-instock').textContent = formatNumber(inStockCount) + '+';
    const avgRating = (ratingSum / allProducts.length).toFixed(1);
    document.getElementById('stat-avg-rating').textContent = avgRating + '★';
}

// Build dynamic checkboxes for categories
function buildCategoryFilters() {
    // Count category distributions
    const catCounts = {};
    allProducts.forEach(p => {
        if (p.category) {
            catCounts[p.category] = (catCounts[p.category] || 0) + 1;
        }
    });

    // Sort category names alphabetically
    const sortedCats = Object.keys(catCounts).sort();
    document.getElementById('category-count-badge').textContent = sortedCats.length;

    categoryFilterList.innerHTML = sortedCats.map(cat => `
        <label class="flex items-center justify-between group cursor-pointer text-slate-600 hover:text-slate-900 transition-colors">
            <div class="flex items-center gap-2.5">
                <input type="checkbox" value="${cat}" class="category-checkbox h-4.5 w-4.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer">
                <span class="text-sm font-medium">${cat}</span>
            </div>
            <span class="text-[11px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">${catCounts[cat]}</span>
        </label>
    `).join('');

    // Bind events to new checkboxes
    document.querySelectorAll('.category-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) {
                activeCategories.add(cb.value);
            } else {
                activeCategories.delete(cb.value);
            }
            currentPage = 1;
            applyFilters();
        });
    });
}

// Build dynamic checkboxes for brands
function buildBrandFilters() {
    // Count brand distributions
    const brandCounts = {};
    allProducts.forEach(p => {
        if (p.brand) {
            brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
        }
    });

    // Sort brand names alphabetically
    const sortedBrands = Object.keys(brandCounts).sort();
    document.getElementById('brand-count-badge').textContent = sortedBrands.length;

    brandFilterList.innerHTML = sortedBrands.map(brand => `
        <label class="brand-item flex items-center justify-between group cursor-pointer text-slate-600 hover:text-slate-900 transition-colors" data-name="${brand.toLowerCase()}">
            <div class="flex items-center gap-2.5">
                <input type="checkbox" value="${brand}" class="brand-checkbox h-4.5 w-4.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer">
                <span class="text-sm font-medium">${brand}</span>
            </div>
            <span class="text-[11px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">${brandCounts[brand]}</span>
        </label>
    `).join('');

    // Bind events to new checkboxes
    document.querySelectorAll('.brand-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) {
                activeBrands.add(cb.value);
            } else {
                activeBrands.delete(cb.value);
            }
            currentPage = 1;
            applyFilters();
        });
    });
}

// 3. LISTEN FOR SEARCH AND INTERACTIONS
function setupEventListeners() {
    
    // Dynamic multi-keyword input search with instant matching
    searchInput.addEventListener('input', () => {
        const val = searchInput.value;
        if (val.trim().length > 0) {
            searchClear.classList.remove('scale-0');
            searchClear.classList.add('scale-100');
        } else {
            searchClear.classList.add('scale-0');
            searchClear.classList.remove('scale-100');
        }

        // Tokenize and filter
        searchTokens = val.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
        
        // Show dynamic search tokens
        renderSearchTokens();
        
        currentPage = 1;
        applyFilters();
    });

    // Clear search button clicked
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.classList.add('scale-0');
        searchClear.classList.remove('scale-100');
        searchTokens = [];
        renderSearchTokens();
        currentPage = 1;
        applyFilters();
        searchInput.focus();
    });

    // Sorting selection changed
    sortSelect.addEventListener('change', () => {
        sortBy = sortSelect.value;
        applyFilters();
    });

    // Max price range slider drag
    priceRange.addEventListener('input', () => {
        maxPrice = parseFloat(priceRange.value);
        priceSliderVal.textContent = formatCurrency(maxPrice);
        currentPage = 1;
        applyFilters();
    });

    // Stock Only custom toggle switch
    stockOnlyCheckbox.addEventListener('change', () => {
        inStockOnly = stockOnlyCheckbox.checked;
        if (inStockOnly) {
            stockToggleBg.classList.replace('bg-slate-200', 'bg-primary-600');
            stockToggleDot.classList.add('translate-x-4');
        } else {
            stockToggleBg.classList.replace('bg-primary-600', 'bg-slate-200');
            stockToggleDot.classList.remove('translate-x-4');
        }
        currentPage = 1;
        applyFilters();
    });

    // Brand search filter sub-input
    brandSearchInput.addEventListener('input', () => {
        const query = brandSearchInput.value.toLowerCase().trim();
        const brandItems = document.querySelectorAll('.brand-item');
        brandItems.forEach(item => {
            const name = item.dataset.name;
            if (name.includes(query)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    });

    // Minimum rating pills filter
    document.querySelectorAll('.rating-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rating-filter-btn').forEach(b => {
                b.classList.remove('bg-primary-600', 'border-primary-600', 'text-white');
                b.classList.add('border-slate-200', 'text-slate-600');
            });
            
            btn.classList.add('bg-primary-600', 'border-primary-600', 'text-white');
            btn.classList.remove('border-slate-200', 'text-slate-600');
            
            minRating = parseFloat(btn.dataset.rating);
            currentPage = 1;
            applyFilters();
        });
    });

    // Items per page button clicks
    document.querySelectorAll('.items-per-page-btn').forEach(btn => {
        // Initialize default
        if (parseInt(btn.dataset.value) === itemsPerPage) {
            btn.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
        }

        btn.addEventListener('click', () => {
            document.querySelectorAll('.items-per-page-btn').forEach(b => {
                b.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
            });
            btn.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
            itemsPerPage = parseInt(btn.dataset.value);
            currentPage = 1;
            applyFilters();
        });
    });

    // Reset filters click
    resetFiltersBtn.addEventListener('click', resetAllFilters);

    // Mobile filters panel toggle accordion
    mobileFilterToggle.addEventListener('click', () => {
        filterPanel.classList.toggle('hidden');
        mobileFilterChevron.classList.toggle('rotate-180');
    });
}

// Render search keyword tokens under search input
function renderSearchTokens() {
    if (searchTokens.length > 0) {
        searchTokensContainer.classList.remove('hidden');
        searchTokensContainer.innerHTML = `
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Active Terms:</span>
            ${searchTokens.map((token, i) => `
                <span class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200 shadow-sm">
                    "${token}"
                    <button onclick="removeSearchToken(${i})" class="h-4 w-4 rounded hover:bg-primary-200/50 flex items-center justify-center text-primary-500">
                        <i class="fa-solid fa-xmark text-[9px]"></i>
                    </button>
                </span>
            `).join('')}
        `;
    } else {
        searchTokensContainer.classList.add('hidden');
        searchTokensContainer.innerHTML = '';
    }
}

function removeSearchToken(index) {
    searchTokens.splice(index, 1);
    searchInput.value = searchTokens.join(' ');
    if (searchTokens.length === 0) {
        searchInput.value = '';
        searchClear.classList.add('scale-0');
    }
    renderSearchTokens();
    currentPage = 1;
    applyFilters();
    searchInput.focus();
}

// Collapse filter list categories
function toggleFilterCollapse(elementId, chevronId) {
    const el = document.getElementById(elementId);
    const chevron = document.getElementById(chevronId);
    el.classList.toggle('hidden');
    chevron.classList.toggle('rotate-180');
}

// 4. FILTERING & SORTING LOGIC
function applyFilters() {
    // STEP A: Multi-token dynamic search filter (AND condition)
    if (searchTokens.length > 0) {
        filteredProducts = allProducts.filter(p => {
            return searchTokens.every(token => {
                const titleMatch = p.title && p.title.toLowerCase().includes(token);
                const brandMatch = p.brand && p.brand.toLowerCase().includes(token);
                const categoryMatch = p.category && p.category.toLowerCase().includes(token);
                const descMatch = p.description && p.description.toLowerCase().includes(token);
                const tagsMatch = p.tags && p.tags.some(t => t.toLowerCase().includes(token));
                return titleMatch || brandMatch || categoryMatch || descMatch || tagsMatch;
            });
        });
    } else {
        filteredProducts = [...allProducts];
    }

    // STEP B: Category checkboxes filter
    if (activeCategories.size > 0) {
        filteredProducts = filteredProducts.filter(p => activeCategories.has(p.category));
    }

    // STEP C: Brand checkboxes filter
    if (activeBrands.size > 0) {
        filteredProducts = filteredProducts.filter(p => activeBrands.has(p.brand));
    }

    // STEP D: Price filter
    filteredProducts = filteredProducts.filter(p => p.price <= maxPrice);

    // STEP E: Rating filter
    if (minRating > 0) {
        filteredProducts = filteredProducts.filter(p => p.rating >= minRating);
    }

    // STEP F: In stock filter
    if (inStockOnly) {
        filteredProducts = filteredProducts.filter(p => p.inStock);
    }

    // Update matched counts badge
    resultsCountLabel.textContent = formatNumber(filteredProducts.length);

    // STEP G: Sort products
    sortProducts();

    // STEP H: Render products
    renderProductsGrid();
    renderPagination();
    updateURLParams();
}

// Sorters
function sortProducts() {
    switch (sortBy) {
        case 'price-asc':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-desc':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'rating-desc':
            filteredProducts.sort((a, b) => b.rating - a.rating);
            break;
        case 'reviews-desc':
            filteredProducts.sort((a, b) => b.reviews - a.reviews);
            break;
        case 'released-desc':
            filteredProducts.sort((a, b) => new Date(b.releasedAt) - new Date(a.releasedAt));
            break;
        default:
            // default Sort: Featured/ID
            filteredProducts.sort((a, b) => a.id - b.id);
    }
}

// 5. RENDER THE PRODUCT CARDS GRID
function renderProductsGrid() {
    if (filteredProducts.length === 0) {
        productGrid.innerHTML = '';
        productGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    productGrid.classList.remove('hidden');

    // Paginated slice
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredProducts.length);
    const pageSlice = filteredProducts.slice(startIndex, endIndex);

    productGrid.innerHTML = pageSlice.map(product => {
        const isFavorite = favorites.has(product.id);
        const favClass = isFavorite ? 'text-red-500 scale-110' : 'text-slate-400 hover:text-red-500';
        
        return `
            <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                
                <!-- Top actions (Favorite button) -->
                <button onclick="toggleFavorite(${product.id}, event)" class="absolute top-6 right-6 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-sm text-slate-400 hover:scale-110 active:scale-95 transition-all" title="Add to favorites">
                    <i class="fa-solid fa-heart ${favClass} transition-colors" id="fav-icon-${product.id}"></i>
                </button>

                <div>
                    <!-- Aspect ratio card image box -->
                    <div class="w-full aspect-[4/3] bg-slate-50 rounded-xl flex items-center justify-center p-4 relative overflow-hidden mb-4">
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        <img src="${product.image && product.image !== 'null' ? product.image : 'https://picsum.photos/seed/stellarcart/360/480'}" alt="${product.title}" loading="lazy" class="max-h-full max-w-full object-contain rounded-lg drop-shadow-sm group-hover:scale-105 duration-300">
                        
                        <!-- Hover Quick View overlays -->
                        <div class="absolute inset-0 bg-slate-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="openQuickView(${product.id})" class="bg-white/95 backdrop-blur text-slate-900 font-bold text-xs px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:bg-white hover:scale-105">
                                <i class="fa-solid fa-eye text-primary-500"></i> Quick View
                            </button>
                        </div>
                    </div>

                    <!-- Metadata (Category and Release Date) -->
                    <div class="flex justify-between items-center mb-1.5">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${product.category || 'Curated'}</span>
                        <span class="text-[10px] text-slate-400 font-medium">${formatDateYear(product.releasedAt)}</span>
                    </div>

                    <!-- Product Title -->
                    <h3 class="font-extrabold text-slate-900 leading-snug text-sm sm:text-base mb-1 hover:text-primary-600 cursor-pointer group-hover:text-primary-600 transition-colors" onclick="openQuickView(${product.id})">
                        ${product.title}
                    </h3>

                    <!-- Brand name -->
                    <p class="text-xs text-primary-600 font-bold hover:underline mb-2 cursor-pointer flex items-center gap-1">
                        <i class="fa-solid fa-building text-[10px] opacity-70"></i> ${product.brand}
                    </p>

                    <!-- Ratings and reviews stars -->
                    <div class="flex items-center gap-1.5 mb-4 text-xs">
                        <div class="flex text-amber-400">
                            ${renderStarsHTML(product.rating)}
                        </div>
                        <span class="font-bold text-slate-700">${product.rating || '0.0'}</span>
                        <span class="text-slate-300 text-[10px]">(${formatNumber(product.reviews)})</span>
                    </div>
                </div>

                <!-- Price and Stock Details -->
                <div class="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                    <div>
                        <span class="text-xs text-slate-400 block font-medium">Price</span>
                        <span class="text-lg font-black text-slate-900">${formatCurrency(product.price)}</span>
                    </div>

                    <!-- Bottom quick CTAs -->
                    <div class="flex items-center gap-2">
                        ${product.inStock ? `
                            <button onclick="showToast('Item added to cart!')" class="h-9 w-9 bg-primary-50 hover:bg-primary-600 text-primary-600 hover:text-white rounded-lg flex items-center justify-center shadow-sm transition-all active:scale-95" title="Quick Add to Cart">
                                <i class="fa-solid fa-bag-shopping text-sm"></i>
                            </button>
                        ` : `
                            <span class="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 border border-red-100 px-2 py-1.5 rounded-lg flex items-center gap-1">
                                <i class="fa-solid fa-circle-minus text-[8px]"></i> Out
                            </span>
                        `}
                        <a href="product.html?id=${product.id}" target="_blank" class="h-9 w-9 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg flex items-center justify-center transition-all active:scale-95" title="Dedicated Page">
                            <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                        </a>
                    </div>
                </div>

            </div>
        `;
    }).join('');
}

// 6. RENDER PAGINATION NAVIGATION BAR
function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    
    if (totalPages <= 1) {
        paginationShowing.parentNode.classList.add('hidden');
        return;
    }
    paginationShowing.parentNode.classList.remove('hidden');

    const startIdx = (currentPage - 1) * itemsPerPage + 1;
    const endIdx = Math.min(startIdx + itemsPerPage - 1, filteredProducts.length);
    
    paginationShowing.innerHTML = `Showing <span class="font-semibold text-slate-800">${formatNumber(startIdx)}</span> to <span class="font-semibold text-slate-800">${formatNumber(endIdx)}</span> of <span class="font-semibold text-slate-800">${formatNumber(filteredProducts.length)}</span> items`;

    let pages = [];
    
    // Core window of visible pages to handle 100+ pages nicely
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    if (endPage - startPage < maxPageButtons - 1) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    // Prev Button
    pages.push(`
        <button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm" aria-label="Previous page">
            <i class="fa-solid fa-angle-left text-xs"></i>
        </button>
    `);

    // First page marker
    if (startPage > 1) {
        pages.push(`<button onclick="goToPage(1)" class="h-9 w-9 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">1</button>`);
        if (startPage > 2) {
            pages.push(`<span class="px-2 text-slate-400 font-bold">...</span>`);
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        const btnClass = isActive 
            ? 'bg-primary-600 border-primary-600 text-white shadow-md' 
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm';
        
        pages.push(`
            <button onclick="goToPage(${i})" class="h-9 w-9 rounded-lg border text-sm font-bold ${btnClass} transition-all">
                ${i}
            </button>
        `);
    }

    // Last page marker
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pages.push(`<span class="px-2 text-slate-400 font-bold">...</span>`);
        }
        pages.push(`<button onclick="goToPage(${totalPages})" class="h-9 w-9 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">${totalPages}</button>`);
    }

    // Next Button
    pages.push(`
        <button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-sm" aria-label="Next page">
            <i class="fa-solid fa-angle-right text-xs"></i>
        </button>
    `);

    paginationNav.innerHTML = pages.join('');
}

function goToPage(p) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    applyFilters();
    // Scroll to the top of results list
    searchInput.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 7. FAVORITES TOGGLING
function toggleFavorite(id, event) {
    if (event) event.stopPropagation();
    
    if (favorites.has(id)) {
        favorites.delete(id);
        showToast("Removed from favorites");
    } else {
        favorites.add(id);
        showToast("Added to favorites!", "heart");
    }
    
    // Sync with localstorage
    localStorage.setItem('stellarcart_favorites', JSON.stringify(Array.from(favorites)));
    updateFavoritesUI();
    
    // Re-render current visible cards
    const icon = document.getElementById(`fav-icon-${id}`);
    if (icon) {
        if (favorites.has(id)) {
            icon.className = 'fa-solid fa-heart text-red-500 scale-110 transition-colors';
        } else {
            icon.className = 'fa-solid fa-heart text-slate-400 hover:text-red-500 transition-colors';
        }
    }
    
    // If modal is open, sync modal favorite button
    const modalFavBtn = document.getElementById('modal-favorite-btn');
    if (modalFavBtn && parseInt(modalFavBtn.dataset.productId) === id) {
        updateModalFavoriteState(id);
    }
}

function updateFavoritesUI() {
    const countBadge = document.getElementById('favorites-count');
    const favBtn = document.getElementById('favorites-btn');
    
    countBadge.textContent = favorites.size;
    if (favorites.size > 0) {
        countBadge.classList.replace('scale-0', 'scale-100');
        favBtn.classList.replace('text-slate-400', 'text-red-500');
    } else {
        countBadge.classList.replace('scale-100', 'scale-0');
        favBtn.classList.replace('text-red-500', 'text-slate-400');
    }
}

// 8. QUICK VIEW MODAL CONTROLS
function openQuickView(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('modal-image').src = product.image && product.image !== 'null' ? product.image : 'https://picsum.photos/seed/stellarcart/360/480';
    document.getElementById('modal-image').alt = product.title;
    document.getElementById('modal-category').textContent = product.category;
    document.getElementById('modal-title').textContent = product.title;
    document.getElementById('modal-brand').textContent = product.brand;
    document.getElementById('modal-released').innerHTML = `<i class="fa-solid fa-calendar-days opacity-60 mr-1"></i> Released: ${formatDateFull(product.releasedAt)}`;
    document.getElementById('modal-rating').textContent = product.rating;
    document.getElementById('modal-reviews').textContent = `${formatNumber(product.reviews)} reviews`;
    document.getElementById('modal-description').textContent = product.description || `High quality premium ${product.title} from ${product.brand}. Crafted with durability and utility in mind.`;
    document.getElementById('modal-price').textContent = formatCurrency(product.price);
    
    // Set details link
    document.getElementById('modal-details-link').href = `product.html?id=${id}`;

    // Rating Stars
    document.getElementById('modal-rating-stars').innerHTML = renderStarsHTML(product.rating);

    // Tags
    const tagsHTML = product.tags && product.tags.length > 0 
        ? product.tags.map(t => `<span class="px-2 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded-lg border border-slate-200">#${t}</span>`).join('')
        : `<span class="text-xs text-slate-400">No tags listed</span>`;
    document.getElementById('modal-tags').innerHTML = tagsHTML;

    // Stock badge status
    const stockBadge = document.getElementById('modal-stock-badge');
    const stockText = document.getElementById('modal-stock-text');
    if (product.inStock) {
        stockBadge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-sm bg-emerald-50 text-emerald-700 border border-emerald-100';
        stockText.textContent = 'In Stock - Ready to Ship';
    } else {
        stockBadge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-sm bg-red-50 text-red-700 border border-red-100';
        stockText.textContent = 'Out of Stock';
    }

    // Favorite btn binding
    const modalFavBtn = document.getElementById('modal-favorite-btn');
    modalFavBtn.dataset.productId = id;
    updateModalFavoriteState(id);
    modalFavBtn.onclick = (e) => toggleFavorite(id, e);

    // Open modal
    document.getElementById('quickview-modal').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function updateModalFavoriteState(id) {
    const modalFavBtn = document.getElementById('modal-favorite-btn');
    const isFavorite = favorites.has(id);
    if (isFavorite) {
        modalFavBtn.className = 'col-span-1 border border-red-200 bg-red-50 text-red-500 rounded-xl flex items-center justify-center transition-all active:scale-[0.98]';
    } else {
        modalFavBtn.className = 'col-span-1 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl flex items-center justify-center transition-all active:scale-[0.98]';
    }
}

function closeQuickView() {
    document.getElementById('quickview-modal').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

// 9. RE-SYNCHRONIZE AND CLEAR FILTERS
function resetAllFilters() {
    searchInput.value = '';
    searchClear.classList.add('scale-0');
    searchTokens = [];
    renderSearchTokens();
    
    // Clear checked inputs
    document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
    activeCategories.clear();

    document.querySelectorAll('.brand-checkbox').forEach(cb => cb.checked = false);
    activeBrands.clear();

    // Clear sub brand query
    brandSearchInput.value = '';
    document.querySelectorAll('.brand-item').forEach(item => item.classList.remove('hidden'));

    // Price slider reset
    priceRange.value = catalogMaxPrice;
    maxPrice = catalogMaxPrice;
    priceSliderVal.textContent = formatCurrency(catalogMaxPrice);

    // Rating Filter reset
    document.querySelectorAll('.rating-filter-btn').forEach(btn => {
        if (btn.dataset.rating === "0") {
            btn.classList.add('bg-primary-600', 'border-primary-600', 'text-white');
            btn.classList.remove('border-slate-200', 'text-slate-600');
        } else {
            btn.classList.remove('bg-primary-600', 'border-primary-600', 'text-white');
            btn.classList.add('border-slate-200', 'text-slate-600');
        }
    });
    minRating = 0;

    // Stock Toggle reset
    stockOnlyCheckbox.checked = false;
    inStockOnly = false;
    stockToggleBg.classList.replace('bg-primary-600', 'bg-slate-200');
    stockToggleDot.classList.remove('translate-x-4');

    // Sorting reset
    sortSelect.value = 'featured';
    sortBy = 'featured';

    currentPage = 1;
    applyFilters();
    showToast("All filters cleared");
}

// 10. URL SYNCING AND STATE PRESERVATION (Extremely Premium Touch)
function updateURLParams() {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set('q', searchInput.value.trim());
    if (activeCategories.size > 0) params.set('categories', Array.from(activeCategories).join(','));
    if (activeBrands.size > 0) params.set('brands', Array.from(activeBrands).join(','));
    if (maxPrice < catalogMaxPrice) params.set('maxPrice', maxPrice);
    if (minRating > 0) params.set('minRating', minRating);
    if (inStockOnly) params.set('inStock', 'true');
    if (sortBy !== 'featured') params.set('sortBy', sortBy);
    if (currentPage > 1) params.set('page', currentPage);

    const path = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({ path }, '', path);
}

function parseURLParams() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('q')) {
        const query = params.get('q');
        searchInput.value = query;
        searchTokens = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
        searchClear.classList.remove('scale-0');
        renderSearchTokens();
    }

    if (params.has('categories')) {
        const cats = params.get('categories').split(',');
        cats.forEach(cat => activeCategories.add(cat));
        
        // Set checkbox status in HTML once loaded
        setTimeout(() => {
            document.querySelectorAll('.category-checkbox').forEach(cb => {
                if (activeCategories.has(cb.value)) cb.checked = true;
            });
        }, 50);
    }

    if (params.has('brands')) {
        const brands = params.get('brands').split(',');
        brands.forEach(brand => activeBrands.add(brand));

        setTimeout(() => {
            document.querySelectorAll('.brand-checkbox').forEach(cb => {
                if (activeBrands.has(cb.value)) cb.checked = true;
            });
        }, 50);
    }

    if (params.has('maxPrice')) {
        maxPrice = parseFloat(params.get('maxPrice'));
        setTimeout(() => {
            priceRange.value = maxPrice;
            priceSliderVal.textContent = formatCurrency(maxPrice);
        }, 50);
    }

    if (params.has('minRating')) {
        minRating = parseFloat(params.get('minRating'));
        setTimeout(() => {
            document.querySelectorAll('.rating-filter-btn').forEach(btn => {
                if (parseFloat(btn.dataset.rating) === minRating) {
                    btn.click();
                }
            });
        }, 50);
    }

    if (params.has('inStock')) {
        inStockOnly = true;
        setTimeout(() => {
            stockOnlyCheckbox.checked = true;
            stockToggleBg.classList.replace('bg-slate-200', 'bg-primary-600');
            stockToggleDot.classList.add('translate-x-4');
        }, 50);
    }

    if (params.has('sortBy')) {
        sortBy = params.get('sortBy');
        sortSelect.value = sortBy;
    }

    if (params.has('page')) {
        currentPage = parseInt(params.get('page')) || 1;
    }
}

// UTILITY FORMATTERS
function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

// Solid, half, and empty stars builder helper
function renderStarsHTML(rating) {
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating % 1) >= 0.4;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHTML = '';
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fa-solid fa-star"></i>';
    }
    if (hasHalfStar) {
        starsHTML += '<i class="fa-solid fa-star-half-stroke"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<i class="fa-regular fa-star opacity-40"></i>';
    }
    return starsHTML;
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

function formatDateYear(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).getFullYear();
}

function formatDateFull(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Dynamic visual notification toasts
function showToast(message, icon = 'circle-info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-800 text-xs font-bold transition-all duration-300 transform translate-y-5 opacity-0';
    
    let iconClass = 'fa-solid fa-circle-info text-primary-400';
    if (icon === 'heart') iconClass = 'fa-solid fa-heart text-red-400';
    
    toast.innerHTML = `
        <i class="${iconClass}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.replace('translate-y-5', 'translate-y-0');
        toast.classList.replace('opacity-0', 'opacity-100');
    }, 10);
    
    // Remove toast after delay
    setTimeout(() => {
        toast.classList.replace('translate-y-0', 'translate-y-5');
        toast.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}
