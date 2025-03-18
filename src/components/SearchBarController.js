/**
 * Controller para a funcionalidade de busca em tempo real
 * Este arquivo contém a lógica de busca que pode ser reutilizada em várias páginas
 */

export class SearchBarController {
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
    this.setupEventListeners();
    this.setupCategoryAttributes();
    this.checkUrlParams();
  }
  
  // Configurar atributos de categoria nos cards de produto
  setupCategoryAttributes() {
    document.querySelectorAll(this.options.productSelector).forEach(card => {
      const categoryElement = card.querySelector(this.options.categorySelector);
      if (categoryElement) {
        const categoryText = categoryElement.textContent?.trim();
        const categorySlug = this.normalizeText(categoryText || '')
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]+/g, '');
        card.setAttribute('data-category', categorySlug);
      }
    });
  }
  
  // Configurar todos os event listeners
  setupEventListeners() {
    // Evento de input no campo de busca
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.performLiveSearch());
      
      // Focar no input ao clicar na barra de pesquisa
      document.querySelector('.search-container')?.addEventListener('click', (e) => {
        if (!this.categoryDropdownButton?.contains(e.target) && !this.categoryDropdown?.contains(e.target)) {
          this.searchInput.focus();
        }
      });
    }
    
    // Evento de clique no botão de busca
    if (this.searchButton) {
      this.searchButton.addEventListener('click', () => this.performSearch());
    }
    
    // Evento de pressionar Enter no campo de busca
    if (this.searchInput) {
      this.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.performSearch();
        }
      });
    }
    
    // Toggle do dropdown de categorias
    if (this.categoryDropdownButton && this.categoryDropdown) {
      this.categoryDropdownButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.categoryDropdown.classList.toggle('hidden');
      });
      
      // Fechar dropdown ao clicar fora
      document.addEventListener('click', () => {
        if (this.categoryDropdown && !this.categoryDropdown.classList.contains('hidden')) {
          this.categoryDropdown.classList.add('hidden');
        }
      });
      
      // Evitar que o clique dentro do dropdown o feche
      this.categoryDropdown?.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
    
    // Selecionar categoria do dropdown
    this.categoryItems.forEach(item => {
      item.addEventListener('click', () => {
        const category = item.getAttribute('data-category');
        const categoryName = item.getAttribute('data-name');
        
        if (category && categoryName) {
          this.selectedCategory = category;
          this.selectedCategoryName = categoryName;
          
          // Atualizar texto do botão de categorias
          if (this.categoryDropdownButton) {
            const buttonText = this.categoryDropdownButton.querySelector('span');
            if (buttonText) {
              buttonText.textContent = category === 'all' ? 'Categorias' : categoryName;
            }
          }
          
          // Fechar dropdown
          if (this.categoryDropdown) {
            this.categoryDropdown.classList.add('hidden');
          }
          
          // Mostrar filtro ativo
          this.updateActiveFilters();
          
          // Atualizar resultados de pesquisa
          this.performLiveSearch();
        }
      });
    });
  }
  
  // Verificar parâmetros na URL para preencher a busca
  checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    
    if (queryParam && this.searchInput) {
      this.searchInput.value = queryParam;
      this.performLiveSearch();
    }
  }
  
  // Normalizar texto (remover acentos e caracteres especiais)
  normalizeText(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  
  // Realizar busca em tempo real diretamente na página
  performLiveSearch() {
    if (!this.searchInput) return;
    
    const searchTerm = this.searchInput.value.trim().toLowerCase();
    const normalizedQuery = this.normalizeText(searchTerm);
    
    // Limpar timeout anterior
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Definir timeout para evitar muitas buscas durante digitação
    this.searchTimeout = setTimeout(() => {
      const productCards = document.querySelectorAll(this.options.productSelector);
      let visibleCount = 0;
      
      // Filtrar produtos
      productCards.forEach(card => {
        const title = this.normalizeText(card.querySelector(this.options.titleSelector)?.textContent || '');
        const category = this.normalizeText(card.querySelector(this.options.categorySelector)?.textContent || '');
        const price = card.querySelector(this.options.priceSelector)?.textContent || '';
        
        // Verificar se o produto corresponde à pesquisa
        const matchesSearch = !searchTerm || title.includes(normalizedQuery) || category.includes(normalizedQuery) || price.includes(normalizedQuery);
        
        // Verificar se o produto corresponde à categoria selecionada
        const cardCategory = card.getAttribute('data-category');
        const matchesCategory = this.selectedCategory === 'all' || cardCategory === this.selectedCategory;
        
        // Mostrar ou esconder o produto
        if (matchesSearch && matchesCategory) {
          card.classList.remove('hidden');
          card.classList.add('animate-fade-in');
          visibleCount++;
        } else {
          card.classList.add('hidden');
          card.classList.remove('animate-fade-in');
        }
      });
      
      this.updateNoResultsMessage(visibleCount, searchTerm);
      this.updateResultsCount(visibleCount);
      
      // Adicionar efeito de animação ao filtrar
      if (this.productGrid) {
        this.productGrid.classList.add('animate-fade');
        setTimeout(() => {
          this.productGrid.classList.remove('animate-fade');
        }, 500);
      }
    }, 300); // 300ms de delay
  }
  
  // Atualizar mensagem de nenhum resultado
  updateNoResultsMessage(visibleCount, searchTerm) {
    const noResultsElement = document.getElementById('noResults');
    if (noResultsElement) {
      if (visibleCount === 0) {
        noResultsElement.classList.remove('hidden');
        noResultsElement.textContent = `Nenhum resultado encontrado para "${searchTerm}"`;
      } else {
        noResultsElement.classList.add('hidden');
      }
    } else if (visibleCount === 0 && this.productGrid) {
      // Criar elemento de "nenhum resultado" se não existir
      const noResults = document.createElement('div');
      noResults.id = 'noResults';
      noResults.className = 'w-full py-16 text-center text-neutral-500';
      noResults.innerHTML = `
        <div class="flex flex-col items-center">
          <i class="fas fa-search text-neutral-300 text-4xl mb-4"></i>
          <p class="text-lg">Nenhum resultado encontrado para "${searchTerm}"</p>
          <button id="clearSearch" class="mt-4 text-primary-600 hover:text-primary-800 font-medium">
            <i class="fas fa-times-circle mr-1"></i> Limpar busca
          </button>
        </div>
      `;
      this.productGrid.parentNode?.insertBefore(noResults, this.productGrid.nextSibling);
      
      // Adicionar evento para limpar busca
      document.getElementById('clearSearch')?.addEventListener('click', () => {
        if (this.searchInput) {
          this.searchInput.value = '';
          this.performLiveSearch();
        }
      });
    }
  }
  
  // Atualizar contador de resultados
  updateResultsCount(visibleCount) {
    const resultsCountElement = document.getElementById('resultsCount');
    if (resultsCountElement) {
      resultsCountElement.textContent = `${visibleCount} ${visibleCount === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
      resultsCountElement.classList.toggle('hidden', visibleCount === 0);
    } else if (visibleCount > 0 && this.productGrid) {
      const resultsCount = document.createElement('div');
      resultsCount.id = 'resultsCount';
      resultsCount.className = 'text-sm text-neutral-500 mb-4';
      resultsCount.textContent = `${visibleCount} ${visibleCount === 1 ? 'produto encontrado' : 'produtos encontrados'}`;
      this.productGrid.parentNode?.insertBefore(resultsCount, this.productGrid);
    }
  }
  
  // Realizar a busca e navegar
  performSearch() {
    const searchTerm = this.searchInput?.value.trim();
    
    if (searchTerm || this.selectedCategory !== 'all') {
      let url = '/categoria/todos';
      
      // Se tiver uma categoria específica, usa a URL da categoria
      if (this.selectedCategory !== 'all') {
        url = `/categoria/${this.selectedCategory}`;
      }
      
      // Adiciona o termo de busca como parâmetro se existir
      if (searchTerm) {
        url += `?q=${encodeURIComponent(searchTerm)}`;
      }
      
      window.location.href = url;
    }
  }
  
  // Atualizar chips de filtros ativos
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
        <button class="ml-1 text-primary-500 hover:text-primary-700" data-clear="category">
          <i class="fas fa-times-circle"></i>
        </button>
      `;
      this.activeFilters.appendChild(categoryChip);
      hasActiveFilters = true;
      
      // Evento para limpar categoria
      const clearButton = categoryChip.querySelector('[data-clear="category"]');
      if (clearButton) {
        clearButton.addEventListener('click', () => {
          this.selectedCategory = 'all';
          this.selectedCategoryName = 'Todos';
          
          // Atualizar texto do botão
          if (this.categoryDropdownButton) {
            const buttonText = this.categoryDropdownButton.querySelector('span');
            if (buttonText) {
              buttonText.textContent = 'Categorias';
            }
          }
          
          this.updateActiveFilters();
          this.performLiveSearch();
        });
      }
    }
    
    // Adicionar chip de termo de busca se existir
    if (this.searchInput && this.searchInput.value.trim()) {
      const searchChip = document.createElement('div');
      searchChip.className = 'inline-flex items-center gap-2 bg-accent-100 text-accent-700 px-3 py-1.5 rounded-full text-sm font-medium';
      searchChip.innerHTML = `
        <i class="fas fa-search text-xs"></i>
        <span>${this.searchInput.value.trim()}</span>
        <button class="ml-1 text-accent-500 hover:text-accent-700" data-clear="search">
          <i class="fas fa-times-circle"></i>
        </button>
      `;
      this.activeFilters.appendChild(searchChip);
      hasActiveFilters = true;
      
      // Evento para limpar termo de busca
      const clearButton = searchChip.querySelector('[data-clear="search"]');
      if (clearButton) {
        clearButton.addEventListener('click', () => {
          if (this.searchInput) {
            this.searchInput.value = '';
            this.updateActiveFilters();
            this.performLiveSearch();
          }
        });
      }
    }
    
    // Mostrar ou esconder a seção de filtros ativos
    if (hasActiveFilters) {
      this.activeFilters.classList.remove('hidden');
    } else {
      this.activeFilters.classList.add('hidden');
    }
  }
}

// Exportar a classe para uso em outros arquivos
export default SearchBarController;
