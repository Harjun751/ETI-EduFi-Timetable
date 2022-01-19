# ETI-EduFi-Timetable
EduFi-Timetable is a microservice that implements part of the 'EduFi' application created for theEmerging Trends in IT module assignment 2. It uses ExpressJS as the backend, with the template engine "LiquidJS". The frontend is a simple html page along with tailwindcss for styling.

## How does it work?
This section will go through the planned steps in which the microservice accomplshes it's tasks.

### 3.15.1 Auto Award 20 ETI tokens for each student at the start of the semester
This task is done using a node script.

1. Obtain full student list from Student API
2. Call Wallet Credit API to credit 20 points to each student. (For loop/Bulk request if available)

This script will be scheduled and run at Sunday 0000 using a cron job

### 3.15.2 Auto Allocate Classes based on highest amount
This task is done using a node script

1. Obtain student bids from Bidding Dashboard API
2. Allocate highest bidders to classes until class capacity has been reached
3. Call Bidding Dashboard API to PATCH the bids with succesful/unsuccessful status
4. Store successful bids in database with: {'Student_ID':123, 'classes':[123,1231,13]} or similar structure
5. Call [3.15.3](#3154-auto-refund-failed-bids) with a list of failed bids as the parameter
6. _Possible requirement: Update class API with enrolled students **OR** provide API for allocated classes_

### 3.15.3 Generate Timetable
This task shows a timetable for a given tutor/student

#### Student
1. Get successful bids for current semester
2. For each successful class in bid, GET to class details to obtain timings
3. Create a list of class details and pass to frontend to construct timetable

#### Tutor
1. Get assigned classes for the tutor (need to check+update endpoint required for this)
2. For each class, GET class details IF required
3. Create a list of class details and pass to frontend to construct timetable

### 3.15.4 Auto Refund Failed Bid
This task will be automatically executed on completion of [3.15.2](#3152-auto-allocate-classes-based-on-highest-amount)

1. For each bid, get bid amount
2. Call Wallet API to send the amount of points bid to the student's wallet
