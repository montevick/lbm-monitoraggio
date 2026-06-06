const express = require('express');
const { Pool } = require('pg');
const PdfPrinter = require('pdfmake');
const app = express();
app.use(express.json());
app.use(express.static('.'));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ROTA PARA SALVAR HORAS
app.post('/api/horas', async (req, res) => {
    const { data, local, horas, status } = req.body;
    await pool.query('INSERT INTO horas (data, local, horas, status) VALUES ($1, $2, $3, $4)', [data, local, horas, status]);
    res.send('Salvo!');
});

// ROTA PARA GERAR PDF (A MÁGICA ACONTECE AQUI)
app.get('/exportar_pdf', async (req, res) => {
    const { mes } = req.query; // Ex: 2026-05
    const registros = await pool.query("SELECT * FROM horas WHERE data LIKE $1", [`%${mes}%`]);

    const docDefinition = {
        content: [
            { text: 'LBM IMPRESA DI PULIZIE', fontSize: 20, bold: true, alignment: 'center' },
            { text: '\nRelatório de Presenças - ' + mes + '\n\n' },
            {
                table: {
                    widths: ['*', '*', '*', '*'],
                    body: [
                        ['Data', 'Local', 'Horas', 'Status'],
                        ...registros.rows.map(r => [r.data, r.local, r.horas, r.status || 'Normal'])
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

app.listen(3000);
