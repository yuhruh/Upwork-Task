// APP STATE
let allProducts = [];
let favorites = new Set();
let productId = null;
let currentProduct = null;

// FAVORITES SYNC VIA LOCAL STORAGE
if (localStorage.getItem('stellarcart_favorites')) {
    try {
        favorites = new Set(JSON.parse(localStorage.getItem('stellarcart_favorites')));
        updateFavoritesUI();
    } catch(e) {
        console.error("Error loading favorites", e);
    }
}

// Parse Product ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
productId = parseInt(urlParams.get('id'));

document.addEventListener('DOMContentLoaded', async () => {
    await fetchProducts();
});

// 1. FETCH PRODUCT DATA
async function fetchProducts() {
    try {
        const response = await fetch('product.json');
        if (!response.ok) throw new Error('Failed to load product.json');
        allProducts = await response.json();
        
        // Initialize the page
        renderDetailsPage();
    } catch(e) {
        console.error("Error loading details page", e);
        showError();
    }
}

// 2. RENDER THE CONTENT OR ERROR STATE
function renderDetailsPage() {
    document.getElementById('product-skeleton').classList.add('hidden');

    if (isNaN(productId)) {
        showError();
        return;
    }

    currentProduct = allProducts.find(p => p.id === productId);
    if (!currentProduct) {
        showError();
        return;
    }

    // Product found! Render detailed content
    document.getElementById('product-content').classList.remove('hidden');
    document.getElementById('related-section').classList.remove('hidden');
    
    // Set browser document title
    document.title = `${currentProduct.title} - StellarCart`;

    // Populate product specifics
    document.getElementById('p-image').src = getProductImage(currentProduct);
    document.getElementById('p-image').alt = currentProduct.title;
    
    document.getElementById('p-breadcrumbs-category').textContent = currentProduct.category;
    document.getElementById('p-title').textContent = currentProduct.title;
    document.getElementById('p-brand').textContent = currentProduct.brand;
    document.getElementById('p-brand-link').href = `index.html?brands=${encodeURIComponent(currentProduct.brand)}`;
    
    document.getElementById('p-rating-stars').innerHTML = renderStarsHTML(currentProduct.rating);
    document.getElementById('p-rating').textContent = currentProduct.rating;
    document.getElementById('p-reviews').textContent = `${formatNumber(currentProduct.reviews)} verified customer reviews`;
    
    document.getElementById('p-price').textContent = formatCurrency(currentProduct.price);
    document.getElementById('p-msrp').textContent = formatCurrency(currentProduct.price * 1.15); // Add theoretical savings

    // Description block
    document.getElementById('p-description').textContent = currentProduct.description || `Crafted with extreme attention to detail, this premium ${currentProduct.title} by ${currentProduct.brand} incorporates innovative materials and exquisite design. Ideal for both daily use and long-term durability. Built by trusted craftsmanship, it stands as an elite product in our ${currentProduct.category} collection.`;

    // Dates & Shipping
    document.getElementById('p-released').textContent = formatDateFull(currentProduct.releasedAt);

    // Tags badges
    const tagsHTML = currentProduct.tags && currentProduct.tags.length > 0
        ? currentProduct.tags.map(t => `<a href="index.html?q=${encodeURIComponent(t)}" class="px-2.5 py-1 text-xs font-bold bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg border border-primary-200 shadow-sm transition-colors">#${t}</a>`).join('')
        : `<span class="text-xs text-slate-400">No tags listed for this product</span>`;
    document.getElementById('p-tags').innerHTML = tagsHTML;

    // Stock badge status
    const stockBadge = document.getElementById('p-stock-badge');
    const stockText = document.getElementById('p-stock-text');
    if (currentProduct.inStock) {
        stockBadge.className = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-sm bg-emerald-50 text-emerald-700 border border-emerald-100';
        stockText.textContent = 'In Stock - Ready to Ship';
    } else {
        stockBadge.className = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-sm bg-red-50 text-red-700 border border-red-100';
        stockText.textContent = 'Temporarily Out of Stock';
    }

    // Sync favorite button state
    setupFavoriteButton();

    // Populate Related Products recommendation engine
    renderRelatedProducts();
}

// Show error UI
function showError() {
    document.getElementById('product-skeleton').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
}

