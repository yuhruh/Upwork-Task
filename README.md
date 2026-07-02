# StellarCart 🌌

StellarCart is a modern, high-performance, single-page-feel e-commerce product discovery and detailed product catalog web application. It is engineered with **Vanilla ES6+ JavaScript** and styled using **Tailwind CSS**. 

---

## 🚀 Live Features Built

### 1. Dynamic Product Discovery & Multifaceted Filtering (`index.html`)
The main browse interface provides an exceptionally responsive and powerful filtering engine:
* **Tokenized Search (AND logic)**: The search bar tokenizes user input into separate keywords. To match, a product must contain *every* keyword across its title, brand, category, description, or tags (e.g., searching ` rAtTan   miNiMal ` will perform a case-insensitive match for both words).
* **Dynamic Category & Brand Checkboxes**: Programmatically generated sidebar filters that compute live, exact product counts matching each attribute.
* **Inline Brand Search**: A localized text search inside the brand selector list lets customers quickly find specific brands in a long list.
* **Smart Slider Range Filters**: Features a dual-limit range input that computes minimum and maximum pricing limits dynamically based on the active JSON dataset.
* **Minimum Rating Selector**: Instantly filter products with star-based ratings (e.g., 4★ & above).
* **Availability Toggle**: A sleek stock status filter to show "In Stock Only" items.
* **Comprehensive Sort Suite**: Sort products by price (low to high, high to low), average customer ratings, verified review counts, release date (newest first), or featured (default).
* **Robust Pagination**: Smooth state-driven pagination dynamically splitting product grids into clean pages (defaulting to 12 items per page) with full navigation.

### 2. URL State Synchronization (Bookmarkable Filters)
Every filter, query, sort option, and selection is serialized directly into the browser's URL search parameters (e.g., `?q=minimal&categories=Kitchen&maxPrice=1500&sortBy=rating-desc`). 
* On page load, the application parses the active URL parameters to restore the user's filtered state.
* This allows users to bookmark search queries or share exact filtered views with others.

### 3. Interactive Modal Quick View
Clicking on any product card in the main grid opens a high-fidelity modal quick view overlay. Users can read descriptions, check stock, inspect ratings, and interact with favorites/cart utilities instantly without leaving their browsing context or losing scroll position.

### 4. High-Fidelity Dedicated Product Details Page (`product.html`)
A standalone detail view for deep-linking single products:
* **Deep Linking**: Triggered dynamically via `?id=123` URL routing.
* **Dynamic Breadcrumbs & Specs**: Populates specific details, category-based tags, exact release dates, stock badges, and descriptions.
* **Dynamic Fallback Copywriter**: Includes an automated contextual description generator if the source product description in JSON is brief.
* **Share/Copy Deep Link**: A one-click utility that copies the direct, shareable browser link to the user's clipboard.
* **Recommendation / Related Products Engine**: An intelligent client-side matching script recommending 4 related products by prioritising category matches first, fallback brand matches second, and top-rated general items as a final fallback.

### 5. Persistent State & Toast Feedback
* **Favorites (Heart) & Shopping Bag (Cart)**: Interactive toggles and counters stored in `LocalStorage` to persist items across page reloads.
* **Toast Notification Engine**: Custom animated popover toasts that provide smooth visual confirmations for cart actions, link sharing, and placeholder alerts.

---

## 🛠️ Architectural Decisions & Why They Were Made

### 1. No Heavy Frameworks (Vanilla ES6+ JS)
* **Decision**: Built entirely with Vanilla JavaScript (using standard DOM APIs, ES6 modules, and async/await).
* **Why**: By bypassing frameworks like React, Angular, or Vue, the application avoids bundler overhead, transpilation delays, and heavy runtime JS weight. The resulting application loads near-instantly, performs layout calculations at peak frame rates, and demonstrates how standard DOM manipulation matches framework capability when built around a robust state architecture.

### 2. State-Driven Dynamic Rendering
* **Decision**: The entire application state is stored centrally in memory (`allProducts`, `filteredProducts`, `searchTokens`, and sets for active categories/brands) and updated via an unidirectional flow starting at `applyFilters()`.
* **Why**: Traditional jQuery-style DOM management leads to "spaghetti code" where filters clash. A structured, unidirectional flow ensures that updating *any* filter cascades cleanly: filtering the list, recalculating matched quantities, sorting, updating pagination, synchronizing the URL parameters, and finally rendering the precise subset.

### 3. Programmatic Metadata and Dynamic Sidebar Setup
* **Decision**: Sidebars, checkbox counts, and price ranges are not hardcoded in HTML. Instead, the application iterates over `product.json` on launch to calculate exact maximum and minimum prices, compile a unique set of categories and brands, and count how many products belong to each.
* **Why**: This ensures the codebase is highly scalable. If 1,000 new products are loaded into `product.json` with new categories and brands, the application will adapt instantly, generating new filters and setting correct boundaries without a single line of code change.

### 4. Clean Build & Design Separation with Tailwind CLI
* **Decision**: Compiled custom designs using the offline Tailwind CSS CLI utility (`npm run build`) with customized extended palettes and shadows.
* **Why**: Keeps CSS small and highly optimized. Instead of loading a bloated CSS framework, Tailwind CLI parses `index.html`, `product.html`, and JS components, compiling only the exact classes utilized. This guarantees an ultra-fast, lightweight stylesheet (usually < 20KB).

---

## 🚀 Getting Started

To run the StellarCart project locally:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Build CSS Style Sheets**:
   ```bash
   # Run a one-time optimized build
   npm run build

   # Watch and auto-compile classes during development
   npm run watch
   ```

3. **Launch Local Server**:
   ```bash
   npm start
   ```
   *The server will start, exposing the application at `http://localhost:3000`.*
