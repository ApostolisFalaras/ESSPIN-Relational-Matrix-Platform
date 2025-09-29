

// Image inside the Main content frame
const image = document.querySelector(".main-content-frame > img");

// Apply Filter Button
const applyFilterButton = document.querySelector(".apply-filter-btn");

// End Search Button
const endSearchButton = document.querySelector(".end-search-btn");

// New Search Button
const newSearchButton = document.querySelector(".new-search-btn");

// History Input Wrapper div
const inputWrapper = document.querySelector(".input-wrapper");

// History Input Element
const historyInput = document.getElementById("search-history-input");

// History Menu Element
const historyMenu = document.querySelector(".search-history-menu");

// History Menu Options Element
const historyMenuOptions = document.querySelectorAll(".history-menu-options");

// Clear Icon of the history input
const clearIcon = document.querySelector(".clear-input");

// History Results Div
const historyResults = document.querySelector(".history-results-list"); 

// Dependent Variables History
const dependentHistory = document.getElementById("dependent-history");

// Independent Variables History
const independentHistory = document.getElementById("independent-history");

// Query Variables History
const queryHistory = document.getElementById("query-history");

// Theme Tooltip
const themetoolTip = document.querySelector(".theme-tooltip");


/* ========== Event Listener when Page is Loaded ========== */

window.addEventListener("pageshow", function () {

    document.documentElement.classList.add("disable-transitions");
    document.documentElement.style.visibility = "hidden";

    const localTheme = localStorage.getItem("theme");
    console.log("GET Theme:", localTheme);
    
    if (localTheme === "dark") {
        document.documentElement.classList.remove("light-mode");
        document.documentElement.classList.add("dark-mode");
    }
    else {
        document.documentElement.classList.remove("dark-mode");
        document.documentElement.classList.add("light-mode");
    }

    const localSidebar = this.localStorage.getItem("sidebar");
    console.log("GET Sidebar:", localSidebar);

    if (localSidebar === "collapsed") {
        document.documentElement.classList.add("collapsed");
    }
    else {
        document.documentElement.classList.remove("collapsed");
    }

    if (document.documentElement.classList.contains("dark-mode")) {
        toggleIcon.src = "/images/list-dark-mode.svg";
        lightDarkIcon.src = "/images/sun.svg";
        themetoolTip.textContent = "Switch to Light Theme";
        bookmarkIcon.src = "/images/bookmark-simple-dark.svg";
        historyIcon.src = "/images/folder-star-dark.svg";
        logoutIcon.src = "/images/sign-out-dark.svg";
        image.src = "/images/folder-star-dark.svg";
        cookieIcon.src = "/images/cookie-fill-dark-mode.svg";
    }
    else {
        toggleIcon.src = "/images/list.svg";
        lightDarkIcon.src = "/images/moon.svg";
        themetoolTip.textContent = "Switch to Dark Theme";
        bookmarkIcon.src = "/images/bookmark-simple.svg";
        historyIcon.src = "/images/folder-star.svg";
        logoutIcon.src = "/images/sign-out.svg";
        image.src = "/images/folder-star.svg";
        cookieIcon.src = "/images/cookie-fill.svg";
    }

    // Adding the active class to denote the current step in the application flow.
    const currentStep = document.getElementById("step-c");
    currentStep.classList.add("active");
    
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("disable-transitions");
        document.documentElement.style.visibility = "visible";
      });
    });

    
});


/* ========== Event Listeners for History Input Element ========= */

historyInput.addEventListener("click", function (e) {
    e.stopPropagation();

    // Making History Menu Appear and Disappear accordingly
    const expanded = this.getAttribute("aria-expanded") === "true";
    this.setAttribute("aria-expanded", String(!expanded));
    historyMenu.style.display = expanded ? "none" : "block";

    if (historyMenu.style.display === "none") {
        this.style.boxShadow = "none";
    }
    else {
        this.style.boxShadow = "0 0 6px rgba(255, 215, 0, 0.5)";
        historyMenuOptions.forEach((option) => {
            option.style.display = "block";
        });
    }
});


/* ========== Event Listeners for History Menu Options ========= */

for (let i=0; i<historyMenuOptions.length; i++) {
    historyMenuOptions[i].addEventListener("click", function () {

        historyInput.value = this.dataset.value;
        historyInput.setAttribute("aria-expanded", false);
        historyInput.style.boxShadow = "none";
        
        historyMenu.style.display = "none";

        // Making the "X" symbol appear at the end of the input element
        clearIcon.style.display = historyInput.value ? "block" : "none";

        historyInput.style.height = "auto";
        historyInput.style.height = historyInput.scrollHeight + "px";
    });
}


