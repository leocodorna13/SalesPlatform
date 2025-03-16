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
    console.log('Verificando usuário atual...');
    const session = await getSession();
    
    if (!session) {
      console.log('Nenhuma sessão encontrada');
      return null;
    }
    
    console.log('Sessão encontrada:', session.user.id);
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
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
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
        categories (id, name, slug),
        product_images (id, image_url, is_primary)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return null;
  }
}

/**
 * Cria um novo produto
 * @param {object} productData - Dados do produto
 * @param {Array} imageFiles - Arquivos de imagem
 * @returns {Promise<object|null>} - Produto criado ou null se falhar
 */
export async function createProduct(productData, imageFiles) {
  try {
    // Criar o produto
    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        title: productData.title,
        description: productData.description,
        price: productData.price,
        category_id: productData.category_id,
        status: 'available'
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Fazer upload das imagens
    if (imageFiles && imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        if (!file || file.size === 0) continue;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${product.id}/${Date.now()}.${fileExt}`;
        const filePath = `products/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);
        
        if (uploadError) {
          console.error('Erro ao fazer upload da imagem:', uploadError);
          continue;
        }
        
        const { data: publicURL } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
        
        // Salvar referência da imagem no banco
        await supabase
          .from('product_images')
          .insert([{
            product_id: product.id,
            image_url: publicURL.publicUrl,
            is_primary: i === 0 // A primeira imagem é a principal
          }]);
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
    console.log(`Atualizando status do produto ${id} para ${status}`);
    
    // Verificar se o usuário está autenticado
    const session = await getSession();
    if (!session) {
      console.error('Usuário não autenticado para atualizar status');
      return false;
    }
    
    console.log(`Usuário autenticado: ${session.user.id}`);
    
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
    
    console.log('Permissão verificada, produto encontrado:', testData);
    
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
    
    console.log('Produto atualizado com sucesso:', data);
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
    console.log(`Excluindo produto ${id}`);
    
    // Verificar se o usuário está autenticado
    const session = await getSession();
    if (!session) {
      console.error('Usuário não autenticado para excluir produto');
      return false;
    }
    
    // Primeiro excluir as imagens
    const { data: imageData, error: imagesError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', id)
      .select();
    
    if (imagesError) {
      console.error('Erro detalhado ao excluir imagens:', imagesError);
      throw imagesError;
    }
    
    console.log('Imagens excluídas:', imageData);
    
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
    
    console.log('Produto excluído:', data);
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
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
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
 * @returns {Promise<object|null>} - Categoria criada ou null se falhar
 */
export async function createCategory(name, slug) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, slug }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    return null;
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

// ======= Funções de Interessados =======

/**
 * Registra interesse em um produto
 * @param {object} userData - Dados do usuário interessado
 * @returns {Promise<boolean>} - true se o registro foi bem-sucedido
 */
export async function registerInterest(userData) {
  try {
    const { error } = await supabase
      .from('interested_users')
      .insert([{
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        product_id: userData.product_id,
        message: userData.message
      }]);
    
    if (error) throw error;
    
    // Incrementar o contador de visualizações
    await incrementProductViews(userData.product_id);
    
    return true;
  } catch (error) {
    console.error('Erro ao registrar interesse:', error);
    return false;
  }
}

/**
 * Incrementa o contador de visualizações de um produto
 * @param {string} productId - ID do produto
 * @returns {Promise<void>}
 */
export async function incrementProductViews(productId) {
  try {
    // Buscar o produto atual
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('views')
      .eq('id', productId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Incrementar as visualizações
    const { error } = await supabase
      .from('products')
      .update({ views: (product.views || 0) + 1 })
      .eq('id', productId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Erro ao incrementar visualizações:', error);
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
      .select('id, status, views');
    
    if (productsError) throw productsError;
    
    // Total de interessados
    const { count: interestedCount, error: interestedError } = await supabase
      .from('interested_users')
      .select('id', { count: 'exact' });
    
    if (interestedError) throw interestedError;
    
    // Calcular estatísticas
    const totalProducts = products.length;
    const availableProducts = products.filter(p => p.status === 'available').length;
    const soldProducts = products.filter(p => p.status === 'sold').length;
    const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
    
    return {
      totalProducts,
      availableProducts,
      soldProducts,
      totalViews,
      interestedCount: interestedCount || 0
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return {
      totalProducts: 0,
      availableProducts: 0,
      soldProducts: 0,
      totalViews: 0,
      interestedCount: 0
    };
  }
}
