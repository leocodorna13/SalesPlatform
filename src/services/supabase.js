import { createClient } from '@supabase/supabase-js';
import { getImage } from 'astro:assets';

// Inicializar o cliente Supabase
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://seu-projeto.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'sua-chave-anonima';

// Verificar se as variáveis de ambiente estão definidas
if (supabaseUrl === 'https://seu-projeto.supabase.co' || supabaseAnonKey === 'sua-chave-anonima') {
  console.warn('⚠️ Variáveis de ambiente do Supabase não configuradas. Usando valores padrão para desenvolvimento.');
}

// Criar cliente com autenticação persistente
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Cache em memória para dados frequentes
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const cache = {
  siteSettings: { data: null, timestamp: 0 },
  categories: { data: null, timestamp: 0 },
  products: { data: null, timestamp: 0 }
};

// ======= Funções de Autenticação =======

/**
 * Realiza login de administrador
 * @param {string} email - Email do administrador
 * @param {string} password - Senha do administrador
 * @returns {Promise<object|null>} - Dados do usuário ou null se falhar
 */
export async function loginAdmin(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return null;
  }
}

/**
 * Verifica se o usuário está autenticado
 * @returns {Promise<object|null>} - Dados do usuário ou null se não estiver autenticado
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    return data.session;
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return null;
  }
}

/**
 * Obtém o usuário atual autenticado
 * @returns {Promise<object|null>} - Dados do usuário ou null se não estiver autenticado
 */
export async function getCurrentUser() {
  try {
    const session = await getSession();
    
    if (!session) {
      return null;
    }
    
    const { user } = session;
    return user;
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
}

/**
 * Realiza logout do usuário
 * @returns {Promise<boolean>} - true se o logout foi bem-sucedido
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    return false;
  }
}

// ======= Funções de Produtos =======

/**
 * Busca todos os produtos
 * @param {string} status - Status dos produtos (available, sold, all)
 * @returns {Promise<Array>} - Lista de produtos
 */
export async function getProducts(status = 'all') {
  try {
    const cacheKey = `products_${status}`;
    const cached = cache[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    let query = supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name,
          slug
        ),
        product_images (
          id,
          image_url,
          is_primary
        )
      `)
      .order('created_at', { ascending: false });
    
    if (status !== 'all') {
      query = query.eq('status', status);
    } else {
      // Se status for 'all', ainda assim excluímos os produtos ocultos
      query = query.neq('status', 'hidden');
    }
    
    // Filtrar apenas produtos visíveis para o público
    query = query.eq('visible', true);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Atualizar cache
    cache[cacheKey] = {
      data: data || [],
      timestamp: Date.now()
    };
    
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }
}

/**
 * Busca produtos para o painel de administração (incluindo ocultos)
 * @param {string} status - Status dos produtos (available, sold, hidden, all)
 * @returns {Promise<Array>} - Lista de produtos
 */
export async function getAdminProducts(status = 'all') {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        categories (id, name, slug),
        product_images (id, image_url, is_primary)
      `)
      .order('created_at', { ascending: false });
    
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar produtos para administração:', error);
    return [];
  }
}

/**
 * Busca produtos por categoria usando o slug da categoria
 * @param {string} categorySlug - Slug da categoria
 * @returns {Promise<Array>} - Lista de produtos
 */
export async function getProductsByCategorySlug(categorySlug) {
  try {
    // Se o slug for "todos", retornar todos os produtos disponíveis
    if (categorySlug === 'todos') {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images (*),
          categories (*)
        `)
        .eq('status', 'available')
        .eq('visible', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
    
    // Caso contrário, buscar produtos da categoria específica
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();
    
    if (categoryError) throw categoryError;
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (*),
        categories (*)
      `)
      .eq('category_id', category.id)
      .eq('status', 'available')
      .eq('visible', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar produtos por categoria (slug):', error);
    return [];
  }
}

/**
 * Busca um produto pelo ID
 * @param {string} id - ID do produto
 * @returns {Promise<object|null>} - Dados do produto ou null se não encontrado
 */
export async function getProductById(id) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (*),
        categories (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar produto por ID:', error);
    return null;
  }
}

/**
 * Busca produtos relacionados (mesma categoria, excluindo o produto atual)
 * @param {string} categoryId - ID da categoria
 * @param {string} currentProductId - ID do produto atual a ser excluído
 * @returns {Promise<Array>} - Lista de produtos relacionados
 */
