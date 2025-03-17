import { createClient } from '@supabase/supabase-js';

// Credenciais do Supabase
const supabaseUrl = 'https://ebfjtzvwkgnhzstlqjnz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZmp0enZ3a2duaHpzdGxxam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU5NjA5NDQsImV4cCI6MjAzMTUzNjk0NH0.Ug7AYaRHXlAFbL-OU0mH8Jcj9kadIhMJjZbdCXYaSXE';

// Inicializar o cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

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

async function setupDemoData() {
  try {
    console.log('Iniciando configuração dos dados de demonstração...');
    
    // Verificar se já existem configurações
    const { data: existingSettings, error: checkError } = await supabase
      .from('site_settings')
      .select('id')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Erro ao verificar configurações existentes:', checkError);
      return;
    }
    
    let result;
    
    if (existingSettings) {
      console.log('Configurações existentes encontradas. Atualizando...');
      // Atualizar configurações existentes
      const { data, error } = await supabase
        .from('site_settings')
        .update(demoSettings)
        .eq('id', existingSettings.id)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar configurações:', error);
        return;
      }
      
      result = { success: true, message: "Configurações atualizadas com sucesso", data };
    } else {
      console.log('Nenhuma configuração encontrada. Criando novas...');
      // Criar novas configurações
      const { data, error } = await supabase
        .from('site_settings')
        .insert([demoSettings])
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar configurações:', error);
        return;
      }
      
      result = { success: true, message: "Configurações criadas com sucesso", data };
    }
    
    console.log('Resultado da operação:', result);
    console.log('Configuração dos dados de demonstração concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao configurar dados de demonstração:', error);
  }
}

// Executar a função
setupDemoData();
