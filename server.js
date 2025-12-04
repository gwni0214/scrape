import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ------------------------------
   🔍 XCODE 자동 수집
------------------------------ */
async function getXcodes() {
  const url = "https://www.rocketsalad.co.kr/shop/shopbrand.html";

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const xcodes = new Set();

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const match = href.match(/xcode=(\d+)/);
    if (match) xcodes.add(match[1]);
  });

  return [...xcodes];
}

/* ------------------------------
   🧭 마지막 페이지 판별
------------------------------ */
function isLastPage($) {
  const nextBtn = $("a:contains('다음')");
  return nextBtn.length === 0;
}

/* ------------------------------
   🔥 스크래핑 API (mcode 없음)
------------------------------ */
app.post("/api/scrape", async (req, res) => {
  const keyword = req.body.keyword?.toLowerCase() ?? "";
  const results = [];
  const debugLogs = [];

  try {
    const xcodes = await getXcodes();
    debugLogs.push("수집된 XCODE: " + JSON.stringify(xcodes));

    if (xcodes.length === 0) {
      debugLogs.push("🚨 XCODE를 찾지 못함.");
      return res.json({ count: 0, items: [], debug: debugLogs });
    }

    for (const xcode of xcodes) {
      let page = 1;
      let lastPage = false;

      while (!lastPage) {
        const url = `https://www.rocketsalad.co.kr/shop/shopbrand.html?xcode=${xcode}&type=X&page=${page}`;
        debugLogs.push("[SCRAPE] " + url);

        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });

        const html = await response.text();
        const $ = cheerio.load(html);

        const tables = $("td > table[cellpadding='0']");
        debugLogs.push(`[PAGE] xcode=${xcode}, page=${page}, items=${tables.length}`);

        if (tables.length === 0) break;

        tables.each((_, el) => {
          const title = $(el).find("span.Tahoma").first().text().trim();
          const price = $(el).find("span.mk_price").text().trim();
          const link = $(el).find("a").attr("href");
          const img = $(el).find("img").attr("src");

          if (!title) return;
          if (keyword && !title.toLowerCase().includes(keyword)) return;

          results.push({
            xcode,
            title,
            price,
            link: link ? `https://www.rocketsalad.co.kr${link}` : null,
            img: img ? `https://www.rocketsalad.co.kr${img}` : null
          });
        });

        lastPage = isLastPage($);
        page++;
      }
    }

    return res.json({
      count: results.length,
      items: results,
      debug: debugLogs
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message,
      debug: debugLogs
    });
  }
});

/* ------------------------------
   서버 시작
------------------------------ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
