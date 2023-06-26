const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dressSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    image1: {
        type: String,
        required: true
    },
    image2: {
        type: String,
        required: true
    },
    image3: {
        type: String,
        required: true
    },
    material: {
        type: String,
        required: true
    },
    size: {
        type: Array,
        required: true
    }
} ,{ timestamps: true})

const Dress = mongoose.model('Dress', dressSchema);
module.exports = Dress;