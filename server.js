// =============================================================
// index.js — Servidor Principal da API do B7Store
// =============================================================
//
// Fluxo de uma Requisição (com Middlewares):
//
//     Navegador / Frontend
//              │
//              ▼
//         [cors()]         ← Middleware 1: Libera acesso para o Frontend
//              │
//              ▼
//      [express.json()]    ← Middleware 2: Transforma o corpo da requisição em JSON
//              │
//              ▼
//        Rota correta      ← A requisição chega na rota certa da API
//    (ex: GET /api/produtos)
//              │
//              ▼ (se der erro)
//      [errorHandler]      ← Captura qualquer erro das rotas e salva o servidor
//              │
//              ▼
//    Resposta enviada de volta ao Frontend
//
// =============================================================

// ─── 1. Importações das Dependências ─────────────────────────
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ─── 2. Criação da Aplicação Express ─────────────────────────
const app = express();

// ─── 3. Middlewares Globais do Express ────────────────────────
app.use(cors());
app.use(express.json());

// ─── 4. Inicialização do Supabase ─────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


// ─── 5. Rota Raiz (Boas-Vindas) ───────────────────────────────
// Crucial para a Vercel: Garante que quem acessar o link principal veja que a API está online!
app.get('/', (req, res) => {
    res.json({ 
        sucesso: true,
        mensagem: '🚀 Bem-vindo à API Oficial da B7Store!' 
    });
});

// Outro mapeamento opcional para caso acessem direto /api
app.get('/api', (req, res) => {
    res.json({ 
        sucesso: true,
        mensagem: '📦 Endpoints da API B7Store operacionais.' 
    });
});


// ─── 6. Definição das Rotas da Aplicação ──────────────────────

// ROTA: Listar Produtos (Pública para a Vitrine)
app.get('/api/produtos', async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .order('criado_em', { ascending: false });

        if (error) throw new Error(error.message);
        return res.status(200).json(data);
    } catch (err) {
        next(err); // Repassa o erro para o Middleware de Erro Global
    }
});

// ROTA: Login do Admin (Gera Token)
app.post('/api/auth/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ sucesso: false, error: "E-mail e senha são obrigatórios." });
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return res.status(401).json({ sucesso: false, error: "Acesso negado: " + error.message });

        return res.status(200).json({ 
            sucesso: true,
            message: "Login efetuado com sucesso!", 
            token: data.session.access_token 
        });
    } catch (err) {
        next(err);
    }
});

// ROTA: Cadastrar Novo Produto (Protegida por Token)
app.post('/api/produtos', async (req, res, next) => {
    try {
        const { nome, preco, imagem_url, info } = req.body;
        const authHeader = req.headers.authorization;
        
        if (!authHeader) return res.status(401).json({ sucesso: false, error: "Não autorizado. Token faltando." });
        const token = authHeader.split(' ')[1];

        // Valida se o token pertence a um usuário válido no Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ sucesso: false, error: "Sessão inválida ou expirada." });

        if (!nome || !preco) {
            return res.status(400).json({ sucesso: false, error: "Nome e preço são obrigatórios." });
        }

        const { data, error } = await supabase
            .from('produtos')
            .insert([{ nome, preco: parseFloat(preco), imagem_url, info }]);

        if (error) throw new Error(error.message);
        return res.status(201).json({ sucesso: true, message: "Produto cadastrado com sucesso!" });
    } catch (err) {
        next(err);
    }
});


// ─── 7. Tratamento de Rota não encontrada (404) ──────────────
app.use((req, res) => {
    res.status(404).json({
        sucesso: false,
        mensagem: `A rota '${req.url}' não existe na API da B7Store.`
    });
});


// ─── 8. Middleware de Erros Global (errorHandler) ─────────────
app.use((err, req, res, next) => {
    console.error("❌ ERRO CAPTURADO NA API:", err.message);
    res.status(500).json({
        sucesso: false,
        error: "Erro interno no servidor do backend.",
        detalhes: err.message
    });
});


// ─── 9. Inicializando o Servidor Local ────────────────────────
const PORTA = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORTA, () => {
        console.log('');
        console.log(' ==========================================');
        console.log(` 🛍️  Servidor da B7Store Ativo Localmente!`);
        console.log(` Acesso Local: http://localhost:${PORTA}`);
        console.log(' ==========================================');
        console.log('');
        console.log('📋 Rotas da API Disponíveis:');
        console.log(`   GET  /`);
        console.log(`   GET  /api/produtos`);
        console.log(`   POST /api/auth/login`);
        console.log(`   POST /api/produtos (Protegida)`);
        console.log('');
    });
}

// Exporta o app para que a Vercel consiga ler em produção
module.exports = app;