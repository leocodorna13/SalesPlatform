// Script para registro do Service Worker e gerenciamento de notificações

// Detectar se é um dispositivo móvel
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Variável para armazenar o evento de instalação
let deferredPrompt;
let installButton;

// Registra o service worker
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      console.log('Tentando registrar service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registrado com sucesso:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Falha ao registrar o Service Worker:', error);
      return null;
    }
  }
  console.log('Service Worker não suportado neste navegador');
  return null;
}

// Solicita permissão para enviar notificações
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Este navegador não suporta notificações');
    return false;
  }

  if (Notification.permission === 'granted') {
    console.log('Permissão já concedida');
    return true;
  }

  if (Notification.permission !== 'denied') {
    console.log('Solicitando permissão...');
    try {
      const permission = await Notification.requestPermission();
      console.log('Permissão concedida:', permission === 'granted');
      return permission === 'granted';
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      return false;
    }
  }

  console.log('Permissão negada anteriormente');
  return false;
}

// Função para inscrever o usuário para receber notificações push
async function subscribeToPushNotifications(registration) {
  try {
    console.log('Tentando inscrever para notificações push...');
    // Utiliza a chave pública VAPID gerada
    const vapidPublicKey = 'BAG0zdDLenMECfMFnl8gfQo2YHhdzE_BHS5rUHc8YdL2NWLXoLR43MkS4aDaKzL9R44FBQrKRG4R_sc-iX_BLvA';
    
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    
    // Verificar se já existe uma assinatura
    let subscription = await registration.pushManager.getSubscription();
    
    // Se já existe uma assinatura, retorne-a
    if (subscription) {
      console.log('Assinatura existente encontrada:', subscription);
      // Garantir que a assinatura existente seja salva no servidor
      await saveSubscriptionToServer(subscription);
      return subscription;
    }
    
    // Caso contrário, crie uma nova assinatura
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });
    
    console.log('Inscrição de notificação bem-sucedida:', subscription);
    
    // Enviar a inscrição para o servidor
    await saveSubscriptionToServer(subscription);
    
    // Notificar a página de que a assinatura foi concluída
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SUBSCRIPTION_COMPLETE',
        subscription: subscription
      });
    }
    
    // Broadcast um evento personalizado para que outras partes do código saibam que as notificações foram ativadas
    document.dispatchEvent(new CustomEvent('notificationsEnabled'));
    
    return subscription;
  } catch (error) {
    console.error('Falha ao se inscrever para notificações push:', error);
    return null;
  }
}

// Enviar a inscrição para o servidor
async function saveSubscriptionToServer(subscription) {
  try {
    console.log('Enviando assinatura para o servidor...');
    const response = await fetch('/api/save-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha ao salvar assinatura no servidor: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Assinatura salva com sucesso:', data);
    return data.success;
  } catch (error) {
    console.error('Erro ao salvar assinatura no servidor:', error);
    return false;
  }
}

// Função auxiliar para converter a chave VAPID
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Verifica se o app já está instalado
function checkIfAppIsInstalled() {
  // Método 1: Verificar se está em modo standalone (já instalado)
  if (window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true) {
    console.log('Aplicativo já está instalado (modo standalone)');
    return true;
  }
  
  // Método 2: Verificar se está sendo executado como PWA
  if (document.referrer.startsWith('android-app://')) {
    console.log('Aplicativo já está instalado (android app)');
    return true;
  }
  
  return false;
}

// Inicializar quando a página carregar
window.addEventListener('load', async () => {
  try {
    console.log('Inicializando PWA...');
    const isMobile = isMobileDevice();
    console.log('Dispositivo móvel detectado:', isMobile);
    
    // Verificar se o app já está instalado
    const isInstalled = checkIfAppIsInstalled();
    
    // Obter botão de instalação
    const installAppButton = document.getElementById('install-app');
    if (installAppButton) {
      // Se já estiver instalado, esconder o botão
      if (isInstalled) {
        installAppButton.style.display = 'none';
      } else {
        installAppButton.style.display = 'block';
      }
    }
    
    // Garantir que esteja registrado antes de continuar
    let registration = null;
    
    // Em dispositivos móveis, precisamos verificar se o service worker já está registrado
    if (isMobile && 'serviceWorker' in navigator) {
      try {
        // Tentar obter registro existente
        registration = await navigator.serviceWorker.ready;
        console.log('Service Worker já registrado:', registration);
      } catch (error) {
        console.log('Nenhum service worker registrado, registrando novo...');
        registration = await registerServiceWorker();
      }
    } else {
      registration = await registerServiceWorker();
    }
    
    // Lidar com o evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevenir o comportamento padrão
      e.preventDefault();
      // Armazenar o evento para uso posterior
      deferredPrompt = e;
      
      // Atualizar a UI para mostrar o botão de instalação
      if (installAppButton) {
        installAppButton.style.display = 'block';
        
        // Adicionar evento de clique para instalar o app
        installAppButton.addEventListener('click', async () => {
          // Mostrar o prompt de instalação
          deferredPrompt.prompt();
          // Aguardar a escolha do usuário
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`Usuário ${outcome === 'accepted' ? 'aceitou' : 'recusou'} a instalação`);
          // Limpar a referência
          deferredPrompt = null;
          
          // Se aceitou, esconder o botão
          if (outcome === 'accepted') {
            installAppButton.style.display = 'none';
          }
        });
      }
    });
    
    // Quando o app é instalado, esconder o botão
    window.addEventListener('appinstalled', (e) => {
      console.log('Aplicativo instalado com sucesso!');
      if (installAppButton) {
        installAppButton.style.display = 'none';
      }
      // Limpar a referência ao prompt
      deferredPrompt = null;
    });
    
    if (registration) {
      // Adicionar botão para habilitar notificações
      const notificationButton = document.getElementById('enable-notifications');
      
      if (notificationButton) {
        // Usar touchstart para dispositivos móveis
        const eventType = isMobile ? 'touchstart' : 'click';
        
        notificationButton.addEventListener(eventType, async (e) => {
          e.preventDefault();
          console.log('Botão de notificações clicado');
          
          const permission = await requestNotificationPermission();
          
          if (permission) {
            const subscription = await subscribeToPushNotifications(registration);
            
            if (subscription) {
              notificationButton.textContent = 'Notificações ativadas!';
              notificationButton.disabled = true;
              
              // Mostrar notificação de confirmação
              try {
                new Notification('Notificações Ativadas', {
                  body: 'Você receberá alertas quando novos produtos forem adicionados!',
                  icon: '/android-chrome-192x192.png'
                });
              } catch (error) {
                console.error('Erro ao mostrar notificação:', error);
              }
              
              // Esconder o container de notificação (evento personalizado)
              document.dispatchEvent(new CustomEvent('notificationsEnabled'));
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('Erro ao inicializar PWA:', error);
  }
});

// Adicionar listener para mensagens do service worker
navigator.serviceWorker.addEventListener('message', (event) => {
  console.log('Mensagem recebida do service worker:', event.data);
  if (event.data && event.data.type === 'PUSH_SUBSCRIBED') {
    console.log('Recebida confirmação de assinatura do service worker');
    document.dispatchEvent(new CustomEvent('notificationsEnabled'));
  }
});
