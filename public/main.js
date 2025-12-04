async function search() {
  const keyword = document.getElementById("keyword").value;

  const res = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword })
  });

  const data = await res.json();
  document.getElementById("result").innerText =
    JSON.stringify(data, null, 2);
}