export async function getRelatedProducts(categoryId, currentProductId) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          *
        ),
        product_images (
          *
        )
      `)
      .eq('category_id', categoryId)
      .eq('status', 'available')
      .eq('visible', true)
      .neq('id', currentProductId)
      .order('created_at', { ascending: false })
      .limit(4);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar produtos relacionados:', error);
    return [];
  }
}

/**
 * Busca produtos recomendados (produtos disponíveis, excluindo o atual e os relacionados)
 * @param {string} currentProductId - ID do produto atual
 * @param {Array<string>} excludeIds - IDs de produtos a excluir (ex: relacionados)
 * @param {number} page - Página atual (começa em 1)
 * @param {number} perPage - Itens por página
 * @returns {Promise<{data: Array, hasMore: boolean}>} - Lista de produtos recomendados e flag indicando se há mais
 */
export async function getRecommendedProducts(currentProductId, excludeIds = [], page = 1, perPage = 8) {
  try {
    // Calcular o offset baseado na página
    const offset = (page - 1) * perPage;
    
    // Buscar um item a mais para saber se há próxima página
    const { data, error, count } = await supabase
      .from('products')
      .select(`
        *,
        product_images (*),
        categories (*)
      `, { count: 'exact' })
      .eq('status', 'available')
      .eq('visible', true)
      .neq('id', currentProductId)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage);
    
    if (error) throw error;
    
    return {
      data: data || [],
      hasMore: count > offset + perPage
    };
  } catch (error) {
    console.error('Erro ao buscar produtos recomendados:', error);
    return { data: [], hasMore: false };
  }
}

/**
 * Cria um novo produto
 * @param {Object} productData - Dados do produto
 * @param {Array} imageFiles - Arquivos de imagem
 * @returns {Promise<Object|null>} - Produto criado ou null se falhar
 */
export async function createProduct(productData, imageFiles) {
  try {
    // Validar dados obrigatórios
    if (!productData.title || typeof productData.price !== 'number' || !productData.category_id) {
      throw new Error('Título, preço e categoria são obrigatórios');
    }

    // 1. Criar produto
    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        title: productData.title,
        description: productData.description || '',
        price: productData.price,
        category_id: productData.category_id,
        status: 'available',
        visible: true
      }])
      .select()
      .single();

    if (error) throw error;

    // Verificar se há arquivos de imagem válidos
    const validFiles = [];
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB
    let totalSize = 0;
    
    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        if (file && 
            typeof file === 'object' && 
            ((file instanceof File && file.size > 0) || 
             (file.name && file.type && file.size > 0))) {
          
          if (file.size > MAX_FILE_SIZE) {
            console.warn(`Arquivo muito grande ignorado (max ${MAX_FILE_SIZE/1024/1024}MB):`, file.name);
            continue;
          }

          totalSize += file.size;
          if (totalSize > MAX_TOTAL_SIZE) {
            console.warn(`Tamanho total dos arquivos excede ${MAX_TOTAL_SIZE/1024/1024}MB. Ignorando:`, file.name);
            continue;
          }

          validFiles.push(file);
        } else {
          console.warn('Arquivo inválido ignorado:', file);
        }
      }
    }
    
    // Garantir que o bucket existe
    await ensureBucketExists('product-images');
    
    // Fazer upload das imagens em paralelo com retry
    if (validFiles.length > 0) {
      const MAX_RETRIES = 3;
      const uploadPromises = validFiles.map(async (file, i) => {
        let retries = 0;
        while (retries < MAX_RETRIES) {
          try {
            // Gerar nome de arquivo único
            const fileExt = file.name.split('.').pop();
            const timestamp = new Date().getTime();
            const fileName = `${product.id}/${timestamp}-${i}.${fileExt}`;
            const filePath = `products/${fileName}`;
            
            // Fazer upload do arquivo
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type
              });
            
            if (uploadError) throw uploadError;
            
            // Obter URL pública
            const { data: publicURLData } = supabase.storage
              .from('product-images')
              .getPublicUrl(filePath);
            
            const publicUrl = publicURLData?.publicUrl;
            if (!publicUrl) throw new Error('Falha ao gerar URL pública');
            
            // Salvar referência da imagem
            const { data: imageData, error: imageError } = await supabase
              .from('product_images')
              .insert([{
                product_id: product.id,
                image_url: publicUrl,
                is_primary: i === 0
              }])
              .select();
            
            if (imageError) throw imageError;
            
            return {
              success: true,
              url: publicUrl,
              isPrimary: i === 0
            };
          } catch (err) {
            console.error(`Tentativa ${retries + 1}/${MAX_RETRIES} falhou:`, err);
            retries++;
            if (retries === MAX_RETRIES) {
              return {
                success: false,
                error: err
              };
            }
            // Esperar um pouco antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }
      });

      // Aguardar todos os uploads terminarem
      const results = await Promise.all(uploadPromises);
      const failures = results.filter(r => !r.success);
      
      if (failures.length > 0) {
        console.error(`${failures.length} imagens falharam ao fazer upload:`, failures);
      }
    }
    
    return product;
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return null;
  }
}

/**
 * Atualiza o status de um produto
 * @param {string} id - ID do produto
 * @param {string} status - Novo status (available, sold)
 * @returns {Promise<boolean>} - true se a atualização foi bem-sucedida
 */
export async function updateProductStatus(id, status) {
  try {
    // Verificar se o usuário está autenticado
    const session = await getSession();
    if (!session) {
      console.error('Usuário não autenticado para atualizar status');
      return false;
    }
    
    // Testar permissões com uma consulta simples primeiro
    const { data: testData, error: testError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .single();
    
    if (testError) {
      console.error('Erro ao verificar permissões:', testError);
      if (testError.code === 'PGRST301') {
        console.error('Erro de permissão RLS. Verifique as políticas no Supabase.');
      }
      return false;
    }
    
    // Atualizar o status
    const { data, error } = await supabase
      .from('products')
      .update({ status })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Erro detalhado ao atualizar status:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar status do produto:', error);
    return false;
  }
}

/**
 * Exclui um produto
 * @param {string} id - ID do produto
 * @returns {Promise<boolean>} - true se a exclusão foi bem-sucedida
 */
export async function deleteProduct(id) {
  try {
    // Verificar se o usuário está autenticado
    const session = await getSession();
    if (!session) {
      console.error('Usuário não autenticado para excluir produto');
      return false;
    }
    
    // 1. Primeiro, buscar todas as imagens do produto
    const { data: productImages, error: fetchError } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', id);
    
    if (fetchError) {
      console.error('Erro ao buscar imagens do produto:', fetchError);
      return false;
    }

    // 2. Excluir os arquivos do storage
    if (productImages && productImages.length > 0) {
      const filesToDelete = productImages.map(img => {
        // Extrair o caminho do arquivo da URL do Supabase
        // A URL tem o formato: https://.../storage/v1/object/public/product-images/products/ID/filename
        const parts = img.image_url.split('product-images/');
        if (parts.length > 1) {
          return parts[1]; // Retorna 'products/ID/filename'
        }
        return null;
      }).filter(Boolean); // Remove nulls

      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('product-images')
          .remove(filesToDelete);

        if (storageError) {
          console.error('Erro ao excluir arquivos do storage:', storageError);
        }
      }
    }

    // 3. Excluir as referências das imagens no banco
    const { error: imagesError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', id);
    
    if (imagesError) {
      console.error('Erro ao excluir referências das imagens:', imagesError);
      return false;
    }
    
    // 4. Por fim, excluir o produto
    const { error: productError } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (productError) {
      console.error('Erro ao excluir produto:', productError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    return false;
  }
}

// ======= Funções de Categorias =======

/**
 * Busca todas as categorias
 * @returns {Promise<Array>} - Lista de categorias
 */
export async function getCategories() {
  try {
    if (cache.categories.data && Date.now() - cache.categories.timestamp < CACHE_DURATION) {
      return cache.categories.data;
    }
    
    // Buscar categorias
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    // Para cada categoria, buscar a contagem de produtos
    const categoriesWithCount = await Promise.all(
      (categories || []).map(async (category) => {
        // Buscar a contagem de produtos disponíveis nesta categoria
        const { count, error: countError } = await supabase
          .from('products')
          .select('id', { count: 'exact' })
          .eq('category_id', category.id)
          .eq('status', 'available');
        
        if (countError) {
          console.error(`Erro ao contar produtos para categoria ${category.id}:`, countError);
          return { ...category, product_count: 0 };
        }
        
        return { ...category, product_count: count || 0 };
      })
    );
    
    cache.categories = {
      data: categoriesWithCount || [],
      timestamp: Date.now()
    };
    
    return categoriesWithCount || [];
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return [];
  }
}

/**
 * Busca uma categoria pelo slug
 * @param {string} slug - Slug da categoria
 * @returns {Promise<object|null>} - Dados da categoria ou null se não encontrada
 */
export async function getCategoryBySlug(slug) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar categoria por slug:', error);
    return null;
  }
}

/**
 * Cria uma nova categoria
 * @param {string} name - Nome da categoria
 * @param {string} slug - Slug da categoria
 * @returns {Promise<object>} - Resultado da operação com success e message
 */
export async function createCategory(name, slug) {
  try {
    // Verificar se o slug já existe
    const { data: existingCategory, error: searchError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (searchError && searchError.code !== 'PGRST116') {
      // PGRST116 é o código para "não encontrado", que é o que queremos
      throw searchError;
    }
    
    if (existingCategory) {
      return { 
        success: false, 
        message: 'Já existe uma categoria com este slug. Por favor, escolha outro nome.' 
      };
    }
    
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, slug }])
      .select()
      .single();
    
    if (error) throw error;
    
    return { 
      success: true, 
      message: 'Categoria criada com sucesso.',
      category: data
    };
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    return { 
      success: false, 
      message: 'Erro ao criar categoria: ' + (error.message || 'Erro desconhecido')
    };
  }
}

/**
 * Exclui uma categoria
 * @param {string} id - ID da categoria
 * @returns {Promise<object>} - Resultado da operação com success e message
 */
export async function deleteCategory(id) {
  try {
    // Verificar se existem produtos nesta categoria
    const { count, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('category_id', id);
    
    if (countError) throw countError;
    
    // Se existirem produtos, não permitir a exclusão
    if (count > 0) {
      return { success: false, message: 'Não é possível excluir uma categoria que contém produtos.' };
    }
    
    // Excluir a categoria
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true, message: 'Categoria excluída com sucesso.' };
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    return { success: false, message: 'Erro ao excluir categoria: ' + error.message };
  }
}

/**
 * Move produtos de uma categoria para outra
 * @param {string} fromCategoryId - ID da categoria de origem
 * @param {string} toCategoryId - ID da categoria de destino
 * @returns {Promise<object>} - Resultado da operação
 */
export async function moveProductsBetweenCategories(fromCategoryId, toCategoryId) {
  try {
    // Verificar se as categorias existem
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id')
      .in('id', [fromCategoryId, toCategoryId]);
    
    if (categoriesError) throw categoriesError;
    
    if (categories.length !== 2) {
      return { success: false, message: 'Uma ou ambas as categorias não existem.' };
    }
    
    // Atualizar os produtos
    const { data: products, error: updateError } = await supabase
      .from('products')
      .update({ category_id: toCategoryId })
      .eq('category_id', fromCategoryId)
      .select('id');
    
    if (updateError) throw updateError;
    
    return { 
      success: true, 
      message: `${products.length} produtos movidos com sucesso.`,
      count: products.length
    };
  } catch (error) {
    console.error('Erro ao mover produtos entre categorias:', error);
    return { success: false, message: 'Erro ao mover produtos: ' + error.message };
  }
}

/**
 * Obtém o número de produtos em uma categoria
 * @param {string} categoryId - ID da categoria
 * @returns {Promise<number>} - Número de produtos
 */
export async function getProductCountByCategory(categoryId) {
  try {
    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('category_id', categoryId);
    
    if (error) throw error;
    return count;
  } catch (error) {
    console.error('Erro ao contar produtos por categoria:', error);
    return 0;
  }
}

/**
 * Busca produtos por categoria
 * @param {number} categoryId - ID da categoria
 * @param {string} status - Status dos produtos (opcional, padrão: todos)
 * @returns {Promise<Array>} - Lista de produtos
 */
export async function getProductsByCategory(categoryId, status = null) {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        product_images (*),
        categories (*)
      `)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar produtos por categoria:', error);
    return [];
  }
}

