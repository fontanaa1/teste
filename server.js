import app from './api/index.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor local rodando em http://localhost:${PORT}`);
});