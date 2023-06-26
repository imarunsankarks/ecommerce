const fs =  require('fs');
const path = require('path');
// const express = require('router');


exports.addProductToCart = (id,price) => {
 const cartPath = path.join(__dirname, '../', 'data', 'cart.json');
 fs.readFile(cartPath, (error, cartContent) => {
    //cart details
    let cart ={products:[], totalPrice: 0};
    //if cart data is existing
    if (!error) {
        cart = JSON.parse(cartContent);
    }

    let existingProductIndex = cart.products.findIndex(prod => prod.id.toString() == id);
    let updatedProduct;

    if (existingProductIndex !== -1) {
        updatedProduct = { ...cart.products[existingProductIndex] };
        updatedProduct.quantity += 1;
        cart.products = [...cart.products];
        cart.products[existingProductIndex] = updatedProduct;
    } else {
        updatedProduct = { id, quantity: 1};
        cart.products = [...cart.products, updatedProduct];
    }
    cart.totalPrice += +price;
    fs.writeFile(cartPath, JSON.stringify(cart), (error) => {
        console.log(error);
    })
});
}