/**
 * Atualiza uma categoria existente
 * @param {string} id - ID da categoria
 * @param {string} name - Novo nome da categoria
 * @param {string} slug - Novo slug da categoria
 * @returns {Promise<object>} - Resultado da operação
 */
export async function updateCategory(id, name, slug) {
  try {
    // Verificar se o slug já existe em outra categoria
    const { data: existingCategory, error: searchError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .single();
    
    if (searchError && searchError.code !== 'PGRST116') {
      // PGRST116 é o código para "não encontrado", que é o que queremos
      throw searchError;
    }
    
    if (existingCategory) {
      return { 
        success: false, 
        message: 'Já existe uma categoria com este slug. Por favor, escolha outro nome.' 
      };
    }
    
    // Atualizar a categoria
    const { data, error } = await supabase
      .from('categories')
      .update({ name, slug })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return { 
      success: true, 
      message: 'Categoria atualizada com sucesso.',
      category: data
    };
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    return { 
      success: false, 
      message: 'Erro ao atualizar categoria: ' + error.message 
    };
  }
}

/**
 * Exclui múltiplas categorias em lote
 * @param {string[]} categoryIds - Array com IDs das categorias a serem excluídas
 * @returns {Promise<object>} - Resultado da operação
 */
export async function deleteBulkCategories(categoryIds) {
  try {
    // Verificar se todas as categorias estão vazias
    const { data: categoriesWithProducts, error: countError } = await supabase
      .from('products')
      .select('category_id')
      .in('category_id', categoryIds);

    if (countError) throw countError;

    if (categoriesWithProducts && categoriesWithProducts.length > 0) {
      return {
        success: false,
        message: 'Algumas categorias não podem ser excluídas pois contêm produtos.'
      };
    }

    // Excluir as categorias
    const { error } = await supabase
      .from('categories')
      .delete()
      .in('id', categoryIds);

    if (error) throw error;

    return {
      success: true,
      message: `${categoryIds.length} categorias foram excluídas com sucesso.`
    };
  } catch (error) {
    console.error('Erro ao excluir categorias:', error);
    return {
      success: false,
      message: 'Erro ao excluir categorias: ' + error.message
    };
  }
}

// ======= Funções de Interessados =======

/**
 * Função utilitária para converter ID para número
 * @param {string|number} id - ID a ser convertido
 * @returns {number|null} - ID convertido ou null se inválido
 */
function normalizeId(id) {
  if (!id) return null;
  return typeof id === 'string' ? parseInt(id, 10) : id;
}

/**
 * Registra o interesse de um usuário em um produto
 * @param {object} userData - Dados do usuário interessado
 * @returns {Promise<boolean>} - true se o registro foi bem-sucedido
 */
export async function registerInterest(userData) {
  try {
    // Converter para número se for string
    const numericId = typeof userData.product_id === 'string' ? parseInt(userData.product_id, 10) : userData.product_id;
    
    // Inserir o registro de interesse na tabela interests
    const { error: insertError } = await supabase
      .from('interests')
      .insert([{
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        product_id: numericId,
        message: userData.message
      }]);
    
    if (insertError) {
      console.error('Erro ao inserir interesse:', insertError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao registrar interesse:', error);
    return false;
  }
}

/**
 * Obtém a contagem de interesses para um produto
 * @param {string|number} productId - ID do produto
 * @returns {Promise<number>} - Contagem de interesses
 */
export async function getProductInterestCount(productId) {
  try {
    if (!productId) return 0;
    
    // Converter para número se for string
    const numericId = typeof productId === 'string' ? parseInt(productId, 10) : productId;
    
    // Buscar todos os registros e contar
    const { data, error } = await supabase
      .from('interests')
      .select('id')
      .eq('product_id', numericId);
    
    if (error) {
      console.error('Erro ao buscar interesses:', error);
      return 0;
    }
    
    return data.length;
  } catch (error) {
    console.error('Erro ao obter contagem de interesses:', error);
    return 0;
  }
}

// ======= Funções de Estatísticas =======

/**
 * Busca estatísticas para o dashboard
 * @returns {Promise<object>} - Estatísticas
 */
export async function getDashboardStats() {
  try {
    // Total de produtos
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, status, views, title');
    
    if (productsError) {
      console.error('Erro ao buscar produtos:', productsError);
      throw productsError;
    }
    
    if (!products || products.length === 0) {
      return {
        totalProducts: 0,
        availableProducts: 0,
        soldProducts: 0,
        interestCount: 0,
        totalViews: 0,
        mostViewedProducts: []
      };
    }
    
    // Total de produtos disponíveis
    const availableProducts = products.filter(p => p.status === 'available').length;
    
    // Total de produtos vendidos
    const soldProducts = products.filter(p => p.status === 'sold').length;
    
    // Total de visualizações
    const totalViews = products.reduce((sum, product) => {
      const views = product.views || 0;
      return sum + views;
    }, 0);
    
    // Produtos mais visualizados (usando os produtos já buscados para evitar outra consulta)
    const mostViewedProducts = [...products]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        title: p.title,
        views: p.views || 0
      }));
    
    // Total de interessados
    const { count: interestCount, error: interestError } = await supabase
      .from('interests')
      .select('id', { count: 'exact' });
    
    if (interestError) {
      console.error('Erro ao buscar interessados:', interestError);
      throw interestError;
    }
    
    const result = {
      totalProducts: products.length,
      availableProducts,
      soldProducts,
      interestCount: interestCount || 0,
      totalViews,
      mostViewedProducts
    };
    
    return result;
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return {
      totalProducts: 0,
      availableProducts: 0,
      soldProducts: 0,
      interestCount: 0,
      totalViews: 0,
      mostViewedProducts: []
    };
  }
}

