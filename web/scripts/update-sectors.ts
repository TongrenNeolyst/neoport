import { createClient } from "@supabase/supabase-js";

// Supabase configuration from .env
const SUPABASE_URL = "https://csysmreidiksphqdihex.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzeXNtcmVpZGlrc3BocWRpaGV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI0Njk3MSwiZXhwIjoyMDg3ODIyOTcxfQ.WtH23Op8luMlgnFzT_Wch_QBSvXeYOos5N6skjLtrn4";

// Raw sector data (simplified TSV format)
const SECTOR_DATA = `id	sector	sector_chinese	sort	parent_id
1	Agriculture	农业	1	0
2	Automation	自动化	2	0
3	Autos	汽车	3	0
4	Auto Parts	汽车配件	1	3
5	Automobiles	汽车	2	3
6	Automotive Retailers	汽车零售商	3	3
7	Banks	银行行业	4	0
8	Business Services	商业服务	5	0
9	Casinos & Gaming	赌场和博彩	6	0
10	Chemical Engineering	化工	7	0
11	Computer & Software	计算机和软件	8	0
12	Construction and Building Materials	建筑建材	9	0
13	Discretionary	可选消费	10	0
14	Retail	零售	1	13
15	Apparel, Footwear & Acc Design	服装、鞋类及配饰设计	2	13
16	Consumer Services	消费服务	3	13
17	Household Appliances	家用电器与器具	4	13
18	Education	教育	11	0
19	Electronics	电子	12	0
20	Consumer Electronics	消费电子	1	19
21	Semiconductor	半导体	2	19
22	Other Electronic Components	其他电子元器件	3	19
23	Communication System	通讯系统	4	19
24	PCB	印刷电路板	5	19
25	Health Care	医疗	13	0
26	Pharmaceuticals	药品	1	25
27	Biotech	生物科技	2	25
28	Health Care Services	医疗服务	3	25
29	Health Care Equipment	医疗设备	4	25
30	Health Care Facilities	医疗设施	5	25
31	Health Care Supplies	保健用品	6	25
32	Drug Store	药品店	7	25
33	Internet	互联网	14	0
34	Other Internet	其他互联网	1	33
35	E-Commerce	电子商务	2	33
36	Ads	广告营销	3	33
37	Online Games	在线游戏	4	33
38	Live Streaming	流媒体	5	33
39	Light Manufacturing	轻工业	15	0
40	Machinery	机械	16	0
41	Media	媒体	17	0
43	Non-Bank Financials	非银行金融	19	0
44	Life Insurance	人寿保险	1	43
45	Mortgage Finance	抵押金融	2	43
46	Institutional Brokerage	机构经纪商	3	43
47	Commercial Finance	商业金融	4	43
48	Consumer Finance	消费金融	5	43
49	P&C Insurance	财产与意外保险	6	43
50	Wealth Management	财富管理	7	43
51	Other Financial Services	其他金融服务	8	43
52	Investment Management	投资管理	9	43
53	Non-ferrous Metals	有色金属	20	84
54	Property	房地产	21	0
56	Real Estate Development	房地产开发	1	54
57	Property Management	房地产服务	2	54
59	Building Products	建筑产品	3	54
60	Specialty Finance	特殊金融	22	0
61	Staples	必需消费	23	0
62	Food & Beverage	食品饮料	1	61
63	Packaged Food	包装食品	2	61
64	Household Products	家用产品	3	61
65	Tobacco	烟草	4	61
66	Restaurants	餐饮业	5	61
67	Home Improvement	家居装潢	6	61
68	Apparel & Footwear	服装、鞋类及配饰设计	7	61
69	Telecom	通信设备	24	0
70	Transportation	交通运输	25	0
71	Marine Shipping	海运	1	70
72	Logistics Services	物流服务	2	70
73	Airlines	航空公司	3	70
75	Ferrous Metals	黑色金属	27	84
76	Energy	能源	28	0
77	Petroleum and Petrochemical	石油石化	1	76
78	Coal	煤炭	2	76
79	New Energy	新能源	3	76
80	Construction	建筑	1	12
81	Plastic Pipe	塑料管	2	12
82	Cement	水泥	3	12
83	Other Construction	建筑其他	4	12
84	Materials	材料	29	0
85	Rail & Road	铁路和公路	4	70
86	Cosmetics	化妆品	5	13
87	Aerospace and National Defense	航空航天与国防	30	0
88	Energy Transition	能源转型	4	76
89	Military	军工	31	0
90	Industrials	工业	32	0
91	General Aviation	通用航空	1	87`;

