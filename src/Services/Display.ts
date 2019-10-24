
let display;


const queued = [];

document.addEventListener("DOMContentLoaded", function (event) {
    display = document.querySelector("pre#display");
    processQueue();
});