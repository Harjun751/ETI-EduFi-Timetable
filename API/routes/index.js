var express = require('express');
var router = express.Router();
var mysql = require('mysql');

var con = mysql.createConnection({
	host:"localhost",
	user:"edufi",
	password:"password",
    database:"edufi"
})

// write logic to get timetable from database from here?
router.get('/timetable/student/:studentID', function(req, res, next) {
  student_id =  req.params.studentID
  con.connect(function(err) {
      if (err) {
        console.error('error connecting: ' + err.stack);
        return;
      }
    
      console.log('connected as id ' + con.threadId);
  });
  con.query({
      sql: 'SELECT * from student_class_link WHERE student_id = ?',
      values: [student_id],
      function (error, results, fields){
        unique_classes = [ ...new Set(results.map(x=>x.class_id) ]
        // GET class details
        class_details = [{class_id:123, lessons: [{day:"monday","start":0900,"end":1000},{day:"wednesday",start:0900,end:1000}], name: "Deep Learning", short_name:"DL"}]
        html = createTable(class_details)
        res.render('timetable', { html:html })
      }
  })
});

router.get('/timetable/tutor/:tutorID', function(req, res, next) {
    tutor_ID =  req.params.tutorID
    // get tutor class info
    // create html 
    res.send('timetable',{html:html})
  })
module.exports = router;

function createTable(class_list){
    col_dict = {
        "0900":0,
        "1000":1,
        "1100":2,
        "1200":3,
        "1300":4,
        "1400":5,
        "1500":6,
        "1600":7,
        "1700":8
    }
    day_dict = {
        "monday":[],
        "tuesday":[],
        "wednesday":[],
        "thursday":[],
        "friday":[],
    }
    for (i=0; i<class_list.length; i++){
        for (y=0; y<class_list[i].lessons.length; y++){
            day_dict[class_list[i].lessons[y].day].push(class_list[i])
            day_dict[class_list[i].lessons[y].day].sort()
        }
        console.log(day_dict[class_list[i].day])
    }
    html = ""
    Object.keys(day_dict).forEach(function(key){
        day = day_dict[key]
        for (i=0; i<day.length; i++){
            start = col_dict[day[i].start]
            end = col_dict[day[i].end]
            html+='<div class="h-14 text-center text-lg col-start-'+(start+2)+' col-end-'+(end+3)+'"><div class="h-10 pt-1 bg-purple-300 mx-5 text-center border-solid border-black border-2 rounded-xl">'+day[i].name+'</div></div>' 
        } 
    });
    return html;
}