/**
 * Verifica se um bucket existe e cria se não existir
 * @param {string} bucketName - Nome do bucket
 * @returns {Promise<boolean>} - true se o bucket existe ou foi criado com sucesso
 */
export async function ensureBucketExists(bucketName) {
  try {
    // Primeiro verifica se o bucket existe
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();

    if (listError) throw listError;

    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    if (bucketExists) {
      return true;
    }

    // Se não existe, tenta criar
    const { data, error } = await supabase
      .storage
      .createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB em bytes
      });

    // Se der erro de RLS, verifica se o bucket existe mesmo assim
    if (error?.status === 400 && error.message?.includes('row-level security')) {
      const { data: checkBuckets } = await supabase.storage.listBuckets();
      return checkBuckets.some(bucket => bucket.name === bucketName);
    }

    if (error) throw error;
    return true;

  } catch (error) {
    // Se for erro de RLS, ignora pois provavelmente o bucket já existe
    if (error?.status === 400 && error.message?.includes('row-level security')) {
      console.warn('Aviso: Erro de RLS ao verificar/criar bucket, mas continuando operação...');
      return true;
    }
    console.error('Erro ao criar bucket', bucketName, ':', error);
    return false;
  }
}

/**
 * Cria um bucket no Supabase Storage se ele não existir
 * @param {string} bucketName - Nome do bucket a ser criado
 * @returns {Promise<boolean>} - true se o bucket foi criado ou já existe
 */
