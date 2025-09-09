# ESSPIN - Relational Matrix Platform

<p align="center">
  <img src="public/images/ESSPIN.svg" width="450px" alt="ESSPIN Logo">
</p>


## ESSPIN - Web Application

This project is part of the **ESSPIN (Economic, Social, and Spatial Inequalities in Europe)** Horizon research initiative.
It provides an open-access relational matrix platform that enables the estimation and analysis of inequalities under different scenarios involving drivers and policy choices.

## Project Description

The Relational Matrix Platform is designed and implemented as a **Full-Stack Web Application**.

- **Frontend:** HTML, CSS, JavaScript, and Embedded JavaScript (EJS)
- **Backend:** Node.js with Express for routing, logic, and data integration.
- **Database:** Initially developed with MySQL, later migrated to Postgres for deployment

The app enables users to explore, query, and view data on inequalities across Europe.

 It's structured to support multi-step navigation, result summaries, and user interaction features such as bookmarking of individual results and search history of the selected economic variables as well as of the search queries.

 ## Project Structure

 ```
ESSPIN-Relational-Matrix-Platform/
├─ public/
│ ├─ images/ # PNG/SVG icons (Phosphor)
│ ├─ scripts/ # Frontend JavaScript
│ └─ styles/ # Frontend CSS
├─ views/ # EJS templates for every page of the app
│ ├─ partials/ # Shared components of every page
│ ├─ ... # Page templates
├─ index.js # Server entry point
├─ package.json
├─ package-lock.json
└─ README.md
```

## Data Availability

This repository contains only the **repository code**.
The underlying database, which stores the results of the ESSPIN research team's work, is **not publicly available**.

- Database access is restricted to the project consortium.  
- Deployment instances connect to the database through environment variables (not committed to Git).  
- The published web application provides user access to aggregated results without exposing the raw research data.


## Deployment

The application will soon be hosted on **Render**, using:

- A **Web Service** to host the Node.js + Express application.
- A **Postgres Service** to host the project's database (not publicly available).

and integrated into the main ESSPIN website for user access.

## License & Attributions

- **Phosphor Icons** are used in the interface. They're distributed under the MIT License.
  Repository: [Phosphor Icons](https://github.com/phosphor-icons/homepage)

- Project code license: MIT License (see [LICENSE](./LICENSE)).
