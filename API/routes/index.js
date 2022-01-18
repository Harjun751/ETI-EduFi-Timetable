var express = require('express');
var router = express.Router();

// write logic to get timetable from database from here?
router.get('/timetable', function(req, res, next) {
  html = createTable([{"class_id":123,"day":"monday","start":"0900","end":"1200","name":"DL"}])
  console.log(html)
  res.render('timetable', { html:html });
});

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
        console.log(day_dict[class_list[i].day])
        day_dict[class_list[i].day].push(class_list[i])
        day_dict[class_list[i].day].sort()
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
