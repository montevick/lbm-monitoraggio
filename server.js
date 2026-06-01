// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com o Banco de Dados PostgreSQL do Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Inicializar as tabelas no banco de dados se não existirem
async function initDB() {
    try {
        // Tabela de Usuários
        await pool.query(`
            CREATE TABLE IF NOT EXISTS utenti (
                username VARCHAR(50) PRIMARY KEY,
                password VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                role VARCHAR(20) DEFAULT 'user'
            );
        `);
        // Tabela de Horas
        await pool.query(`
            CREATE TABLE IF NOT EXISTS record_ore (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) REFERENCES utenti(username) ON DELETE CASCADE,
                data VARCHAR(20) NOT NULL,
                ore VARCHAR(10) NOT NULL,
                luogo VARCHAR(100) NOT NULL,
                note TEXT,
                raw_month VARCHAR(5) NOT NULL
            );
        `);
        console.log("Banco de dados inicializado com sucesso!");
    } catch (err) {
        console.error("Erro ao inicializar banco de dados:", err);
    }
}
initDB();

// MASTER ADMIN CREDENTIALS (Vem das variáveis de ambiente do Render)
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "1570751";

// ROTA: Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const userClean = username.trim().toLowerCase().replace(/\s+/g, '');

    if (userClean === ADMIN_USER && password === ADMIN_PASS) {
        return res.json({ username: ADMIN_USER, name: "Luan (Amministratore)", role: "admin" });
    }

    try {
        const result = await pool.query('SELECT * FROM utenti WHERE username = $1 AND password = $2', [userClean, password]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            return res.json({ username: user.username, name: user.name, role: user.role });
        } else {
            return res.status(401).json({ error: "Credenziali errate!" });
        }
    } catch (err) {
        return res.status(500).json({ error: "Errore del server" });
    }
});

// ROTA: Buscar dados do usuário (registros de horas)
app.get('/api/records/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const result = await pool.query('SELECT * FROM record_ore WHERE username = $1 ORDER BY id DESC', [username]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Errore nel recupero dati" });
    }
});

// ROTA: Salvar novo turno (Ponto)
app.post('/api/records', async (req, res) => {
    const { username, data, ore, luogo, note, rawMonth } = req.body;
    try {
        await pool.query(
            'INSERT INTO record_ore (username, data, ore, luogo, note, raw_month) VALUES ($1, $2, $3, $4, $5, $6)',
            [username, data, ore, luogo, note, rawMonth]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Errore nel salvataggio" });
    }
});

// ROTA: Buscar TODOS os usuários (Apenas Admin)
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT username, name, password, role FROM utenti ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Errore" });
    }
});

// ROTA: Buscar TODOS os registros de TODOS os usuários (Apenas Admin)
app.get('/api/admin/records', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM record_ore ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Errore" });
    }
});

// ROTA: Criar Novo Usuário (Apenas Admin)
app.post('/api/admin/users', async (req, res) => {
    const { username, password, name } = req.body;
    const userClean = username.trim().toLowerCase().replace(/\s+/g, '');
    try {
        await pool.query('INSERT INTO utenti (username, password, name, role) VALUES ($1, $2, $3, \'user\')', [userClean, password, name]);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: "Username già esistente" });
    }
});

// ROTA: Deletar Usuário (Apenas Admin)
delete_user_route: app.delete('/api/admin/users/:username', async (req, res) => {
    const { username } = req.params;
    try {
        await pool.query('DELETE FROM utenti WHERE username = $1', [username]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Errore" });
    }
});

// ROTA: Deletar Registro de Hora específico (Apenas Admin)
app.delete('/api/admin/records/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM record_ore WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Errore" });
    }
});

// Servir o Front-end estático (Opcional se quiser rodar tudo no Render)
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
