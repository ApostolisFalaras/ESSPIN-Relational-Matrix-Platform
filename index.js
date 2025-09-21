import express from "express";
import session from "express-session";
import { createRequire } from "module";
import dotenv from "dotenv";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Pool } from "pg";

dotenv.config();

const require = createRequire(import.meta.url);
const PgSession = require("connect-pg-simple")(session);

// Initializing the server and the port number 
const app = express();

// Trust proxy for secure cookies on Render
app.set("trust proxy", 1);


// Setting up a Postgres connection pool either on Render or local
const useConnString = !!process.env.DATABASE_URL;

const poolConfig = useConnString
    ? {
        // Render Postgres requires SSL, up 20 connections, idle clients close after 30s
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
    }
    : {
        // Local Postgres config, up to 20 connections, idle clients close after 30s
        host: process.env.PG_HOST || "localhost",
        user: process.env.PG_USER,
        database: process.env.PG_DATABASE,
        password: process.env.PG_PASSWORD,
        port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
        ssl: process.env.PGSSLMODE == "require" ? { rejectUnauthorized: false } : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
    }

const pool = new Pool(poolConfig);

const sessionMaxAge = Number(process.env.SESSION_COOKIE_MAXAGE || 7200000);
const isProd = process.env.NODE_ENV == "production";

const envSameSite = (process.env.SESSION_SAMESITE || "lax").toLowerCase();
const allowedSameSite = ["lax", "strict", "none"];
const sameSite = allowedSameSite.includes(envSameSite) ? envSameSite : "lax";
const mustBeSecure = sameSite == "none";
const secure = isProd || mustBeSecure;

if (!process.env.SESSION_SECRET) {
    console.log("[WARN] SESSION_SECRET is missing - sessions will fail.");
}

// Preserving users' data in Sessions throughout multiple requests
app.use(session({
    store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
        pruneSessionInterval: 3600, // Expired sessions will be cleaned up from the DB once per hour
    }),
    name: process.env.SESSION_COOKIE_NAME || "sid",
    secret: process.env.SESSION_SECRET,
    resave: false, // Don't save sessions if nothing changed
    saveUninitialized: false, // Don't save empty sessions
    rolling: true, // Reset cookie expiration time, so active users don't get logged out
    cookie: {
        maxAge: sessionMaxAge,
        httpOnly: true, // Cookie cannot be read by JS in the browser
        secure: secure,
        sameSite: sameSite,
        //domain: process.env.SESSION_DOMAIN || undefined

    }
}));

// Specifying the (relative, based on where the app starts) directory and serving static files
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

// The requests' URL-encoded data are parsed, and the request is effectively given a body
app.use(express.urlencoded({extended: true}));
app.use(express.json());

// Basic Healthcheck
app.get("/healthz", (_req, res) => res.status(200).send("ok"));


// Database check to confirm the connection status upon startup
(async () => {
  try {
    const { rows } = await pool.query("select 1 as ok");
    console.log("DB ping:", rows[0]);
  } catch (err) {
    console.error("DB connection failed at startup:", err);
  }
})();


// GET Home Page: Renders the Relational Matrix Platform's home page
app.get("/", (req, res) => {
    
    if (!req.session.user) {
        res.render("home-page.ejs", {
            isMainAppFlow: true
        });
    }
    else {
        res.render("home-page.ejs", {
            isMainAppFlow: true
        })
    }
    
});


// POST Home Page: Triggered by the "Enter" button, and redirects us to the login page
app.post("/", (req, res) => {
    res.redirect("/login");
});


// GET Signup Page: Renders the User Registration Page
app.get("/signup", (req, res) => {
    res.render("signup.ejs", {
        isMainAppFlow: false
    });
});


// GET Login Page: Renders the Login page
app.get("/login", (req, res) => {

    if (!req.session.user) {
        res.render("login.ejs", {
            isMainAppFlow: true
        });
    }
    else {
        res.redirect("/login/select-level");
    }
});


// Utility function that checks if a user exists in the database, 
// by verifying their (unique) email address
function userExists(inputEmail, storedEmails) {
    return storedEmails.some((row) => row.email === inputEmail);
}

// POST Signup Page: A new User has been created in the database, 
// and users are redirected to the login page to verify their credentials
app.post("/signup", async (req, res) => {

    if (req.body.action == "back") {
        res.redirect("/");
    }
    else {
            // Storing the user's personal info in their current session 
        const { firstName, lastName, affiliation, email} = req.body;

        try {
            // Retrieving the set of emails in the users table
            const {rows: emails} = await pool.query("SELECT email FROM users;");
            
            if (!userExists(email, emails)) {
                try {

                    // Determining the new user's id, based on the current amount of stored users
                    const {rows: countRows } = await pool.query("SELECT COUNT(*)::int AS count FROM users;");

                    let newUserId = countRows[0].count + 1;

                    // Inserting the new user in the users table
                    await pool.query(
                        "INSERT INTO users (first_name, last_name, affiliation, email) VALUES ($1, $2, $3, $4);",
                        [firstName, lastName, affiliation, email]
                    );

                    // Initializing the session and its data fields,
                    // after inserting the new user to the database
                    if (!req.session.user) {
                        req.session.user = {};
                    }
                    req.session.user.userId = newUserId;
                    
                    req.session.user.firstName = firstName;
                    req.session.user.lastName = lastName;
                    req.session.user.affiliation = affiliation;
                    req.session.user.email = email;
                    
                    req.session.save((err) => {
                        if (err) {
                            console.error(err);
                        }
                    });

                    console.log(`User ${req.session.user.userId} has been added to the database.`);

                } catch (err) {
                    // If the user already exists in the "users" table,
                    // we retrieve its Id and store it in the session.
                    const { rows } = await pool.query("SELECT id FROM users WHERE email = $1;", [email]);

                    req.session.user.userId = rows[0].id;
                    req.session.save((err) => {
                        if (err) {
                            console.log("Error saving session:", err);
                        }
                    });

                    console.log(`User ${req.session.user.userId} already exists.`);

                }
            }

            res.redirect("/login/select-level");
            
        } catch (err) {
            console.log("Here");
            console.error(err);
        }
    }
    
});


// POST Login Page: Submits the users' credentials, and redirects them to the level of analysis selection page
app.post("/login", async (req, res) => {

    if (req.body.action == "back") {
        res.redirect("/");

    }
    else {
            // Storing the user's personal info in their current session 
        const { firstName, lastName, affiliation, email} = req.body;
        
        try {
            // Retrieving the set of emails in the users table
            const {rows: emails} = await pool.query("SELECT email FROM users;");

            if (userExists(email, emails)) {
                try {

                    // If the user already exists in the "users" table,
                    // we retrieve its Id and store it in the session.
                    const {rows} = await pool.query("SELECT id FROM users WHERE email = $1;", [email]);

                    // Since the user has been verified, we initialize their session object and 
                    // we store the request's additional info to the user's session object
                    if (!req.session.user) {
                        req.session.user = {};
                    }

                    req.session.user.userId = rows[0].id;
                    
                    req.session.user.firstName = firstName;
                    req.session.user.lastName = lastName;
                    req.session.user.affiliation = affiliation;
                    req.session.user.email = email;
                    
                    req.session.save((err) => {
                        if (err) {
                            console.log("Error saving session:", err);
                        }
                    });

                    console.log(`User ${req.session.user.userId} already exists.`);

                } catch (err) {
                    console.error(err);
                }

                // Advancing the user the Level of Analysis Selection Page
                res.redirect("/login/select-level");
            }
            else {
                console.log("User doesn't exist");
                res.render(`signup.ejs`, {
                    loginFailed: true,
                    isMainAppFlow: false,
                });
            }

        } catch (err) {
            console.error(err);
        }
    }   
    
});


// POST Logout: Users logout, deleting their session info and redirecting them to the Introductory Page.
app.post("/logout", (req, res) => {
    
    req.session.destroy(err => {
        if (err) {
            console.error("Session destruction error:", err);
            return res.status(500).send("Could not log out. Please try again");
        }

        res.clearCookie('connect.sid');
        res.redirect("/");
    });
});


// GET Select Level: Renders the inequality level selection page
app.get("/login/select-level", (req, res) => {

    // Checking if the user is logged in
    if (!req.session.user) {
        console.log("User not logged in. Back to the login page.");
        res.redirect("/login");
    }
    else {
        // If the user comes back at this page after a search, display the previously selected value, or an empty string.
        // Also, save the current page endpoint, so that users can come back (by clicking the Back buttons),
        // if they are in the bookmarks or search history page
        req.session.user.lastMainPage = req.path;

        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            res.render("select-level.ejs", {
                levelOfAnalysis: req.session.user.levelOfAnalysis || "",
                otherLevelOfAnalysis: req.session.user.otherLevelOfAnalysis || "",
                isMainAppFlow: true
            });
        });
    }
});


// POST Select Level: Submits the users' selected level, and Redirects them to the dependent variable's selection page
app.post("/login/select-level", (req, res) => {

    // Checking if the user is logged in.
    if (!req.session.user) {
        console.log("User not logged in. Back to the login page.");
        res.redirect("/login");
    }
    else {
        // If the "Cancel Search" button was selected, de-select all the previous search options
        if (req.body.action == "cancel-search") {
            req.session.user.levelOfAnalysis = "";
            req.session.user.otherLevelOfAnalysis = "";

            req.session.user.dependentVariable = "";
            req.session.user.otherDependentVariable = "";
            req.session.user.dependentCategory = "";

            req.session.user.independentVariable = "";
            req.session.user.otherIndependentVariable = "";
            req.session.user.independentCategory = "";

            req.session.save((err) => {
                if (err) {
                    console.error(err);
                }
            });

            res.redirect("/");
        }
        else if (req.body.action === "back") {
            res.redirect("/");
        }
        else {
            // Saving the selected Level of Analysis in the user's session.
            // Saving any changes in the sidebar's and theme's status.
            req.session.user.levelOfAnalysis = req.body.levelOfAnalysis;
            req.session.user.otherLevelOfAnalysis = req.body.otherLevelOfAnalysis;

            req.session.save((err) => {
                if (err) {
                    console.error(err);
                }

                console.log(`User ${req.session.user.userId} selected ` + req.session.user.levelOfAnalysis);

                // Moving on to the next page.
                res.redirect("/login/select-level/select-dependent-variable");
            });
            
        }
    }
});


// GET Select Dependent Variable: Renders the dependent variable's selection page 
app.get("/login/select-level/select-dependent-variable", (req, res) => {

    // Checking if the user is logged in.
    if (!req.session.user) {
        console.log("User not logged in. Back to the login page.");
        res.redirect("/login");
    }
    else {
        // If the user comes back at this page after a search, display the previously selected value, or an empty string.
        // Also, retrieving the selected Level of Analysis from the user session.

        // Also, save the current page endpoint, so that users can come back (by clicking the Back buttons),
        // if they are in the bookmarks or search history page
        req.session.user.lastMainPage = req.path;

        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            res.render("select-dependent.ejs", {
                dependentVariable: Array.isArray(req.session.user.dependentVariable) ? req.session.user.dependentVariable.join(" - ") : req.session.user.dependentVariable,
                otherDependentVariable: req.session.user.otherDependentVariable || "",
                dependentCategory: req.session.user.dependentCategory || "",
                isMainAppFlow: true
            });
        })
        
    }
});


