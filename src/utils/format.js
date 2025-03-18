/**
 * Formata um valor numérico para moeda brasileira (BRL)
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado como moeda
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata uma data para o formato brasileiro
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} - Data formatada
 */
export function formatDate(date) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
}

/**
 * Trunca um texto para o tamanho especificado
 * @param {string} text - Texto a ser truncado
 * @param {number} maxLength - Tamanho máximo
 * @returns {string} - Texto truncado
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
}
