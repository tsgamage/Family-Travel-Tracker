import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

import dotenv from "dotenv";

dotenv.config();

const db = new pg.Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId;

let users;

async function getUsers() {
  users = [];
  const memberResult = await db.query("SELECT * FROM member");
  memberResult.rows.forEach((member) => {
    // console.log(member);
    users.push(member);
  });
}

async function checkVisisted() {
  const result = await db.query(
    "SELECT visited_countries.id, member.name, member.color, country.country_code FROM visited_countries JOIN member ON  visited_countries.member_id = member.id JOIN country ON visited_countries.country_id = country.id "
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function getUserCountries(userId) {
  let countryIDs = [];
  let countryCodes = [];
  try {
    let countryIdResult = await db.query(
      "SELECT country_id FROM visited_countries WHERE member_id = $1",
      [userId]
    );

    countryIdResult.rows.forEach((id) => {
      countryIDs.push(id.country_id);
    });

    for await (const id of countryIDs) {
      let countryCodeResult = await db.query(
        "SELECT country_code FROM country WHERE id = $1",
        [id]
      );
      countryCodes.push(countryCodeResult.rows[0].country_code);
    }
    return countryCodes;
  } catch (error) {
    console.log(error);
    return "error find user";
  }
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  await getUsers();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: "red",
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  res.locals.error;
  if (input.length > 2) {
    try {
      const result = await db.query(
        "SELECT id FROM country WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
        [input.toLowerCase()]
      );

      let countryID = 0;
      if (result.rowCount != 0) {
        const data = result.rows[0];
        countryID = data.id;
      }

      if (countryID != 0) {
        try {
          console.log(
            "currentUserId: ",
            currentUserId,
            " countryID: ",
            countryID
          );
          await db.query(
            "INSERT INTO visited_countries (member_id,country_id) VALUES ($1, $2)",
            [currentUserId, countryID]
          );
          res.redirect("/");
        } catch (err) {
          console.log(err);
          const countries = await checkVisisted();
          res.render("index.ejs", {
            countries: countries,
            total: countries.length,
            users: users,
            color: "red",
            error: "Country Already Added to Tracker",
          });
        }
      }
    } catch (err) {
      console.log(err);
    }
  }else{
    res.redirect("/")
  }
});

app.post("/user", async (req, res) => {
  if (req.body.user != "new") {
    currentUserId = req.body.user;

    let countriesId = await getUserCountries(req.body.user);

    res.render("index.ejs", {
      countries: countriesId,
      total: countriesId.length,
      users: users,
      color: users[req.body.user - 1].color,
    });
  } else {
    console.log(req.body);
    res.render("new.ejs");
  }
});

app.post("/new", async (req, res) => {
  let newReq = req.body;
  console.log(newReq.name.length);

  res.locals.error;

  let errorMessage = "";
  if (newReq.name.length === 0) {
    errorMessage = "Please enter a name to Add a Family Member";
    res.render("new.ejs", {
      error: errorMessage,
    });
  } else if (newReq.name.length < 2) {
    errorMessage = "Name must have at least 2 characters";
    res.render("new.ejs", {
      error: errorMessage,
    });
  }
  if (!newReq.color) {
    if (errorMessage.length != 0) {
      errorMessage += "<br>Please select a color to the member";
      res.render("new.ejs", {
        error: errorMessage,
      });
    } else {
      errorMessage = "Please select a color to the member";
      res.render("new.ejs", {
        error: errorMessage,
      });
    }
  }

  await db.query("INSERT INTO member (name,color) VALUES ($1, $2)", [
    newReq.name,
    newReq.color,
  ]);

  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