// POST Select Dependent Variable: Submits the users' selected dependent variable, and redirects them to the independent variable's selection page
app.post("/login/select-level/select-dependent-variable", (req, res) => {

    // Checking if the user is logged in.
    if (!req.session.user) {
        console.log("User not logged in. Back to the login page.");
        res.redirect("/login");
    }
    else {
        // If the "Cancel Search" button was selected, de-select all the previous search options
        if (req.body.action == "cancel-search") {
            req.session.user.levelOfAnalysis = "";
            req.session.user.otherLevelOfAnalysis = "";

            req.session.user.dependentVariable = "";
            req.session.user.otherDependentVariable = "";
            req.session.user.dependentCategory = "";

            req.session.user.independentVariable = "";
            req.session.user.otherIndependentVariable = "";
            req.session.user.independentCategory = "";

            req.session.save((err) => {
                if (err) {
                    console.error(err);
                }
            });

            res.redirect("/");
        }
        else if (req.body.action === "back") {
            res.redirect("/login/select-level");
        }
        else {
            // Saving the selected Dependent Variable in the user's session.
            // Saving any changes in the sidebar's and theme's status.

            if (req.body.dependentVariable.startsWith("Size of Public sector") ||
                req.body.dependentVariable.startsWith("Adequate transportation infrastructure") ||
                req.body.dependentVariable.startsWith("Level of development") ||
                req.body.dependentVariable.startsWith("Discrimination with respect to race")) {
                    req.session.user.dependentVariable = req.body.dependentVariable.split(" - ");
            }
            else {
                req.session.user.dependentVariable = req.body.dependentVariable;
            }

            req.session.user.otherDependentVariable = req.body.otherDependentVariable;
            req.session.user.dependentCategory = req.body.dependentCategory;

            req.session.save((err) => {
                if (err) {
                    console.error(err);
                }

                console.log(`User ${req.session.user.userId} selected ` + req.session.user.dependentVariable);
            
                // Moving on to the next page.
                res.redirect("/login/select-level/select-dependent-variable/select-independent-variable");
            });
        }
    }
});


// GET Select Independent Variable: Renders the independent variable's selection page
app.get("/login/select-level/select-dependent-variable/select-independent-variable", (req, res) => {

    // Checking if the user is logged in.
    if (!req.session.user) {
        console.log("User not logged in. Back to the login page.");
        res.redirect("/login");
    }
    else {
        // If the user comes back at this page after a search, display the previously selected value, or an empty string.
        // Also, retrieving the Level of Analysis and the Dependent Variable from the user's session

        // Also, save the current page endpoint, so that users can come back (by clicking the Back buttons),
        // if they are in the bookmarks or search history page
        req.session.user.lastMainPage = req.path;

        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            res.render("select-independent.ejs", {
                independentVariable: Array.isArray(req.session.user.independentVariable) ? req.session.user.independentVariable.join(" - ") : req.session.user.independentVariable,
                otherIndependentVariable: req.session.user.otherIndependentVariable || "",
                independentCategory: req.session.user.independentCategory || "",
                isMainAppFlow: true
            });
        });
    }
    
});


/* POST Select Independent Variable: Submits the user's selected independent variable, and redirects them to the results page. */
app.post("/login/select-level/select-dependent-variable/select-independent-variable", (req, res) => {

    if (!req.session.user) {
        console.log("User not logged in. Back to the login page.");
        res.redirect("/login");
    }
    else {
        // If the "Cancel Search" button was selected, de-select all the previous search options
        if (req.body.action == "cancel-search") {
            req.session.user.levelOfAnalysis = "";
            req.session.user.otherLevelOfAnalysis = "";

            req.session.user.dependentVariable = "";
            req.session.user.otherDependentVariable = "";
            req.session.user.dependentCategory = "";

            req.session.user.independentVariable = "";
            req.session.user.otherIndependentVariable = "";
            req.session.user.independentCategory = "";

            req.session.save((err) => {
                if (err) {
                    console.error(err);
                }

                res.redirect("/");
            });

           
        }
        else if (req.body.action === "back") {
            res.redirect("/login/select-level/select-dependent-variable");
        }
        else {
            // Saving the selected Independent Variable to the user session
            // Saving any changes in the sidebar's and theme's status.

            if (req.body.independentVariable.startsWith("Size of Public sector") ||
                req.body.independentVariable.startsWith("Adequate transportation infrastructure") ||
                req.body.independentVariable.startsWith("Level of development") ||
                req.body.independentVariable.startsWith("Discrimination with respect to race")) {
                req.session.user.independentVariable = req.body.independentVariable.split(" - ");
            }
            else {
                req.session.user.independentVariable = req.body.independentVariable;
            }

            req.session.user.otherIndependentVariable = req.body.otherIndependentVariable;
            req.session.user.independentCategory = req.body.independentCategory;

            req.session.save((err) => {
                if (err) {
                    console.error(err);
                }

                // Finally, we update the history since the user performed a Query to the Database
                // The function is provided towards the end of the server code.
                console.log(`User ${req.session.user.userId} selected ` + req.session.user.independentVariable);
                
                updateSearchHistory(req.session.user);

                // Moving on to the next page.
                res.redirect("/login/select-level/select-dependent-variable/select-independent-variable/overview-results");
            });

        }
    }
});


// Utility function that queries one of the first 3 input sources (Estimated, Literature, Perceived)
async function queryInputSource(source, dataFields, userSession) {

    let results;

    // For the Estimated / Literature / Perceived Input Sources
    if (source === "estimated" || source === "literature" || source === "perceived") {

            // If both Dependent and Independent are regular Variables
            if (!userSession.dependentVariable[0].startsWith("Other") && !userSession.independentVariable[0].startsWith("Other")) {
                
                // If Level of analysis is "All Levels"
                if (userSession.levelOfAnalysis === "All Levels") {

                    let levels = ["National (compare countries)", "Regional (compare regions or areas)", "Survey (compare individuals or social groups)", "Case Study (in depth analysis)", "Other"];
                    for (let i=0; i < levels.length; i++) {
                        let {rows: currentResults} = await pool.query(
                            `SELECT ${dataFields} FROM ${source}_inputs WHERE level_of_analysis = $1 AND selection_dependent = $2 AND selection_independent = $3;`,
                            [levels[i], userSession.dependentVariable[0], userSession.independentVariable[0]]
                        );

                        if (i === 0) results = currentResults;
                        else results.push(...currentResults);
                    }
                }
                else {
                    const { rows } = await pool.query(
                        `SELECT ${dataFields} FROM ${source}_inputs WHERE level_of_analysis = $1 AND selection_dependent = $2 AND selection_independent = $3;`,
                        [userSession.levelOfAnalysis, userSession.dependentVariable[0], userSession.independentVariable[0]]
                    );

                    results = rows;
                }
                
            }
            // If Dedendent is an "Other" variable, and Independent a regular variable
            else if (userSession.dependentVariable[0].startsWith("Other") && !userSession.independentVariable[0].startsWith("Other")) {

                // If Level of analysis is "All Levels"
                if (userSession.levelOfAnalysis === "All Levels") {

                    let levels = ["National (compare countries)", "Regional (compare regions or areas)", "Survey (compare individuals or social groups)", "Case Study (in depth analysis)", "Other"];
                    for (let i=0; i < levels.length; i++) {
                        
                        let { rows: currentResults } = await pool.query(
                            `SELECT ${dataFields} FROM ${source}_inputs WHERE level_of_analysis = $1 AND selection_dependent = $2 AND other_dependent = $3 AND selection_independent = $4;`,
                            [levels[i], userSession.dependentVariable[0], userSession.otherDependentVariable, userSession.independentVariable[0]]
                        );
                        
                        if (i === 0) results = currentResults;
                        else results.push(...currentResults);
                    }
                }
                else {
                    const { rows } = await pool.query(
                        `SELECT ${dataFields} FROM ${source}_inputs WHERE level_of_analysis = $1 AND selection_dependent = $2 AND other_dependent = $3 AND selection_independent = $4;`,
                        [userSession.levelOfAnalysis, userSession.dependentVariable[0], userSession.otherDependentVariable, userSession.independentVariable[0]]
                    );
                    results = rows;
                }
                
            }
            // If Dependent is a regular variable, and Independent an "Other" variable
            else if (!userSession.dependentVariable[0].startsWith("Other") && userSession.independentVariable[0].startsWith("Other")) {

                // If Level of analysis is "All Levels"
                if (userSession.levelOfAnalysis === "All Levels") {

                    let levels = ["National (compare countries)", "Regional (compare regions or areas)", "Survey (compare individuals or social groups)", "Case Study (in depth analysis)", "Other"];
                    for (let i=0; i < levels.length; i++) {
                        let {rows: currentResults} = await pool.query(
                            `SELECT ${dataFields} FROM ${source}_inputs WHERE level_of_analysis = $1 AND selection_dependent = $2 AND selection_independent = $3 AND other_independent = $4;`,
                            [levels[i], userSession.dependentVariable[0], userSession.independentVariable[0], userSession.otherIndependentVariable]
                        );

                        if (i === 0) results = currentResults;
                        else results.push(...currentResults);
                    }
                }
                else {
                    const { rows } = await pool.query(
                        `SELECT ${dataFields} FROM ${source}_inputs WHERE level_of_analysis = $1 AND selection_dependent = $2 AND selection_independent = $3 AND other_independent = $4;`,
                        [userSession.levelOfAnalysis, userSession.dependentVariable[0], userSession.independentVariable[0], userSession.otherIndependentVariable]
                    );
                    results = rows;
                }
                
            }
            // If both Dependent and Independent are "Other" Variables
            else {

                // If Level of analysis is "All Levels"
                if (userSession.levelOfAnalysis === "All Levels") {

                    let levels = ["National (compare countries)", "Regional (compare regions or areas)", "Survey (compare individuals or social groups)", "Case Study (in depth analysis)", "Other"];
                    for (let i=0; i < levels.length; i++) {
                        let { rows: currentResults } = await pool.query(
                            `SELECT ${dataFields} FROM ${source}_inputs WHERE level_of_analysis = $1 AND selection_dependent = $2 AND other_dependent = $3 AND selection_independent = $4 AND other_independent = $5;`,
                            [levels[i], userSession.dependentVariable[0], userSession.otherDependentVariable, userSession.independentVariable[0], userSession.otherIndependentVariable]
                        );

                        if (i === 0) results = currentResults;
                        else results.push(...currentResults);
                    }
                }
                else {
                    const { rows } = await pool.query(
                        `SELECT ${dataFields} FROM ${source}_inputs WHERE level_of_analysis = $1 AND selection_dependent = $2 AND other_dependent = $3 AND selection_independent = $4 AND other_independent = $5;`,
                        [userSession.levelOfAnalysis, userSession.dependentVariable[0], userSession.otherDependentVariable, userSession.independentVariable[0], userSession.otherIndependentVariable]
                    );
                    results = rows;
                }
                
            }
    }
    // For the Correlations Table Input Sources
    else if (source === "correlations") {

        results = [];

        for (let i=0; i < userSession.dependentVariable.length; i++) {
            for (let j=0; j < userSession.independentVariable.length; j++) {
            
                let { rows: correlationResults } = await pool.query(
                    "SELECT * FROM correlations WHERE dependent_variable = $1 AND independent_variable = $2;",
                    [userSession.dependentVariable[i], userSession.independentVariable[j]]
                );

                if (correlationResults.length === 0) {

                    const { rows } = await pool.query(
                        "SELECT * FROM correlations WHERE dependent_variable = $1 AND independent_variable = $2;",
                        [userSession.independentVariable[j], userSession.dependentVariable[i]]
                    );

                    correlationResults = rows;
                }

                if (correlationResults.length > 0) {
                    correlationResults = correlationResults.map(row => {
                        if (row.correlation_2000 == 10) row.correlation_2000 = "-";
                        if (row.correlation_2023 == 10) row.correlation_2023 = "-";
                        return row;
                    });

                    results.push(correlationResults);
                }
            }
        }
    }
    // For the Granger Causalities Input Source
    else if (source === "granger_causalities") {
        
        results = [];

        for (let i=0; i < userSession.dependentVariable.length; i++) {
            for (let j=0; j < userSession.independentVariable.length; j++) {

                let { rows: causalityResults } = await pool.query(
                    "SELECT * FROM granger_causalities WHERE dependent_variable = $1 AND independent_variable = $2;",
                    [userSession.dependentVariable[i], userSession.independentVariable[j]]
                );
                
                if (causalityResults.length > 0) {
                    results.push(causalityResults);
                }
            }
        }
    }
    else if (source === "ai_chatgpt_research") {
        // If Level of analysis is "All Levels"
        if (userSession.levelOfAnalysis === "All Levels") {

            let levels = ["National (compare countries)", "Regional (compare regions or areas)"];
            for (let i=0; i < levels.length; i++) {
                let { rows: currentResults} = await pool.query(
                    `SELECT ${dataFields} FROM ${source} WHERE level_of_analysis = $1 AND selection_dependent = $2 AND selection_independent = $3;`,
                    [levels[i], userSession.dependentVariable[0], userSession.independentVariable[0]]
                );

                if (i === 0) results = currentResults;
                else results.push(...currentResults);
            }
        }
        else {
            const {rows} = await pool.query(
                `SELECT ${dataFields} FROM ${source} WHERE level_of_analysis = $1 AND selection_dependent = $2 AND selection_independent = $3;`,
                [userSession.levelOfAnalysis, userSession.dependentVariable[0], userSession.independentVariable[0]]
            );
            results = rows;
        }
    }
    
    return results;
}  

