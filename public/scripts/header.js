
// Left sidebar 
const leftSidebar = document.querySelector(".sidebar");

// Top-right Nabar 
const navBar = document.querySelector(".nav-bar");

// Navbar's toggle button and Icon
const toggleButton = document.querySelector(".toggle-btn");
const toggleIcon = toggleButton.querySelector("img");

// Light/Dark theme toggle button and Icon
const lightDarkButton = document.querySelector(".toggle-theme-btn");
const lightDarkIcon = lightDarkButton.querySelector("img");

// Bookmark button and Icon
const bookmarkButton = document.querySelector(".bookmark-btn");
const bookmarkIcon = bookmarkButton.querySelector("img");

// Search history button and Icon
const historyButton = document.querySelector(".search-history-btn");
const historyIcon = historyButton.querySelector("img");

// Logout button and Icon
const logoutButton = document.querySelector(".logout-btn");
const logoutIcon = logoutButton.querySelector("img");

// ESSPIN title that appears only when the left sidebar is collapsed
const esspinTitle = document.querySelector(".esspin-title");

// Container for main content frame
const mainContents = document.querySelector(".main-contents");

// Main Content Frame
const mainContentsFrame = document.querySelector(".main-content-frame");

// Array of Hidden Input elements about the Light/Dark Theme of the Navbar's Bookmarks & Search History Buttons
const navbarThemeInputs = document.querySelectorAll(".navbar-is-dark-theme");

// Array of Hidden Input elements about the Light/Dark Theme of the Navbar's Bookmarks & Search History Buttons
const navbarSidebarInputs = document.querySelectorAll(".navbar-is-sidebar-collapsed");


/* ========== Event Listeners for Navigation Bar Elements ========= */

/* Event listener for left sidebar's toggle button */
toggleButton.addEventListener("click", function () {

    // Toggling the collapsed class from the html element,
    // and to all the scoped elements by extension
    document.documentElement.classList.toggle("collapsed");

    if (document.documentElement.classList.contains("collapsed")) {
        localStorage.setItem("sidebar", "collapsed");
    }
    else {
        localStorage.setItem("sidebar", "not-collapsed");
    }
});

/* ========== Event Listeners for making the Tooltips (dis-)appear when Hovering on top of the Navbar Buttons ========== */

// Sidebar Toggle Button
toggleButton.addEventListener("mouseenter", function () {

    const toggleTooltip = document.querySelector(".toggle-tooltip");

    toggleTooltip.style.display = "block";
});

toggleButton.addEventListener("mouseleave", function () {

    const toggleTooltip = document.querySelector(".toggle-tooltip");

    toggleTooltip.style.display = "none";
});

// Light/Dark Theme Button
lightDarkButton.addEventListener("mouseenter", function () {

    if (window.innerWidth > 767) {
        const themeTooltip = document.querySelector(".theme-tooltip");

        themeTooltip.style.display = "block";
    }
});

lightDarkButton.addEventListener("mouseleave", function () {

    if (window.innerWidth > 767) {
        const themeTooltip = document.querySelector(".theme-tooltip");

        themeTooltip.style.display = "none";
    }
});

// Bookmarks Button
bookmarkButton.addEventListener("mouseenter", function () {

    if (window.innerWidth > 767) {
        const bookmarkTooltip = document.querySelector(".bookmark-tooltip");

        bookmarkTooltip.style.display = "block";
    }
});

bookmarkButton.addEventListener("mouseleave", function () {

    if (window.innerWidth > 767) {
        const bookmarkTooltip = document.querySelector(".bookmark-tooltip");

        bookmarkTooltip.style.display = "none";
    }
});

// Search History Button
historyButton.addEventListener("mouseenter", function () {

    if (window.innerWidth > 767) {
        const historyTooltip = document.querySelector(".history-tooltip");

        historyTooltip.style.display = "block";
    }
});

historyButton.addEventListener("mouseleave", function () {

    if (window.innerWidth > 767) {
        const historyTooltip = document.querySelector(".history-tooltip");

        historyTooltip.style.display = "none";
    }
});

// Log-out of the account Button
logoutButton.addEventListener("mouseenter", function () {

    if (window.innerWidth > 767) {
        const logoutTooltip = document.querySelector(".logout-tooltip");

        logoutTooltip.style.display = "block";
    }
});

logoutButton.addEventListener("mouseleave", function () {

    if (window.innerWidth > 767) {
        const logoutTooltip = document.querySelector(".logout-tooltip");

        logoutTooltip.style.display = "none";
    }
});