export async function createBucketIfNotExists(bucketName) {
  try {
    // Verificar se o bucket existe
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} não existe. Criando...`);
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: true // Tornar o bucket público
      });
      
      if (error) {
        console.error('Erro ao criar bucket:', error);
        return false;
      }
      
      console.log(`Bucket ${bucketName} criado com sucesso:`, data);
    } else {
      console.log(`Bucket ${bucketName} já existe.`);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar/criar bucket:', error);
    return false;
  }
}

/**
 * Função para testar o upload de imagens para o Supabase Storage
 * @returns {Promise<{success: boolean, error?: any, url?: string}>}
 */
export async function testImageUpload() {
  try {
    // Verificar se o cliente Supabase está disponível
    if (!supabase) {
      console.error('Cliente Supabase não inicializado');
      return { success: false, error: 'Cliente Supabase não inicializado' };
    }
    
    // Verificar se o bucket existe, criando-o se necessário
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketName = 'product-images';
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket '${bucketName}' não encontrado. Criando...`);
      const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createBucketError) {
        console.error('Erro ao criar bucket:', createBucketError);
        return { success: false, error: createBucketError };
      }
      
      console.log(`Bucket '${bucketName}' criado com sucesso`);
    } else {
      console.log(`Bucket '${bucketName}' já existe`);
    }
    
    // Criar uma imagem de teste (1x1 pixel transparente em base64)
    const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAJ5jfZixgAAAABJRU5ErkJggg==';
    
    // Converter base64 para blob
    const response = await fetch(base64Image);
    const blob = await response.blob();
    
    // Criar um arquivo a partir do blob
    const testFile = new File([blob], 'test-image.png', { type: 'image/png' });
    
    // Fazer upload do arquivo
    console.log('Iniciando upload do arquivo de teste...');
    const timestamp = new Date().getTime();
    const filePath = `test/test-image-${timestamp}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, testFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: testFile.type
      });
    
    if (uploadError) {
      console.error('Erro ao fazer upload do arquivo de teste:', uploadError);
      return { success: false, error: uploadError };
    }
    
    console.log('Arquivo de teste enviado com sucesso:', uploadData);
    
    // Obter URL pública do arquivo
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    const publicUrl = urlData?.publicUrl;
    console.log('URL pública do arquivo de teste:', publicUrl);
    
    return { 
      success: true, 
      url: publicUrl,
      message: 'Teste de upload concluído com sucesso!'
    };
    
  } catch (error) {
    console.error('Erro durante o teste de upload:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Cria uma nova categoria ou retorna uma existente com o mesmo nome
 * @param {string} categoryName - Nome da categoria
 * @returns {Promise<object|null>} - Categoria criada/encontrada ou null se falhar
 */
export async function findOrCreateCategory(categoryName) {
  try {
    // Normalizar o nome da categoria
    const name = categoryName.trim();
    
    // Gerar slug a partir do nome
    const slug = name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    
    // Verificar se a categoria já existe pelo nome ou pelo slug
    const { data: existingCategories, error: searchError } = await supabase
      .from('categories')
      .select('*')
      .or(`name.ilike.${name},slug.eq.${slug}`);
    
    if (!searchError && existingCategories && existingCategories.length > 0) {
      return existingCategories[0];
    }
    
    // Criar nova categoria
    const { data: newCategory, error: createError } = await supabase
      .from('categories')
      .insert([{ name, slug }])
      .select()
      .single();
    
    if (createError) throw createError;
    return newCategory;
  } catch (error) {
    console.error('Erro ao criar/encontrar categoria:', error);
    return null;
  }
}

/**
 * Cria múltiplos produtos com suas imagens
 * @param {Array<Object>} productsData - Array de dados dos produtos
 * @returns {Promise<Array>} - Array de produtos criados
 */
export async function createBulkProducts(productsData) {
  try {
    const createdProducts = [];
    
    // Verificar se o bucket existe
    await ensureBucketExists('product-images');
    
    // Processar cada produto
    for (const productData of productsData) {
      const { title, price, description, category_id, image, images } = productData;
      
      if (!title || !price || !category_id || (!image && (!images || images.length === 0))) {
        console.error('Dados de produto incompletos:', productData);
        continue;
      }
      
      // Criar produto no Supabase
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert([{
          title,
          description,
          price,
          category_id,
          status: 'available',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (productError) {
        console.error('Erro ao criar produto:', productError);
        continue;
      }
      
      // Preparar array de imagens
      const imagesToUpload = [];
      if (image) {
        imagesToUpload.push(image);
      }
      if (images && images.length > 0) {
        imagesToUpload.push(...images);
      }
      
      // Fazer upload das imagens
      if (imagesToUpload.length > 0 && product) {
        for (let i = 0; i < imagesToUpload.length; i++) {
          const currentImage = imagesToUpload[i];
          try {
            const fileExt = currentImage.name.split('.').pop();
            const timestamp = new Date().getTime();
            const fileName = `${product.id}/${timestamp}-${i}.${fileExt}`;
            const filePath = `products/${fileName}`;
            
            // Fazer upload do arquivo
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(filePath, currentImage, {
                cacheControl: '3600',
                upsert: true,
                contentType: currentImage.type
              });
            
            if (uploadError) {
              console.error('Erro ao fazer upload da imagem:', uploadError);
              continue;
            }
            
            // Obter URL pública da imagem
            const { data: publicURLData } = supabase.storage
              .from('product-images')
              .getPublicUrl(filePath);
            
            if (!publicURLData || !publicURLData.publicUrl) {
              console.error('Falha ao gerar URL pública para a imagem');
              continue;
            }
            
            // Salvar referência da imagem no banco
            const { data: imageData, error: imageError } = await supabase
              .from('product_images')
              .insert([{
                product_id: product.id,
                image_url: publicURLData.publicUrl,
                is_primary: i === 0
              }])
              .select();
            
            if (imageError) {
              console.error('Erro ao salvar referência da imagem:', imageError);
            } else {
              console.log('Imagem salva com sucesso para o produto:', product.id);
            }
          } catch (uploadErr) {
            console.error('Exceção durante o upload da imagem:', uploadErr);
          }
        }
      }
      
      createdProducts.push(product);
    }
    
    return createdProducts;
  } catch (error) {
    console.error('Erro ao criar produtos em massa:', error);
    throw error;
  }
}

/**
 * Executa ações em lote para múltiplos produtos
 * @param {Array<string>} productIds - IDs dos produtos
 * @param {string} action - Ação a ser executada ('markSold', 'markAvailable', 'markHidden', 'markVisible', 'delete')
 * @returns {Promise<object>} - Resultado da operação
 */
export async function batchProductAction(productIds, action) {
  if (!productIds || productIds.length === 0) {
    return { success: false, error: 'Nenhum produto selecionado' };
  }
  
  try {
    let result;
    
    console.log(`Executando ação em lote: ${action} para ${productIds.length} produtos`);
    
    switch (action) {
      case 'markSold':
        result = await supabase
          .from('products')
          .update({ status: 'sold', updated_at: new Date().toISOString() })
          .in('id', productIds);
        break;
        
      case 'markAvailable':
        result = await supabase
          .from('products')
          .update({ status: 'available', updated_at: new Date().toISOString() })
          .in('id', productIds);
        break;
        
      case 'markHidden':
        result = await supabase
          .from('products')
          .update({ visible: false, updated_at: new Date().toISOString() })
          .in('id', productIds);
        break;
        
      case 'markVisible':
        result = await supabase
          .from('products')
          .update({ visible: true, updated_at: new Date().toISOString() })
          .in('id', productIds);
        break;
        
      case 'delete':
        // Primeiro excluímos as imagens relacionadas
        const { error: imagesError } = await supabase
          .from('product_images')
          .delete()
          .in('product_id', productIds);
          
        if (imagesError) throw imagesError;
        
        // Depois excluímos os produtos
        result = await supabase
          .from('products')
          .delete()
          .in('id', productIds);
        break;
        
      default:
        return { success: false, error: 'Ação inválida' };
    }
    
    if (result.error) {
      console.error(`Erro na operação ${action}:`, result.error);
      throw result.error;
    }
    
    return { 
      success: true, 
      message: `${productIds.length} produtos foram ${
        action === 'markSold' ? 'marcados como vendidos' : 
        action === 'markAvailable' ? 'disponibilizados' : 
        action === 'markHidden' ? 'ocultados' : 
        action === 'markVisible' ? 'tornados visíveis' : 
        'excluídos'} com sucesso.` 
    };
  } catch (error) {
    console.error('Erro ao executar ação em lote:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Alterna a visibilidade de um produto
 * @param {string} productId - ID do produto
 * @returns {Promise<object>} - Resultado da operação
 */
export async function toggleProductVisibility(productId) {
  try {
    // Primeiro, obter o estado atual do produto
    const { data: product, error: getError } = await supabase
      .from('products')
      .select('visible')
      .eq('id', productId)
      .single();
    
    if (getError) throw getError;
    
    // Alternar a visibilidade
    const newVisibility = !product.visible;
    
    // Atualizar o produto
    const { error } = await supabase
      .from('products')
      .update({ 
        visible: newVisibility,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);
    
    if (error) throw error;
    
    return { 
      success: true, 
      visible: newVisibility,
      message: `Produto ${newVisibility ? 'visível' : 'oculto'} com sucesso!`
    };
  } catch (error) {
    console.error('Erro ao alternar visibilidade do produto:', error);
    return { success: false, error: error.message };
  }
}

// ======= Funções de Configurações do Site =======

/**
 * Interface para as configurações do site
 * @typedef {Object} SiteSettings
 * @property {string} id - ID único das configurações
 * @property {string} heroTitle - Título principal da página inicial
 * @property {string} heroDescription - Descrição principal da página inicial
 * @property {string} heroImageUrl - URL da imagem de fundo do hero
 * @property {string} contactPhone - Telefone de contato
 * @property {string} contactWhatsapp - WhatsApp de contato
 * @property {string} paymentMethods - Formas de pagamento aceitas
 * @property {string} whatsappMessage - Mensagem padrão do WhatsApp
 * @property {string} projectName - Nome do projeto/site
 */

/**
 * Busca as configurações do site
 * @returns {Promise<SiteSettings>} Configurações do site
 */
export async function getSiteSettings() {
  try {
    if (cache.siteSettings.data && Date.now() - cache.siteSettings.timestamp < CACHE_DURATION) {
      return cache.siteSettings.data;
    }
    
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .single();
    
    if (error) {
      // Se a tabela não existir ou não tiver dados, retornamos configurações padrão
      if (error.code === 'PGRST116') {
        return {
          id: '1',
          heroTitle: "Desapego dos Martins",
          heroDescription: "Encontre produtos de qualidade a preços acessíveis. Todos os itens estão em ótimo estado e prontos para um novo lar.",
          heroImageUrl: "/images/hero-background.jpg",
          contactPhone: "",
          contactWhatsapp: "",
          paymentMethods: "Pix, dinheiro, ou cartão parcelado com juros da maquininha",
          whatsappMessage: "Olá, tenho interesse nesse desapego!",
          projectName: 'Desapegos'
        };
      }
      console.error('Erro ao buscar configurações do site:', error);
      return null;
    }
    
    cache.siteSettings = {
      data: data || {},
      timestamp: Date.now()
    };
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar configurações do site:', error);
    return null;
  }
}

/**
 * Faz upload de uma imagem para o Supabase Storage
 * @param {File} file - Arquivo de imagem
 * @param {string} bucketName - Nome do bucket (default: 'site-images')
 * @param {string} folder - Pasta dentro do bucket (default: 'hero')
 * @returns {Promise<{success: boolean, url: string|null, error: any}>}
 */
export async function uploadImage(file, bucketName = 'site-images', folder = 'hero') {
  try {
    const bucketExists = await createBucketIfNotExists(bucketName);
    if (!bucketExists) {
      throw new Error('Não foi possível criar o bucket para armazenamento de imagens');
    }

    // Converter o File para um formato que o Astro possa processar
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Otimizar a imagem usando o Astro
    const optimizedImage = await getImage({
      src: buffer,
      width: 1920,
      height: 1080,
      format: 'webp',
      quality: 80
    });

    // Criar um novo File com a imagem otimizada
    const response = await fetch(optimizedImage.src);
    const optimizedBuffer = await response.arrayBuffer();
    const optimizedFile = new File([optimizedBuffer], `${file.name.split('.')[0]}.webp`, {
      type: 'image/webp'
    });

    // Upload para o Supabase
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.webp`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, optimizedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: publicURL } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return {
      success: true,
      url: publicURL.publicUrl,
      error: null
    };
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    return {
      success: false,
      url: null,
      error
    };
  }
}

