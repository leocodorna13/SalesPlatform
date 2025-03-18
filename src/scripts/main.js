// Efeito parallax para o hero
function initParallax() {
  const heroImage = document.querySelector('.hero-parallax');
  
  function handleParallax() {
    if (heroImage && heroImage instanceof HTMLElement) {
      const scrolled = window.scrollY;
      heroImage.style.transform = `scale(1.1) translateY(${scrolled * 0.1}px)`;
    }
  }
  
  window.addEventListener('scroll', handleParallax);
}

// Animações de entrada
function initAnimations() {
  // Animação para os cards de categoria
  const categoryCards = document.querySelectorAll('.category-card');
  categoryCards.forEach(card => {
    const delay = card.getAttribute('data-delay') || '0';
    setTimeout(() => {
      card.classList.add('is-visible');
    }, parseFloat(delay) * 1000);
  });
  
  // Animação para os elementos com animate-slide-up
  const animatedElements = document.querySelectorAll('.animate-slide-up');
  animatedElements.forEach(element => {
    const delay = element.getAttribute('data-delay') || '0';
    setTimeout(() => {
      element.classList.add('is-visible');
    }, parseFloat(delay) * 1000);
  });
  
  // Função para animar elementos quando entrarem na viewport
  function animateOnScroll() {
    const elements = document.querySelectorAll('.animate-on-scroll:not(.is-visible)');
    elements.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      const elementBottom = element.getBoundingClientRect().bottom;
      const isVisible = (elementTop < window.innerHeight) && (elementBottom > 0);
      
      if (isVisible) {
        element.classList.add('is-visible');
      }
    });
  }
  
  // Adicionar listener para scroll
  window.addEventListener('scroll', animateOnScroll);
}

// Gerenciar botão de pesquisa flutuante
function initSearchButton() {
  const searchFloatingButton = document.getElementById('searchFloatingButton');
  const searchModal = document.getElementById('searchModal');
  const closeSearchModal = document.getElementById('closeSearchModal');
  
  function handleSearchButtonVisibility() {
    const heroSection = document.querySelector('section');
    if (!heroSection || !searchFloatingButton) return;
    
    const heroBottom = heroSection.getBoundingClientRect().bottom;
    
    if (heroBottom <= 0) {
      // Mostrar botão flutuante quando rolar para baixo da hero section
      searchFloatingButton.classList.remove('hidden');
    } else {
      // Esconder botão flutuante quando estiver na hero section
      searchFloatingButton.classList.add('hidden');
    }
  }
  
  // Inicializar visibilidade do botão de pesquisa
  handleSearchButtonVisibility();
  
  // Adicionar listener para scroll
  window.addEventListener('scroll', handleSearchButtonVisibility);
  
  // Abrir modal de pesquisa ao clicar no botão flutuante
  if (searchFloatingButton) {
    searchFloatingButton.addEventListener('click', function() {
      if (searchModal) {
        searchModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Impedir rolagem
      }
    });
  }
  
  // Fechar modal de pesquisa
  if (closeSearchModal) {
    closeSearchModal.addEventListener('click', function() {
      if (searchModal) {
        searchModal.classList.add('hidden');
        document.body.style.overflow = ''; // Restaurar rolagem
      }
    });
  }
  
  // Fechar modal ao clicar fora
  if (searchModal) {
    searchModal.addEventListener('click', function(e) {
      if (e.target === searchModal) {
        searchModal.classList.add('hidden');
        document.body.style.overflow = ''; // Restaurar rolagem
      }
    });
  }
}

// Inicializar todos os componentes quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  initParallax();
  initAnimations();
  initSearchButton();
});