/* ========== Event Listener for Filtering the Menu Options based on the partially typed input of user ========== */

historyInput.addEventListener("input", function () {
    const filter = this.value.toLowerCase();

    // If the current typed input matches a menu option, make that option be the only one appearing
    historyMenuOptions.forEach((option) => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.startsWith(filter) ? "block" : "none";
    });

    historyMenu.style.display = "block";
    this.setAttribute("aria-expanded", "true");
    this.style.boxShadow = "0 0 6px rgba(255, 215, 0, 0.5)";

    // Making the "X" symbol appear at the end of the input element
    clearIcon.style.display = this.value ? "block" : "none";

    historyInput.style.height = "auto";
    historyInput.style.height = historyInput.scrollHeight + "px";
});


/* ========== Event Listener for emptying the Input element if the user clicks the Clear Icon ========== */
clearIcon.addEventListener("click", function () {
    clearIcon.style.display = "none";

    historyInput.value = "";
    historyInput.setAttribute("aria-expanded", "false");
    
    historyMenu.style.display = "none";
    historyMenu.style.boxShadow = "none";
    
    historyInput.style.height = "auto";
    historyInput.style.height = historyInput.scrollHeight + "px";
});


/* ========== Event Listener for closing the History Menu when the user Clicks Away ========== */

document.addEventListener("click", function (e) {

    if (!historyInput.contains(e.target) && !historyMenu.contains(e.target)) {
        historyMenu.style.display = "none";
        historyInput.setAttribute("aria-expanded", "false");
        historyInput.style.boxShadow = "none";
    }
});


/* ========== Event Listeners for Filter Applying Button ========= */

