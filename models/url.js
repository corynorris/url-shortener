var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var urlSchema = new Schema({
    id: Number,
    url: String
})

var urlModel = mongoose.model('Url', urlSchema);

urlSchema.pre('save', function(next) {
    const _this = this;
    urlModel.count({}, function(err, count) {
        if (err) throw err;
        count = (count === null) ? 0 : count + 1;
        _this.id = count;
        next();
    });
});

module.exports = urlModel;
