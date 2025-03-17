import { supabase } from '../../services/supabase';

export async function POST() {
  try {
    // Verificar se já existem configurações
    const { data: existingSettings } = await supabase
      .from('site_settings')
      .select('id')
      .single();
    
    // Dados de demonstração para as configurações do site
    const demoSettings = {
      heroTitle: "Desapegos dos Martins",
      heroDescription: "Encontre produtos de qualidade a preços acessíveis. Todos os itens estão em ótimo estado e prontos para um novo lar.",
      heroImageUrl: "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      contactPhone: "(11) 98765-4321",
      contactWhatsapp: "5511987654321",
      paymentMethods: "Pix, Dinheiro, Cartão de Crédito (com juros da maquininha)",
      whatsappMessage: "Olá! Vi seu produto no site Desapegos dos Martins e tenho interesse!",
      projectName: "Desapegos dos Martins"
    };
    
    let result;
    
    if (existingSettings) {
      // Atualizar configurações existentes
      const { data, error } = await supabase
        .from('site_settings')
        .update(demoSettings)
        .eq('id', existingSettings.id)
        .select()
        .single();
      
      if (error) throw error;
      result = { success: true, message: "Configurações atualizadas com sucesso", data };
    } else {
      // Criar novas configurações
      const { data, error } = await supabase
        .from('site_settings')
        .insert([demoSettings])
        .select()
        .single();
      
      if (error) throw error;
      result = { success: true, message: "Configurações criadas com sucesso", data };
    }
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Erro ao configurar dados de demonstração:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: `Erro ao configurar dados de demonstração: ${error.message}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
