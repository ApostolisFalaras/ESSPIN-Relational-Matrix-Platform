
// Individual Results Containers
const individualResults = document.querySelectorAll(".result-card");

// Individual Bookmark Symbols on Result Cards
const bookmarkWrappers = document.querySelectorAll(".bookmark-wrapper");

// Image inside the Main content frame
const image = document.querySelector(".main-content-frame > img");

// Download Icon
const downloadIcon = document.querySelectorAll(".export-buttons a img")

// Legend with Colored Impacts 
const legend = document.querySelector(".legend");

// Colored Squares
const coloredSquares = document.querySelectorAll(".color-shape");

// New search button
const newSearchButton = document.querySelector(".new-search-btn");

// Theme Tooltip
const themetoolTip = document.querySelector(".theme-tooltip");


/* ========== Event Listeners for Bookmarks in the top of the Results card ========= */
for (let i=0; i<bookmarkWrappers.length; i++) {
    bookmarkWrappers[i].addEventListener("click", function () {

        const bookmark = this.querySelector(".bookmark");
        this.classList.toggle("selected");
        bookmark.classList.toggle("selected");

        if (bookmark.classList.contains("selected")) {
            const notesDiv = document.createElement("div");

            const resultCard = bookmark.parentElement.parentElement.parentElement;
            resultCard.appendChild(notesDiv);

            if (bookmark.classList.contains("positive")) 
                notesDiv.innerHTML = `<img src="/images/note-positive.svg" alt="Note Icon">`;
            else if (bookmark.classList.contains("rather-positive"))
                notesDiv.innerHTML = `<img src="/images/note-rather-positive.svg" alt="Note Icon">`;
            else if (bookmark.classList.contains("negative"))
                notesDiv.innerHTML = `<img src="/images/note-negative.svg" alt="Note Icon">`;
            else if (bookmark.classList.contains("rather-negative"))
                notesDiv.innerHTML = `<img src="/images/note-rather-negative.svg" alt="Note Icon">`;
            else if (bookmark.classList.contains("inconclusive")) 
                notesDiv.innerHTML = `<img src="/images/note-inconclusive.svg" alt="Note Icon">`;
            else if (bookmark.classList.contains("no-effect"))
                notesDiv.innerHTML = `<img src="/images/note-noeffect.svg" alt="Note Icon">`;

            notesDiv.classList.add("notes-div");
        }
        else {
            const resultCard = bookmark.parentElement.parentElement.parentElement;
            const notesDiv = resultCard.querySelector(".notes-div");
            if (notesDiv)
                notesDiv.remove();

            const notesTextFrame = resultCard.querySelector(".notes-text-frame");
            if (notesTextFrame)
                notesTextFrame.style.display = "none";

            const hiddenInput = form.querySelector('input[name="noteText"]');
            hiddenInput.value = "";
        }

        const form = this.closest("form");
        form.submit();
    });
}

/* ========== Event Listeners for Notes in the top of the Results card ========= */

document.addEventListener('click', function (e) {
    const noteIcon = e.target.closest('.notes-div');
    if (!noteIcon) return;

    const resultCard = noteIcon.closest('.result-card');
    const notesTextFrame = resultCard.querySelector('.notes-text-frame');

    // Use computed style to get the actual visibility
    const isHidden = window.getComputedStyle(notesTextFrame).display === "none";

    notesTextFrame.style.display = isHidden ? 'block' : 'none';
});

// The save button assigns the textarea's contents to the hidden element that will be passed 
// to the server as the saved bookmark
document.addEventListener('click', function (e) {
    if (e.target.closest('.save-note')) {
        const saveBtn = e.target.closest('.save-note');
        const form = saveBtn.closest('form');
        const notesFrame = form.closest('.notes-text-frame');
        
        const textarea = notesFrame.querySelector('textarea');
        const hiddenInput = form.querySelector('input[name="noteText"]');
        
        hiddenInput.value = textarea.value;
        notesFrame.style.display = "none";
    }
});

// The cancel note button deletes the note the textarea (not database), and closes it.
document.addEventListener('click', function (e) {
    if (e.target.closest('.cancel-note')) {
        const cancelBtn = e.target.closest('.cancel-note');
        const notesFrame = cancelBtn.closest('.notes-text-frame');
        
        const textarea = notesFrame.querySelector('textarea');

        textarea.value = "";
        notesFrame.style.display = "none";
    }
});

// The delete note button deletes the note from the database, empties the textarea, and closes it.
document.addEventListener('click', function (e) {
    if (e.target.closest('.delete-note')) {
        const deleteBtn = e.target.closest('.delete-note');
        const form = deleteBtn.closest('form');
        const notesFrame = form.closest('.notes-text-frame');
        
        const textarea = notesFrame.querySelector('textarea');

        textarea.value = "";
        notesFrame.style.display = "none";
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
        image.src = "/images/check-circle-dark-mode.svg";
        cookieIcon.src = "/images/cookie-fill-dark-mode.svg";
        downloadIcon.forEach((img) => {
            img.src = "/images/download-simple-fill.svg";
        });
    }
    else {
        toggleIcon.src = "/images/list.svg";
        lightDarkIcon.src = "/images/moon.svg";
        themetoolTip.textContent = "Switch to Dark Theme";
        bookmarkIcon.src = "/images/bookmark-simple.svg";
        historyIcon.src = "/images/folder-star.svg";
        logoutIcon.src = "/images/sign-out.svg";
        image.src = "/images/check-circle.svg";
        cookieIcon.src = "/images/cookie-fill.svg";
        downloadIcon.forEach((img) => {
            img.src = "/images/download-simple-fill.svg";
        });
    }

    individualResults.forEach((resCard) => {
        const bookmark = resCard.querySelector(".bookmark");

        if (bookmark.classList.contains("selected")) {
            const notesDiv = document.createElement("div");

            resCard.appendChild(notesDiv);

            if (bookmark.classList.contains("positive")) 
                notesDiv.innerHTML = `<img src="/images/note-positive.svg" alt="Note Icon">`;
            else if (bookmark.classList.contains("rather-positive"))
                notesDiv.innerHTML = `<img src="/images/note-rather-positive.svg" alt="Note Icon">`;
            else if (bookmark.classList.contains("negative"))
                notesDiv.innerHTML = `<img src="/images/note-negative.svg" alt="Note Icon">`;
            else if (bookmark.classList.contains("rather-negative"))
                notesDiv.innerHTML = `<img src="/images/note-rather-negative.svg" alt="Note Icon">`;
            else if (bookmark.classList.contains("inconclusive")) 
                notesDiv.innerHTML = `<img src="/images/note-inconclusive.svg" alt="Note Icon">`;
            else if (bookmark.classList.contains("no-effect"))
                notesDiv.innerHTML = `<img src="/images/note-noeffect.svg" alt="Note Icon">`;

            notesDiv.classList.add("notes-div");

            const textarea = resCard.querySelector('textarea');
            const hiddenInput = resCard.querySelector('input[name="noteText"]');

            textarea.value = hiddenInput.value;
            console.log(textarea.value);
        }
    });

    // Adding the active class to denote the current step in the application flow.
    const currentStep = document.getElementById("step-8");
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
        image.src = "/images/check-circle-dark-mode.svg";
        cookieIcon.src = "/images/cookie-fill-dark-mode.svg";

        localStorage.setItem("theme", "dark");
    }

    
    console.log("SET Theme:", localStorage.getItem("theme"));
});