// Utility Function that classifies the findings from a data source (only the first 3 - Estimated, Literature, Perceived)
// and calculates the number of findings per impact category
function calculateFindings(source, findings, userSession) {
    let index;
    let totalSourceFindings = 0;

    // Determining Input Source by accessing the correct index in the array of finding categories
    switch (source) {
        case "Estimated": index = 0; break;
        case "Literature": index = 1; break;
        case "Perceived": index = 2; break;
        case "Correlations": index = 3; break;
        case "Granger Causalities": index = 4; break;
        case "AI (ChatGPT) Research": index = 5; break;
    }

    // Findings Classification
    if (index === 0 || index === 1 || index === 2 || index === 5) {
        findings.forEach((finding) => {

            totalSourceFindings += 1;

            switch (finding.effect_direction) {
                case "Increases": case "Increase":
                    userSession.positiveFindings[index] += 1;
                    if (finding.type_of_condition_effect == "Makes increase weaker. After some point impact becomes negative") {
                        userSession.negativeFindings[index] += 1;
                        totalSourceFindings += 1;
                    } 
                    break;
                case "Decreases":
                    userSession.negativeFindings[index] += 1;
                    if (finding.type_of_condition_effect == "Makes decrease weaker. After some point impact becomes positive") {
                        userSession.positiveFindings[index] += 1;
                        totalSourceFindings += 1;
                    }
                    break;
                case "Inconclusive effect":
                    userSession.inconclusiveFindings[index] += 1;
                    break;
                case "No effect":
                    userSession.noEffectFindings[index] += 1;
                    break;
                case "Increases under a conditionality":
                    userSession.positiveFindings[index] += 1;
                    if (finding.type_of_condition_effect == "Makes increase weaker. After some point impact becomes negative") {
                        userSession.negativeFindings[index] += 1;
                        totalSourceFindings += 1;
                    } 
                    break;
                case "Decreases under a conditionality":
                    userSession.negativeFindings[index] += 1;
                    if (finding.type_of_condition_effect == "Makes decrease weaker. After some point impact becomes positive") {
                        userSession.positiveFindings[index] += 1;
                        totalSourceFindings += 1;
                    }
                    break;
                case "First increases and after some point decreases":
                case "First decreases and after some point increases":
                    userSession.positiveFindings[index] += 1;
                    userSession.negativeFindings[index] += 1;
                    totalSourceFindings += 1;
                    break;
            }
        });
    }
    else if (index === 3) {
        for (let i=0; i < findings.length; i++) {
            
            if (findings[i][0].correlation_2000 != "-") {
                if (findings[i][0].correlation_2000 > 0) userSession.positiveFindings[index] += 1;
                else if (findings[i][0].correlation_2000 < 0) userSession.negativeFindings[index] += 1;
                else userSession.noEffectFindings[index] += 1;

                totalSourceFindings += 1;
            }

            if (findings[i][0].correlation_2023 != "-") {
                if (findings[i][0].correlation_2023 > 0) userSession.positiveFindings[index] += 1;
                else if (findings[i][0].correlation_2023 < 0) userSession.negativeFindings[index] += 1;
                else userSession.noEffectFindings[index] += 1;

                totalSourceFindings += 1;
            }
            
        }
    }
    else if (index === 4) {
        for (let i=0; i < findings.length; i++) {

            switch (findings[i][0].causality) {
                case "Consistent positive": case "Predominantly positive": userSession.positiveFindings[index] += 1; break;
                case "Consistent negative": case "Predominantly negative": userSession.negativeFindings[index] += 1; break;
                case "Mixed trend": userSession.inconclusiveFindings[index] += 1; break;
            }

            totalSourceFindings += 1;
        }
    }

    return totalSourceFindings;
} 


// Utility function that calculates the Overall Impact for a particular input data source (all 5 sources in this function),
// attempting to determine the most dominant effect category (if any) of its findings.
function calculateImpact(source, userSession) {

    let index;

    // Determining Input Source by accessing the correct index in the array of finding categories
    switch (source) {
        case "Estimated": index = 0; break;
        case "Literature": index = 1; break;
        case "Perceived": index = 2; break;
        case "Correlations": index = 3; break;
        case "Granger Causalities": index = 4; break;
        case "AI (ChatGPT) Research": index = 5; break;
    }

    let impact;
    
    let positive = userSession.positiveFindings[index];
    let negative = userSession.negativeFindings[index]; 
    let inconclusive = userSession.inconclusiveFindings[index];
    let noeffect = userSession.noEffectFindings[index];
    
    // Calculating Overall Impact on each source based on the Proportions of the Most Dominant Impact Category
    if (positive === 0 && negative === 0 && inconclusive === 0 && noeffect === 0) impact = "-";
    else if (negative === 0 && inconclusive === 0 && noeffect === 0) impact = "positive";
    else if (positive === 0 && inconclusive === 0 && noeffect === 0) impact = "negative";
    else if (positive === 0 && negative === 0 && noeffect === 0) impact = "inconclusive";
    else if (positive === 0 && negative === 0 && inconclusive === 0) impact = "no-effect";
    else if (positive > 0.65 * (positive + negative + inconclusive + noeffect)) impact = "rather-positive";
    else if (negative > 0.65 * (positive + negative + inconclusive + noeffect)) impact = "rather-negative";
    else if (inconclusive > 0.65 * (positive + negative + inconclusive + noeffect)) impact = "possibly-inconclusive";
    else if (noeffect > 0.65 * (positive + negative + inconclusive + noeffect)) impact = "possibly-no-effect";
    else impact = "inconclusive";    
    
    return impact;
}


