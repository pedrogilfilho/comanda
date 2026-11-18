// Configuração lida do ambiente na hora do build (variáveis NEXT_PUBLIC_*)

// Em produção é "/api": o Next encaminha para o backend (rewrite em next.config.js)
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
