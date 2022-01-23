use edufi;
CREATE USER 'edufi'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
GRANT ALL PRIVILEGES ON edufi.* TO 'edufi'@'localhost';
CREATE TABLE student(
	id INT PRIMARY KEY
);

CREATE TABLE class(
	id INT PRIMARY KEY
	module_code VARCHAR(5)
);

CREATE TABLE semester(
	id INT AUTO_INCREMENT PRIMARY KEY,
	start DATE,
	end DATE
);


CREATE TABLE student_class_link(
	student_id	INT,
	class_id	INT,
	semester	INT,
	FOREIGN KEY (student_id) REFERENCES student(id),
	FOREIGN KEY (class_id) REFERENCES class(id),
	FOREIGN KEY (semester) REFERENCES semester(id)
)