import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ------------------------------
   🔥 xcode 고정 배열
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
   🔥 스크래핑 API (고정 xcode)
------------------------------ */
app.post("/api/scrape", async (req, res) => {
  const keyword = req.body.keyword?.toLowerCase() ?? "";
  const results = [];
  const debugLogs = [];

  try {
    debugLogs.push("사용할 XCODE: " + JSON.stringify(categories));

    for (const xcode of categories) {
      debugLogs.push(`\n=== XCODE ${xcode} 시작 ===`);
      let page = 1;
      let lastPage = false;

      while (!lastPage) {
        const url = `https://www.rocketsalad.co.kr/shop/shopbrand.html?xcode=${xcode}&type=X&page=${page}`;
        debugLogs.push(`[SCRAPE] ${url}`);

        let response;
        try {
          response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" }
          });
        } catch (err) {
          debugLogs.push(`❌ Fetch 실패: ${err.message}`);
          break;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const tables = $("td > table[cellpadding='0']");
        debugLogs.push(`[PAGE] xcode=${xcode}, page=${page}, items=${tables.length}`);

        if (tables.length === 0) {
          debugLogs.push("⚠️ table=0 → 이 카테고리 종료");
          break;
        }

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

        // 마지막 페이지면 종료
        lastPage = isLastPage($);
        if (lastPage) {
          debugLogs.push("🔚 마지막 페이지 도달");
        }

        page++;
      }
    }

    res.json({
      count: results.length,
      items: results,
      debug: debugLogs
    });

  } catch (err) {
    res.status(500).json({
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
