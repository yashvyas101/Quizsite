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
            res.redirect(`/teacher_login/${userId}`);
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
            res.redirect(`/student_login/${userId}`);
        } else {
            // Failed login — send error to template
            res.render("login_as_student.ejs", { error: "❌ Invalid User ID or Password" });
        }
    });
});



//dashboard routes fo teacher
app.get("/teacher_login/:userId",(req,res)=>{
    const userId = req.params.userId;
    const q = "SELECT * FROM teacher_login WHERE user_id = ?";
    connection.query(q, [userId], (err, results) => {
        if(err) {
            console.log(err);
            return res.render("login_as_teacher.ejs", { error: "Database error!" });
        }
        let name=results[0].teacher_name;
        res.render("teacher_login.ejs",{ userId ,name});

    });
});


//dashboard routes fo student
app.get("/student_login/:userId",(req,res)=>{
    const userId = req.params.userId;
    const q = "SELECT * FROM student_login WHERE user_id = ?";
    connection.query(q, [userId], (err, results) => {
        if(err) {
            console.log(err);
            return res.render("login_as_student.ejs", { error: "Database error!" });
        }
        let name=results[0].student_name;
        res.render("student_login.ejs",{ userId ,name});

    });
});


//adding new quiz route
app.get("/teacher_login/:userId/new", (req, res) => {
  const { userId } = req.params;
  res.render("new_quiz.ejs", { userId });
});
//adding quiz to database route
app.post("/add_quiz_to_DB",(req,res)=>{
    // console.log(req.query);
    console.log("Incoming quiz data:", req.body);

    const quiz_id = uuid(); 
    const { topic, questions,userId } = req.body;
    const creation_time = new Date();
    const insertQuery = "INSERT INTO quizzes (quiz_id, user_id, topic, creation_time) VALUES (?, ?, ?, ?)";
    connection.query(insertQuery, [quiz_id, userId, topic, creation_time], (err, results) => {
        if (err) {  
            console.error("Error inserting quiz:", err);
            return res.status(500).send("Internal Server Error");
        }
        console.log("Quiz added successfully with ID:", quiz_id);
    });

    for(let i=1;i<=10;i++)
    {
        // Each question comes from EJS form as `questions[i][...]`
        const qData = questions[i];
        if (!qData) continue; // Skip if question missing

        const quiz_questions = uuid();
        const question_text = qData.text;
        const optionA = qData.optionA;
        const optionB = qData.optionB;
        const optionC = qData.optionC;
        const optionD = qData.optionD;
        const correct_answer = qData.correct;
        const marks = qData.marks;

        const qToInsertIntoQuestionTable = `INSERT INTO quiz_questions 
        (quiz_questions,quiz_id, question_text, optionA, optionB, optionC, optionD, correct_answer, marks)
        VALUES (?,?, ?, ?, ?, ?, ?, ?, ?)`;
        
        // ✅ Use your for-loop to insert each question
        connection.query(
            qToInsertIntoQuestionTable,
            [quiz_questions,quiz_id, question_text, optionA, optionB, optionC, optionD, correct_answer, marks],
            (err, result) => {
                if (err) {
                    console.error(`❌ Error inserting question ${i}:`, err);
                } else {
                    console.log(`✅ Question ${i} inserted successfully`);
                }
            }
        );
        console.log("Quiz added successfully with ID:", quiz_id);
        
    }
    res.redirect(`/teacher_login/${userId}`);
});






//logout route
app.get("/logout",(req,res)=>{
    res.redirect("/");
});


//server
app.listen(3000,()=>{
    console.log("Listening on port 3000");
});