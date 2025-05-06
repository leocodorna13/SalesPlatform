/**
 * Utilitário para otimização de imagens antes do upload para o Supabase
 * Implementa compressão, redimensionamento e conversão para formatos eficientes
 */

/**
 * Comprime e redimensiona uma imagem para upload
 * @param {File} file - O arquivo de imagem original
 * @param {Object} options - Opções de otimização
 * @param {number} options.maxWidth - Largura máxima da imagem (padrão: 1200px)
 * @param {number} options.quality - Qualidade da imagem (0-1, padrão: 0.8)
 * @param {string} options.format - Formato de saída ('webp', 'jpeg', padrão: 'webp')
 * @param {boolean} options.generateThumbnail - Se deve gerar uma miniatura (padrão: true)
 * @param {number} options.thumbnailWidth - Largura da miniatura (padrão: 256px)
 * @returns {Promise<{optimizedFile: File, thumbnail: File|null, dimensions: {width: number, height: number}}>}
 */
export async function optimizeImage(file, options = {}) {
  const {
    maxWidth = 1200,
    quality = 0.8,
    format = 'webp',
    generateThumbnail = true,
    thumbnailWidth = 256
  } = options;

  // Verificar se o navegador suporta as APIs necessárias
  if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
    console.warn('As APIs de arquivo não são totalmente suportadas neste navegador');
    return { optimizedFile: file, thumbnail: null, dimensions: { width: 0, height: 0 } };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // Calcular dimensões mantendo a proporção
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        
        // Criar canvas para a imagem principal
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Processar imagem principal
        const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
        const fileName = file.name.replace(/\.[^/.]+$/, `.${format}`);
        
        // Resultado final
        const result = {
          dimensions: { width, height },
          thumbnail: null
        };
        
        // Processar a imagem principal
        canvas.toBlob(async (blob) => {
          result.optimizedFile = new File([blob], fileName, { 
            type: mimeType, 
            lastModified: Date.now() 
          });
          
          // Gerar miniatura se solicitado
          if (generateThumbnail) {
            const thumbCanvas = document.createElement('canvas');
            const thumbRatio = thumbnailWidth / width;
            const thumbHeight = Math.round(height * thumbRatio);
            
            thumbCanvas.width = thumbnailWidth;
            thumbCanvas.height = thumbHeight;
            
            const thumbCtx = thumbCanvas.getContext('2d');
            thumbCtx.drawImage(img, 0, 0, thumbnailWidth, thumbHeight);
            
            // Processar a miniatura
            const thumbFileName = file.name.replace(/\.[^/.]+$/, `-thumb.${format}`);
            
            try {
              const thumbBlob = await new Promise((resolve, reject) => {
                thumbCanvas.toBlob((blob) => {
                  if (blob) resolve(blob);
                  else reject(new Error('Falha ao gerar miniatura'));
                }, mimeType, quality);
              });
              
              result.thumbnail = new File([thumbBlob], thumbFileName, { 
                type: mimeType, 
                lastModified: Date.now() 
              });
              
              resolve(result);
            } catch (error) {
              console.error('Erro ao gerar miniatura:', error);
              resolve(result); // Continuar mesmo sem miniatura
            }
          } else {
            resolve(result);
          }
        }, mimeType, quality);
      };
      
      img.onerror = () => {
        reject(new Error('Falha ao carregar a imagem'));
      };
      
      img.src = event.target.result;
    };
    
    reader.onerror = () => {
      reject(new Error('Falha ao ler o arquivo'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Faz upload de uma imagem otimizada para o Supabase
 * @param {Object} supabase - Cliente Supabase
 * @param {File} file - Arquivo de imagem original
 * @param {string} bucket - Nome do bucket no Storage
 * @param {string} path - Caminho dentro do bucket
 * @param {Object} options - Opções de otimização
 * @returns {Promise<{url: string, thumbnailUrl: string|null, dimensions: {width: number, height: number}}>}
 */
export async function uploadOptimizedImage(supabase, file, bucket, path, options = {}) {
  try {
    // Otimizar a imagem antes do upload
    const { optimizedFile, thumbnail, dimensions } = await optimizeImage(file, options);
    
    // Caminho completo para o arquivo principal
    const filePath = `${path}/${optimizedFile.name}`;
    
    // Upload do arquivo principal
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, optimizedFile, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    
    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    // Resultado final
    const result = {
      url: publicUrl,
      thumbnailUrl: null,
      dimensions
    };
    
    // Upload da miniatura se disponível
    if (thumbnail) {
      const thumbPath = `${path}/${thumbnail.name}`;
      
      const { data: thumbData, error: thumbError } = await supabase.storage
        .from(bucket)
        .upload(thumbPath, thumbnail, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (!thumbError) {
        const { data: { publicUrl: thumbUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(thumbPath);
        
        result.thumbnailUrl = thumbUrl;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao fazer upload da imagem otimizada:', error);
    throw error;
  }
}

/**
 * Gera URLs de imagem responsivas para diferentes tamanhos
 * @param {string} baseUrl - URL base da imagem
 * @param {Array<number>} sizes - Array de tamanhos desejados
 * @returns {Object} - Objeto com URLs para diferentes tamanhos
 */
export function generateResponsiveImageUrls(baseUrl, sizes = [256, 640, 1024, 1200]) {
  if (!baseUrl) return { original: '' };
  
  // Para URLs do Supabase Storage
  if (baseUrl.includes('supabase.co/storage/v1/object/public')) {
    const result = { original: baseUrl };
    
    sizes.forEach(size => {
      // Adicionar parâmetros de transformação à URL
      result[`w${size}`] = `${baseUrl}?width=${size}&quality=80&format=webp`;
    });
    
    // Adicionar tamanho específico para Open Graph (sem parâmetros de URL)
    result.og = baseUrl;
    
    return result;
  }
  
  // Para outras URLs, retornar apenas a original
  return { original: baseUrl };
}
