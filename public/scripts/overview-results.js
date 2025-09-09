
// Results' Source buttons
const sourceButtons = document.querySelectorAll(".source-btn");

// The hidden input element that will store the value of the selected button
const sourceValue = document.getElementById('selected-source');

// Legend with Colored Impacts
const legend = document.querySelector(".legend");

// Colored Squares
const coloredSquares = document.querySelectorAll(".color-shape");

// Overall Impact Legend
const impactLegend = document.querySelector(".impact-legend");

// Linear Gradient of Overall Impact Legend
const linearGradient = document.querySelector(".linear-gradient");

// Submission Form
const submissionForm = document.getElementById("source-selection-form");

// Container of overall impact results
const impactWrapper = document.querySelector(".impact-wrapper");

// Circular progress bar
const progressCircle = document.querySelector(".circular-progress");

// Progress bar value
const progressValue = document.querySelector(".progress-value");

// Overall Percentage of Dominant Effect Category findings
const overallPercentage = document.getElementById("overall-percentage");

// Impact text
const impactText = document.querySelector(".impact-text");

// Alert Popup for the cases, where users didn't select an option
const alertPopup = document.getElementById("alert-popup");

// Image inside the Main content frame
const image = document.querySelector(".main-content-frame > img");

// Next Button
const nextButton = document.querySelector(".next-btn");

// Theme Tooltip
const themetoolTip = document.querySelector(".theme-tooltip");


/* ========== Event Listeners on the Level Selection Buttons ========== */

for (let i=0; i<sourceButtons.length; i++) {
    sourceButtons[i].addEventListener("click", function () {
        
        /* If the current button is not already selected, I select it by adding the corresponding styles */
        if (!this.classList.contains("selected")) {
            this.classList.add("selected");
            sourceValue.value = this.dataset.value;
            
            /* Making alert popup message disappear, in case the user previousliy tried to skip the selection */
            alertPopup.style.visibility = "hidden";

            if (window.innerWidth < 767) {
                nextButton.style.marginTop = "0";
            }
            
            /* Making sure only one button can be selected, by removing the "selected" class from the other button */
            for (let j=0; j<sourceButtons.length; j++) {
                if (sourceButtons[j] != this && sourceButtons[j].classList.contains("selected")) {
                    sourceButtons[j].classList.remove("selected");
                    break;
                }
            }
        }
        else {
            /* When we un-click a button, we remove the "selected" class, and the hidden input is now an empty string */
            this.classList.remove("selected");
            sourceValue.value = "";
        }
    });
}


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
    const currentStep = document.getElementById("step-6");
    currentStep.classList.add("active");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("disable-transitions");
        document.documentElement.style.visibility = "visible";
      });
    });


    const target = overallPercentage.value;
    let value = 0;

    // Hidden input element controling the page's theme
    const currentTheme = document.documentElement.classList.contains("dark-mode") ? "true" : "false";    

    console.log("Target:", target);
    
    if (target === "0%") {
        const color = getGradientColor(0, currentTheme);
        let remainingColor = currentTheme === "true" ? "#3b3b47" : "#eee";
        progressCircle.style.background = `conic-gradient(${remainingColor} 0deg, ${remainingColor} 360deg)`;
        progressValue.textContent = "0%";
        return;
    } 

    const interval = setInterval(() => {
        
        if (value >= target) {
            value = target;
            clearInterval(interval);
            progressValue.textContent = `${target}%`;
            return;
        }
        value += 1;

        const angle = (value / 100) * 360;
        const color = getGradientColor(value, currentTheme);

        let remainingColor = currentTheme === "true" ? '#3b3b47' : '#eee';
        progressCircle.style.background = `conic-gradient(${color} ${angle}deg, ${remainingColor} ${angle}deg)`;
        progressValue.textContent = `${value}%`;
    }, 20);
});

//Utility function that computes the RBG value of an interpolated color (described as a factor)
// between the two provided colors.
function interpolateColor(color1, color2, factor) {
    const result = color1.map((c, i) => Math.round(c + (color2[i] - c) * factor));
    return `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
}

// Utility function that parses a HEX color value, splits it in pairs of hex digits, 
// and converts them to RGB values
function hexToRgb(hex) {
    return hex.match(/\w\w/g).map(c => parseInt(c, 16));
}

// Utility function that converts the 3 checkpoint colors:
// Red hue at the start (0 degrees), Yellow hue in the middle (180 degrees), Green hue at the end (360 degrees)
// And it calculates the current color that represents the completion percentage of the circular progress bar
function getGradientColor(percent, isDarkTheme) {
    const redHue = hexToRgb(isDarkTheme === "true" ? "#b25d5d" : "#e76a6a");
    const yellowHue = hexToRgb(isDarkTheme === "true" ? "#c8b850" : "#f2d660");
    const greenHue = hexToRgb(isDarkTheme === "true" ? "#4b8e4e" : "#5aa15e");

    if (percent <= 50) {
        const factor = percent / 50; 
        return interpolateColor(redHue, yellowHue, factor);
    } else {
        const factor = (percent - 50) / 50;
        return interpolateColor(yellowHue, greenHue, factor);
    }
}



/* ========== Event Listener on Submission Form ========= */

submissionForm.addEventListener("submit", function (event) {

    const eventButton = event.submitter;

    if (eventButton.value === "next" && sourceValue.value === "") {
        // Prevent submission if user hasn't selected an option
        event.preventDefault();
        // Make the Alert Popup Message appear
        alertPopup.style.visibility = "visible";

        if (window.innerWidth < 767) {
            alertPopup.style.top = "80%";
            nextButton.style.marginTop = "100px";
        }
        
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
        image.src = "/images/check-circle.svg";

        const percentage = document.getElementById("overall-percentage");

        updateCircularProgress(percentage.value, "false");

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
        

        const percentage = document.getElementById("overall-percentage");

        updateCircularProgress(percentage.value, "true");

        localStorage.setItem("theme", "dark");
    }

    
    console.log("SET Theme:", localStorage.getItem("theme"));
});


// Utility function that updates the Conic Gradient of the Progress Bar,
// When the user clicks the light-dark button
function updateCircularProgress(value, isDarkMode) {
    const angle = (value / 100) * 360;
    const color = getGradientColor(value, isDarkMode);
    const remainingColor = isDarkMode === "true" ? '#3b3b47' : '#eee';

    progressCircle.style.background = `conic-gradient(${color} ${angle}deg, ${remainingColor} ${angle}deg)`;
}