// 3. RECOMMENDATIONS / RELATED PRODUCTS ENGINE
function renderRelatedProducts() {
    // Find products in the same category, excluding the current one
    let related = allProducts.filter(p => p.category === currentProduct.category && p.id !== currentProduct.id);
    
    // If we don't have enough products in the same category, grab from the same brand or tags
    if (related.length < 4) {
        const brandRelated = allProducts.filter(p => p.brand === currentProduct.brand && p.id !== currentProduct.id && !related.some(r => r.id === p.id));
        related = [...related, ...brandRelated];
    }
    
    if (related.length < 4) {
        // If still not enough, grab top rated items
        const randomRelated = allProducts.filter(p => p.id !== currentProduct.id && !related.some(r => r.id === p.id))
            .sort((a,b) => b.rating - a.rating);
        related = [...related, ...randomRelated];
    }

    // Slice down to top 4 related items
    const relatedToRender = related.slice(0, 4);

    const relatedGrid = document.getElementById('related-grid');
    relatedGrid.innerHTML = relatedToRender.map(product => {
        return `
            <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div>
                    <!-- Related Card Image -->
                    <div class="w-full aspect-square bg-slate-50 rounded-xl flex items-center justify-center p-4 relative overflow-hidden mb-3">
                        <img src="${getProductImage(product)}" alt="${product.title}" loading="lazy" class="max-h-full max-w-full object-contain rounded-lg drop-shadow-sm group-hover:scale-105 duration-300">
                        
                        <div class="absolute inset-0 bg-slate-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href="product.html?id=${product.id}" class="bg-white/95 backdrop-blur text-slate-900 font-bold text-xs px-3.5 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:scale-105">
                                <i class="fa-solid fa-eye text-primary-500"></i> View Specs
                            </a>
                        </div>
                    </div>

                    <!-- Related Metadata -->
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">${product.category || 'Curated'}</span>
                    
                    <!-- Related Title -->
                    <h3 class="font-extrabold text-slate-900 leading-snug text-sm mb-1 hover:text-primary-600 cursor-pointer group-hover:text-primary-600 transition-colors">
                        <a href="product.html?id=${product.id}">${product.title}</a>
                    </h3>

                    <!-- Related Brand -->
                    <p class="text-xs text-primary-600 font-bold mb-2">by ${product.brand}</p>

                    <!-- Ratings -->
                    <div class="flex items-center gap-1.5 text-xs text-amber-400">
                        <div class="flex">
                            ${renderStarsHTML(product.rating)}
                        </div>
                        <span class="font-bold text-slate-700">${product.rating || '0.0'}</span>
                    </div>
                </div>

                <!-- Related Price -->
                <div class="pt-3 border-t border-slate-100 flex items-center justify-between mt-4">
                    <span class="text-base font-black text-slate-900">${formatCurrency(product.price)}</span>
                    <span class="text-[10px] font-bold uppercase tracking-wider ${product.inStock ? 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded' : 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded'}">
                        ${product.inStock ? 'In Stock' : 'Sold Out'}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// 4. FAVORITES MECHANICS SYNC
function setupFavoriteButton() {
    const favBtn = document.getElementById('p-fav-btn');
    
    updateFavoriteButtonUI();

    favBtn.addEventListener('click', () => {
        const isFav = favorites.has(productId);
        if (isFav) {
            favorites.delete(productId);
            showToast("Removed from favorites");
        } else {
            favorites.add(productId);
            showToast("Added to favorites!", "heart");
        }

        // Sync with storage
        localStorage.setItem('stellarcart_favorites', JSON.stringify(Array.from(favorites)));
        
        updateFavoriteButtonUI();
        updateFavoritesUI();
    });
}

function updateFavoriteButtonUI() {
    const icon = document.getElementById('p-fav-icon');
    const btn = document.getElementById('p-fav-btn');
    const isFav = favorites.has(productId);

    if (isFav) {
        icon.className = 'fa-solid fa-heart text-red-500 scale-110';
        btn.className = 'absolute top-6 right-6 h-12 w-12 rounded-full bg-red-50 shadow-md border border-red-100 flex items-center justify-center transition-all text-xl';
    } else {
        icon.className = 'fa-solid fa-heart text-slate-400 hover:text-red-500';
        btn.className = 'absolute top-6 right-6 h-12 w-12 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center transition-all text-xl hover:scale-110 active:scale-95';
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

// 5. COPY LINK CLIPBOARD
function copyProductLink() {
    const dummy = document.createElement('input');
    const text = window.location.href;
    
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand('copy');
    document.body.removeChild(dummy);
    
    showToast("Product link copied to clipboard!");
}

// FORMATTERS
function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function getProductImage(product) {
    if (!product || !product.image || product.image === 'null') {
        return 'https://picsum.photos/seed/stellarcart/500/320';
    }
    
    let imgUrl = product.image;
    if (imgUrl.includes('cdn.catalog.example')) {
        imgUrl = `https://picsum.photos/seed/cat${product.id}/500/320`;
    }
    
    if (imgUrl.includes('picsum.photos')) {
        imgUrl = imgUrl.replace(/\/\d+\/\d+$/, '/500/320');
    }
    
    return imgUrl;
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

function formatDateFull(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

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

function showToast(message, icon = 'circle-info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-800 text-xs font-bold transition-all duration-300 transform translate-y-5 opacity-0 pointer-events-auto';
    
    let iconClass = 'fa-solid fa-circle-info text-primary-400';
    if (icon === 'heart') iconClass = 'fa-solid fa-heart text-red-400';
    
    toast.innerHTML = `
        <i class="${iconClass}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.replace('translate-y-5', 'translate-y-0');
        toast.classList.replace('opacity-0', 'opacity-100');
    }, 10);
    
    setTimeout(() => {
        toast.classList.replace('translate-y-0', 'translate-y-5');
        toast.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}