/**
 * Faz upload de múltiplas imagens para o Supabase Storage
 * @param {File[]} files - Arquivos de imagem
 * @param {string} bucketName - Nome do bucket (default: 'site-images')
 * @param {string} folder - Pasta dentro do bucket (default: 'hero')
 * @returns {Promise<{success: boolean, urls: string[], error: any}>}
 */
export async function uploadHeroCarouselImages(files, bucketName = 'site-images', folder = 'hero') {
  try {
    // Garantir que o bucket existe
    const bucketExists = await createBucketIfNotExists(bucketName);
    if (!bucketExists) {
      throw new Error('Não foi possível criar o bucket para armazenamento de imagens');
    }

    const uploadPromises = [];
    for (const file of files) {
      if (!file || file.size === 0) continue;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // Upload da imagem
      const uploadPromise = supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      uploadPromises.push(uploadPromise);
    }
    
    // Esperar todos os uploads terminarem
    const results = await Promise.all(uploadPromises);
    
    // Obter URLs públicas das imagens
    const urls = await Promise.all(results.map(async (result) => {
      const { data: publicURL } = supabase.storage
        .from(bucketName)
        .getPublicUrl(result.data.Key);
      return publicURL.publicUrl;
    }));

    return {
      success: true,
      urls,
      error: null
    };
  } catch (error) {
    console.error('Erro ao fazer upload das imagens:', error);
    return {
      success: false,
      urls: [],
      error: error.message
    };
  }
}

