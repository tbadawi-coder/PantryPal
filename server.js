require("dotenv").config();
const express = require("express");
const morgan = require('morgan');
const methodOverride = require('method-override');
const mysql = require("mysql2");
const cors = require("cors");
const userRoutes = require('./routes/userRoutes');
const db = require('./config/db.js')

const app = express();
app.use(cors());
app.use(express.json());

let port = 3000;
let host = 'localhost';

// app.set('view engine', 'ejs');



// Middleware functions
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));
app.use(methodOverride('_method'));

//  This is for routing
app.get('/' , (req, res) => {
    // res.render('index', {cssFile: '/css/styles.css'})
    res.json({msg: 'working'})
    // implement ejs files - convert html to individual ejs files for each view
    //  make seperate headers and footers that will be on each page for easy navigation
    //  then we ca link everything
})
//  I only did users for now - we can implement the others if we want to use the mvc style 
app.use('/users', userRoutes);

//  Express error handelers
app.use((req, res, next) => {
    let err = new Error('Server cannot locate ' + req.url);
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => {
    console.log(err.stack);
    if (!err.status) {
        err.status = 500;
        err.message = ('Internal Server Error');
    }
    // this is where the error handeling gets displayed
    res.status(err.status) 
    res.render('error', {status: status, message: message});
    //  if we impliment ejs instead we can have a error page that will be displayed with the error
});

//  I have moved the create connection to db in the config file

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }
    console.log("Connected to MySQL database!");

    app.listen(port, host, () =>{
        console.log(`Server is running on port ${port}`)
    });
});