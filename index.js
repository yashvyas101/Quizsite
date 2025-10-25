const express = require("express");
const app = express();
const { faker } = require("@faker-js/faker");
const mysql = require("mysql2");
const path = require("path");
const { v4 : uuid } =require("uuid") ;
const methodOverride = require('method-override');
app.use(methodOverride("_method"));


app.use(express.static(path.join(__dirname,"public")));
app.use(express.urlencoded({extended:true}));
// EJS setup (now __dirname works normally)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.get("/",(req,res)=>{
    res.render("home.ejs");
});