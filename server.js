import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ------------------------------
   🔍 1. XCODE 수집
------------------------------ */
async function getXcodes() {
  const url = "https://www.rocketsalad.co.kr/shop/shopbrand.html";

  console.log("[XCODE] 요청:", url);

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

  console.log("[XCODE] 수집 결과:", [...xcodes]);

  return [...xcodes];
}

/* ------------------------------
   🔍 2. MCODE 수집
------------------------------ */
async function getMcodes(xcode) {
  const url = `https://www.rocketsalad.co.kr/shop/shopbrand.html?xcode=${xcode}&type=X`;

  console.log(`\n[MCODE] XCODE=${xcode} 요청:`, url);

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  const mcodes = new Set();

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const match = href.match(/mcode=(\d+)/);
    if (match) mcodes.add(match[1]);
  });

  console.log(`[MCODE] XCODE=${xcode} → MCODE 수집 결과:`, [...mcodes]);

  return [...mcodes];
}

/* ------------------------------
   🧭 3. 마지막 페이지 판별
------------------------------ */
function isLastPage($) {
  const nextBtn = $("a:contains('다음')");
  return nextBtn.length === 0;
}

/* ------------------------------
   🧨 4. 전체 스크래핑 API
------------------------------ */
app.post("/api/scrape", async (req, res) => {
  const keyword = req.body.keyword?.toLowerCase() ?? "";

  console.log("\n=========================");
  console.log("[SEARCH] 요청됨:", keyword);
  console.log("=========================");

  let results = [];
  let debugLogs = []; // 프론트에도 보여줄 디버깅 로그

  try {
    const xcodes = await getXcodes();
    debugLogs.push("수집된 XCODE: " + JSON.stringify(xcodes));

    if (xcodes.length === 0) {
      debugLogs.push("🚨 XCODE를 하나도 찾지 못했습니다.");
      return res.json({ count: 0, items: [], debug: debugLogs });
    }

    for (const xcode of xcodes) {
      const mcodes = await getMcodes(xcode);
      debugLogs.push(`XCODE=${xcode} → MCODE: ${JSON.stringify(mcodes)}`);

      const mcodeList = mcodes.length > 0 ? mcodes : [null];

      for (const mcode of mcodeList) {
        let page = 1;
        let lastPage = false;

        while (!lastPage) {
          const url = mcode
            ? `https://www.rocketsalad.co.kr/shop/shopbrand.html?xcode=${xcode}&mcode=${mcode}&type=X&page=${page}`
            : `https://www.rocketsalad.co.kr/shop/shopbrand.html?xcode=${xcode}&type=X&page=${page}`;

          console.log("[SCRAPE]", url);
          debugLogs.push("[SCRAPE] " + url);

          const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" }
          });

          const html = await response.text();
          const $ = cheerio.load(html);

          const tables = $("td > table[cellpadding='0']");
          debugLogs.push(`[PAGE] xcode=${xcode}, mcode=${mcode}, page=${page}, 상품 수=${tables.length}`);

          if (tables.length === 0) {
            debugLogs.push(`🚨 상품이 0개 — 페이지 종료`);
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
              mcode,
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
    }

    res.json({
      count: results.length,
      items: results,
      debug: debugLogs
    });

  } catch (err) {
    console.error("🔥 서버 오류:", err);
    res.status(500).json({ error: err.message, debug: debugLogs });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
