/**
 * Controller para a funcionalidade de busca em tempo real
 */
/**
 * @typedef {import('../types').Product} Product
 * @typedef {import('../types').Category} Category
 */
class SearchBarController {
  constructor(options = {}) {
    this.options = {
      productSelector: '.product-card',
      productGridSelector: '.product-grid',
      titleSelector: 'h3',
      categorySelector: '.badge',
      priceSelector: '.text-accent-600',
      ...options
    };
    
    this.searchInput = document.getElementById('searchInput');
    this.searchButton = document.getElementById('searchButton');
    this.categoryDropdownButton = document.getElementById('categoryDropdownButton');
    this.categoryDropdown = document.getElementById('categoryDropdown');
    this.categoryItems = document.querySelectorAll('.category-dropdown-item');
    this.activeFilters = document.getElementById('activeFilters');
    this.productGrid = document.querySelector(this.options.productGridSelector);
    
    this.selectedCategory = 'all';
    this.selectedCategoryName = 'Todos';
    this.searchTimeout = null;
    
    this.init();
  }
  
  init() {
    this.setupCategoryAttributes();
    this.setupEventListeners();
    this.checkUrlParams();
  }
  
  setupCategoryAttributes() {
    const products = document.querySelectorAll(this.options.productSelector);
    products.forEach(product => {
      const categoryBadge = product.querySelector(this.options.categorySelector);
      if (categoryBadge) {
        const categorySlug = categoryBadge.getAttribute('data-category');
        const categoryName = categoryBadge.getAttribute('data-name');
        product.setAttribute('data-category', categorySlug || '');
        product.setAttribute('data-category-name', categoryName || '');
      }
    });
  }
  