// Utility function that estimates the Overall Impact of all findings across all input data sources
function estimateOverallImpact(userSession) {

    const positive = userSession.positiveFindings.reduce((total, val) => total + val, 0);
    const negative = userSession.negativeFindings.reduce((total, val) => total + val, 0);
    const inconclusive = userSession.inconclusiveFindings.reduce((total, val) => total + val, 0);
    const noeffect = userSession.noEffectFindings.reduce((total, val) => total + val, 0);

    console.log(userSession.positiveFindings, positive);
    console.log(userSession.negativeFindings, negative);
    console.log(userSession.inconclusiveFindings, inconclusive);
    console.log(userSession.noEffectFindings, noeffect);

    let impact;
    let percentage; 
    let confidence;

    // Calculating:
    // 1) Overall Impact,
    // 2) Proportional Percentage of the Most Dominant Category
    // 3) Confidence Level,
    // for the Total Findings from all Sources
    if (positive === 0 && negative === 0 && inconclusive === 0 && noeffect === 0) { impact = "", percentage = "0%"; confidence = "" }
    else if (positive >= 0.90 * (positive + negative + inconclusive + noeffect)) {impact = "Positive"; percentage = ((positive / (positive + negative + inconclusive + noeffect))*100).toFixed(1); confidence = "Very High";} 
    else if (negative >= 0.90 * (positive + negative + inconclusive + noeffect)) { impact = "Negative"; percentage = ((negative / (positive + negative + inconclusive + noeffect))*100).toFixed(1); confidence = "Very High";}
    else if (inconclusive >= 0.90 * (positive + negative + inconclusive + noeffect)) { impact = "Inconclusive"; percentage = ((inconclusive / (positive + negative + inconclusive + noeffect))*100).toFixed(1); confidence = "Very High";}
    else if (noeffect >= 0.90 * (positive + negative + inconclusive + noeffect)) {impact = "No Effect"; percentage = ((noeffect / (positive + negative + inconclusive + noeffect))*100).toFixed(1); confidence = "Very High";}
    else if (positive >= 0.75 * (positive + negative + inconclusive + noeffect)) {impact = "Positive"; percentage = ((positive / (positive + negative + inconclusive + noeffect))*100).toFixed(1); confidence = "High";}
    else if (negative >= 0.75 * (positive + negative + inconclusive + noeffect)) {impact = "Negative"; percentage = ((negative / (positive + negative + inconclusive + noeffect))*100).toFixed(1); confidence = "High";} 
    else if (inconclusive >= 0.75 * (positive + negative + inconclusive + noeffect)) {impact = "Inconclusive"; percentage = ((inconclusive / (positive + negative + inconclusive + noeffect))*100).toFixed(1); confidence = "High";} 
    else if (noeffect >= 0.75 * (positive + negative + inconclusive + noeffect)) {impact = "No Effect"; percentage = ((noeffect / (positive + negative + inconclusive + noeffect))*100).toFixed(1); confidence = "High";}
    else if (positive >= 0.50 * (positive + negative + inconclusive + noeffect)) {
        if (positive === negative) {
            impact = "Inconclusive";
        }
        else {
            impact = "Positive"; 
        }
        
        percentage = ((positive / (positive + negative + inconclusive + noeffect))*100).toFixed(1); 
        confidence = "Modest";
    }
    else if (negative >= 0.50 * (positive + negative + inconclusive + noeffect)) { impact = "Negative"; percentage = ((negative / (positive + negative + inconclusive + noeffect))*100).toFixed(1); confidence = "Modest";} 
    else if (inconclusive >= 0.50 * (positive + negative + inconclusive + noeffect)) {impact = "Inconclusive"; percentage = ((inconclusive / (positive + negative + inconclusive + noeffect))*100).toFixed(1); confidence = "Modest";} 
    else if (noeffect >= 0.50 * (positive + negative + inconclusive + noeffect)) {impact = "No Effect"; percentage = ((noeffect / (positive + negative + inconclusive + noeffect))*100).toFixed(1); confidence = "Modest";}
    else {
        if (positive >= negative && positive >= inconclusive && positive >= noeffect) {
            if (positive === negative) {
                impact = "Inconclusive";
            }
            else {
                impact = "Positive";
            }

            percentage = ((positive / (positive + negative + inconclusive + noeffect))*100).toFixed(1);
        }
        else if ((negative >= positive && negative >= inconclusive && negative >= noeffect)) {
            impact = "Negative";
            percentage = ((negative / (positive + negative + inconclusive + noeffect))*100).toFixed(1);
        }
        else if ((inconclusive >= positive && inconclusive >= negative && inconclusive >= noeffect)) {
            impact = "Inconclusive";
            percentage = ((inconclusive / (positive + negative + inconclusive + noeffect))*100).toFixed(1);
        }
        else {
            impact = "No Effect";
            percentage = ((noeffect / (positive + negative + inconclusive + noeffect))*100).toFixed(1);
        }

        confidence = "Low";
    }  
    
    console.log("Overall Impact: ", impact, percentage, confidence);
    
    return [impact, percentage, confidence];
}


/* GET Overview Results: Renders the results that correspond to the user's query search parameters */
app.get("/login/select-level/select-dependent-variable/select-independent-variable/overview-results",  async (req, res) => {

    // Checking if the user is logged in.
    if (!req.session.user) {
        console.log("User not logged in. Back to the login page.");
        res.redirect("/login");
    }
    else {
        // Arrays storing the number of a specific type of findings for each data source
        // Each position (index) in the array is assigned to a specific data source
        // 0 -> Estimated, 1 -> Literature, 2 -> Perceived, 3 -> Correlations, 4 -> Granger Causalities, 5 -> AI Research 
        req.session.user.positiveFindings = [0, 0, 0, 0, 0, 0];
        req.session.user.negativeFindings = [0, 0, 0, 0, 0, 0];
        req.session.user.inconclusiveFindings = [0, 0, 0, 0, 0, 0];
        req.session.user.noEffectFindings = [0, 0, 0, 0, 0, 0];

        // Converting single dependent and independent variables to 1-element arrays
        // for easier handling in the Correlations and Granger causalities queries
        if (!Array.isArray(req.session.user.dependentVariable)) {
            req.session.user.dependentVariable = [req.session.user.dependentVariable];
        } 


        if(!Array.isArray(req.session.user.independentVariable)) {
            req.session.user.independentVariable = [req.session.user.independentVariable];
        }

        
        // 1) Query to the Estimated Inputs Table, storing the number of Estimated findings,
        // and their effects in an array 
        const estimatedResults = await queryInputSource("estimated", "effect_direction, type_of_condition_effect", req.session.user);

        req.session.user.totalEstimatedFindings = calculateFindings("Estimated", estimatedResults, req.session.user);

        req.session.user.estimatedImpact = calculateImpact("Estimated", req.session.user);

        // 2) Query to the Literature Inputs Table, storing the number of Literature findings,
        // and their effects in an array
        const literatureResults = await queryInputSource("literature", "effect_direction, type_of_condition_effect", req.session.user);

        req.session.user.totalLiteratureFindings = calculateFindings("Literature", literatureResults, req.session.user);
        
        req.session.user.literatureImpact = calculateImpact("Literature", req.session.user);

        // 3) Query to the Perceived Inputs Table, storing the number of Perceived findings,
        // and their effects in an array
        const perceivedResults = await queryInputSource("perceived", "effect_direction, type_of_condition_effect", req.session.user);

        req.session.user.totalPerceivedFindings = calculateFindings("Perceived", perceivedResults, req.session.user);

        req.session.user.perceivedImpact = calculateImpact("Perceived", req.session.user);

        // 4) Query to the Correlations Table for all possible combinations (if required) of main variables,
        // and secondary variables describing the main variables, storing the number of correlation findings.
        req.session.user.totalCorrelationFindings = 0;

        let correlationResults = await queryInputSource("correlations", "*", req.session.user)
        
        req.session.user.totalCorrelationFindings = calculateFindings("Correlations", correlationResults, req.session.user);
        
        req.session.user.correlationsImpact = calculateImpact("Correlations", req.session.user);

        // 5) Query to the Granger Causalities Table for all possible combinations (if required) of main variables,
        // and secondary variables describing the former, storing the number of causality findings.
        
        let causalityResults = await queryInputSource("granger_causalities", "*", req.session.user);
                
        req.session.user.totalGrangerFindings = calculateFindings("Granger Causalities", causalityResults, req.session.user);
        
        req.session.user.grangerImpact = calculateImpact("Granger Causalities", req.session.user);

        
        // 6) Query to the AI Research Inputes if the selected level is either National or Regional or All Levels
        // and the dependent variable is unequal income distribution
        req.session.user.totalAIFindings = 0;
        req.session.user.aiImpact = "";

        if ((req.session.user.levelOfAnalysis === "National (compare countries)" || 
             req.session.user.levelOfAnalysis === "Regional (compare regions or areas)" ||
             req.session.user.levelOfAnalysis === "All Levels") &&
             req.session.user.dependentVariable[0] === "Unequal Income distribution (individuals or social groups)") {

                let chatgptResults = await queryInputSource("ai_chatgpt_research", "*", req.session.user);

                req.session.user.totalAIFindings = calculateFindings("AI (ChatGPT) Research", chatgptResults, req.session.user);

                req.session.user.aiImpact = calculateImpact("AI (ChatGPT) Research", req.session.user);
        }
        

        // Calling the method that calculates the percentage of the most dominant impact category
        // overall, and the corresponding confidence level
        let overallImpact = estimateOverallImpact(req.session.user);

        // Also, save the current page endpoint, so that users can come back (by clicking the Back buttons),
        // if they are in the bookmarks or search history page
        req.session.user.lastMainPage = req.path;

        // Saving the Findings Counts per Category in the user session
        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            console.log("Estimated:", req.session.user.totalEstimatedFindings, "( Positive -", req.session.user.positiveFindings[0], "Negative -", req.session.user.negativeFindings[0], "Inconclusive -", req.session.user.inconclusiveFindings[0], "no Effect -", req.session.user.noEffectFindings[0], ")");
            console.log("Literature:", req.session.user.totalLiteratureFindings, "( Positive -", req.session.user.positiveFindings[1], "Negative -", req.session.user.negativeFindings[1], "Inconclusive -", req.session.user.inconclusiveFindings[1], "no Effect -", req.session.user.noEffectFindings[1], ")");
            console.log("Perceived:", req.session.user.totalPerceivedFindings, "( Positive -", req.session.user.positiveFindings[2], "Negative -", req.session.user.negativeFindings[2], "Inconclusive -", req.session.user.inconclusiveFindings[2], "no Effect -", req.session.user.noEffectFindings[2], ")");
            console.log("Correlations:", req.session.user.totalCorrelationFindings, "( Positive -", req.session.user.positiveFindings[3], "Negative -", req.session.user.negativeFindings[3], "Inconclusive -", req.session.user.inconclusiveFindings[3], "no Effect -", req.session.user.noEffectFindings[3], ")");
            console.log("Granger Causalities:", req.session.user.totalGrangerFindings, "( Positive -", req.session.user.positiveFindings[4], "Negative -", req.session.user.negativeFindings[4], "Inconclusive -", req.session.user.inconclusiveFindings[4], "no Effect -", req.session.user.noEffectFindings[4], ")\n");
            console.log("AI Research:", req.session.user.totalAIFindings, "( Positive -", req.session.user.positiveFindings[5], "Negative -", req.session.user.negativeFindings[5], "Inconclusive - ", req.session.user.inconclusiveFindings[5], "no Effect - ", req.session.user.noEffectFindings[5], ")");
            
            console.log("Estimated Impact: ", req.session.user.estimatedImpact);
            console.log("Literature Impact: ", req.session.user.literatureImpact);
            console.log("Perceived Impact: ", req.session.user.perceivedImpact);
            console.log("Correlations Impact: ", req.session.user.correlationsImpact);
            console.log("Granger Causalities Impact: ", req.session.user.grangerImpact);
            console.log("AI Research Impact: ", req.session.user.aiImpact);

            // Rendering the Summary Results Page 
            res.render("overview-results.ejs", {
                sourceOfResults: "",

                positiveFindings: req.session.user.positiveFindings,
                negativeFindings: req.session.user.negativeFindings,
                inconclusiveFindings: req.session.user.inconclusiveFindings,
                noEffectFindings: req.session.user.noEffectFindings,

                estimatedImpact: req.session.user.estimatedImpact,
                literatureImpact: req.session.user.literatureImpact,
                perceivedImpact: req.session.user.perceivedImpact,
                correlationsImpact: req.session.user.correlationsImpact,
                grangerImpact: req.session.user.grangerImpact,
                aiImpact: req.session.user.aiImpact,

                totalEstimatedFindings: req.session.user.totalEstimatedFindings,
                totalLiteratureFindings: req.session.user.totalLiteratureFindings,
                totalPerceivedFindings: req.session.user.totalPerceivedFindings,
                totalCorrelationFindings: req.session.user.totalCorrelationFindings,
                totalGrangerFindings: req.session.user.totalGrangerFindings,
                totalAIFindings: req.session.user.totalAIFindings,

                dependentVariable: (req.session.user.dependentVariable[0].startsWith("Other")) ? [req.session.user.otherDependentVariable] : req.session.user.dependentVariable,
                independentVariable: (req.session.user.independentVariable[0].startsWith("Other")) ? [req.session.user.otherIndependentVariable] : req.session.user.independentVariable,

                impact: overallImpact[0],
                percentage: overallImpact[1],
                confidence: overallImpact[2],
                isMainAppFlow: true
            });
        });
    }    
});


