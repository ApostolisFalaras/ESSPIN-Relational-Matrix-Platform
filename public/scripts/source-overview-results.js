
// Summary Results table
const summaryTable = document.getElementById("summary-results");

// Table Headers
const summaryTableHeaders = document.querySelectorAll("th");

// Table Elements
const summaryTableData = document.querySelectorAll("td");

const nextButton = document.querySelector(".next-btn");

// Image inside the Main content frame
const image = document.querySelector(".main-content-frame > img");

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
        image.src = "/images/check-circle-dark-mode.svg";
    }
    else {
        toggleIcon.src = "/images/list.svg";
        lightDarkIcon.src = "/images/moon.svg";
        themetoolTip.textContent = "Switch to Dark Theme";
        bookmarkIcon.src = "/images/bookmark-simple.svg";
        historyIcon.src = "/images/folder-star.svg";
        logoutIcon.src = "/images/sign-out.svg";
        image.src = "/images/check-circle.svg";
    }

    // Adding the active class to denote the current step in the application flow.
    const currentStep = document.getElementById("step-7");
    currentStep.classList.add("active");

    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("disable-transitions");
        document.documentElement.style.visibility = "visible";
      });
    });

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
        image.src = "/images/check-circle.svg";

        
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
        image.src = "/images/check-circle-dark-mode.svg";

        localStorage.setItem("theme", "dark");
    }

    
    console.log("SET Theme:", localStorage.getItem("theme"));
});
