const express = require('express');
const { Pool } = require('pg');
const PdfPrinter = require('pdfmake');
const fs = require('fs');
const cors = require('cors'); // Adicionado para evitar erro de comunicação

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.post('/api/records', async (req, res) => {
    try {
        const { username, data, ore, luogo, note, status, rawMonth } = req.body;
        await pool.query(
            'INSERT INTO horas (username, data, ore, luogo, note, status, raw_month) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [username, data, ore, luogo, note, status || 'Lavoro', rawMonth]
        );
        res.send({ success: true });
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/exportar_pdf', async (req, res) => {
    try {
        const { mes, username } = req.query;
        const registros = await pool.query("SELECT * FROM horas WHERE username = $1 AND raw_month = $2", [username, mes.split('-')[1]]);

        const logoBase64 = fs.existsSync('./logolbm.png') ? fs.readFileSync('./logolbm.png', {encoding: 'base64'}) : '';
        const docDefinition = {
            content: [
                { text: 'Rapporto presenze - ' + mes, fontSize: 18, bold: true, alignment: 'center' },
                { table: { widths: ['*', '*', '*', '*'], body: [['Data', 'Luogo', 'Ore', 'Status'], ...registros.rows.map(r => [r.data, r.luogo, r.ore, r.status])] } }
            ]
        };

        const printer = new PdfPrinter({ Roboto: { normal: 'Helvetica', bold: 'Helvetica-Bold' } });
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        res.setHeader('Content-Type', 'application/pdf');
        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (err) { res.status(500).send("Erro ao gerar PDF"); }
});

app.listen(process.env.PORT || 3000);
