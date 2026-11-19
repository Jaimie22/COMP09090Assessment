
// 1. THE MENU
// The outline that "draws" itself around a menu link when you hover over it
const borderSvg = '<svg class="animated-border-svg" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><rect width="100%" height="100%" rx="8" /></svg>';

// The five element pages, in order. These appear in the "Elements" drop-down
const elementPages = [
  { file: "element1.html", name: "01 · Blockout" },
  { file: "element2.html", name: "02 · The Void" },
  { file: "element3.html", name: "03 · Adrift" },
  { file: "element4.html", name: "04 · Suit HUD" },
  { file: "element5.html", name: "05 · Event Horizon" }
];

// Work out which page the user is on, for example "element2.html".
// If the web address ends in "/", we are on the home page.
const currentPage = window.location.pathname.split("/").pop() || "index.html";

// Gives back the word "active" if a link points to the current page, so it can be highlighted
function activeClass(file) {
  return file === currentPage ? " active" : "";
}

// Turns the list of element pages into the links inside the drop-down
function dropdownLinks(pageList) {
  return pageList
    .map(page => `<li><a class="dropdown-item${activeClass(page.file)}" href="${page.file}">${page.name}</a></li>`)
    .join("");
}

// Checks whether we are on one of the element pages, so the "Elements" button lights up as well
const onElementPage = elementPages.some(page => page.file === currentPage);

// The full menu, built with Bootstrap's ready-made navbar classes
const navHTML = `
<nav class="navbar navbar-expand-lg fixed-top site-navbar" data-bs-theme="dark" aria-label="Main navigation">
  <div class="container">
    <a class="navbar-brand" href="index.html">TON <span>618</span></a>

    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Open menu">
      <span class="navbar-toggler-icon"></span>
    </button>

    <div class="collapse navbar-collapse" id="mainNav">
      <ul class="navbar-nav ms-auto">
        <li class="nav-item">
          <a class="nav-link${activeClass("index.html")}" href="index.html">Home${borderSvg}</a>
        </li>
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle${onElementPage ? " active" : ""}" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Elements${borderSvg}</a>
          <ul class="dropdown-menu dropdown-menu-end">${dropdownLinks(elementPages)}</ul>
        </li>
        <li class="nav-item">
          <a class="nav-link${activeClass("documentation.html")}" href="documentation.html">Documentation${borderSvg}</a>
        </li>
      </ul>
    </div>
  </div>
</nav>`;

// Find the empty <div id="site-nav"> on the page and put the menu inside it
const navSlot = document.getElementById("site-nav");
if (navSlot) {
  navSlot.innerHTML = navHTML;
}


// 2. BACK TO TOP BUTTON 

// Create the button and add it to the page
const backToTop = document.createElement("button");
backToTop.className = "back-to-top";
backToTop.type = "button";
backToTop.setAttribute("aria-label", "Back to top");
backToTop.textContent = "↑";
document.body.appendChild(backToTop);

// Every time the page scrolls, show the button if we are more than 400 pixels down
window.addEventListener("scroll", () => {
  backToTop.classList.toggle("is-visible", window.scrollY > 400);
});

// When clicked, glide smoothly back to the top
backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});


// 3. KEEP SCROLLING INSIDE THE SCENES
// Over a BabylonJS scene, the scroll wheel should zoom the camera, not scroll the page.
// The same goes for Space and the arrow keys once you've clicked into a scene.

// Find every scene canvas on this page (there's one on each element page)
document.querySelectorAll(".scene-frame canvas").forEach(sceneCanvas => {

  // Mouse wheel over the scene: stop the page scrolling.
  // Babylon still receives the wheel, so the camera zoom keeps working.
  // "passive: false" is needed, or the browser won't let us stop the scroll.
  sceneCanvas.addEventListener("wheel", event => {
    event.preventDefault();
  }, { passive: false });

  // Keys pressed while the scene is selected: stop Space and the arrow keys scrolling the page
  const scrollKeys = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  sceneCanvas.addEventListener("keydown", event => {
    if (scrollKeys.includes(event.code)) {
      event.preventDefault();
    }
  });
});