// POST Summary Results: Redirects users to the analytical results page 
app.post("/login/select-level/select-dependent-variable/select-independent-variable/overview-results", async (req,res) => {

    if (!req.session.user) {
        res.redirect("/login");
    }
    else {

        if (req.body.action == "back") {
            res.redirect("/login/select-level/select-dependent-variable/select-independent-variable");

        }
        else {
            // Saving the current selection of the Results Source to the user session
            req.session.user.sourceOfResults = req.body.sourceOfResults;

            req.session.save((err) => {
                if (err) {
                    console.error(err);
                }

                res.redirect("/login/select-level/select-dependent-variable/select-independent-variable/overview-results/source-overview-results");
            });
        }
        
        
    }
});


// Utility function that summarizes the findings in terms of their effect direction,
// calculating the total findings for each effect direction case.
// It also substitutes the "Increases" and "Decreases" by "Positive" and "Negative" to reflect Impact, instead of effect direction.
// Moreover, it assigns the result card colors to each result tuple. 
function aggregateEffectDirections(source, results, userSession) {

    let index;
    switch (source) {
        case "Estimated": index = 0; break;
        case "Literature": index = 1; break;
        case "Perceived": index = 2; break;
        case "Correlations": index = 3; break;
        case "Granger Causalities": index = 4; break;
        case "AI (ChatGPT) Research": index = 5; break;
    }

    if (index === 0 || index === 1 || index === 2 || index === 5) {
        results.forEach((res) => {

            if (index === 0 || index === 1 || index === 2)
                res.table = source + " Inputs";
            else
                res.table = source;

            switch (res.effect_direction) {
                case "Increases": 
                case "Increase": 
                    res.effect_direction = "Positive";
                    res.effect_for_color = "positive";
                    userSession.totalEffects.positive += 1; 
                    break;
                case "Increases under a conditionality":
                    res.effect_direction = "Positive under a conditionality"; 
                    res.effect_for_color = "rather-positive";
                    userSession.totalEffects.positiveConditionality += 1;
                    break;
                case "Decreases": 
                    res.effect_direction = "Negative";
                    res.effect_for_color = "negative";
                    userSession.totalEffects.negative += 1; 
                    break;
                case "Decreases under a conditionality": 
                    res.effect_direction = "Negative under a conditionality";
                    res.effect_for_color = "rather-negative";
                    userSession.totalEffects.negativeConditionality += 1; 
                    break;
                case "Inconclusive effect": 
                    res.effect_direction = "Inconclusive Impact";
                    res.effect_for_color = "inconclusive";
                    userSession.totalEffects.inconclusiveEffect += 1; 
                    break;
                case "No effect":  
                    res.effect_direction = "No Impact";
                    res.effect_for_color = "no-effect";
                    userSession.totalEffects.noEffect += 1; 
                    break;
                case "First increases and after some point decreases": 
                    res.effect_direction = "First Positive and after some point Negative";
                    res.effect_for_color = "first-positive";
                     userSession.totalEffects.firstPositive += 1; 
                    break;
                case "First decreases and after some point increases": 
                    res.effect_direction = "First Negative and after some point Positive";
                    res.effect_for_color = "rather-negative";
                    userSession.totalEffects.firstNegative += 1; 
                    break;
            }

            // Changing "increase" and "decrease" to "Positive" and "Negative" respectively.
            if (index === 0 || index === 1 || index === 2) {
                if (res.type_of_condition_effect) {
                    switch (res.type_of_condition_effect) {
                        case "Makes increase even stronger": res.type_of_condition_effect = "Makes Positive impact even stronger"; break;
                        case "Makes decrease even stronger": res.type_of_condition_effect = "Makes Negative impact even stronger"; break;
                        case "Makes increase weaker. After some point impact becomes negative":
                            res.type_of_condition_effect = "Makes Positive impact weaker. After some point impact becomes Negative"; 
                            
                            if (res.effect_direction === "Positive" || res.effect_direction === "Positive under a conditionality")
                                userSession.totalEffects.negative += 1;
                            break;
                        case "Makes decrease weaker. After some point impact becomes positive": 
                            res.type_of_condition_effect = "Makes Negative impact weaker. After some point impact becomes Positive"; 
                            
                            if (res.effect_direction === "Negative" || res.effect_direction === "Negative under a conditionality")
                                userSession.totalEffects.positive += 1;
                            break;
                    }
                }
            }
        });
    }
    else if (index === 3) {
        results.forEach((res) => {

            res[0].table = "Correlations Table";

            if (res[0].correlation_2000 != "-" && res[0].correlation_2023 != "-") {
                if (res[0].correlation_2000 > 0 && res[0].correlation_2023 > 0) {
                    res[0].effect_for_color = "positive";
                    userSession.totalEffects.positive += 2;
                }
                else if (res[0].correlation_2000 < 0 && res[0].correlation_2023 < 0) {
                    res[0].effect_for_color = "negative";
                    userSession.totalEffects.negative += 2;
                }
                else if ((res[0].correlation_2000 > 0 && res[0].correlation_2023 < 0) || (res[0].correlation_2000 < 0 && res[0].correlation_2023 > 0)) {
                    res[0].effect_for_color = "inconclusive";
                    userSession.totalEffects.positive += 1;
                    userSession.totalEffects.negative += 1;
                }
                else if ((res[0].correlation_2000 > 0 && res[0].correlation_2023 == 0) || (res[0].correlation_2000 == 0 && res[0].correlation_2023 > 0)) {
                    res[0].effect_for_color = "rather-positive";
                    userSession.totalEffects.positive += 1;
                    userSession.totalEffects.noEffect += 1;
                }
                else if ((res[0].correlation_2000 < 0 && res[0].correlation_2023 == 0) || (res[0].correlation_2000 == 0 && res[0].correlation_2023 < 0)) {
                    res[0].effect_for_color = "rather-negative";
                    userSession.totalEffects.negative += 1;
                    userSession.totalEffects.noEffect += 1;
                }
                else {
                    res[0].effect_for_color = "no-effect";
                    userSession.totalEffects.noEffect += 2;
                }
            }
            // Only for "Democratic voice / quality" as dependent or independent
            else if (res[0].correlation_2000 != "-") {
                if (res[0].correlation_2000 > 0) {
                    res[0].effect_for_color = "positive";
                    userSession.totalEffects.positive += 1;
                }
                else if (res[0].correlation_2000 < 0) {
                    res[0].effect_for_color = "negative";
                    userSession.totalEffects.negative += 1;
                }
                else {
                    res[0].effect_for_color = "no-effect";
                    userSession.totalEffects.noEffect += 1;
                }
            }
            else if (res[0].correlation_2023 != "-") {
                if (res[0].correlation_2023 > 0) {
                    res[0].effect_for_color = "positive";
                    userSession.totalEffects.positive += 1;
                }
                else if (res[0].correlation_2023 < 0) {
                    res[0].effect_for_color = "negative";
                    userSession.totalEffects.negative += 1;
                }
                else {
                    res[0].effect_for_color = "no-effect";
                    userSession.totalEffects.noEffect += 1;
                }
            }
        });
    }
    else if (index === 4) {
        // Assigning the appropriate color: Green (positive causality), Red (negative causality)
        // Yellow (mixed causality)
        results.forEach((res) => {

            res[0].table = "Granger Causalities Table";

            switch(res[0].causality) {
                case "Consistent positive": 
                res[0].effect_for_color = "positive"; 
                userSession.totalEffects.positive += 1;
                break;
            case "Predominantly positive": 
                res[0].effect_for_color = "rather-positive"; 
                userSession.totalEffects.positive += 1;
                break;
            case "Consistent negative": 
                res[0].effect_for_color = "negative";
                userSession.totalEffects.negative += 1; 
                break;
            case "Predominantly negative": 
                res[0].effect_for_color = "rather-negative";
                userSession.totalEffects.negative += 1;
                break;
            case "Mixed trend": 
                res[0].effect_for_color = "inconclusive";
                userSession.totalEffects.inconclusiveEffect += 1;
                break;
            }

            console.log(res);
        });
    }
    
}