/**
 * Atualiza as configurações do site
 * @param {object} settings - Novas configurações
 * @returns {Promise<object>} - Resultado da operação
 */
export async function updateSiteSettings(settings) {
  try {
    const { error } = await supabase
      .from('site_settings')
      .update(settings)
      .eq('id', 1);  // Sempre usa ID 1 pois só temos uma configuração

    if (error) throw error;
    return { success: true, message: 'Configurações atualizadas com sucesso!' };
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return { success: false, message: `Erro ao atualizar configurações: ${error.message}` };
  }
}

/**
 * Busca produtos com base em um termo de pesquisa
 * @param {string} query - Termo de busca
 * @param {string} categoryId - ID da categoria para filtrar (opcional)
 * @returns {Promise<Array>} - Lista de produtos encontrados
 */
export async function searchProducts(query, categoryId) {
  try {
    // Construir a query base
    let supabaseQuery = supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name,
          slug
        ),
        product_images (
          id,
          url,
          is_primary
        )
      `)
      .eq('status', 'available')
      .order('created_at', { ascending: false });
    
    // Adicionar filtro de texto se houver query
    if (query && query.trim() !== '') {
      const searchTerm = `%${query.toLowerCase()}%`;
      supabaseQuery = supabaseQuery.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`);
    }
    
    // Adicionar filtro de categoria se especificado
    if (categoryId && categoryId !== 'all') {
      supabaseQuery = supabaseQuery.eq('category_id', categoryId);
    }
    
    // Executar a query
    const { data, error } = await supabaseQuery;
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }
}

