CREATE USER 'edufi'@'%' IDENTIFIED WITH mysql_native_password BY 'password';
GRANT ALL PRIVILEGES ON edufi.* TO 'edufi'@'%';

CREATE TABLE student_class_link(
	student_id	INT,
	class_id	INT,
	semester	VARCHAR(10)
);
