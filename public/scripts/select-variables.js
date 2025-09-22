
// List of all Dropdown buttons
const dropDownButtons = document.querySelectorAll(".dropdown-btn");

// List of all Dropdown options
const dropDownOptions = document.querySelectorAll(".option");

// Inner dropdowns for "Other" options from each category
const otherDropdownOption = document.querySelectorAll(".has-dropdown");

// Hidden input element representing the selected Dependent variable
const selectedVariable = document.getElementById("selected-variable");

// Hidden input element representing the selected Other Dependent variable
const selectedOtherVariable = document.getElementById("selected-other-variable");

// Hidden input element representing the Category of the selected dependent variable (for a few edge cases)
const selectedCategory = document.getElementById("selected-category");

// List of all Dropdown X icons after an option is selected
const dropdownIcons = document.querySelectorAll(".dropdown-icon");

// Submission Form
const submissionForm = document.getElementById("select-variable-form");

// Alert pop-up
const alertPopup = document.getElementById("alert-popup");

// Image inside the Main content frame
const image = document.querySelector(".main-content-frame > img");

// Next Button
const nextButton = document.querySelector(".next-btn");

// Theme Tooltip
const themetoolTip = document.querySelector(".theme-tooltip");



/* ========== Event Listeners for Dropdown Buttons ========== */

for (let i=0; i<dropDownButtons.length; i++) {
    dropDownButtons[i].addEventListener("click", function () {
    
        // Expand or hide the list of items of the corresponding dropdown button.
        const expanded = this.getAttribute("aria-expanded") === "true";
        this.setAttribute("aria-expanded", String(!expanded));
        this.nextElementSibling.style.display = expanded ? "none" : "block";

        if (this.nextElementSibling.style.display === "none") {
            const otherDropdown = this.parentElement.querySelector(".other-options");

            if (otherDropdown && otherDropdown.style.display !== "none") {
                    const hasDropdownOption = this.parentElement.querySelector("ul.options > li.has-dropdown");
                    const dropdownIcon = hasDropdownOption.querySelector(".dropdown-icon");
                    
                    hasDropdownOption.classList.remove("selected");
                    dropdownIcon.innerHTML = "&#x25BC;";
                    dropdownIcon.classList.remove("selected");
                    otherDropdown.style.display = "none";
            }

            if (window.innerWidth <= 767) {
                alertPopup.style.top = "65%";    
            }
        }
        else {
            if (window.innerWidth <= 767) {
                alertPopup.style.top = "70%";
            }
        }


        // If any other dropdown list was open, we hide it, by checking the "aria-expanded" of the rest of the dropdown buttons
        for (let j=0; j<dropDownButtons.length; j++) {
            if (dropDownButtons[j] != this && dropDownButtons[j].getAttribute("aria-expanded") === "true") {
                
                dropDownButtons[j].setAttribute("aria-expanded", "false");
                
                let dropdownList = dropDownButtons[j].nextElementSibling;
                dropdownList.style.display = "none";

                // For the same dropdown list, we check if the inner dropdown was also visible
                // We hide it by applying the appropriate styles.
                const otherDropdown = dropDownButtons[j].parentElement.querySelector(".other-options");

                if (otherDropdown.style.display !== "none") {
                    const hasDropdownOption = dropDownButtons[j].parentElement.querySelector("ul.options > li.has-dropdown");
                    const dropdownIcon = hasDropdownOption.querySelector(".dropdown-icon");
                    
                    hasDropdownOption.classList.remove("selected");
                    dropdownIcon.innerHTML = "&#x25BC;";
                    dropdownIcon.classList.remove("selected");
                    otherDropdown.style.display = "none";
                }

                break;
            }
        }
    });
}


/* ========== Event listener for dropdown Options ========== */

// Utility function that checks if another option, in another dropdown, is selected
// If there is one, we deselect that dropdown and remove the option from the dropdown button