// GET Select Results Source: Renders the source of results selection page 
app.get("/login/select-level/select-dependent-variable/select-independent-variable/overview-results/source-overview-results", async (req,res) => {

    // Checking if the user is logged in.
    if (!req.session.user) {
        console.log("User not logged in. Back to the login page.");
        res.redirect("/login");
    }
    else {
        // Since the user has selected a source of results to further research,
        // we query the corresponding database table
        // and store the retrieved results in the user's session.

        // Object storing the aggregate counts of the different effect directions of the currently selected input source
         req.session.user.totalEffects = {
            positive: 0,
            positiveConditionality: 0,
            negative: 0,
            negativeConditionality: 0,
            inconclusiveEffect: 0,
            noEffect: 0,
            firstPositive: 0,
            firstNegative: 0
        };

        // Temporary helper results list
        let results, table;

        console.log(req.session.user.sourceOfResults);
        switch (req.session.user.sourceOfResults) {

            // 1) Query to the Estimated Inputs
            case "Estimated Inputs":
                table = "Estimated Inputs";
                
                let estimatedResults = await queryInputSource("estimated", "*", req.session.user);

                req.session.user.queryResults = estimatedResults;
                
                aggregateEffectDirections("Estimated", req.session.user.queryResults, req.session.user);
                
                console.log(req.session.user.queryResults);
                break;

            // 2) Query to the Literature Inputs
            case "Literature Inputs":
                table = "Literature Inputs";
            
                let literatureResults = await queryInputSource("literature", "*", req.session.user);

                // Checking for findings that span multiple year periods, 
                // Querying the appropriate table to get those year spans, and integrating them with the finding
                for (const literatureResult of literatureResults) {

                    let year_spans;
                    if (literatureResult.multiple_year_spans) {
                        let {rows: year_spans} = await pool.query(
                            'SELECT * FROM lit_inputs_multiple_year_spans WHERE "index" = $1;',
                            [literatureResult.id]
                        );

                        literatureResult.year_spans = year_spans;
                    }
                }

                req.session.user.queryResults = literatureResults;

                aggregateEffectDirections("Literature", req.session.user.queryResults, req.session.user);
                
                console.log(req.session.user.queryResults);
                break;

            // 3) Query to the Perceived Inputs
            case "Perceived Inputs":
                table = "Perceived Inputs";

                let perceivedResults = await queryInputSource("perceived", "*", req.session.user);

                req.session.user.queryResults = perceivedResults;
                
                aggregateEffectDirections("Perceived", req.session.user.queryResults, req.session.user);
                
                console.log(req.session.user.queryResults);
                break;
            
            // Query to the Correlations Table
            case "Correlations Table":
                table = "Correlations Table";

                results = [];
                let isOpposite;

                let correlationResults = await queryInputSource("correlations", "*", req.session.user);

                aggregateEffectDirections("Correlations", correlationResults, req.session.user);

                correlationResults.forEach((res) => {

                    console.log("In the loop:\n", res[0]);
                    isOpposite = false;

                    let depIndex = req.session.user.dependentVariable.indexOf(res[0].dependent_variable);
                    let indIndex = req.session.user.independentVariable.indexOf(res[0].independent_variable);

                    if (depIndex === -1 && indIndex === -1) {
                        console.log("Inverse");
                        depIndex = req.session.user.independentVariable.indexOf(res[0].dependent_variable);
                        indIndex = req.session.user.dependentVariable.indexOf(res[0].independent_variable);
                        isOpposite = true;
                        console.log("Inverse", depIndex, indIndex);
                    }

                    if (depIndex > 0 && indIndex > 0) {
                        if (!isOpposite) {
                            res[0].dependent_variable = req.session.user.dependentVariable[0] + " (approximated by " + res[0].dependent_variable + ")";
                            res[0].independent_variable = req.session.user.independentVariable[0] + " (approximated by " + res[0].independent_variable + ")";
                        }
                        else if (isOpposite) {
                            console.log("Inverse 2");
                            let temp = res[0].dependent_variable;
                            res[0].dependent_variable = req.session.user.dependentVariable[0] + " (approximated by " + res[0].independent_variable + ")";
                            res[0].independent_variable = req.session.user.independentVariable[0] + " (approximated by " + temp + ")";
                        }
                    }
                    else if (depIndex > 0) {
                        if (!isOpposite) {
                            res[0].dependent_variable = req.session.user.dependentVariable[0] + " (approximated by " + res[0].dependent_variable + ")";
                            res[0].independent_variable = req.session.user.independentVariable[0];
                        }
                        else if (isOpposite) {
                            res[0].dependent_variable = req.session.user.dependentVariable[0];
                            res[0].independent_variable = req.session.user.independentVariable[0] + " (approximated by " + res[0].independent_variable + ")";
                        }
                    }
                    else if (indIndex > 0) {
                        if (!isOpposite) {
                            res[0].dependent_variable = req.session.user.dependentVariable[0];
                            res[0].independent_variable = req.session.user.independentVariable[0]  + " (approximated by " + res[0].independent_variable + ")";
                        }
                        else if (isOpposite) {
                            res[0].dependent_variable = req.session.user.dependentVariable[0] + " (approximated by " + res[0].independent_variable + ")";
                            res[0].independent_variable = req.session.user.independentVariable[0];
                        }
                    }
                    else {
                        if (isOpposite) {
                            res[0].dependent_variable = req.session.user.dependentVariable[0];
                            res[0].independent_variable = req.session.user.independentVariable[0];
                        }
                    }

                    results.push(res[0]);
                });

                req.session.user.queryResults = results;

                console.log(req.session.user.queryResults);
                break;
            
            // 5) Query to the Granger Causalities Table
            case "Granger Causalities Table":
                table = "Granger Causalities Table";

                results = [];

                let causalityResults = await queryInputSource("granger_causalities", "*", req.session.user);

                aggregateEffectDirections("Granger Causalities", causalityResults, req.session.user);

                causalityResults.forEach((res) => {

                    let depIndex = req.session.user.dependentVariable.indexOf(res[0].dependent_variable);
                    let indIndex = req.session.user.independentVariable.indexOf(res[0].independent_variable);

                    if (depIndex > 0) {
                        res[0].dependent_variable = req.session.user.dependentVariable[0] + " (approximated by " + res[0].dependent_variable + ")";
                    }

                    if (indIndex > 0) {
                        res[0].independent_variable = req.session.user.independentVariable[0] + " (approximated by " + res[0].independent_variable + ")";
                    }

                    results.push(res[0]);
                });

                req.session.user.queryResults = results;

                console.log(req.session.user.queryResults);
                break;

            case "AI (ChatGPT) Research":
                table = "AI (ChatGPT) Research";

                let chatgptResults = await queryInputSource("ai_chatgpt_research", "*", req.session.user);

                req.session.user.queryResults = chatgptResults;
                
                aggregateEffectDirections("AI (ChatGPT) Research", req.session.user.queryResults, req.session.user);
                
                chatgptResults.forEach((res) => {
                    res.references = [];
                    res.sources = [];
                });

                for (const chatgptResult of chatgptResults) {
                    let {rows: references} = await pool.query(
                        "SELECT * FROM ai_chatgpt_references WHERE query_id = $1;",
                        [chatgptResult.id]
                    );

                    references.forEach((ref) => {
                        chatgptResult.references.push(ref.reference);
                        chatgptResult.sources.push(ref.source);
                    });
                }

                console.log(req.session.user.queryResults);
                break;
        }

        // Also, save the current page endpoint, so that users can come back (by clicking the Back buttons),
        // if they are in the bookmarks or search history page
        req.session.user.lastMainPage = req.path;

        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            // Rendering the results overview from a specific source
            res.render("source-overview-results.ejs", {
                totalEffects: req.session.user.totalEffects,
                table: table,
                isMainAppFlow: true
            });
        })

        
    }
});


// POST Select Results Source: Redirects user to the appropriate detailed results page 
app.post("/login/select-level/select-dependent-variable/select-independent-variable/overview-results/source-overview-results", (req,res) => {

    if (!req.session.user) {
        console.log("User not logged in. Back to the login page.");
        res.redirect("/login");
    }
    else {

        if (req.body.action == "back") {
            res.redirect("/login/select-level/select-dependent-variable/select-independent-variable/overview-results");

        }
        else {
            res.redirect("/login/select-level/select-dependent-variable/select-independent-variable/overview-results/source-overview-results/detailed-results");
        }
    }    
});



// Utility function that checks which of the current result cards
// have been bookmarked by the current user at a previous point in time, 
// and marks the appropriate bookmark symbols
async function checkIfBookmarked(results, userId) {

    const {rows: bookmarks} = await pool.query(
        "SELECT * FROM bookmarks WHERE user_id = $1;",
        [userId]
    );


    // Collecting all the Result Card Ids in an array
    let resultIds = [];
    let notes = [];

    bookmarks.forEach((bookmark) => {

        // Checking if each Result Card has been bookmarked by the current user
        results.forEach((res) => {
            if (res.id == bookmark.source_id && res.table === bookmark.source_table) {
                res.note = bookmark.node;
                res.isBookmarked = "true";
                console.log("bookmarked:", res.id);
            }
            else {
                res.isBookmarked = "false";
                console.log("not bookmarked:", res.id);
            }
        });
    });

}


// GET Detailed Results: Renders the detailed results page of all individual cases the matched the query
app.get("/login/select-level/select-dependent-variable/select-independent-variable/overview-results/source-overview-results/detailed-results", async (req,res) => {

    if (!req.session.user) {
        console.log("User not logged in. Back to the login page");
        res.redirect("/login");
    }
    else {

        await checkIfBookmarked(req.session.user.queryResults, req.session.user.userId);

        console.log("Results:");
        console.log(req.session.user.queryResults);

        // Also, save the current page endpoint, so that users can come back (by clicking the Back buttons),
        // if they are in the bookmarks or search history page
        req.session.user.lastMainPage = req.path;

        req.session.save((err) => {
            if (err) {
                console.error(err);
            }

            res.render("detailed-results.ejs", {
                results: req.session.user.queryResults,
                sourceOfResults: req.session.user.sourceOfResults,
                isMainAppFlow: true
            });
        });
    }
});


// POST Detailed Results: Redirect the button clicks to the correct pages
app.post("/login/select-level/select-dependent-variable/select-independent-variable/overview-results/source-overview-results/detailed-results", (req,res) => {

    if (!req.session.user) {
        console.log("User not logged in. Back to the login page.");
        res.redirect("/login");
    }
    else {
        if (req.body.action === "back") {
            // Redirecting users to the previous page
            res.redirect("/login/select-level/select-dependent-variable/select-independent-variable/overview-results/source-overview-results");
        }
        else if (req.body.action === "end-search") {
            // Emptying all the Selections from the session, since the user has decided to end the search
            req.session.user.levelOfAnalysis = "";
            req.session.user.otherLevelOfAnalysis = "";

            req.session.user.dependentVariable = "";
            req.session.user.otherDependentVariable = "";
            req.session.user.dependentCategory = "";

            req.session.user.independentVariable = "";
            req.session.user.otherIndependentVariable = "";
            req.session.user.independentCategory = "";

            req.session.user.totalEstimatedFindings = "";
            req.session.user.totalLiteratureFindings = "";
            req.session.user.totalPerceivedFindings = "";
            req.session.user.totalCorrelationFindings = "";
            req.session.user.totalGrangerFindings = "";

            req.session.user.sourceOfResults = "";

            req.session.save((err) => {
                if (err) {
                    console.error(err);
                }

                res.redirect("/");
            });
        }
        else if (req.body.action === "new-search") {
            // Redirecting users to the 1st selection page, that of the Level of Analysis
            res.redirect("/login/select-level");
        }
    }
});

// POST Bookmarks: Redirects the user to the Bookmarks page
app.post("/bookmarked-result-cards", (req, res) => {

    console.log("Last Main Page:", req.originalUrl);
    res.redirect("/bookmarked-result-cards");
});


// Utility function that calculates the effect directions of the individual results of the selected input source,
// and assigns the appropriate impact that will later be used to style the result cards.
function calculateResultCardColors(results, source) {

    results.forEach((res) => {
        
        res.table = source;

        switch (res.effect_direction) {
            // 1st Case: The function is called as a part of Rendering the Detailed Results Page
            case "Positive": res.effect_for_color = "positive"; break;
            case "Positive under a conditionality": res.effect_for_color = "rather-positive"; break;
            case "Negative": res.effect_for_color = "negative"; break;
            case "Negative under a conditionality": res.effect_for_color = "rather-negative"; break;
            case "Inconclusive Impact": res.effect_for_color = "inconclusive"; break;
            case "No Impact": res.effect_for_color = "no-effect"; break;
            case "First Positive and after some point Negative": res.effect_for_color = "first-positive"; break;
            case "First Negative and after some point Positive": res.effect_for_color = "first-negative"; break;

            // 2nd Case: The function is called as a part of Rendering the Bookmarks Page,
            // meaning the effect directions have been modified to represent impacts.
            case "Increases": case "Increase": 
                res.effect_direction = "Positive"; 
                res.effect_for_color = "positive"; 
                break;
            case "Increases under a conditionality": 
                res.effect_direction = "Positive under a conditionality"; 
                res.effect_for_color = "rather-positive"; 
                break;
            case "Decreases": 
                res.effect_direction = "Negative"; 
                res.effect_for_color = "negative"; 
                break;
            case "Decreases under a conditionality": 
                res.effect_direction = "Negative under a conditionality"; 
                res.effect_for_color = "rather-negative"; 
                break;
            case "Inconclusive effect": 
                res.effect_direction = "Inconclusive Impact";
                res.effect_for_color = "inconclusive"; 
                break;
            case "No effect": 
                res.effect_direction = "No Impact";
                res.effect_for_color = "no-effect";
                break;
            case "First Increases and after some point Decreases": 
                res.effect_direction = "First Positive and after some point Negative"; 
                res.effect_for_color = "first-positive"; 
                break;
            case "First Decreases and after some point Increases": 
                res.effect_direction = "First Negative and after some point Positive"; 
                res.effect_for_color = "first-negative"; 
                break;
        }

        // Changing "increase" and "decrease" to "Positive" and "Negative" respectively.
        if (res.type_of_condition_effect) {
            switch (res.type_of_condition_effect) {
                case "Makes increase even stronger": res.type_of_condition_effect = "Makes Positive impact even stronger"; break;
                case "Makes decrease even stronger": res.type_of_condition_effect = "Makes Negative impact even stronger"; break;
                case "Makes increase weaker. After some point impact becomes negative": res.type_of_condition_effect = "Makes Positive impact weaker. After some point impact becomes Negative"; break;
                case "Makes decrease weaker. After some point impact becomes positive": res.type_of_condition_effect = "Makes Negative impact weaker. After some point impact becomes Positive"; break;
            }
        }
        
    });
}