/**
 * Remove an image from the carousel
 * @param {string} imageUrl - URL of the image to remove
 * @returns {Promise<Object>} - Result of the operation
 */
export async function removeCarouselImage(imageUrl) {
  try {
    // Usar o cliente supabase já inicializado em vez de criar um novo
    
    // Get current settings
    const { data: settings } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (!settings) {
      return { success: false, message: 'Configurações não encontradas' };
    }
    
    // Parse current carousel URLs
    let carouselUrls = [];
    try {
      carouselUrls = JSON.parse(settings.heroCarouselUrls || '[]');
    } catch (e) {
      console.error('Erro ao analisar URLs do carrossel:', e);
      carouselUrls = [];
    }
    
    // Remove the specified URL
    carouselUrls = carouselUrls.filter(url => url !== imageUrl);
    
    // Update settings with new carousel URLs
    const { data, error } = await supabase
      .from('site_settings')
      .update({
        heroCarouselUrls: JSON.stringify(carouselUrls)
      })
      .eq('id', settings.id);
    
    if (error) {
      console.error('Erro ao atualizar configurações:', error);
      return { success: false, message: `Erro ao remover imagem: ${error.message}` };
    }
    
    // Try to delete the file from storage if it's in our bucket
    try {
      if (imageUrl.includes('supabase.co')) {
        const urlParts = new URL(imageUrl);
        const pathParts = urlParts.pathname.split('/');
        const bucketName = pathParts[1]; // Assuming URL format /storage/v1/object/public/bucket-name/path
        const filePath = pathParts.slice(4).join('/'); // Get everything after the bucket name
        
        if (bucketName && filePath) {
          await supabase.storage
            .from(bucketName)
            .remove([filePath]);
        }
      }
    } catch (e) {
      console.warn('Não foi possível excluir o arquivo de armazenamento:', e);
      // Continue anyway, as we've already updated the database
    }
    
    return { success: true, message: 'Imagem removida com sucesso!' };
  } catch (error) {
    console.error('Erro ao remover imagem do carrossel:', error);
    return { success: false, message: `Erro ao processar a remoção: ${error.message}` };
  }
}

// Funções para gerenciar imagens do hero
export async function getHeroImages() {
  const { data, error } = await supabase
    .from('hero_images')
    .select('*')
    .order('order');
    
  if (error) {
    console.error('Erro ao buscar imagens do hero:', error);
    return [];
  }
  
  // Retorna as imagens encontradas ou array vazio
  return data || [];
}

export async function addHeroImage(file) {
  try {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `hero/${fileName}`;

    // Upload da imagem
    const { error: uploadError } = await supabase.storage
      .from('siteimages')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Gerar URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('siteimages')
      .getPublicUrl(filePath);

    // Buscar a ordem mais alta atual
    const { data: currentImages } = await supabase
      .from('hero_images')
      .select('order')
      .order('order', { ascending: false })
      .limit(1);
    
    const nextOrder = currentImages && currentImages.length > 0 ? currentImages[0].order + 1 : 0;

    // Inserir nova imagem na tabela hero_images
    const { error: dbError } = await supabase
      .from('hero_images')
      .insert({
        url: publicUrl,
        filename: fileName,
        order: nextOrder
      });

    if (dbError) throw dbError;

    return { success: true, message: 'Imagem adicionada com sucesso' };
  } catch (error) {
    console.error('Erro ao adicionar imagem:', error);
    return { success: false, message: 'Erro ao adicionar imagem' };
  }
}

export async function deleteHeroImage(imageId) {
  try {
    // Primeiro buscar os dados da imagem
    const { data, error } = await supabase
      .from('hero_images')
      .select('*')
      .eq('id', imageId)
      .single();

    if (error) throw error;

    if (data?.filename) {
      // Deletar arquivo do storage usando o caminho correto
      const { error: storageError } = await supabase.storage
        .from('siteimages')
        .remove([`hero/${data.filename}`]);

      if (storageError) {
        console.error('Erro ao deletar arquivo:', storageError);
        return { success: false, message: 'Erro ao deletar arquivo do storage' };
      }
    }

    // Remover registro do banco
    const { error: dbError } = await supabase
      .from('hero_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      console.error('Erro ao deletar registro:', dbError);
      return { success: false, message: 'Erro ao deletar registro do banco' };
    }

    return { success: true, message: 'Imagem removida com sucesso' };
  } catch (error) {
    console.error('Erro ao remover imagem:', error);
    return { success: false, message: 'Erro ao remover imagem' };
  }
}

export async function updateHeroImageOrder(images) {
  try {
    const { error } = await supabase
      .from('hero_images')
      .upsert(
        images.map(img => ({
          id: img.id,
          order: img.order
        })),
        { onConflict: 'id' }
      );

    if (error) throw error;

    return { success: true, message: 'Ordem das imagens atualizada com sucesso' };
  } catch (error) {
    console.error('Erro ao atualizar ordem das imagens:', error);
    return { success: false, message: 'Erro ao atualizar ordem das imagens' };
  }
}
