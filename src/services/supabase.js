import { createClient } from '@supabase/supabase-js';

// Inicializar o cliente Supabase
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://seu-projeto.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'sua-chave-anonima';

// Verificar se as variáveis de ambiente estão definidas
if (supabaseUrl === 'https://seu-projeto.supabase.co' || supabaseAnonKey === 'sua-chave-anonima') {
  console.warn('⚠️ Variáveis de ambiente do Supabase não configuradas. Usando valores padrão para desenvolvimento.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    } else {
      // Se status for 'all', ainda assim excluímos os produtos ocultos
      query = query.neq('status', 'hidden');
    }
    
    // Filtrar apenas produtos visíveis para o público
    query = query.eq('visible', true);
    
    const { data, error } = await query;
    
    if (error) throw error;
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
        .neq('status', 'hidden')  // Mostrar produtos disponíveis e vendidos, mas não ocultos
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
      .neq('status', 'hidden')  // Mostrar produtos disponíveis e vendidos, mas não ocultos
      .eq('visible', true) // Mostrar apenas produtos visíveis
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
        product_images (*),
        categories (*)
      `)
      .eq('category_id', categoryId)
      .eq('status', 'available')
      .eq('visible', true) // Mostrar apenas produtos visíveis
      .neq('id', currentProductId)
      .limit(4);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar produtos relacionados:', error);
    return [];
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
    
    // Criar o produto
    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        title: productData.title,
        description: productData.description,
        price: productData.price,
        category_id: productData.category_id || null,
        status: 'available',
        visible: true
      }])
      .select()
      .single();
    
    if (error) throw error;
    
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
    
    // Buscar as imagens do produto antes de excluí-las
    const { data: productImages, error: fetchError } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', id);
    
    if (fetchError) {
      console.error('Erro ao buscar imagens do produto:', fetchError);
    } else {
      // Excluir os arquivos do storage
      if (productImages && productImages.length > 0) {
        try {
          // Excluir a pasta inteira do produto no storage
          const { data: storageData, error: storageError } = await supabase.storage
            .from('product-images')
            .remove([`products/${id}`]);
          
          if (storageError) {
            console.error('Erro ao excluir arquivos do storage:', storageError);
            
            // Tentar excluir arquivos individuais se a exclusão da pasta falhar
            for (const image of productImages) {
              // Extrair o caminho do arquivo da URL
              const imageUrl = image.image_url;
              const urlParts = imageUrl.split('/');
              const fileName = urlParts[urlParts.length - 1];
              const filePath = `products/${id}/${fileName}`;
              
              console.log(`Tentando excluir arquivo individual: ${filePath}`);
              
              const { error: individualError } = await supabase.storage
                .from('product-images')
                .remove([filePath]);
              
              if (individualError) {
                console.error(`Erro ao excluir arquivo ${filePath}:`, individualError);
              } else {
                console.log(`Arquivo ${filePath} excluído com sucesso`);
              }
            }
          } else {
            console.log('Arquivos excluídos do storage:', storageData);
          }
        } catch (storageExcError) {
          console.error('Exceção ao excluir arquivos do storage:', storageExcError);
        }
      }
    }
    
    // Excluir as referências das imagens no banco
    const { data: imageData, error: imagesError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', id)
      .select();
    
    if (imagesError) {
      console.error('Erro detalhado ao excluir imagens:', imagesError);
      throw imagesError;
    }
    
    // Depois excluir o produto
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Erro detalhado ao excluir produto:', error);
      throw error;
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
    // Buscar categorias
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    // Para cada categoria, buscar a contagem de produtos
    const categoriesWithCount = await Promise.all(
      (categories || []).map(async (category) => {
        // Buscar a contagem de produtos disponíveis nesta categoria
        const { count, error: countError } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('category_id', category.id)
          .eq('status', 'available');
        
        if (countError) {
          console.error(`Erro ao contar produtos para categoria ${category.id}:`, countError);
          return { ...category, product_count: 0 };
        }
        
        return { ...category, product_count: count || 0 };
      })
    );
    
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
    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 é o código para "não encontrado", que é o que queremos
      throw checkError;
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
    // Verificar se o bucket já existe
    const { data: buckets, error: listError } = await supabase.storage
      .listBuckets();
    
    if (listError) {
      console.error('Erro ao listar buckets:', listError);
      return false;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      return true;
    }
    
    // Se não existe, criar o bucket
    console.log(`Bucket ${bucketName} não existe. Criando...`);
    
    // Verificar se o usuário tem permissão para criar buckets
    const { error: createError } = await supabase.storage
      .createBucket(bucketName, {
        public: true
      });
    
    if (createError) {
      console.error(`Erro ao criar bucket ${bucketName}:`, createError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar/criar bucket:', error);
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
        fileSizeLimit: 5242880, // 5MB
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
        upsert: true
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
    
    // Verificar se a categoria já existe
    const { data: existingCategory, error: searchError } = await supabase
      .from('categories')
      .select('*')
      .ilike('name', name)
      .single();
    
    if (!searchError && existingCategory) {
      return existingCategory;
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
      const { title, price, description, category_id, image } = productData;
      
      if (!title || !price || !category_id || !image) {
        console.error('Dados de produto incompletos:', productData);
        continue;
      }
      
      // Criar produto no Supabase
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert([{
          title,
          price,
          description,
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
      
      // Fazer upload da imagem
      if (image && product) {
        try {
          const fileExt = image.name.split('.').pop();
          const timestamp = new Date().getTime();
          const fileName = `${product.id}/${timestamp}.${fileExt}`;
          const filePath = `products/${fileName}`;
          
          // Fazer upload do arquivo
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, image, {
              cacheControl: '3600',
              upsert: true,
              contentType: image.type
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
              is_primary: true
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
    // Garantir que o bucket existe
    const bucketExists = await createBucketIfNotExists(bucketName);
    if (!bucketExists) {
      throw new Error('Não foi possível criar o bucket para armazenamento de imagens');
    }

    // Gerar um nome de arquivo único
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    
    // Fazer upload do arquivo
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    
    // Obter URL pública da imagem
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    return {
      success: true,
      url: urlData.publicUrl,
      error: null
    };
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    return {
      success: false,
      url: null,
      error: error.message
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
export async function uploadMultipleImages(files, bucketName = 'site-images', folder = 'hero') {
  try {
    // Garantir que o bucket existe
    const bucketExists = await createBucketIfNotExists(bucketName);
    if (!bucketExists) {
      throw new Error('Não foi possível criar o bucket para armazenamento de imagens');
    }

    const uploadPromises = [];
    for (const file of files) {
      // Gerar um nome de arquivo único
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      // Fazer upload do arquivo
      const uploadPromise = supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
        .then(({ data, error }) => {
          if (error) throw error;
          
          // Obter URL pública da imagem
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);
          
          return urlData.publicUrl;
        });
      
      uploadPromises.push(uploadPromise);
    }
    
    // Esperar todos os uploads terminarem
    const urls = await Promise.all(uploadPromises);
    
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
 * @param {File|null} heroImageFile - Arquivo de imagem para o hero (opcional)
 * @param {File[]|null} heroCarouselFiles - Arquivos de imagem para o carrossel (opcional)
 * @returns {Promise<object>} - Resultado da operação
 */
export async function updateSiteSettings(settings, heroImageFile = null, heroCarouselFiles = null) {
  try {
    const supabase = createClient();
    let updatedSettings = { ...settings };
    
    // Upload hero image if provided
    if (heroImageFile) {
      const heroImageUrl = await uploadImage(heroImageFile);
      if (heroImageUrl) {
        updatedSettings.heroImageUrl = heroImageUrl;
      }
    }
    
    // Upload carousel images if provided
    if (heroCarouselFiles && heroCarouselFiles.length > 0) {
      const newCarouselUrls = await uploadMultipleImages(heroCarouselFiles);
      
      // Combine with existing carousel images
      let existingUrls = [];
      try {
        existingUrls = JSON.parse(settings.heroCarouselUrls || '[]');
      } catch (e) {
        console.error('Erro ao analisar URLs do carrossel:', e);
        existingUrls = [];
      }
      
      // Merge existing and new URLs
      const combinedUrls = [...existingUrls, ...newCarouselUrls];
      
      // Update the settings with the combined URLs
      updatedSettings.heroCarouselUrls = JSON.stringify(combinedUrls);
    }
    
    // Check if settings already exist
    const { data: existingSettings } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1);
    
    let result;
    
    if (existingSettings && existingSettings.length > 0) {
      // Update existing settings
      const { data, error } = await supabase
        .from('site_settings')
        .update(updatedSettings)
        .eq('id', existingSettings[0].id);
      
      if (error) {
        console.error('Erro ao atualizar configurações:', error);
        return { success: false, message: `Erro ao atualizar configurações: ${error.message}` };
      }
      
      result = { success: true, message: 'Configurações atualizadas com sucesso!' };
    } else {
      // Insert new settings
      const { data, error } = await supabase
        .from('site_settings')
        .insert([updatedSettings]);
      
      if (error) {
        console.error('Erro ao inserir configurações:', error);
        return { success: false, message: `Erro ao inserir configurações: ${error.message}` };
      }
      
      result = { success: true, message: 'Configurações criadas com sucesso!' };
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return { success: false, message: `Erro ao processar configurações: ${error.message}` };
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
        product_images (
          id,
          url,
          is_primary
        ),
        categories (
          id,
          name,
          slug
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
 * Upload multiple images to Supabase Storage
 * @param {File[]} files - Array of files to upload
 * @param {string} bucketName - Name of the bucket to upload to
 * @param {string} folder - Folder within the bucket to upload to
 * @returns {Promise<string[]>} - Array of URLs of the uploaded images
 */
async function uploadMultipleImages(files, bucketName = 'site-images', folder = 'hero') {
  try {
    if (!files || files.length === 0) {
      return [];
    }
    
    const supabase = createClient();
    const urls = [];
    
    // Upload each file and collect the URLs
    for (const file of files) {
      if (!file || file.size === 0) continue;
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Erro ao fazer upload da imagem:', error);
        continue;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      urls.push(publicUrl);
    }
    
    return urls;
  } catch (error) {
    console.error('Erro ao fazer upload das imagens:', error);
    return [];
  }
}

/**
 * Update site settings
 * @param {Object} settings - Site settings to update
 * @param {File} heroImageFile - Hero image file to upload (optional)
 * @param {File[]} heroCarouselFiles - Hero carousel image files to upload (optional)
 * @returns {Promise<Object>} - Result of the update operation
 */
async function updateSiteSettings(settings, heroImageFile = null, heroCarouselFiles = null) {
  try {
    const supabase = createClient();
    let updatedSettings = { ...settings };
    
    // Upload hero image if provided
    if (heroImageFile) {
      const heroImageUrl = await uploadImage(heroImageFile);
      if (heroImageUrl) {
        updatedSettings.heroImageUrl = heroImageUrl;
      }
    }
    
    // Upload carousel images if provided
    if (heroCarouselFiles && heroCarouselFiles.length > 0) {
      const newCarouselUrls = await uploadMultipleImages(heroCarouselFiles);
      
      // Combine with existing carousel images
      let existingUrls = [];
      try {
        existingUrls = JSON.parse(settings.heroCarouselUrls || '[]');
      } catch (e) {
        console.error('Erro ao analisar URLs do carrossel:', e);
        existingUrls = [];
      }
      
      // Merge existing and new URLs
      const combinedUrls = [...existingUrls, ...newCarouselUrls];
      
      // Update the settings with the combined URLs
      updatedSettings.heroCarouselUrls = JSON.stringify(combinedUrls);
    }
    
    // Check if settings already exist
    const { data: existingSettings } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1);
    
    let result;
    
    if (existingSettings && existingSettings.length > 0) {
      // Update existing settings
      const { data, error } = await supabase
        .from('site_settings')
        .update(updatedSettings)
        .eq('id', existingSettings[0].id);
      
      if (error) {
        console.error('Erro ao atualizar configurações:', error);
        return { success: false, message: `Erro ao atualizar configurações: ${error.message}` };
      }
      
      result = { success: true, message: 'Configurações atualizadas com sucesso!' };
    } else {
      // Insert new settings
      const { data, error } = await supabase
        .from('site_settings')
        .insert([updatedSettings]);
      
      if (error) {
        console.error('Erro ao inserir configurações:', error);
        return { success: false, message: `Erro ao inserir configurações: ${error.message}` };
      }
      
      result = { success: true, message: 'Configurações criadas com sucesso!' };
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return { success: false, message: `Erro ao processar configurações: ${error.message}` };
  }
}

/**
 * Remove an image from the carousel
 * @param {string} imageUrl - URL of the image to remove
 * @returns {Promise<Object>} - Result of the operation
 */
async function removeCarouselImage(imageUrl) {
  try {
    const supabase = createClient();
    
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
      return { success: false, message: 'Erro ao processar URLs do carrossel' };
    }
    
    // Remove the specified URL
    const updatedUrls = carouselUrls.filter(url => url !== imageUrl);
    
    // Update settings with new URLs
    const { data, error } = await supabase
      .from('site_settings')
      .update({ heroCarouselUrls: JSON.stringify(updatedUrls) })
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

export {
  getProducts,
  getProductById,
  getProductsByCategory,
  getCategories,
  getCategoryBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadImage,
  uploadMultipleImages,
  registerInterest,
  getInterests,
  getInterestsByProduct,
  deleteInterest,
  getSiteSettings,
  updateSiteSettings,
  removeCarouselImage,
  getCurrentUser,
  signIn,
  signOut,
  createClient
};
