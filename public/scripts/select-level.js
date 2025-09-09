
// Buttons list of "National level" and "Regional level" buttons 
const levelButtons = document.querySelectorAll('.level-btn');

// The hidden input element that will store the value of the selected button
const levelValue = document.getElementById('selected-level');


// Submission Form
const submissionForm = document.getElementById("ineq-level-form");

// Alert Popup for the cases, where users didn't select an option
const alertPopup = document.getElementById("alert-popup");

// Image inside the Main content frame
const image = document.querySelector(".main-content-frame > img");

// Theme Tooltip
const themetoolTip = document.querySelector(".theme-tooltip");


/* ========== Event Listeners on the Level Selection Buttons ========== */

for (let i=0; i<levelButtons.length; i++) {
    levelButtons[i].addEventListener("click", function () {
        
        
        /* If the current button is not already selected, I select it by adding the corresponding styles */
        if (!this.classList.contains("selected")) {
            this.classList.add("selected");

            levelValue.value = this.dataset.value;

            /* Making alert popup message disappear, in case the user previousliy tried to skip the selection */
            alertPopup.style.visibility = "hidden";

            // Removing the padding from the buttons div, since an option was selected
            if (window.innerWidth < 767) {
                const buttonsDiv = document.querySelector(".buttons-div");
                buttonsDiv.style.paddingTop = "0";
            }
            
            /* Making sure only one button can be selected, by removing the "selected" class from the other button */
            for (let j=0; j<levelButtons.length; j++) {
                if (levelButtons[j].dataset.value != levelValue.value) {
                    levelButtons[j].classList.remove("selected");
                }
            }
        }
        else {
            /* When we un-click a button, we remove the "selected" class, and the hidden input is now an empty string */
            this.classList.remove("selected");
            levelValue.value = "";
        }
    })
}


/* ========== Event Listener on Submission Form ========= */

submissionForm.addEventListener("submit", function (event) {

    const eventButton = event.submitter;

    if (eventButton.value === "next" && levelValue.value === "") {
        // Prevent submission if user hasn't selected an option
        event.preventDefault();
        // Make the Alert Popup Message appear
        alertPopup.style.visibility = "visible";
        alertPopup.style.top = "70%";

        if (window.innerWidth < 767) {
            const buttonsDiv = document.querySelector(".buttons-div");
            buttonsDiv.style.paddingTop = "100px";
        }
        
    }
    
});


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
        image.src = "/images/globe-hemisphere-west-dark-mode.svg";
    }
    else {
        toggleIcon.src = "/images/list.svg";
        lightDarkIcon.src = "/images/moon.svg";
        themetoolTip.textContent = "Switch to Dark Theme";
        bookmarkIcon.src = "/images/bookmark-simple.svg";
        historyIcon.src = "/images/folder-star.svg";
        logoutIcon.src = "/images/sign-out.svg";
        image.src = "/images/globe-hemisphere-west.svg";
    }

    const currentStep = document.getElementById("step-3");
    currentStep.classList.add("active");
    
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("disable-transitions");
        document.documentElement.style.visibility = "visible";
      });
    });

    this.requestAnimationFrame(() => {
            const previousChoice = document.getElementById("selected-level");

        if (previousChoice.value === "National (compare countries)") {
            const selectedLevel = document.querySelector(".level-btn[data-value='National (compare countries)']");
            selectedLevel.classList.add("selected");
        }
        else if (previousChoice.value === "Regional (compare regions or areas)") {
            const selectedLevel = document.querySelector(".level-btn[data-value='Regional (compare regions or areas)']");
            selectedLevel.classList.add("selected");
        }
        else if (previousChoice.value === "Survey (compare individuals or social groups)") {
            const selectedLevel = document.querySelector(".level-btn[data-value='Survey (compare individuals or social groups)']");
            selectedLevel.classList.add("selected");
        }
        else if (previousChoice.value === "Case Study (in depth analysis)") {
            const selectedLevel = document.querySelector(".level-btn[data-value='Case Study (in depth analysis)']");
            selectedLevel.classList.add("selected");
        }
        else if (previousChoice.value === "Other") {
            const selectedLevel = document.querySelector(".level-btn[data-value='Other']");
            selectedLevel.classList.add("selected");
        }
        else if (previousChoice.value === "All Levels") {
            const selectedLevel = document.querySelector(".level-btn[data-value='All Levels']");
            selectedLevel.classList.add("selected");
        }
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
        image.src = "/images/globe-hemisphere-west.svg";

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
        image.src = "/images/globe-hemisphere-west-dark-mode.svg";


        localStorage.setItem("theme", "dark");
    }

    
    console.log("SET Theme:", localStorage.getItem("theme"));
});