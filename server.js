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
            short_url: `https://boiling-bayou-79322.herokuapp.com/${shortUrl.id}`,
            given_url: shortUrl.url,
        });    
    });
});

app.get('/:id', (req, res) => {
    getUrl(req.params.id, function(err, url) {
        if (err) {
            res.json({
                error: 'no url found for given id',
            })
        } else {
            res.json({
                original_url: redirect.url,
            });
        };
    });
});

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port);
