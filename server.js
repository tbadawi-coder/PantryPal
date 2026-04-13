require("dotenv").config();
const express = require("express");
const morgan = require('morgan');
const methodOverride = require('method-override');
const mysql = require("mysql2");
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require("cors");
const flash = require('connect-flash');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const plannerRoutes = require('./routes/plannerRoutes');
const db = require('./config/db.js')

const app = express();
app.use(cors());
app.use(express.json());

let port = 3000;
let host = 'localhost';

app.set('view engine', 'ejs');

const hasDbConfig = process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME;
let sessionStore;

if (hasDbConfig) {
    sessionStore = new MySQLStore({}, db);
} else {
    sessionStore = new session.MemoryStore();
    console.warn('DB session store disabled: using in-memory session storage because DB environment variables are missing.');
}

app.use(
    session({
        secret: 'uhfsigurwhg32r4bvwinskSD',
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {maxAge: 60*60*1000}
    })
);
// flash will allow us to do quick messages that will pop up for the user
app.use(flash());

app.use((req,res,next) =>{
    res.locals.user = req.session.user || null;
    res.locals.errorFlash = req.flash('error');
    res.locals.successFlash = req.flash('success');
    next();
})

// Middleware functions
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));
app.use(methodOverride('_method'));

//  This is for routing
app.get('/' , (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
})

app.get('/pantry.html', (req, res) => {
    res.sendFile(__dirname + '/views/pantry.html')
})

app.get('/results.html', (req, res) => {
    res.sendFile(__dirname + '/views/results.html')
})

app.get('/recipe.html', (req, res) => {
    res.sendFile(__dirname + '/views/recipe.html')
})

app.get('/about.html', (req, res) => {
    res.sendFile(__dirname + '/views/about.html')
})

app.get('/api/me', async (req, res) => {
    if (!req.session.user) return res.json({ loggedIn: false });
    const db = require('./config/db');
    const [rows] = await db.execute('SELECT username FROM users WHERE id = ?', [req.session.user]);
    const username = rows[0] ? rows[0].username : '';
    res.json({ loggedIn: true, username });
});

app.use('/users', userRoutes);
app.use('/chat', chatRoutes);
app.use('/api/planner', plannerRoutes);

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
    res.render('error', {status: err.status, message: err.message});
    //  if we impliment ejs instead we can have a error page that will be displayed with the error
});

//  I have moved the create connection to db in the config file

// db.connect((err) => {
//     if (err) {
//         console.error("Database connection failed:", err);
//         return;
//     }
//     console.log("Connected to MySQL database!");

//     app.listen(port, host, () =>{
//         console.log(`Server is running on port ${port}`)
//     });
// });

app.listen(port, host, () =>{
    console.log(`Server is running on port ${port}`)
});