const favicon = require('serve-favicon');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const isUrl = require('./is-url');
const Url = require('./models/url');

const port = process.env.PORT || process.argv[2] || 3000;
const app = express();

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;

function getUrl(id, callback) {
    Url.findOne({"id": id}, callback);
}

function shortenUrl(url, callback) {    
    var newUrl = Url({
        "url": url,
    })  
    newUrl.save(callback);  
}

app.get('/new/:url', (req, res) => {
    if (!isUrl(req.params.url)){
        res.json({
            error: 'invalid url',
        });
        return;
    }
    shortenUrl(req.params.url, function(err, shortUrl) {
        if (err) throw err;
        res.json({
            given_url: shortUrl.url,
            id: shortUrl.id,
        });    
    });
});

app.get('/:id', (req, res) => {
    getUrl(req.params.id, function(err, url) {
        if (err) return {};
        res.json({
            "original_url": redirect.url,
        });
    });
});


app.listen(port);
