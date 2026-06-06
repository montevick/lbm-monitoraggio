const express = require('express');
const { Pool } = require('pg');
const PdfPrinter = require('pdfmake');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.static('.'));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ROTA SALVAR ATUALIZADA
app.post('/api/records', async (req, res) => {
    const { username, data, ore, luogo, note, status, rawMonth } = req.body;
    await pool.query(
        'INSERT INTO horas (username, data, ore, luogo, note, status, raw_month) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [username, data, ore, luogo, note, status || 'Lavoro', rawMonth]
    );
    res.send('Salvo!');
});

// ROTA PDF ATUALIZADA
app.get('/exportar_pdf', async (req, res) => {
    const { mes } = req.query; // 2026-05
    const registros = await pool.query("SELECT * FROM horas WHERE data LIKE $1", [`%/${mes.split('-')[1]}/%`]);

    const logoBase64 = fs.existsSync('./logolbm.png') ? fs.readFileSync('./logolbm.png', {encoding: 'base64'}) : '';

    const docDefinition = {
        images: { logo: 'data:image/png;base64,' + logoBase64 },
        content: [
            logoBase64 ? { image: 'logo', width: 80, alignment: 'center' } : { text: 'LBM', alignment: 'center' },
            { text: '\nRapporto presenze - ' + mes, fontSize: 18, bold: true, alignment: 'center' },
            {
                table: {
                    widths: ['*', '*', '*', '*'],
                    body: [
                        ['Data', 'Luogo', 'Ore', 'Status'],
                        ...registros.rows.map(r => [r.data, r.luogo, r.ore, r.status])
                    ]
                }
            }
        ]
    };

    const printer = new PdfPrinter({ Roboto: { normal: 'Helvetica', bold: 'Helvetica-Bold' } });
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    pdfDoc.pipe(res);
    pdfDoc.end();
});

app.listen(process.env.PORT || 3000);
