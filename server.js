const favicon = require('serve-favicon');
const express = require('express');
const path = require('path');
const pg = require('pg');

const port = process.env.PORT || process.argv[2] || 3000;
const app = express();



app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
pg.defaults.ssl = true;


function getUrl(id) {
    pg.connect(process.env.DATABASE_URL, function(err, client) {
        if (err) throw err;
        console.log('Connected to postgres! Getting schemas...');

        client
            .query('SELECT table_schema,table_name FROM information_schema.tables;')
            .on('row', function(row) {
                console.log(JSON.stringify(row));
            });
    })

    return id;
}

function shortenUrl() {
    pg.connect(process.env.DATABASE_URL, function(err, client) {
        if (err) throw err;
        console.log('Connected to postgres! Getting schemas...');

        client
            .query('SELECT table_schema,table_name FROM information_schema.tables;')
            .on('row', function(row) {
                console.log(JSON.stringify(row));
            });
    })

    return id;
}

app.get('new/:url', (req, res) => {
    res.json({
        'original_url': req.params.url,
        'serve_url': shortenUrl(req.params.url)
    });
});

app.get('/:id', (req, res) => {
    res.json({
        'serve_url': getUrl(req.params.id)
    });
});


app.listen(port);