function checkForSelectedOptions(currentDropdownBtn) {

    // Iterating over the dropdown buttons' list
    for (let i=0; i<dropDownButtons.length; i++) {

        // Checking if any other dropdown button is selected
        if (dropDownButtons[i] !== currentDropdownBtn && dropDownButtons[i].classList.contains("selected")) {
            let buttonTitle = dropDownButtons[i].querySelector(".dropdown-title");
            let buttonIcon = dropDownButtons[i].querySelector(".dropdown-icon");

            // Canceling the "selected" styles, to transfer the button in the default un-selected
            // Replacing the "x" symbol, with the dropdown caret.
            buttonTitle.innerHTML = buttonTitle.dataset.value;
            buttonTitle.style.fontSize = "1rem";
            buttonIcon.innerHTML = "&#x25BC;";
            dropDownButtons[i].classList.remove("selected");
            buttonIcon.classList.remove("selected");
        }
    }
}

// Defining the event listeners for all dropdown options, of all different dropdowns
for (let i=0; i < dropDownOptions.length; i++) {
    dropDownOptions[i].addEventListener("click", function () {

        // If the "Other Variable" option was selected from a dropdown 
        if (this.classList.contains("has-dropdown")) {

            // Storing it as the dependent variable
            selectedVariable.value = this.dataset.value;

            const dropdownIcon = this.querySelector(".dropdown-icon");
            const innerDropdown = this.parentElement.parentElement.querySelector(".other-options");
            const outerDropdownbtn = this.parentElement.previousElementSibling;

            // Toggle the styles and inner dropdown for the "Other" option
            if (!dropdownIcon.classList.contains("selected")) {

                this.classList.add("selected");

                dropdownIcon.innerHTML = "&#10005;";
                dropdownIcon.classList.add("selected"); 

                innerDropdown.style.display = "block";
                innerDropdown.style.top = (outerDropdownbtn.offsetHeight + this.parentElement.offsetHeight) + "px";

                if (window.innerWidth <= 767) {
                    alertPopup.style.top = "74%";
                }
            }
            else {
                this.classList.remove("selected");

                dropdownIcon.innerHTML = "&#x25BC;";
                dropdownIcon.classList.remove("selected"); 
                innerDropdown.style.display = "none";

                if (window.innerWidth <= 767) {
                    alertPopup.style.top = "70%";
                }
                
            }
            
        }
        else if (this.parentElement.classList.contains("other-options")) {
            // If an option from an Inner Dropdown was selected 

            // Storing it as the other dependent variable
            selectedOtherVariable.value = this.dataset.value;

            // Making the dropdown button appear selected, and modifying the icon 
            const currentDropdown = this.parentElement.parentElement;
            const currentDropdownBtn = currentDropdown.querySelector(".dropdown-btn");
            const currentDropdownList = currentDropdown.querySelector("ul");
            const currentButtonTitle = currentDropdownBtn.querySelector(".dropdown-title");
            const dropdownIcon = currentDropdownBtn.querySelector(".dropdown-icon");

            currentDropdownBtn.classList.add("selected");

            // Storing the dropdown category of the currently selected dependent/independent variable,
            // based on the class of the Dropdown Button 
            if (currentDropdownBtn.classList.contains("pre-market-btn")) selectedCategory.value = "Pre-Market Drivers";
            else if (currentDropdownBtn.classList.contains("in-market-btn")) selectedCategory.value = "In-Market Drivers";
            else if (currentDropdownBtn.classList.contains("post-market-btn")) selectedCategory.value = "Post-Market Drivers";
            else if (currentDropdownBtn.classList.contains("inequalities-btn")) selectedCategory.value = "Inequalities";
            else if (currentDropdownBtn.classList.contains("external-shocks-btn")) selectedCategory.value = "External Shocks";
            else if (currentDropdownBtn.classList.contains("others-btn")) selectedCategory.value = "Other Variables";

            currentButtonTitle.innerHTML = `${selectedOtherVariable.value}`;

            // Setting a smaller font size for the larger, in terms of length, options
            if (window.innerWidth > 767 && currentButtonTitle.offsetHeight > 100) {
                currentButtonTitle.style.fontSize = "0.8rem";
            }
            else if (currentButtonTitle.offsetHeight > 30) {
                currentButtonTitle.style.fontSize = "0.9rem";
            }
            else {
                currentButtonTitle.style.fontSize = "1rem";
            }

            dropdownIcon.innerHTML = "&#10005;";
            dropdownIcon.classList.add("selected");

            // Hiding the outer dropdown list 
            currentDropdownList.style.display = "none";
            currentDropdownBtn.setAttribute("aria-expanded", "false");


            // Deselecting the inner dropdown's "button" (list item) and hiding the list options
            const otherDropdownBtn = currentDropdown.querySelector(".has-dropdown");
            const otherDropdownBtnIcon = otherDropdownBtn.querySelector("span");
            const otherDropdownList = this.parentElement;

            otherDropdownBtn.classList.remove("selected");
            otherDropdownBtnIcon.innerHTML = "&#x25BC;";
            otherDropdownBtnIcon.classList.remove("selected");
            otherDropdownList.style.display = "none";

            // Making alert popup message disappear, in case the user previously tried to skip the selection
            alertPopup.style.visibility = "hidden";

            if (window.innerWidth <= 767) {    
                alertPopup.style.top = "65%";
            }

            // Deselecting any previously selected dropdown button and option
            checkForSelectedOptions(currentDropdownBtn);
        }
        else {
            // A regular option from a Dropdown list was selected
            
            // Storing it as the selected dependent variable
            selectedVariable.value = this.dataset.value;
            
            // Deleting any previously stored "Other" Dependent Variable 
            selectedOtherVariable.value = "";

            // Modifying the button's contents
            const currentDropdownList = this.parentElement;
            const currentDropdownBtn = currentDropdownList.previousElementSibling;
            const currentButtonTitle = currentDropdownBtn.querySelector(".dropdown-title");
            const dropdownIcon = currentDropdownBtn.querySelector(".dropdown-icon");

            // Storing the dropdown category of the currently selected dependent/independent variable,
            // based on the class of the Dropdown Button 
            if (currentDropdownBtn.classList.contains("pre-market-btn")) selectedCategory.value = "Pre-Market Drivers";
            else if (currentDropdownBtn.classList.contains("in-market-btn")) selectedCategory.value = "In-Market Drivers";
            else if (currentDropdownBtn.classList.contains("post-market-btn")) selectedCategory.value = "Post-Market Drivers";
            else if (currentDropdownBtn.classList.contains("inequalities-btn")) selectedCategory.value = "Inequalities";
            else if (currentDropdownBtn.classList.contains("external-shocks-btn")) selectedCategory.value = "External Shocks";
            else if (currentDropdownBtn.classList.contains("others-btn")) selectedCategory.value = "Other Variables";
            

            // Making the dropdown button appear selected
            // If the selected variable, contains additional variables (in the correlations and granger causalities)
            // display only the main variable.
            if (this.dataset.value.startsWith("Size of Public sector") || this.dataset.value.startsWith("Adequate transportation infrastructure") ||
                this.dataset.value.startsWith("Level of development") || this.dataset.value.startsWith("Discrimination with respect to race") ) {
                currentButtonTitle.innerHTML = `${selectedVariable.value.split(" - ")[0]}`;
            }
            else {
                currentButtonTitle.innerHTML = `${selectedVariable.value}`;
            }

            // Setting a smaller font size for the larger, in terms of length, options
            if (window.innerWidth > 767 && currentButtonTitle.offsetHeight > 100) {
                currentButtonTitle.style.fontSize = "0.8rem";
            }
            else if (currentButtonTitle.offsetHeight > 30) {
                currentButtonTitle.style.fontSize = "0.9rem";
            }
            else {
                currentButtonTitle.style.fontSize = "1rem";
            }

            dropdownIcon.innerHTML = "&#10005;";

            // Hiding the dropdown list of items, since an item was selected 
            currentDropdownList.style.display = "none";
            currentDropdownBtn.setAttribute("aria-expanded", "false");

            // Making alert popup message disappear, in case the user previously tried to skip the selection
            alertPopup.style.visibility = "hidden";

            if (window.innerWidth <= 767) {            
                alertPopup.style.top = "65%";
            }

            // If dropdown is not selected, we select 
            if (!currentDropdownBtn.classList.contains("selected")) {
                currentDropdownBtn.classList.add("selected");
            }

            // Adding the selected class to the icon as well 
            if (!dropdownIcon.classList.contains("selected")) {
                dropdownIcon.classList.add("selected");
            }

            // Closing the inner dropdown if it's open at the time of the selection
            const otherDropdown = currentDropdownBtn.parentElement.querySelector(".other-options");
            const otherDropdownBtn = currentDropdownList.querySelector(".has-dropdown");
            
            let otherDropdownBtnIcon;
            if (otherDropdownBtn) {
                otherDropdownBtnIcon = otherDropdownBtn.querySelector("span");
            }
            
            if (otherDropdownBtnIcon && otherDropdownBtnIcon.classList.contains("selected")) {
                otherDropdownBtn.classList.remove("selected");
                otherDropdownBtnIcon.innerHTML = "&#x25BC;";
                otherDropdownBtnIcon.classList.remove("selected");
            }

            if (otherDropdown && otherDropdown.style.display === "block") {
                otherDropdown.style.display = "none";
            }

            // Deselecting any previously selected dropdown button and option
            checkForSelectedOptions(currentDropdownBtn);
        }
        
    });
}


