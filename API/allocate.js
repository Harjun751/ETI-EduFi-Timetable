mysql = require('mysql');
// import fetch from ('node-fetch');

var con = mysql.createConnection({
	host:process.env.DB_HOST,
	user:"edufi",
	password:"password",
    database:"edufi"
})

async function allocate_classes(){
	// Get bidding list
	var bid_api_endpoint = "http://localhost:3000"
    var class_api_endpoint = "http://localhost:3000"
    
    // Assumed data structures of various other APIs
	var bid_list = [{ student_id:1, bid:1, class_id:321 },  { student_id:5, bid:128, class_id: 123}, {student_id:2, bid:130, class_id:321 }, {student_id:3, bid:130, class_id:321 }, {student_id:12, bid:130, class_id:321 }]
    bid_list.sort((a, b) => parseFloat(b.bid) - parseFloat(a.bid))
	// var class_list = [{ class_id: 123, capacity: 1, enrolled:0, module_code:"DB" }, { class_id:321, capacity:1, enrolled:0, module_code:"PRG" }]
    var class_list = [{"class_id":123, "lessons": [{"day":"monday","start":"0900","end":"1000"},{"day":"wednesday","start":"0900","end":"1000"}], "module_code":"DL", "capacity": 1, "enrolled":0},
                      {"class_id":321, "lessons": [{"day":"monday","start":"1000","end":"1200"},{"day":"wednesday","start":"1000","end":"1200"}], "module_code":"PRG", "capacity": 3, "enrolled":0}]

    
    con.connect(function(err) {
        if (err) {
          console.error('error connecting: ' + err.stack);
          return;
        }
      
        console.log('connected as id ' + con.threadId);
    });

    var failed_bids = []
    // Refund classes where bid count is less than 3
    class_list.forEach(y => {
        var to_remove = bid_list.filter(x => x.class_id === y.class_id)
        if (to_remove.length<3){
            failed_bids.push(... to_remove)
            bid_list = bid_list.filter(function(value,index){
                return to_remove.indexOf(value) == -1
            })
        }
    })

    var student_class_list = []
    var curr_class = null;
    // Iterate through bid list
    for (let i=0; i < bid_list.length; i++){
        // Get class details from class list
        curr_class = class_list.find(x => x.class_id == bid_list[i].class_id)
        if (curr_class.enrolled < curr_class.capacity){
            // Add student to student-class list only if the enrolled value  is OK
            student_class_list.push({ student_id : bid_list[i].student_id, class_id:curr_class.class_id })
            curr_class.enrolled += 1
        }
        else{
            // push failed bid with bid amnt to another list
            failed_bids.push({ student_id: bid_list[i].student_id, bid_amount :bid_list[i].bid })
        }
    }
    
    var unique_class_ids = [ ...new Set(student_class_list.map(x=>x.class_id)) ]
    var unique_student_ids = [ ...new Set(student_class_list.map(x=>x.student_id)) ]

    // Create semester
    var today = new Date()
    var sem_start_date_formatted = today.getFullYear() + "-" + (today.getMonth()+1) + "-" + today.getDate()
    // Set end date to a week from start
    today.setDate(today.getDate() + 7)
    var sem_end_date_formatted = today.getFullYear() + "-" + (today.getMonth()+1) + "-" + today.getDate()
    var semester_id = -1;
    con.query("INSERT INTO semester (start,end) VALUES ('" + sem_start_date_formatted +"', '"+sem_end_date_formatted +"')", insertClass)


    // Insert student-class link after semester after student after class
    function insertClass(error,results, fields){
        if (error) throw error;
        semester_id = results.insertId
        var unique_class_details = unique_class_ids.map(x=> {
            var module_code = class_list.find(y=>y.class_id==x).module_code
            return [x,module_code]
        })
        con.query({
            sql: 'INSERT INTO class VALUES ? ON DUPLICATE KEY UPDATE module_code=VALUES(module_code);',
            values: [unique_class_details]
        }, insertLessons);
    }

    function insertLessons(error, results, fields){
        var lesson_details = unique_class_ids.map(x => {
            var deets = []
            var this_class = class_list.find(y=>y.class_id=x);
            this_class.lessons.forEach(lesson => {deets.push([x, lesson.start, lesson.end, lesson.day])})
            return deets
       })
       con.query(
        {
            // pretend this is fine
            // TODO: refine data structure
            sql: "DELETE FROM lesson"
        }, function (error,results,field) {
            con.query({
                sql: 'INSERT INTO lesson (class_id,start,end,day) VALUES ?',
                values: lesson_details
            }, insertStudent);
        })
    }

    function insertStudent(error,results,field){
        if (error) throw error;
        var student_formatted = unique_student_ids.map(x=> {
            return [x]
        })
        // Create students
        con.query({
            sql: 'INSERT IGNORE INTO student VALUES ?',
            values: [student_formatted]
        }, insertLink);
    }

    function insertLink(error,results,field){
        if (error) throw error;
        var student_link_details = student_class_list.map(x => {return [x.student_id, x.class_id, semester_id]})
        // Create student-class linkage
        con.query({
            sql: 'INSERT INTO student_class_link VALUES ?',
            values: [student_link_details]
        }, function (error,results,fields){
            if (error) throw error;
            con.end();
            // Call refund bids function
	        refund_bids(failed_bids)
        });
    }
}



async function refund_bids(failed_bids){
    // TOWRITE: Call wallet credit API for refunds
    console.log("refunded!")
    return
	// for (let i = 0; i < failed_bids.length; i++){
    //     await fetch(credit_api_endpoint, {
    //         method:'POST',
    //         body: JSON.stringify({ credits : failed_bids[i].bid_amount, student : student_data["student_id"] })
    //     })
	// }	
}

allocate_classes()