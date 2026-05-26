import { parseDetailPage } from "../src/lib/scraper/pathways";

async function main() {
  const samples = [
    "HSC-AmFisheriesSoc-HuttonJr",
    "SUM-UConn-PhysiNeuro",
    "SUM-UNevadaLosVegas-EnviroMicroBio",
  ];

  for (const id of samples) {
    const url = `https://pathwaystoscience.org/programhub.aspx?sort=${id}`;
    console.log(`\n=== ${id} ===`);
    const res = await fetch(url, {
      headers: { "User-Agent": "UAPB-RIED-Dashboard/1.0" },
    });
    console.log("HTTP", res.status);
    const html = await res.text();
    const detail = parseDetailPage(html);
    console.log(JSON.stringify(detail, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
