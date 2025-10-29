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
  password: '',
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


//dashboard routes 
// of teacher
app.get("/teacher_login/:userId",(req,res)=>
{
    const userId = req.params.userId;
    const q = "SELECT * FROM teacher_login WHERE user_id = ?";
    const q_quizzes = "SELECT * FROM quizzes WHERE user_id = ?";
    const q_quiz_count=`SELECT COUNT(*) AS quiz_count FROM quizzes WHERE user_id = ?;`
    const quiz_count_q=`SELECT COUNT(*) AS students_count FROM student_login ;`
    //TO GET TEACHER NAME FORM DB
    connection.query(q, [userId], (err, results) => {
        if(err) {
            console.log(err);
            return res.render("login_as_teacher.ejs", { error: "Database error!" });
        }
        let name=results[0].teacher_name;
        //TO GET QUIZZES FORM DB
        connection.query(q_quizzes, [userId], (err, quizResults) => {
            if (err) {
                console.error("❌ Error fetching quizzes:", err);
                return res.status(500).send("Internal Server Error");
            }
            //count of quizzes
            connection.query(q_quiz_count, [userId], (err, quiz_count) =>
            {
                if (err) {
                    console.error("❌ Error fetching quiz count:", err);
                    return res.status(500).send("Internal Server Error");
                }
                //count of students
                connection.query(quiz_count_q, (err, students_count) =>
                {
                    if (err) {
                        console.error("❌ Error fetching student count:", err);
                        return res.status(500).send("Internal Server Error");
                    }
                    res.render("teacher_login.ejs", { userId, name, quizzes: quizResults, quiz_count: quiz_count[0].quiz_count ,students_count:students_count[0].students_count});
                });
            });

            
        });
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

    for(let i=0;i<=10;i++)
    {
        // Each question comes from EJS form as `questions[i][...]`
        const qData = questions[i];
        if (!qData) continue; // Skip if question missing

        const question_id = uuid();
        const question_text = qData.text;
        const optionA = qData.optionA;
        const optionB = qData.optionB;
        const optionC = qData.optionC;
        const optionD = qData.optionD;
        const correct_answer = qData.correct;
        const marks = qData.marks;

        const qToInsertIntoQuestionTable = `INSERT INTO quiz_questions 
        (question_id,quiz_id, question_text, optionA, optionB, optionC, optionD, correct_answer, marks)
        VALUES (?,?, ?, ?, ?, ?, ?, ?, ?)`;
        
        // ✅ Use your for-loop to insert each question
        connection.query(
            qToInsertIntoQuestionTable,
            [question_id,quiz_id, question_text, optionA, optionB, optionC, optionD, correct_answer, marks],
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

    // ✅ Step: Create a unique result table for the quiz to track attendance and marks
    const createQuizResultTableQuery = `
        CREATE TABLE \`${quiz_id}\` (
            user_id VARCHAR(50),
            attend CHAR(1) DEFAULT NULL,    -- 'A' = Attended, NULL = Not Attended
            total_marks INT DEFAULT NULL,   -- Out of 10, NULL = Not attempted
            q1 INT DEFAULT NULL,            -- 0 or 1 per question
            q2 INT DEFAULT NULL,
            q3 INT DEFAULT NULL,
            q4 INT DEFAULT NULL,
            q5 INT DEFAULT NULL,
            q6 INT DEFAULT NULL,
            q7 INT DEFAULT NULL,
            q8 INT DEFAULT NULL,
            q9 INT DEFAULT NULL,
            q10 INT DEFAULT NULL,
            FOREIGN KEY (user_id) REFERENCES student_login(user_id)
        );
    `;

    connection.query(createQuizResultTableQuery, (err, result) => 
    {
        if (err) 
        {
            console.error("❌ Error creating quiz result table:", err);
        } 
        else 
        {
            console.log(`✅ Result table created successfully for quiz: ${quiz_id}`);

            // ✅ Step: Pre-fill with all students (attendance & marks as NULL)
            const insertStudentsQuery = `
                INSERT INTO \`${quiz_id}\` (user_id)
                SELECT user_id FROM student_login;
            `;

            connection.query(insertStudentsQuery, (err2, result2) => {
                if (err2) {
                    console.error("❌ Error inserting students into quiz result table:", err2);
                } else {
                    console.log(`✅ ${result2.affectedRows} students added to quiz ${quiz_id} result table.`);
                }
            });
        }
    });


    // Redirect back to teacher dashboard
    res.redirect(`/teacher_login/${userId}`);
});

//DELETE QUIZ ROUTE  /delete_quiz/<%= quiz.quiz_id %>?_method=DELETE
app.delete("/delete_quiz/:quizId",(req,res)=>{
    const { quizId } = req.params;
    const {userId} =req.body; // Get userId from query parameters
    const deleteQuizQuestionQuery = "DELETE FROM quiz_questions WHERE quiz_id = ?";
    const deleteQuizQuery = "DELETE FROM quizzes WHERE quiz_id = ?";
    // Step 1: Delete quiz questions first (foreign key constraint)
    connection.query(deleteQuizQuestionQuery, [quizId], (err, result) => {
        if (err) {
            console.error("❌ Error deleting quiz questions:", err);
            return res.status(500).send("Internal Server Error");
        }   
        // Step 2: Delete the quizzes TABLE itself
        connection.query(deleteQuizQuery, [quizId], (err, result) => {
            if (err) {
                console.error("❌ Error deleting quiz:", err);
                return res.status(500).send("Internal Server Error");
            }
            // Step 3: Drop the associated result table
            const dropTableQuery = `DROP TABLE IF EXISTS \`${quizId}\``;
            connection.query(dropTableQuery, (err3, result3) => {
                if (err3) {
                    console.error("❌ Error dropping quiz result table:", err3);
                    return res.status(500).send("Error deleting quiz result table");
                }

                console.log(`✅❌✅ Successfully deleted quiz ${quizId} and its result table`);
            });
        });
    });
    res.redirect(`/teacher_login/${userId}`);
});





//dashboard routes 
// of student
app.get("/student_login/:userId",(req,res)=>
{
    const userId = req.params.userId;
    const q = "SELECT * FROM student_login WHERE user_id = ?";
    const getAllQuizzesQuery = "SELECT * FROM quizzes";
    
    //to get student name from db
    connection.query(q, [userId], (err, results) =>
    {
        if(err) 
        {
            console.log(err);
            return res.render("login_as_student.ejs", { error: "Database error!" });
        }
        let name=results[0].student_name;
        //to get all quizzes from db
        connection.query(getAllQuizzesQuery, (err2, quizResults) => 
        {
            if (err2)
            {
                console.error("❌ Error fetching quizzes:", err2);
                return res.status(500).send("Internal Server Error");
            }
            const completedQuizzes = [];
            const pendingQuizzes = [];

            if (quizResults.length === 0) 
            {
                return res.render("student_login.ejs", {
                userId,
                name,
                completedQuizzes,
                pendingQuizzes,
                totalScore: 0,
                totalPossible: 0,
                averageScore: 0,
                quizzesAttempted: 0
                });
            }

            let processed = 0; // To track how many queries finished
            let totalScore = 0;
            let quizzesAttempted = 0;

            // Check each quiz for attended or not 
            for(const quiz of quizResults) 
            {
                const quizId = quiz.quiz_id;
                const topic=quiz.topic;
                const assigned_teacher=quiz.user_id;
                const creation_time=quiz.creation_time;
                // const checkQuery = "SELECT attend, total_marks FROM ${quizId} WHERE user_id = ?";
                const checkQuery = `SELECT attend, total_marks FROM \`${quizId}\` WHERE user_id = ?`;

                connection.query(checkQuery, [userId], (err3, rows) =>
                {
                    if (err3)
                    {
                        console.error(`❌ Error checking attendance for quiz ${quizId}:`, err3);
                    }
                    else if(rows.length>0)
                    {
                        const record = rows[0];
                        if (record.attend === 'A')
                        {   
                            completedQuizzes.push(
                            { 
                                quizId, 
                                topic, 
                                assigned_teacher,
                                creation_time,
                                total_marks: record.total_marks 
                            });
                            totalScore += record.total_marks || 0;
                            quizzesAttempted++;
                        }
                        else
                        {
                            pendingQuizzes.push(
                            { 
                                quizId,
                                topic ,
                                creation_time,
                                assigned_teacher
                            });
                        }
                    }
                    else
                    {
                        pendingQuizzes.push(
                        {
                            quizId,
                            topic ,
                            creation_time, 
                            assigned_teacher 
                        });
                    }
                    processed++;
                    // After all queries are processed, render the page
                    if (processed === quizResults.length) 
                    {
                        const totalPossible = quizzesAttempted * 10;
                        const averageScore =totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(2) : 0;
                        res.render("student_login.ejs", 
                        {
                            userId,
                            name,
                            completedQuizzes,
                            pendingQuizzes,
                             totalScore,
                            totalPossible,
                            averageScore,
                            quizzesAttempted
                        });
                    }
                });
            }
        });
    });
});


//Show Quiz Page
// Route to show the quiz page TO STUDENT
app.get("/take_quiz/:quizId/user/:userId", (req, res) => {
  const { quizId, userId } = req.params;

  // Fetch quiz questions
  const fetchQuestionsQuery = "SELECT * FROM quiz_questions WHERE quiz_id = ?";
  connection.query(fetchQuestionsQuery, [quizId], (err, questions) => {
    if (err) {
      console.error("❌ Error fetching quiz questions:", err);
      return res.status(500).send("Internal Server Error");
    }

    if (questions.length === 0) {
      return res.send("No questions found for this quiz!");
    }

    // Render the quiz page with fetched questions
    res.render("take_quiz.ejs", { quizId, userId, questions });
  });
});
//show result  route
app.get("/result_of_quiz/:quizId/user/:userId", (req, res) => {
  const { quizId, userId } = req.params;
});
//Handle Quiz Submission
// Route to handle quiz submission
// app.post("/submit_quiz/:quizId/user/:userId", (req, res) => { 
//   const { quizId, userId } = req.params;
//   const answers = req.body; // Contains student answers { question_id: selectedOption }

//   const getCorrectAnswersQuery = "SELECT question_id, correct_answer FROM quiz_questions WHERE quiz_id = ?";
//   connection.query(getCorrectAnswersQuery, [quizId], (err, correctRows) => {
//     if (err) {
//       console.error("❌ Error fetching correct answers:", err);
//       return res.status(500).send("Internal Server Error");
//     }

//     let totalMarks = 0;
//     const marksData = {};

//     // Compare answers and calculate marks
//     correctRows.forEach((row, index) => {
//       const studentAnswer = answers[row.question_id];
//       if (studentAnswer && studentAnswer.toUpperCase() === row.correct_answer.toUpperCase()) {
//         totalMarks += 1;
//         marksData[`q${index + 1}`] = 1;
//       } else {
//         marksData[`q${index + 1}`] = 0;
//       }
//     });

//     // Build the update query for quiz result table
//     const updateQuery = `
//       UPDATE \`${quizId}\`
//       SET attend = 'A',
//           total_marks = ?,
//           ${Object.keys(marksData).map(key => `${key} = ?`).join(", ")}
//       WHERE user_id = ?
//     `;

//     const values = [totalMarks, ...Object.values(marksData), userId];

//     connection.query(updateQuery, values, (err2) => {
//       if (err2) {
//         console.error("❌ Error updating quiz result:", err2);
//         return res.status(500).send("Internal Server Error");
//       }

//       console.log(`✅ Quiz submitted successfully by ${userId}, Marks: ${totalMarks}`);
//       res.redirect(`/student_login/${userId}`);
//     });
//   });
// });
app.post("/submit_quiz/:quizId/:userId", (req, res) => {
  const { quizId, userId } = req.params;
  const submitted = req.body; // e.g. { "<question_id1>": "A", "<question_id2>": "C", ... }

  // Extract question IDs the form sent (only keys that look like UUIDs)
  const questionIds = Object.keys(submitted).filter(k => k && k !== '_method');

  if (questionIds.length === 0) {
    // Nothing submitted -> treat as zero attempt
    return res.redirect(`/student_login/${userId}`);
  }

  // Query correct answers for these question_ids
  const placeholders = questionIds.map(() => '?').join(',');
  const fetchCorrect = `SELECT question_id, question_text, correct_answer FROM quiz_questions WHERE question_id IN (${placeholders})`;

  connection.query(fetchCorrect, questionIds, (err, rows) => {
    if (err) {
      console.error("❌ Error fetching correct answers:", err);
      return res.status(500).send("Internal Server Error");
    }

    // Build a map question_id -> correct_answer and question_text
    const correctMap = {};
    rows.forEach(r => {
      correctMap[r.question_id] = {
        correct_answer: (r.correct_answer || '').trim().toUpperCase(),
        question_text: r.question_text
      };
    });

    // Evaluate answers
    let totalMarks = 0;
    const questionResults = []; // array of { question_id, question_text, studentAnswer, isCorrect }

    // We'll preserve the order as rows came back — but to show the same order as the quiz,
    // it's better to use the order of questionIds (form order). Use that:
    for (let i = 0; i < questionIds.length; i++) {
      const qid = questionIds[i];
      const studentRaw = submitted[qid] || '';
      const studentAnswer = (studentRaw + '').trim().toUpperCase();
      const correctEntry = correctMap[qid];

      const isCorrect = correctEntry && studentAnswer === correctEntry.correct_answer;
      if (isCorrect) totalMarks += 1;

      questionResults.push({
        question_id: qid,
        question_text: correctEntry ? correctEntry.question_text : "(Question not found)",
        studentAnswer,
        correctAnswer: correctEntry ? correctEntry.correct_answer : null,
        correct: !!isCorrect
      });
    }

    // Update the quiz result table for this student
    // Build q1..q10 updates based on questionResults order: assign according to index+1
    // If your schema expects q1..q10 explicitly, we must map them. We'll set q1..qN accordingly.
    const qUpdates = {};
    for (let i = 0; i < questionResults.length && i < 10; i++) {
      qUpdates[`q${i+1}`] = questionResults[i].correct ? 1 : 0;
    }
    // If less than 10, remaining q's left as NULL (no change)
    // Build SET clause
    const setParts = ["attend = 'A'", "total_marks = ?"];
    const values = [totalMarks];
    Object.keys(qUpdates).forEach(k => {
      setParts.push(`${k} = ?`);
      values.push(qUpdates[k]);
    });
    values.push(userId); // for WHERE

    const updateQuery = `UPDATE \`${quizId}\` SET ${setParts.join(', ')} WHERE user_id = ?`;

    connection.query(updateQuery, values, (err2) => {
      if (err2) {
        console.error("❌ Error updating quiz result table:", err2);
        return res.status(500).send("Internal Server Error");
      }

      // Fetch student name and teacher ID for result page display
      connection.query("SELECT student_name FROM student_login WHERE user_id = ?", [userId], (err3, srows) => {
        if (err3) {
          console.error("❌ Error fetching student name:", err3);
          return res.status(500).send("Internal Server Error");
        }
        const studentName = srows[0] ? srows[0].student_name : '';

        connection.query("SELECT user_id AS teacherId FROM quizzes WHERE quiz_id = ?", [quizId], (err4, trows) => {
          if (err4) {
            console.error("❌ Error fetching teacher id:", err4);
            return res.status(500).send("Internal Server Error");
          }
          const teacherId = trows[0] ? trows[0].teacherId : '';

          // Render result page with full details (ordered by form submission order)
          res.render("result_of_quiz.ejs", {
            userId,
            studentName,
            quizId,
            teacherId,
            totalMarks,
            questionResults
          });
        });
      });
    });
  });
});





//logout route
app.get("/logout",(req,res)=>{
    res.redirect("/");
});


//server
app.listen(3000,()=>{
    console.log("Listening on port 3000");
});