interface RawSector {
  id: string;
  sector: string;
  sector_chinese: string;
  sort: string;
  parent_id: string;
}

function parseTSV(data: string): RawSector[] {
  const lines = data.trim().split("\n");
  const headers = lines[0].split("\t");

  return lines.slice(1).map((line) => {
    const values = line.split("\t");
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });
    return obj as unknown as RawSector;
  });
}

function generateUUID(id: string): string {
  const paddedId = id.padStart(12, "0");
  return `00000000-0000-0000-0000-${paddedId}`;
}

async function main() {
  console.log("Starting sector data update...\n");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const rawSectors = parseTSV(SECTOR_DATA);
  console.log(`Parsed ${rawSectors.length} sectors from TSV data\n`);

  // Fetch existing sectors to get their current UUIDs
  const { data: existingSectors } = await supabase
    .from("sector")
    .select("id, name_en, level, parent_id");

  const existingSectorMap = new Map<string, { id: string; level: number; parent_id: string | null }>();
  if (existingSectors) {
    existingSectors.forEach((s) => {
      existingSectorMap.set(s.name_en, {
        id: s.id,
        level: s.level,
        parent_id: s.parent_id,
      });
    });
  }

  // Create ID mapping from old ID to new UUID
  const oldIdToUuidMap = new Map<string, string>();

  const sectorsToUpsert: Array<{
    id: string;
    level: 1 | 2;
    parent_id: string | null;
    name_en: string;
    name_cn: string | null;
    wind_name: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }> = [];

  const now = new Date().toISOString();

  // Deduplicate by sector name
  const sectorMap = new Map<string, RawSector>();
  rawSectors.forEach((s) => {
    if (!sectorMap.has(s.sector)) {
      sectorMap.set(s.sector, s);
    }
  });

  console.log(`Unique sectors: ${sectorMap.size}\n`);

  // First pass: create sectors and build ID mapping
  sectorMap.forEach((raw, name) => {
    const isLevel1 = raw.parent_id === "0";
    const level: 1 | 2 = isLevel1 ? 1 : 2;

    const existing = existingSectorMap.get(name);
    const uuid = existing?.id || generateUUID(raw.id);

    oldIdToUuidMap.set(raw.id, uuid);

    sectorsToUpsert.push({
      id: uuid,
      level,
      parent_id: null, // Will be set in second pass
      name_en: raw.sector,
      name_cn: raw.sector_chinese || null,
      wind_name: raw.sector_chinese || null, // Use Chinese name as wind_name
      is_active: true,
      created_at: now,
      updated_at: now,
    });
  });

  // Second pass: set parent_id correctly
  sectorsToUpsert.forEach((sector) => {
    const raw = sectorMap.get(sector.name_en);
    if (raw && raw.parent_id !== "0") {
      const parentUuid = oldIdToUuidMap.get(raw.parent_id);
      if (parentUuid) {
        sector.parent_id = parentUuid;
      }
    }
  });

  console.log("Upserting sectors...");

  const { error } = await supabase.from("sector").upsert(sectorsToUpsert, {
    onConflict: "id",
  });

  if (error) {
    console.error("Error upserting sectors:", error);
    return;
  }

  console.log(`Successfully upserted ${sectorsToUpsert.length} sectors\n`);

  // Verify the results
  const { data: verifyData } = await supabase
    .from("sector")
    .select("id, name_en, level, parent_id")
    .order("level", { ascending: true })
    .order("name_en", { ascending: true });

  if (verifyData) {
    console.log("\n=== Sector Summary ===");
    const level1Count = verifyData.filter((s) => s.level === 1).length;
    const level2Count = verifyData.filter((s) => s.level === 2).length;
    console.log(`Level 1 sectors: ${level1Count}`);
    console.log(`Level 2 sectors: ${level2Count}`);
    console.log(`Total: ${verifyData.length}`);
  }
}

main();
