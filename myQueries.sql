SELECT visited_countries.id, member.name, member.color, country.country_code
FROM visited_countries
JOIN member ON  visited_countries.member_id = member.id
JOIN country ON visited_countries.country_id = country.id

CREATE TABLE visited_countries(
	id SERIAL,
	member_id INTEGER REFERENCES member(id),
	country_id INTEGER REFERENCES country(id)
	PRIMARY KEY (member_id, country_id)
);
