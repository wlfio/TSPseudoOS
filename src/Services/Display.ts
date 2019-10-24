
let display;


const queued = [];


const processQueue: Function = () => {

}

document.addEventListener("DOMContentLoaded", function (event) {
    display = document.querySelector("pre#display");
    processQueue();
});