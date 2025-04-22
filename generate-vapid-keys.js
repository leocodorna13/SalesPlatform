// Script para gerar chaves VAPID para o sistema de notificações
import webpush from 'web-push';

// Gerar as chaves VAPID
const vapidKeys = webpush.generateVAPIDKeys();

console.log('Chaves VAPID geradas com sucesso:');
console.log('===================================');
console.log('Chave pública:');
console.log(vapidKeys.publicKey);
console.log('\nChave privada:');
console.log(vapidKeys.privateKey);
console.log('===================================');
console.log('\nUtilize estas chaves em seu arquivo .env da seguinte forma:');
console.log('\nVAPID_PUBLIC_KEY="' + vapidKeys.publicKey + '"');
console.log('VAPID_PRIVATE_KEY="' + vapidKeys.privateKey + '"');
console.log('VAPID_SUBJECT="mailto:contato@exemplo.com" (Substitua pelo seu email)');
