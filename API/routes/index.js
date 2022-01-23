var express = require("express");
var router = express.Router();
var mysql = require("mysql");

var con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: "edufi",
  password: "password",
  database: "edufi",
});

con.connect(function (err) {
  if (err) {
    console.error("error connecting: " + err.stack);
    return;
  }

  console.log("connected as id " + con.threadId);
});

// write logic to get timetable from database from here?
router.get("/api/v1/timetable/student/:studentID", function (req, res, next) {
  student_id = req.params.studentID;
  con.query(
    {
      sql: "SELECT s.class_id, c.module_code, l.day, l.start, l.end from student_class_link as s INNER JOIN lesson as l on l.class_id = s.class_id INNER JOIN class as c on c.id = s.class_id where student_id=? and semester = (SELECT MAX(id) FROM semester)",
      values: [student_id],
    },
    function (error, results, fields) {
      if (error) throw error;
      class_details = results;
      html = createTable(class_details);
      res.render("timetable", { html: html });
    }
  );
});

router.get("/api/v1/timetable/tutor/:tutorID", function (req, res, next) {
  tutor_ID = req.params.tutorID;
  // get tutor class info
  // create html
  res.send("timetable", { html: html });
});

router.get(
  "/api/v1/allocations/module/:module_code",
  function (req, res, next) {
    module_code = req.params.module_code;
    con.query(
      {
        sql: "SELECT student_id,class_id,semester from student_class_link INNER JOIN class ON student_class_link.class_id=class.id WHERE module_code = ? and semester = (SELECT MAX(id)  FROM semester)",
        values: [[module_code]],
      },
      function (error, results, fields) {
        if (error) throw error;
        res.send(results);
      }
    );
  }
);

router.get("/api/v1/allocations/class/:class_id", function (req, res, next) {
  class_id = req.params.class_id;
  con.query(
    {
      sql: "SELECT * from student_class_link WHERE class_id = ? and semester = (SELECT MAX(id)  FROM semester)",
      values: [class_id],
    },
    function (error, results, fields) {
      if (error) throw error;
      res.send(results);
    }
  );
});

module.exports = router;

function createTable(class_list) {
  col_dict = {
    "0900": 0,
    1000: 1,
    1100: 2,
    1200: 3,
    1300: 4,
    1400: 5,
    1500: 6,
    1600: 7,
    1700: 8,
  };
  day_dict = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
  };
  for (i = 0; i < class_list.length; i++) {
    day_dict[class_list[i].day].push(class_list[i]);
    day_dict[class_list[i].day].sort();
  }
  html = "";
  Object.keys(day_dict).forEach(function (key) {
    day = day_dict[key];
    for (i = 0; i < day.length; i++) {
      start = col_dict[day[i].start];
      end = col_dict[day[i].end];
      html +=
        '<div class="h-14 text-center text-lg col-start-' +
        (start + 2) +
        " col-end-" +
        (end + 3) +
        '"><div class="h-10 pt-1 bg-purple-300 mx-5 text-center border-solid border-black border-2 rounded-xl">' +
        day[i].module_code +
        "</div></div>";
    }
  });
  return html;
}