/* ========== Event Listener for "X" Dropdown Icons ========= */

for (let i=0; i<dropdownIcons.length; i++) {
    dropdownIcons[i].addEventListener("click", function (event) {

        // Preventing the click event from propagating to the button 
        event.preventDefault();
        event.stopPropagation();

        const currentDropdownBtn = this.parentElement;

        console.log(this.innerHTML);
        // If the Icon is the ▼ down arrow
        if (this.innerHTML == "▼") {
            if (currentDropdownBtn.classList.contains("has-dropdown")) {
                // And it also belongs in the inner dropdown list
                const innerDropdown = currentDropdownBtn.parentElement.parentElement.querySelector(".other-options");
                const outerDropdownbtn = currentDropdownBtn.parentElement.previousElementSibling;

                currentDropdownBtn.classList.add("selected");

                this.innerHTML = "&#10005;";
                this.classList.add("selected"); 

                innerDropdown.style.display = "block";
                innerDropdown.style.top = (outerDropdownbtn.offsetHeight + currentDropdownBtn.parentElement.offsetHeight) + "px";

                if (window.innerWidth <= 767) {
                    alertPopup.style.top = "74%";
                }
            }
            else {
                // Expand or hide the list of items of the corresponding dropdown button.
                const expanded = currentDropdownBtn.getAttribute("aria-expanded") === "true";
                currentDropdownBtn.setAttribute("aria-expanded", String(!expanded));
                currentDropdownBtn.nextElementSibling.style.display = expanded ? "none" : "block";

                if (currentDropdownBtn.nextElementSibling.style.display === "none") {
                    const otherDropdown = currentDropdownBtn.parentElement.querySelector(".other-options");

                    if (otherDropdown && otherDropdown.style.display !== "none") {
                            const hasDropdownOption = currentDropdownBtn.parentElement.querySelector("ul.options > li.has-dropdown");
                            const dropdownIcon = hasDropdownOption.querySelector(".dropdown-icon");
                            
                            hasDropdownOption.classList.remove("selected");
                            dropdownIcon.innerHTML = "&#x25BC;";
                            dropdownIcon.classList.remove("selected");
                            otherDropdown.style.display = "none";
                    }

                    if (window.innerWidth <= 767) {
                        alertPopup.style.top = "65%";    
                    }
                }
                else {
                    if (window.innerWidth <= 767) {
                        alertPopup.style.top = "70%";
                    }
                }


                // If any other dropdown list was open, we hide it, by checking the "aria-expanded" of the rest of the dropdown buttons
                for (let j=0; j<dropDownButtons.length; j++) {
                    if (dropDownButtons[j] != currentDropdownBtn && dropDownButtons[j].getAttribute("aria-expanded") === "true") {
                        
                        dropDownButtons[j].setAttribute("aria-expanded", "false");
                        
                        let dropdownList = dropDownButtons[j].nextElementSibling;
                        dropdownList.style.display = "none";

                        // For the same dropdown list, we check if the inner dropdown was also visible
                        // We hide it by applying the appropriate styles.
                        const otherDropdown = dropDownButtons[j].parentElement.querySelector(".other-options");

                        if (otherDropdown.style.display !== "none") {
                            const hasDropdownOption = dropDownButtons[j].parentElement.querySelector("ul.options > li.has-dropdown");
                            const dropdownIcon = hasDropdownOption.querySelector(".dropdown-icon");
                            
                            hasDropdownOption.classList.remove("selected");
                            dropdownIcon.innerHTML = "&#x25BC;";
                            dropdownIcon.classList.remove("selected");
                            otherDropdown.style.display = "none";
                        }

                        break;
                    }
                }
            }
        }
        else {
            // If the dropdown icon is an X 
            if (currentDropdownBtn.classList.contains("has-dropdown")) {
                // And it also belongs in the inner dropdown list
                
                const innerDropdown = currentDropdownBtn.parentElement.parentElement.querySelector(".other-options");
                
                currentDropdownBtn.classList.remove("selected");

                this.innerHTML = "&#x25BC;";
                this.classList.remove("selected");

                innerDropdown.style.display = "none";

                if (window.innerWidth <= 767) {
                    alertPopup.style.top = "70%";    
                }
            }
            else {
                // If the X button belongs in one of the outer dropdowns
                const currentDropdownBtn = this.parentElement;
                const currentDropdownList = currentDropdownBtn.parentElement.children[1];
                const innerDropdown = currentDropdownBtn.parentElement.querySelector(".other-options");
                
                // Closing the inner dropdown if it was open at the time of clicking the outer X icon
                const otherDropdownBtn = currentDropdownList.querySelector(".has-dropdown");
                const otherXDropdownIcon = currentDropdownList.querySelector(".dropdown-icon");

                if (otherXDropdownIcon && otherXDropdownIcon.classList.contains("selected")) {
                    otherDropdownBtn.style.backgroundColor = "rgb(255, 251, 234)";
                    
                    otherXDropdownIcon.classList.remove("selected");
                    otherXDropdownIcon.innerHTML = "&#x25BC;";
                    
                    innerDropdown.style.display = "none";
                }

                // Removing all the styles the made the current dropdown button appear selected,
                // and closing the outer dropdown, if it was open
                
                currentDropdownBtn.classList.remove("selected");
                currentDropdownList.style.display = "none";
                currentDropdownBtn.setAttribute("aria-expanded", "false");

                let currentButtonTitle = currentDropdownBtn.querySelector(".dropdown-title");
                currentButtonTitle.innerHTML =  currentButtonTitle.dataset.value;
                currentButtonTitle.style.fontSize = "1rem";

                this.innerHTML = "&#x25BC;";
                this.classList.remove("selected");

                selectedVariable.value = "";
                selectedOtherVariable.value = "";
                selectedCategory.value = "";

                if (window.innerWidth <= 767) {
                    alertPopup.style.top = "65%";
                }
                    
            }
        }
    });
}


