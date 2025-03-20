// Este arquivo está sendo removido pois não vamos usar o middleware do Supabase
// Estamos usando a opção mais simples com persistSession no createClient

export function onRequest(context, next) {
  // Middleware básico que apenas passa a requisição adiante
  return next();
}