  setupEventListeners() {
    // Busca em tempo real ao digitar
    this.searchInput?.addEventListener('input', () => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.performLiveSearch();
      }, 300); // Debounce de 300ms
    });
    
    // Botão de busca (opcional, mantido para compatibilidade)
    this.searchButton?.addEventListener('click', () => {
      this.performLiveSearch();
    });
    
    // Toggle do dropdown de categorias
    this.categoryDropdownButton?.addEventListener('click', () => {
      this.toggleCategoryDropdown();
    });
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
      if (!this.categoryDropdownButton?.contains(e.target) && 
          !this.categoryDropdown?.contains(e.target)) {
        this.categoryDropdown?.classList.add('hidden');
      }
    });
    
    // Selecionar categoria do dropdown
    this.categoryItems.forEach(item => {
      item.addEventListener('click', () => {
        const category = item.getAttribute('data-category');
        const categoryName = item.getAttribute('data-name');
        
        if (category && categoryName) {
          this.updateSelectedCategory(category, categoryName);
        }
      });
    });
  }
  
  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const searchQuery = params.get('q');
    
    if (searchQuery) {
      this.searchInput.value = searchQuery;
      this.performLiveSearch();
    }
  }
  
  /**
   * Normaliza o texto removendo acentos e convertendo para minúsculas
   * @param {string} text 
   * @returns {string}
   */
  normalizeText(text) {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
  
  performLiveSearch() {
    const searchTerm = this.searchInput?.value.trim().toLowerCase() || '';
    const products = document.querySelectorAll(this.options.productSelector);
    let visibleCount = 0;
    
    products.forEach(product => {
      const title = this.normalizeText(product.querySelector(this.options.titleSelector)?.textContent || '');
      const category = product.getAttribute('data-category') || '';
      const categoryName = this.normalizeText(product.getAttribute('data-category-name') || '');
      const price = this.normalizeText(product.querySelector(this.options.priceSelector)?.textContent || '');
      
      const matchesCategory = this.selectedCategory === 'all' || category === this.selectedCategory;
      const matchesSearch = !searchTerm || 
                          title.includes(this.normalizeText(searchTerm)) || 
                          price.includes(this.normalizeText(searchTerm)) ||
                          categoryName.includes(this.normalizeText(searchTerm));
      
      if (matchesCategory && matchesSearch) {
        product.classList.remove('hidden');
        product.style.display = '';
        visibleCount++;
        
        // Adicionar animação de fade
        product.style.opacity = '0';
        requestAnimationFrame(() => {
          product.style.transition = 'opacity 0.3s ease-in-out';
          product.style.opacity = '1';
        });
      } else {
        product.classList.add('hidden');
        product.style.display = 'none';
      }
    });
    
    this.updateNoResultsMessage(visibleCount, searchTerm);
    this.updateResultsCount(visibleCount);
  }
  
  updateNoResultsMessage(visibleCount, searchTerm) {
    const noResultsElement = document.getElementById('noResults');
    if (noResultsElement) {
      if (visibleCount === 0) {
        noResultsElement.classList.remove('hidden');
        noResultsElement.innerHTML = `
          <div class="flex flex-col items-center">
            <i class="fas fa-search text-neutral-300 text-4xl mb-4"></i>
            <p class="text-lg text-neutral-600">
              ${searchTerm ? 
                `Nenhum produto encontrado para "${searchTerm}"` : 
                'Nenhum produto encontrado nesta categoria'}
            </p>
            ${searchTerm ? `
              <button id="clearSearch" class="mt-4 text-primary-600 hover:text-primary-800 font-medium">
                <i class="fas fa-times-circle mr-1"></i> Limpar busca
              </button>
            ` : ''}
          </div>
        `;
        
        // Adicionar evento para limpar busca
        document.getElementById('clearSearch')?.addEventListener('click', () => {
          if (this.searchInput) {
            this.searchInput.value = '';
            this.performLiveSearch();
          }
        });
      } else {
        noResultsElement.classList.add('hidden');
      }
    }
  }
  
  updateResultsCount(visibleCount) {
    const resultsCountElement = document.getElementById('resultsCount');
    if (resultsCountElement) {
      resultsCountElement.textContent = `${visibleCount} ${visibleCount === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
      resultsCountElement.classList.toggle('hidden', visibleCount === 0);
    }
  }
  
  updateActiveFilters() {
    if (!this.activeFilters) return;
    
    // Limpar filtros atuais
    this.activeFilters.innerHTML = '';
    
    let hasActiveFilters = false;
    
    // Adicionar chip de categoria se não for "Todos"
    if (this.selectedCategory !== 'all') {
      const categoryChip = document.createElement('div');
      categoryChip.className = 'inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full text-sm font-medium';
      categoryChip.innerHTML = `
        <i class="fas fa-tag text-xs"></i>
        <span>${this.selectedCategoryName}</span>
        <button class="ml-1 hover:text-primary-800" data-clear="category">
          <i class="fas fa-times text-xs"></i>
        </button>
      `;
      
      // Evento para limpar categoria
      categoryChip.querySelector('[data-clear="category"]')?.addEventListener('click', () => {
        this.selectedCategory = 'all';
        this.selectedCategoryName = 'Todos';
        if (this.categoryDropdownButton) {
          const buttonText = this.categoryDropdownButton.querySelector('span');
          if (buttonText) {
            buttonText.textContent = 'Categorias';
          }
        }
        this.updateActiveFilters();
        this.performLiveSearch();
      });
      
      this.activeFilters.appendChild(categoryChip);
      hasActiveFilters = true;
    }
    
    // Mostrar ou esconder container de filtros
    this.activeFilters.classList.toggle('hidden', !hasActiveFilters);
  }
  
  /**
   * Alterna a visibilidade do dropdown de categorias
   */
  toggleCategoryDropdown() {
    this.categoryDropdown?.classList.toggle('hidden');
  }

  /**
   * Atualiza a categoria selecionada
   * @param {string} category 
   * @param {string} name 
   */
  updateSelectedCategory(category, name) {
    this.selectedCategory = category;
    this.selectedCategoryName = name;
    if (this.categoryDropdownButton) {
      const buttonText = this.categoryDropdownButton.querySelector('span');
      if (buttonText) {
        buttonText.textContent = category === 'all' ? 'Categorias' : name;
      }
    }
    this.categoryDropdown?.classList.add('hidden');
    this.updateActiveFilters();
    this.performLiveSearch();
  }
}

export { SearchBarController };
