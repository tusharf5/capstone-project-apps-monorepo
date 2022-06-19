console.log("Init");

const id = setInterval(() => {
  console.log("Running forever");
}, 1000 * 60 * 60);

process.once("SIGTERM", function (code) {
  console.log("SIGKILL received...");
  clearInterval(id);
});

process.once("SIGINT", function (code) {
  console.log("SIGINT received...");
  clearInterval(id);
});