/* ========== Event Listener on Submission Form ========= */

submissionForm.addEventListener("submit", function (event) {

    console.log(this.id);
    const eventButton = event.submitter;

    if (eventButton.value === "next" && selectedVariable.value === "" && selectedOtherVariable.value === "") {
        // Prevent submission if user hasn't selected an option
        event.preventDefault();
        
        // Make the Alert Popup Message appear
        alertPopup.style.visibility = "visible";
        
    }
});


/* ========== Event Listener when Page is Loaded ========== */

window.addEventListener("pageshow", function () {

    // 1) Setting up the Theme and Sidebar state
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

    // 2) Determining the correct versions of the Images
    if (document.documentElement.classList.contains("dark-mode")) {
        toggleIcon.src = "/images/list-dark-mode.svg";
        lightDarkIcon.src = "/images/sun.svg";
        themetoolTip.textContent = "Switch to Light Theme";
        bookmarkIcon.src = "/images/bookmark-simple-dark.svg";
        historyIcon.src = "/images/folder-star-dark.svg";
        logoutIcon.src = "/images/sign-out-dark.svg";

        if (selectedVariable.getAttribute("name") === "dependentVariable") {
            image.src = "/images/chart-line-up-dark-mode.svg";
        }
        else {
            image.src= "/images/gear-dark-mode.svg";
        }
    }
    else {
        toggleIcon.src = "/images/list.svg";
        lightDarkIcon.src = "/images/moon.svg";
        themetoolTip.textContent = "Switch to Dark Theme";
        bookmarkIcon.src = "/images/bookmark-simple.svg";
        historyIcon.src = "/images/folder-star.svg";
        logoutIcon.src = "/images/sign-out.svg";

        if (selectedVariable.getAttribute("name") === "dependentVariable") {
            image.src = "/images/chart-line-up.svg";
        }
        else {
            image.src = "/images/gear.svg";
        }
    }
    
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("disable-transitions");
        document.documentElement.style.visibility = "visible";
      });
    });


    // 3) Select Dependent/Independent Variable
    // If the user previously selected a level, make the corresponding button appear selected
    requestAnimationFrame(() => {
        const previousChoice = document.getElementById("selected-variable");
        const previousOtherChoice = document.getElementById("selected-other-variable");
        const previousCategory = document.getElementById("selected-category");
        

        // Adding the active class to denote the current step in the application flow.
        // First case: Step 4 "Select Dependent Variable"
        // Second case: Step 5 "Select Independent Variable"
        if (previousChoice.getAttribute("name") == "dependentVariable") {
            const currentStep = document.getElementById("step-4");
            currentStep.classList.add("active");
        }
        else {
            // When we're in step-5, we firstly have to deactivate step-4
            const prevStep = document.getElementById("step-4");
            prevStep.classList.remove("active");
            const currentStep = document.getElementById("step-5");
            currentStep.classList.add("active");
        }

        // If users had selected a value that last time their were in the current page,
        // Make sure it appears selected
        if (previousChoice.value || previousOtherChoice.value) {
            for (let i=0; i<dropDownOptions.length; i++) {

                if (dropDownOptions[i].dataset.value == previousChoice.value || dropDownOptions[i].dataset.value == previousOtherChoice.value) {
                    
                    let currentDropdownBtn;

                    if (!dropDownOptions[i].parentElement.classList.contains("other-options")) {
                        currentDropdownBtn = dropDownOptions[i].parentElement.previousElementSibling;
                    }
                    else {
                        currentDropdownBtn = dropDownOptions[i].parentElement.previousElementSibling.previousElementSibling;
                    }


                    const buttonTitle = currentDropdownBtn.querySelector(".dropdown-title");
                    const buttonIcon = currentDropdownBtn.querySelector(".dropdown-icon");
                    console.log(buttonTitle.innerHTML, "--", previousCategory.value);
                    
                    if (buttonTitle.innerHTML === previousCategory.value) {
                        
                        currentDropdownBtn.classList.add("selected");
                        
                        if (!dropDownOptions[i].parentElement.classList.contains("other-options")) {
                            if (previousChoice.value.startsWith("Size of Public sector") || previousChoice.value.startsWith("Adequate transportation infrastructure") ||
                                previousChoice.value.startsWith("Level of development") || previousChoice.value.startsWith("Discrimination with respect to race")) {
                                    
                                    buttonTitle.innerHTML = previousChoice.value.split(" - ")[0];
                            }
                            else {
                                buttonTitle.innerHTML = previousChoice.value;
                            }
                        } 
                        else {
                            buttonTitle.innerHTML = previousOtherChoice.value;
                        }
                        
                        // Setting a smaller font size for the larger, in terms of length, options
                        if (buttonTitle.offsetHeight > 100) {
                            buttonTitle.style.fontSize = "0.8rem";
                        }
                        else if (buttonTitle.offsetHeight > 30) {
                            buttonTitle.style.fontSize = "0.9rem";
                        }
                        else {
                            buttonTitle.style.fontSize = "1rem";
                        }
                        
                        buttonIcon.classList.add("selected");
                        buttonIcon.innerHTML = "&#10005;";
                        break;
                    }
                }
            }
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


        if (selectedVariable.getAttribute("name") === "dependentVariable") {
            image.src = "/images/chart-line-up.svg";
        }
        else {
            image.src = "/images/gear.svg";
        }

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

        
        if (selectedVariable.getAttribute("name") === "dependentVariable") {
            image.src = "/images/chart-line-up-dark-mode.svg";
        }
        else {
            image.src= "/images/gear-dark-mode.svg";
        }
        

        localStorage.setItem("theme", "dark");
    }
    
    console.log("SET Theme:", localStorage.getItem("theme"));
});