applyFilterButton.addEventListener("click", (req, res) => {

    let selectedResults;
    let historySource;

    if (historyInput.value === "Dependent Variables History") {
        selectedResults = JSON.parse(dependentHistory.value);
        historySource = "Dependent";
    }
    else if (historyInput.value === "Independent Variables History") {
        selectedResults = JSON.parse(independentHistory.value);
        historySource = "Independent";
    }
    else if (historyInput.value === "Query History") {
        selectedResults = JSON.parse(queryHistory.value);
        historySource = "Query"
    }

    console.log(selectedResults[0]);

    // If the current history type doesn't have any entries, we print a message about it. 
    if (!selectedResults || selectedResults.length === 0) {
        historyResults.innerHTML = `<h5>No history results yet.</h5>`;
    }
    else {
        // Sorting the retrieved History Results in Descending Order of the No. of Occurrences
        selectedResults.sort((a,b) => b.count - a.count);

        // Creating the table for the History Results
        const table = document.createElement("div");
        table.id = "history-result-items";

        // Creating top Header row, with the column names
        const headerRow = document.createElement("div");
        headerRow.className = "history-header";
        headerRow.style.display = "flex";
        headerRow.style.justifyContent = "center";

        if (historySource === "Dependent" || historySource === "Independent") {

            // Creating the top Header row with the column names (Dependent/Independent Variable - No. of Occurrences) 
            // Styling the Header elements
            const rank = document.createElement("div");
            rank.className = "history-data history-variable-rank";
            rank.style.textAlign = "left";

            const depIndVariable = document.createElement("div");
            depIndVariable.className = "history-data history-variable";
            depIndVariable.textContent = `${historySource} Variable`;
            depIndVariable.style.textAlign = "left";

            const noOfOccurrences = document.createElement("div");
            noOfOccurrences.className = "history-data history-variable-count";
            noOfOccurrences.textContent = "Count";
            noOfOccurrences.style.textAlign = "right";

            headerRow.appendChild(rank);
            headerRow.appendChild(depIndVariable);
            headerRow.appendChild(noOfOccurrences);
            table.appendChild(headerRow);

            // For each history result, we create a table row, and the corresponding data elements.
            selectedResults.forEach((res, index) => {
                const row = document.createElement("div");
                row.className = "history-row";

                const rankValue = document.createElement("div");
                rankValue.classList = "history-data history-variable-rank";

                if (index === 0) { rankValue.textContent = "🥇"; rankValue.style.fontSize = "1rem"; row.classList.add("first");}
                else if (index === 1) {rankValue.textContent = "🥈"; rankValue.style.fontSize = "1rem"; row.classList.add("second");}
                else if (index === 2) {rankValue.textContent = "🥉"; rankValue.style.fontSize = "1rem"; row.classList.add("third");}
                else {rankValue.textContent = `${index+1}.`; row.classList.add("general");}

                const variable = document.createElement("div");
                variable.className = "history-data history-variable";
                variable.textContent = res.variable;

                const count = document.createElement("div");
                count.className = "history-data history-variable-count";
                count.textContent = res.count;

                row.appendChild(rankValue);
                row.appendChild(variable);
                row.appendChild(count);
                table.appendChild(row);
            });
        }
        else {
            // Creating the top Header row with the column names (Level of Analysis - Dependent Variable - Independent Variable - No. of Occurrences) 
            const rank = document.createElement("div");
            rank.className = "history-data history-query-rank";
            rank.textContent = "";
            rank.style.textAlign = "left";

            const levelOfAnalysis = document.createElement("div");
            levelOfAnalysis.className = "history-data history-level";
            levelOfAnalysis.textContent = "Level of Analysis";
            levelOfAnalysis.style.textAlign = "left";

            const depVariable = document.createElement("div");
            depVariable.className = "history-data history-dependent";
            depVariable.textContent = "Dependent Variable";
            depVariable.style.textAlign = "center";

            const indVariable = document.createElement("div");
            indVariable.className = "history-data history-independent";
            indVariable.textContent = "Independent Variable";
            indVariable.style.textAlign = "center";

            const noOfOccurrences = document.createElement("th");
            noOfOccurrences.className = "history-data history-query-count";
            noOfOccurrences.textContent = "Count";

            headerRow.appendChild(rank);
            headerRow.appendChild(levelOfAnalysis);
            headerRow.appendChild(depVariable);
            headerRow.appendChild(indVariable);
            headerRow.appendChild(noOfOccurrences);
            table.appendChild(headerRow);

            // For each history result, we create a table row, and the corresponding data elements.
            selectedResults.forEach((res, index) => {
                const row = document.createElement("div");
                row.className = "history-row";

                const rankValue = document.createElement("div");
                rankValue.className = "history-data history-query-rank";

                if (index === 0) {rankValue.textContent = "🥇"; row.classList.add("first");}
                else if (index === 1) {rankValue.textContent = "🥈"; row.classList.add("second");}
                else if (index === 2) {rankValue.textContent = "🥉"; row.classList.add("third");}
                else {rankValue.textContent = `${index+1}.`; row.classList.add("general");}
                
                const levelValue = document.createElement("div");
                levelValue.className = "history-data history-level";
                levelValue.textContent = res.level_of_analysis;


                const dependent = document.createElement("div");
                dependent.className = "history-data history-dependent";
                dependent.textContent = res.dependent;

                const independent = document.createElement("div");
                independent.className = "history-data history-independent";
                independent.textContent = res.independent;

                const count = document.createElement("div");
                count.className = "history-data history-query-count";
                count.textContent = res.count;

                row.appendChild(rankValue);
                row.appendChild(levelValue);
                row.appendChild(dependent);
                row.appendChild(independent);
                row.appendChild(count);
                table.appendChild(row);
            });
        }

        historyResults.innerHTML = "";
        historyResults.appendChild(table);
    }

});


/* ========== Event Listeners for Light/Dark Theme Toggle Button in the Navigation Bar ========= */

lightDarkButton.addEventListener("click", function () {

    if (document.documentElement.classList.contains("dark-mode")) {

        document.documentElement.classList.remove("dark-mode");
        document.documentElement.classList.add("light-mode");

        toggleIcon.src = "/images/list.svg";
        lightDarkIcon.src = "/images/moon.svg";
        themetoolTip.textContent = "Switch to Dark Theme";
        bookmarkIcon.src = "/images/bookmark-simple.svg";
        historyIcon.src = "/images/folder-star.svg";
        logoutIcon.src = "/images/sign-out.svg";
        image.src = "/images/folder-star.svg";
        cookieIcon.src = "/images/cookie-fill.svg";


        localStorage.setItem("theme", "light");
    }
    else {

        document.documentElement.classList.remove("light-mode");
        document.documentElement.classList.add("dark-mode");

        toggleIcon.src = "/images/list-dark-mode.svg";
        lightDarkIcon.src = "/images/sun.svg";
        themetoolTip.textContent = "Switch to Light Theme";
        bookmarkIcon.src = "/images/bookmark-simple-dark.svg";
        historyIcon.src = "/images/folder-star-dark.svg";
        logoutIcon.src = "/images/sign-out-dark.svg";
        image.src = "/images/folder-star-dark.svg";
        cookieIcon.src = "/images/cookie-fill-dark-mode.svg";

        localStorage.setItem("theme", "dark");
    }
    
    console.log("SET Theme:", localStorage.getItem("theme"));
    
});
