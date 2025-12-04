import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ------------------------------
   🔧 사용할 카테고리(XCODE)
------------------------------ */
const categories = ["113", "115", "116", "118"];

/* ------------------------------
   🧭 마지막 페이지 판별
------------------------------ */
function isLastPage($) {
  const nextBtn = $("a:contains('다음')");
  return nextBtn.length === 0;
}

/* ------------------------------
   🔥 스크래핑 API
------------------------------ */
app.post("/api/scrape", async (req, res) => {
  const keyword = req.body.keyword?.toLowerCase() ?? "";
  const results = [];
  const debugLogs = [];
  const seen = new Set(); // 🔥 중복 방지

  try {
    debugLogs.push("사용할 XCODE: " + JSON.stringify(categories));

    for (const xcode of categories) {
      let page = 1;
      let lastPage = false;

      while (!lastPage) {
        const url = `https://www.rocketsalad.co.kr/shop/shopbrand.html?xcode=${xcode}&type=X&page=${page}`;
        debugLogs.push(`[SCRAPE] ${url}`);

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
          const price = $(el).find("span.mk_price").first().text().trim(); // 🔥 가격 중복 해결 (first())
          const link = $(el).find("a").attr("href");
          const img = $(el).find("img").attr("src");

          if (!title) return;
          if (keyword && !title.toLowerCase().includes(keyword)) return;

          const productId = link; // 🔥 중복 식별 키
          if (seen.has(productId)) return;
          seen.add(productId);

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
