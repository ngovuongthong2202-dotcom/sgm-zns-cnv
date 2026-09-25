async function run() {
  const res = await fetch("http://localhost:3000/api/analytics/recalculate", { method: "POST" });
  console.log(await res.text());
}
run();