// GET Bookmark: Renders the Bookmarks page which display's the user's bookmarked Results Card
app.get("/bookmarked-result-cards", async (req, res) => {

    if (!req.session.user) {
        console.log("User not logged in. Back to the login page.");
        res.redirect("/login");
    }
    else {
        let bookmarks;
        let bookmarkResults = [];

        try {
            // Retrieving the Bookmarks of the Current User
            const { rows } = await pool.query(
                "SELECT * FROM bookmarks WHERE user_id = $1;",
                [req.session.user.userId]
            );
            bookmarks = rows;

        } catch (err) {
            console.error(err);
        }

        console.log("Bookmarks:")
        bookmarks.forEach((bookmark) => {
            console.log(bookmark.source_table, ":", bookmark.source_id);
        });

        let results;

        for (const bookmark of bookmarks) {

            // For each Bookmark, we determine its input source, 
            // and select the equivalent Result Card (while applying the coloring effects function for each one)
            switch (bookmark.source_table) {

                case "Estimated Inputs": {
                    const { rows } = await pool.query(
                        "SELECT * FROM estimated_inputs WHERE id = $1;",
                        [bookmark.source_id]
                    );

                    if (!rows.length) break;

                    calculateResultCardColors(rows, "Estimated Inputs");
                    rows[0].note = bookmark.note;
                    bookmarkResults.push(rows[0]);
                    break;
                }
                case "Literature Inputs": {
                    const { rows } = await pool.query(
                        "SELECT * FROM literature_inputs WHERE id = $1;",
                        [bookmark.source_id]
                    );

                    if (!rows.length) break;

                    if (rows[0].multiple_year_spans) {
                        const {row : year_spans} = await pool.query(
                            'SELECT * FROM lit_inputs_multiple_year_spans WHERE "index" = $1;',
                            [rows[0].id]
                        );

                        rows[0].year_spans = year_spans;
                    }
                    
                    calculateResultCardColors(rows, "Literature Inputs");
                    rows[0].note = bookmark.note;

                    console.log(rows[0]);
                    bookmarkResults.push(rows[0]);
                    break;
                }
                case "Perceived Inputs": {
                    const { rows } = await pool.query(
                        "SELECT * FROM perceived_inputs WHERE id = $1;",
                        [bookmark.source_id]
                    );
                    if (!rows.length) break;
                    
                    calculateResultCardColors(rows, "Perceived Inputs");
                    rows[0].note = bookmark.note;
                    bookmarkResults.push(rows[0]);
                    break;
                }
                case "Correlations Table": {
                    const { rows } = await pool.query(
                        "SELECT * FROM correlations WHERE id = $1;",
                        [bookmark.source_id]
                    );

                    if (!rows.length) break;
                    
                    rows[0].table = "Correlations Table";

                    let corr2000 = Number(rows[0].correlation_2000);
                    let corr2023 = Number(rows[0].correlation_2023);

                    // Determining the color for the signs of the correlation values
                    if (corr2000 > 0 && corr2023 > 0) 
                        rows[0].effect_for_color = "positive";
                    else if ((corr2000 > 0 && corr2023 === 0) || (corr2000 === 0 && corr2023 > 0))
                        rows[0].effect_for_color = "rather-positive";
                    else if (corr2000 < 0 && corr2023 < 0) 
                        rows[0].effect_for_color = "negative";
                    else if ((corr2000 < 0 && corr2023 === 0) || (corr2000 === 0 && corr2023 < 0))
                        rows[0].effect_for_color = "rather-negative";
                    else if ((corr2000 > 0 && corr2023 < 0) || (corr2000 < 0 && corr2023 > 0)) 
                        rows[0].effect_for_color = "inconclusive";
                    else 
                        rows[0].effect_for_color = "no-effect";

                    rows[0].note = bookmark.note;
                    bookmarkResults.push(rows[0]);
                    break;
                }
                case "Granger Causalities Table": {
                    const { rows } = await pool.query(
                        "SELECT * FROM granger_causalities WHERE id = $1;",
                        [bookmark.source_id]
                    );

                    if (!rows.length) break;

                    rows[0].table = "Granger Causalities Table";

                    // Determining the color of the Causality values
                    switch (rows[0].causality) {
                        case "Consistent positive": rows[0].effect_for_color = "positive"; break;
                        case "Predominantly positive": rows[0].effect_for_color = "rather-positive"; break;
                        case "Consistent negative": rows[0].effect_for_color = "negative"; break;
                        case "Predominantly negative": rows[0].effect_for_color = "rather-negative"; break;
                        case "Mixed trend": rows[0].effect_for_color = "inconclusive"; break;
                    }

                    rows[0].note = bookmark.note;
                    bookmarkResults.push(rows[0]);
                    break;
                }
                case "AI (ChatGPT) Research":
                    const { rows } = await pool.query(
                        "SELECT * FROM ai_chatgpt_research WHERE id = $1;",
                        [bookmark.source_id]
                    );

                    if (!rows.length) break;

                    calculateResultCardColors(rows, "Literature Inputs");
                    rows[0].note = bookmark.note;
                    bookmarkResults.push(rows[0]);

            }

        }

        // Rendering the Bookmarks page, which is visually identical to the detailed Results page,
        // but displays only the bookmarked results card, from all data sources at once.
        res.render("bookmarks.ejs", {
            bookmarkResults: bookmarkResults,
            isMainAppFlow: false,
        });
    }
});


// POST Bookmark: Store the corresponding Result Card on the user's saved Bookmarks
app.post("/bookmark-result-card", async (req, res) => {

    if (!req.session.user) {
        console.log("User not logged in. Back to the login page");
        res.redirect("/login");
    }
    else {

        try {
            // Checking if the currently clicked bookmark exists in the bookmarks table in the database
            const {rows: currentBookmark} = await pool.query(
                "SELECT * FROM  bookmarks WHERE user_id = ? AND source_table = $1 AND source_id = $2;",
                [req.session.user.userId, req.body.resultCardTable, req.body.resultCardId]
            );


            if (currentBookmark.length > 0) {
                // Bookmark already exists. It must be removed.
                console.log("Deleting an existing Bookmark:\n (User Id:", req.session.user.userId, "Source Table:", req.body.resultCardTable, "Result Card Id:", req.body.resultCardId, ")");

                try {
                    // Deleting an already existing Bookmark to the corresponding Database table
                    await pool.query(
                        "DELETE FROM bookmarks WHERE user_id = $1 AND source_table = $2 AND source_id = $3;",
                        [req.session.user.userId, req.body.resultCardTable, req.body.resultCardId]
                    );

                }
                catch (err) {
                    console.error(err);
                }
            }
            else {
                // Bookmark doesn't exist. It must be added.
                console.log("Storing a new Bookmark:\n (User Id:", req.session.user.userId, "Source Table:", req.body.resultCardTable, "Result Card Id:", req.body.resultCardId, ")");

                try {
                    // Inserting a new Bookmark to the corresponding Database table
                    await pool.query(
                        "INSERT INTO bookmarks (user_id, source_table, source_id) VALUES ($1, $2, $3);",
                        [req.session.user.userId, req.body.resultCardTable, req.body.resultCardId]
                    );

                } catch (err) {
                    console.error(err);
                }
            }
                    
        } catch (err) {
            console.error(err);
        }
    } 
});


// POST Exit Bookmarks: Redirects the user back to the last page of the Main Application Flow
app.post("/exit-boomarks", (req, res) => {

    console.log(req.session.user.lastMainPage);
    res.redirect(req.session.user.lastMainPage);
});


// POST Search History: Redirects the user to the Search History page
app.post("/search-history", (req, res) => {
    res.redirect("/search-history");
});


// POST Save Note: Saves a user's note on a bookmark, so that when they load their saved bookmarks
// the note remains available.
app.post("/save-note", async (req, res) => {
    const resultCardId = req.body.resultCardId;
    const resultCardTable = req.body.resultsCardTable;
    const noteText = req.body.noteText;

    console.log(resultCardId, resultCardTable, noteText);
    
    try {
        // Inserting a new Bookmark to the corresponding Database table
        await pool.query(
            "UPDATE bookmarks SET note = $1 WHERE user_id = $2 AND source_table = $3 AND source_id = $4;",
            [noteText, req.session.user.userId, resultCardTable, resultCardId]
        );

    } catch (err) {
        console.error(err);
    }
});


// POST Delete Note: Deletes a user's note on a bookmark
app.post("/delete-note", async (req, res) => {
    const resultCardId = req.body.resultCardId;
    const resultCardTable = req.body.resultsCardTable;

    console.log(resultCardId, resultCardTable);

    try {
        // Inserting a new Bookmark to the corresponding Database table
        await pool.query(
            "UPDATE bookmarks SET note = '' WHERE user_id = $1 AND source_table = $2 AND source_id = $3;",
            [req.session.user.userId, resultCardTable, resultCardId]
        );

    } catch (err) {
        console.error(err);
    }
});


