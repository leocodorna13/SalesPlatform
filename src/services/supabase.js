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
      .eq('status', 'available') // Mostrar apenas produtos visíveis
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
    console.log('Criando produto:', productData);
    
    // Verificar se há arquivos de imagem válidos
    const validFiles = [];
    
    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        if (file && 
            typeof file === 'object' && 
            ((file instanceof File && file.size > 0) || 
             (file.name && file.type && file.size > 0))) {
          validFiles.push(file);
        } else {
          console.warn('Arquivo inválido ignorado:', file);
        }
      }
    }
    
    console.log(`${validFiles.length} arquivos válidos encontrados`);
    
    // Garantir que o bucket existe
    await ensureBucketExists('product-images');
    
    // Criar o produto
    const { data: product, error } = await supabase
      .from('products')
      .insert([{
        title: productData.title,
        description: productData.description,
        price: productData.price,
        category_id: productData.category_id || null, // Permitir categoria nula
        status: 'available',
        visible: true // Produto visível por padrão
      }])
      .select()
      .single();
    
    if (error) throw error;
    console.log('Produto criado com sucesso:', product);
    
    // Fazer upload das imagens
    if (validFiles.length > 0) {
      console.log(`Iniciando upload de ${validFiles.length} imagens`);
      
      const uploadedImages = [];
      
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        console.log(`Processando imagem ${i+1}/${validFiles.length}:`, file.name, file.type, file.size);
        
        try {
          // Gerar nome de arquivo único
          const fileExt = file.name.split('.').pop();
          const timestamp = new Date().getTime();
          const fileName = `${product.id}/${timestamp}-${i}.${fileExt}`;
          const filePath = `products/${fileName}`;
          
          console.log('Caminho do arquivo no storage:', filePath);
          
          // Fazer upload do arquivo diretamente
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type
            });
          
          if (uploadError) {
            console.error('Erro ao fazer upload da imagem:', uploadError);
            continue;
          }
          
          console.log('Upload concluído com sucesso:', uploadData);
          
          // Obter URL pública
          const { data: publicURLData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
          
          const publicUrl = publicURLData?.publicUrl;
          console.log('URL pública gerada:', publicUrl);
          
          if (!publicUrl) {
            console.error('Falha ao gerar URL pública para a imagem');
            continue;
          }
          
          // Salvar referência da imagem no banco
          const { data: imageData, error: imageError } = await supabase
            .from('product_images')
            .insert([{
              product_id: product.id,
              image_url: publicUrl,
              is_primary: i === 0 // A primeira imagem é a principal
            }])
            .select();
          
          if (imageError) {
            console.error('Erro ao salvar referência da imagem:', imageError);
          } else {
            console.log('Referência da imagem salva com sucesso:', imageData);
            uploadedImages.push({
              url: publicUrl,
              isPrimary: i === 0
            });
          }
        } catch (uploadErr) {
          console.error('Exceção durante o upload:', uploadErr);
        }
      }
      
      console.log(`Upload concluído para ${uploadedImages.length} de ${validFiles.length} imagens`);
    } else {
      console.log('Nenhuma imagem válida para upload');
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
    
    // Buscar as imagens do produto antes de excluí-las
    const { data: productImages, error: fetchError } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', id);
    
    if (fetchError) {
      console.error('Erro ao buscar imagens do produto:', fetchError);
    } else {
      console.log(`Encontradas ${productImages?.length || 0} imagens para exclusão`);
      
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
    
    console.log('Referências de imagens excluídas:', imageData);
    
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
    
    // Total de produtos disponíveis
    const availableProducts = products.filter(p => p.status === 'available').length;
    
    // Total de produtos vendidos
    const soldProducts = products.filter(p => p.status === 'sold').length;
    
    // Total de visualizações
    const totalViews = products.reduce((sum, product) => sum + (product.views || 0), 0);
    
    // Produtos mais visualizados
    const { data: mostViewedProducts, error: viewsError } = await supabase
      .from('products')
      .select('id, title, views')
      .order('views', { ascending: false })
      .limit(5);
    
    if (viewsError) throw viewsError;
    
    // Total de interessados
    const { count: interestCount, error: interestError } = await supabase
      .from('interested_users')
      .select('id', { count: 'exact' });
    
    if (interestError) throw interestError;
    
    return {
      totalProducts: products.length,
      availableProducts,
      soldProducts,
      interestCount,
      totalViews,
      mostViewedProducts
    };
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
      console.log(`Bucket ${bucketName} já existe.`);
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
    
    console.log(`Bucket ${bucketName} criado com sucesso.`);
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
  console.log('Iniciando teste de upload de imagem...');
  
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
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    const publicUrl = publicUrlData?.publicUrl;
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
        console.log('Tornando produtos visíveis:', productIds);
        result = await supabase
          .from('products')
          .update({ visible: true, updated_at: new Date().toISOString() })
          .in('id', productIds);
        console.log('Resultado da operação markVisible:', result);
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
    
    console.log(`Alterando visibilidade do produto ${productId} para: ${newVisibility}`);
    
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
