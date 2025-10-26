const express = require("express");
const app = express();
const { faker } = require("@faker-js/faker");
const mysql = require("mysql2");
const path = require("path");
const { v4 : uuid } =require("uuid") ;
const methodOverride = require('method-override');
const { rmSync } = require("fs");
app.use(methodOverride("_method"));

app.use(express.static(path.join(__dirname,"public")));
app.use(express.urlencoded({extended:true}));
// EJS setup (now __dirname works normally)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));



//connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'quizsite',
  password: 'YASH@2006',
});
//check connection to database
connection.connect((err) => 
{
    if (err) {
      console.error("❌ MySQL Connection Failed!");
      console.error("Error Code:", err.code);
      console.error("Error Message:", err.message);
    } else {
      console.log("✅ MySQL Connected Successfully!");
    }
});





//home route
app.get("/",(req,res)=>{
    res.render("home.ejs");
});


// Login routes
app.get("/student_login",(req,res)=>{
    res.render("login_as_student.ejs");
});
app.get("/teacher_login",(req,res)=>{
    res.render("login_as_teacher.ejs");
});
  


//login cheack routes
//of teacher
app.post("/teacher_login", (req,res) => {
    const {userId, password} = req.body;
    const q = "SELECT * FROM teacher_login WHERE user_id = ?";
    
    connection.query(q, [userId], (err, results) => {
        if(err) {
            console.log(err);
            return res.render("login_as_teacher.ejs", { error: "Database error!" });
        }

        if(results.length > 0 && results[0].password === password) {
            // Successful login
            res.render("teacher_login.ejs", { userId });
        } else {
            // Failed login — send error to template
            res.render("login_as_teacher.ejs", { error: "❌ Invalid User ID or Password" });
        }
    });
});




//login cheack routes
//of student
app.post("/student_login", (req,res) => {
    const {userId, password} = req.body;
    const q = "SELECT * FROM student_login WHERE user_id = ?";
    
    connection.query(q, [userId], (err, results) => {
        if(err) {
            console.log(err);
            return res.render("login_as_student.ejs", { error: "Database error!" });
        }

        if(results.length > 0 && results[0].password === password) {
            // Successful login
            res.render("student_login.ejs", { userId });
        } else {
            // Failed login — send error to template
            res.render("login_as_student.ejs", { error: "❌ Invalid User ID or Password" });
        }
    });
});


//server
app.listen(3000,()=>{
    console.log("Listening on port 3000");
});