// Utility function that updates the Search History when the user Queries for the Results;
async function updateSearchHistory(userSession) {

    // Temporary Variables
    let dependent;
    let independent;

    // If the current dependent/independent variable contains additional secondary variables
    // we only store the first one in the history tables.
    if (Array.isArray(userSession.dependentVariable)) {
        dependent = userSession.dependentVariable[0];
    }
    else {
        dependent = userSession.dependentVariable;
    }

    if (Array.isArray(userSession.independentVariable)) {
        independent = userSession.independentVariable[0];
    }
    else {
        independent = userSession.independentVariable;
    }

    // Checking for the History of the currently Selected Dependent Variable
    const {rows: checkDependent} = await pool.query(
        "SELECT * FROM dependent_count WHERE variable = $1;",
        [dependent]
    );

    if (checkDependent.length > 0) {
        await pool.query(
            'UPDATE dependent_count SET "count" = "count" + 1 WHERE variable = $1;',
            [dependent]
        );
    }
    else {
        await pool.query(
            "INSERT INTO dependent_count (variable, count) VALUES ($1, $2);",
            [dependent, 1]
        );
    }

    // Checking for the History of the currently Selected Independent Variable
    const {rows: checkIndependent} = await pool.query(
        "SELECT * FROM independent_count WHERE variable = $1;",
        [independent]
    );

    if (checkIndependent.length > 0) {
        await pool.query(
            'UPDATE independent_count SET "count" = "count" + 1 WHERE variable = $1;',
            [independent]
        );
    }
    else {
        await pool.query(
            "INSERT INTO independent_count (variable, count) VALUES ($1, $2);",
            [independent, 1]
        );
    }
    
    // Checking for the History of the current Search Query
    const {rows: checkResults} = await pool.query(
        "SELECT * FROM query_count WHERE level_of_analysis = $1 AND dependent = $2 AND independent = $3;",
        [userSession.levelOfAnalysis, dependent, independent]
    );
    
    if (checkResults.length > 0) {
        await pool.query(
            'UPDATE query_count SET "count" = "count" + 1 WHERE level_of_analysis = $1 AND dependent = $2 AND independent = $3;',
            [userSession.levelOfAnalysis, dependent, independent]
        );
    }
    else {
        await pool.query(
            "INSERT INTO query_count (level_of_analysis, dependent, independent, count) VALUES ($1, $2, $3, $4);",
            [userSession.levelOfAnalysis, dependent, independent, 1]
        );
    }

}


// GET Search History: Renders the Search History Page 
app.get("/search-history", async (req, res) => {

    if (!req.session.user) {
        console.log("User not logged in. Back to the login page.");
        res.redirect("/login");
    }
    else {

        // Query to the Dependent Variables history count table
        const {rows: dependentHistory} = await pool.query(
            "SELECT * FROM dependent_count;"
        );
        console.log(dependentHistory);

        // Query to the Independent Variables history count table
        const {rows: independentHistory} = await pool.query(
            "SELECT * FROM independent_count;"
        );
        console.log(independentHistory);

        // Query to the Combined Variables history count table
        const {rows: queryHistory} = await pool.query(
            "SELECT * FROM query_count;"
        );
        console.log(queryHistory);

        res.render("search-history.ejs", {
            dependentHistory: dependentHistory,
            independentHistory: independentHistory,
            queryHistory: queryHistory,
            historyResults: req.session.user.searchHistory || [],
            isMainAppFlow: false
        });
    }
});


// POST Exit Bookmarks: Redirects the user back to the last page of the Main Application Flow
app.post("/exit-search-history", (req, res) => {

    console.log(req.session.user.lastMainPage);
    res.redirect(req.session.user.lastMainPage);
});


// Utility function that formats multiple year spans in result cards into one field, for pdf and excel display
function getYears(resultsRow) {
    // Case 1: Multiple spans array exists and has valid data
    if (Array.isArray(resultsRow.year_spans) && resultsRow.year_spans.length > 0) {
        const spans = resultsRow.year_spans
            .map(span => {
                const s = span.start || span.start_year;
                const e = span.end || span.end_year;
                if (s && e) return `${s}–${e}`;
                return null; // skip invalid entries
            })
            .filter(Boolean); // remove nulls

        if (spans.length > 0) {
            return spans.join('; ');
        }
    }

    // Case 2: Single start/end year
    if (resultsRow.start_year && resultsRow.end_year) {
        return `${resultsRow.start_year}–${resultsRow.end_year}`;
    }

    // No year info
    return '';
}

// Get Export PDF: Downloads the Results from the current source in a PDF file
app.get("/export/pdf", (req, res) => {
    const rawResults = req.session?.user?.queryResults;
    if (!rawResults || !rawResults.length) {
        return res.status(400).send("No results to export.");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="results.pdf"');

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    const tableName = rawResults[0].table || "Results";

    // ==== TITLE ====
    doc.font("Helvetica-Bold")
       .fontSize(18)
       .fillColor('black')
       .text(tableName, { align: "center" });
    doc.moveDown(1);

    const addField = (label, value) => {
        doc.font("Helvetica-Bold").fontSize(10).fillColor('#000000')
           .text(`${label}: `, { continued: true });
        doc.font("Helvetica").fontSize(10).fillColor('#000000')
           .text(value || "-");
        doc.moveDown(0.2);
    };

    rawResults.forEach((row, index) => {
        // Entry number
        doc.font("Helvetica-Bold").fontSize(14).fillColor('#333333')
           .text(`#${index + 1}`);
        doc.moveDown(0.3);

        // Fields
        addField("Years", getYears(row));
        addField("Level of Analysis", row.level_of_analysis || "-");
        addField("Other Level", row.level_of_analysis_other || "-");
        addField("Dependent Variable", row.selection_dependent || "-");
        addField("Other Dependent", row.other_dependent || "-");
        addField("Independent Variable", row.selection_independent || "-");
        addField("Other Independent", row.other_independent || "-");
        addField("Impact", row.effect_direction || "-"); // Always black now
        addField("Variable Condition", row.variable_condition || "-");
        addField("Other Condition", row.other_condition || "-");
        addField("Type of Condition Effect", row.type_of_condition_effect || "-");

        if (Array.isArray(row.references) && row.references.length > 0) {
            // ---- Case 1: multiple references + sources (NO notes) ----
            doc.font("Helvetica-Bold").text("References:");
            row.references.forEach((ref, i) => {
            const src = row.sources[i] || null;

            // reference line (numbered)
            doc.font("Helvetica").fillColor('#000000')
                .text(`${i + 1}. ${ref}`, { indent: 20, width: 500 });

            // source on next line (clickable)
            if (src) {
                doc.font("Helvetica")
                .fillColor('#0000EE')
                .text(src, { indent: 32, width: 500, link: src, underline: true });
                doc.fillColor('#000000');
            }
            doc.moveDown(0.15);

            // optional: avoid splitting awkwardly at page end
            if (doc.y > doc.page.height - doc.page.margins.bottom - 60) doc.addPage();
            });
            doc.moveDown(0.2);

        } else {
            // ---- Case 2: single reference + note ----
            doc.font("Helvetica-Bold").text("Reference:");
            doc.font("Helvetica").fillColor('#000000')
            .text(row.reference || "-", { indent: 20, width: 500 });
            doc.moveDown(0.2);

            doc.font("Helvetica-Bold").text("Notes:");
            doc.font("Helvetica").fillColor('#000000')
            .text(row.notes || "-", { indent: 20, width: 500 });
            doc.moveDown(0.2);
        }
    });

    doc.end();
});


// Get Export Excel: Downloads the Results from the current source in an Excel file
app.get("/export/excel", async (req, res) => {
    const rawResults = req.session?.user?.queryResults;
    if (!rawResults || !rawResults.length) {
        return res.status(400).send("No results to export.");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Results');

    // Title (merged row 1 & 2)
    const tableName = rawResults[0].table || 'Results';
    worksheet.mergeCells(`A1:N2`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = tableName; // your input source name
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB9E585' } // green
    };

    worksheet.getCell('A1').border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } }
    };
    worksheet.getCell('N1').border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    worksheet.getCell('A2').border = {
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } }
    };
    worksheet.getCell('N2').border = {
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
};

    // Headers (row 3)
    const headers = [
        'No.', 'Years', 'Level of Analysis', 'Other Level',
        'Dependent Variable', 'Other Dependent',
        'Independent Variable', 'Other Independent',
        'Impact', 'Variable Condition', 'Other Condition',
        'Type of Condition Effect', 'Reference', 'Sources/Notes'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, size: 12 };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    function addResultRows(ws, row, index) {
        const no = index + 1;
        const common = [
        no,
        getYears(row),
        row.level_of_analysis || '-',
        row.level_of_analysis_other || '-',
        row.selection_dependent || '-',
        row.other_dependent || '-',
        row.selection_independent || '-',
        row.other_independent || '-',
        row.effect_direction || '-',
        row.variable_condition || '-',
        row.other_condition || '-',
        row.type_of_condition_effect || '-'
        ];

        const hasArrayRefs =
        Array.isArray(row.references) && row.references.length > 0 &&
        Array.isArray(row.sources)    && row.sources.length > 0;

        if (hasArrayRefs) {
        row.references.forEach((ref, i) => {
            const src = row.sources[i] || '';
            const values = (i === 0)
            ? [...common, ref || '-', src || '-']                     // first line: all fields
            : [no, '', '', '', '', '', '', '', '', '', '', '', ref || '-', src || '-']; // extra lines: only No.+Ref+Src

            const r = ws.addRow(values);
            r.height = 60;

            // make source clickable if it's a URL
            if (src && /^https?:\/\//i.test(src)) {
            r.getCell(14).value = { text: src, hyperlink: src };
            }
        });
        } else {
        const r = ws.addRow([...common, row.reference || '-', row.notes || '-']);
        r.height = 60;
        }
    }

    // ✅ REPLACE the old "Add data rows" with this:
    rawResults.forEach((row, index) => addResultRows(worksheet, row, index));

    // Column widths
    worksheet.columns = [
        { width: 6 }, { width: 15 }, { width: 25 }, { width: 20 },
        { width: 25 }, { width: 20 }, { width: 25 }, { width: 20 },
        { width: 20 }, { width: 25 }, { width: 25 }, { width: 35 },
        { width: 60 }, { width: 60 }
    ];

    // Column colors (white for Reference & Notes)
    const colColors = {
        1: 'FFFFE699', // No.
        2: 'FFFFE699', // Years
        3: 'FFFDE9D9', // Level of Analysis
        4: 'FFFDE9D9',
        5: 'FFF4B084', // Dependent
        6: 'FFF4B084',
        7: 'FFF4B084',
        8: 'FFF4B084',
        9: 'FFD9E1F2', // Impact
        10: 'FFD9E1F2',
        11: 'FFD9E1F2',
        12: 'FFD9E1F2',
        13: 'FFFFFFFF', // Reference (white)
        14: 'FFFFFFFF'  // Notes (white)
    };

    // Apply styling to all cells
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber <= 2) return;
        row.eachCell((cell, colNumber) => {
            // Background color
            if (colColors[colNumber]) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: colColors[colNumber] }
                };
            }

            // Borders
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            };

            // Center + wrap
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });
    });

    // Send file
    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="results.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
});



// Starting the server, which is listening on the specified port 
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

// Graceful Shutdown of server in case the process is stopped 
const shutdown = (signal) => {
  console.log(`${signal} received: closing server...`);
  server.close(async () => {
    await pool.end();
    console.log("HTTP server closed & DataBase pool ended.");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

// Graceful Shutdown for the SIGTERM and SIGINT signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));