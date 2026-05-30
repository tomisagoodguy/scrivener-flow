-- stock_topics: 投資主題元資料（從 stock-data-ai/stock-data 同步）
CREATE TABLE IF NOT EXISTS stock_topics (
    topic_id    TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    short_name  TEXT NOT NULL,
    group_name  TEXT,
    description TEXT,
    color       TEXT,
    icon        TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- stock_topic_assignments: 股票→主題 N:M 對應關係
CREATE TABLE IF NOT EXISTS stock_topic_assignments (
    stock_code TEXT NOT NULL,
    topic_id   TEXT NOT NULL,
    PRIMARY KEY (stock_code, topic_id),
    CONSTRAINT fk_topic FOREIGN KEY (topic_id)
        REFERENCES stock_topics (topic_id) ON DELETE CASCADE
);

-- RLS: 啟用，主題資料為共用參考資料，不做 user_id 隔離
ALTER TABLE stock_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_topic_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read stock_topics"
    ON stock_topics FOR SELECT
    USING (true);

CREATE POLICY "Public read stock_topic_assignments"
    ON stock_topic_assignments FOR SELECT
    USING (true);

-- Index for JOIN performance
CREATE INDEX IF NOT EXISTS idx_stock_topic_assignments_stock_code
    ON stock_topic_assignments (stock_code);

CREATE INDEX IF NOT EXISTS idx_stock_topic_assignments_topic_id
    ON stock_topic_assignments (topic_id);

-- Seed: 初始主題元資料（對應 src/lib/investment/topicMap.json）
-- SyncTopicsStep 每日從 GitHub 覆蓋，此處只供 DB 初始化時提供 FK 依賴
INSERT INTO stock_topics (topic_id, name, short_name, group_name, description, color, icon) VALUES
    ('ai-server-odm', 'AI 伺服器｜整機組裝 (AI Server ODM)', 'AI 伺服器組裝', 'AI 伺服器', '負責將運算模組、散熱系統、電源與機殼整合為完整的 AI 伺服器機櫃（Rack）。', 'sky', 'Server'),
    ('bbu', 'AI 伺服器｜BBU 電池備援系統 (Battery Backup Unit)', 'BBU 電池備援', 'AI 伺服器', '應用於 AI 伺服器與資料中心的關鍵電力備援模組。', 'amber', 'Bolt'),
    ('ems-smt', 'AI 伺服器｜SMT/EMS 電子代工', 'EMS 電子代工', 'AI 伺服器', 'SMT/EMS 廠商專精於精密 PCB 打件、記憶體模組組裝至 AI 伺服器系統整合。', 'slate', 'Factory'),
    ('ai-server-chassis-rails', 'AI 伺服器｜機殼與滑軌 (AI Server Chassis & Rails)', '機殼與滑軌', 'AI 伺服器', 'AI 伺服器機殼結構升級及高承重精密滑軌。', 'sky', 'Server'),
    ('hpc-network-ic', 'IC 設計｜HPC 與網通 IC (HPC & Connectivity IC)', 'HPC 與網通 IC', 'IC 設計', '聚焦於 AI 資料中心、高效能運算 (HPC) 與 5G/WiFi 網通核心晶片。', 'orange', 'Cpu'),
    ('ic-distribution', 'IC 設計｜IC 通路 (IC Distribution)', 'IC 通路', 'IC 設計', '負責半導體元器件的代理、分銷與技術支援。', 'cyan', 'Truck'),
    ('asic-ip-design', 'IC 設計｜IP 授權與客製 ASIC 設計服務 (IP Licensing & Custom ASIC Design)', 'IP 授權與 ASIC 設計', 'IC 設計', '矽智財 (IP Core) 授權與客製 ASIC 設計服務。', 'orange', 'Cpu'),
    ('analog-power-ic', 'IC 設計｜類比與功率管理 IC (Analog & Power IC)', '類比與功率 IC', 'IC 設計', '電力管理、訊號感測與嵌入式控制的核心類比與功率晶片設計。', 'orange', 'Cpu'),
    ('ddic', 'IC 設計｜顯示驅動 IC (Display Driver IC)', '顯示驅動 IC', 'IC 設計', '顯示驅動 IC (DDIC) 負責控制顯示面板上的像素電壓。', 'orange', 'Cpu'),
    ('cowos-advanced-packaging', '先進封測｜AI 先進封裝（CoWoS）', 'AI 先進封裝', '先進封測', '以台積電 CoWoS 為核心的 AI 先進封裝供應鏈。', 'violet', 'PackageCheck'),
    ('high-end-testing', '先進封測｜IC 測試服務', 'IC 測試服務', '先進封測', '涵蓋 AI/HPC 晶片全製程測試服務與消耗性測試介面耗材。', 'violet', 'PackageCheck'),
    ('ic-substrate', '先進封測｜IC 載板', 'IC 載板', '先進封測', 'IC 載板是晶片與 PCB 主板之間的關鍵訊號橋接層。', 'slate', 'Layers'),
    ('advanced-packaging-test', '先進封測｜封測代工服務（OSAT）', '封測代工', '先進封測', '涵蓋主流 OSAT 代工、特殊封裝製程及記憶體封裝服務。', 'violet', 'PackageCheck'),
    ('advanced-packaging-process', '先進封測｜先進封裝製程機台', '封裝製程機台', '先進封測', '提供先進封裝核心製程所需機台。', 'violet', 'PackageCheck'),
    ('advanced-packaging-automation', '先進封測｜先進封裝量測自動化', '封裝量測自動化', '先進封測', '提供先進封裝製程所需的光學量測、AOI 缺陷檢測與廠內自動化搬運系統。', 'violet', 'ScanSearch'),
    ('packaging-materials', '先進封測｜導線架與化學品', '導線架與化學品', '先進封測', '提供成熟晶片封裝所需的導電結構與化學材料。', 'slate', 'Layers'),
    ('glass-core-substrate', '先進封測｜玻璃基板 (Glass Core Substrate, GCS)', '玻璃基板', '先進封測', '繼 CoWoS 之後先進封裝關鍵戰場。', 'indigo', 'Cpu'),
    ('fiberglass-cloth', '先進封測｜玻纖布', '玻纖布', '先進封測', '從玻璃原料到終端 AI 伺服器應用的完整產業鏈。', 'slate', 'Layers'),
    ('optical-lens-camera', '光學顯示｜光學鏡頭與相機模組 (Optical Lens & Camera Module)', '光學鏡頭', '光學顯示', '涵蓋精密光學鏡頭製造、影像感測器封裝與相機模組整合。', 'slate', 'Aperture'),
    ('optical-sensors', '光學顯示｜光感測與元件 (Optical Sensors & Components)', '光感測與元件', '光學顯示', '涵蓋影像感測 (CIS)、環境光與近接感測等技術。', 'slate', 'Aperture'),
    ('display-panel', '光學顯示｜面板產業 (Display Panel)', '面板產業', '光學顯示', '面板產業正從傳統 LCD 轉型至 OLED 與 Micro LED。', 'slate', 'Monitor'),
    ('semi-process-materials', '半導體製造｜前段製程材料 (Front-End Process Materials)', '前段製程材料', '半導體製造', '提供晶圓製造前段製程所需的高純度化學品與功能性材料。', 'blue', 'Factory'),
    ('wafer-foundry', '半導體製造｜晶圓代工 (Wafer Foundry)', '晶圓代工', '半導體製造', '依據 IC 設計藍圖進行晶圓製造，涵蓋先進邏輯製程與特殊/功率製程。', 'blue', 'Factory'),
    ('wafer-fab-equipment', '半導體製造｜晶圓廠設備 (Wafer Fab Equipment)', '晶圓廠設備', '半導體製造', '提供晶圓製造前段製程所需的設備、量測儀器與設備關鍵零組件。', 'blue', 'Factory'),
    ('silicon-wafer', '半導體製造｜矽晶圓 (Silicon Wafer)', '矽晶圓', '半導體製造', '位於半導體製造最上游，生產矽晶圓基板。', 'blue', 'Factory'),
    ('cnc-machine-tool', '多元產業｜CNC工具機 (CNC Machine Tools)', 'CNC工具機', '多元產業', '涵蓋 CNC 車床、加工中心、龍門機與五軸複合機。', 'slate', 'Settings2'),
    ('thermal_components_air', '散熱冷卻｜氣冷與核心組件 (Thermal Components & Air Cooling)', '氣冷與核心組件', '散熱冷卻', '3D VC、高轉速風扇與熱導管，Edge AI 與中低功率伺服器的核心氣冷元件供應鏈。', 'teal', 'Wind'),
    ('liquid_cooling_advanced', '散熱冷卻｜液冷與先進冷卻 (Liquid Cooling & Advanced)', '液冷與先進冷卻', '散熱冷卻', 'Cold Plate、CDU 與浸沒式冷卻，針對 1000W+ 世代的高密度液冷基礎設施。', 'teal', 'Wind'),
    ('edge-ai', '智慧機器人｜Edge AI / AIoT 邊緣智慧 (Edge AI / AIoT)', 'Edge AI / AIoT', '智慧機器人', 'AI 推論從雲端下沉至終端裝置，涵蓋邊緣 AI 晶片、工業電腦與 IoT 閘道器。', 'sky', 'Cpu'),
    ('robotics_physical_ai', '智慧機器人｜實體 AI 機器人 (Physical AI)', '實體 AI 機器人', '智慧機器人', '機器人正從傳統工業手臂演進為具備 AI 視覺與自主學習能力的智慧實體。', 'sky', 'Smartphone'),
    ('industrial-automation', '智慧機器人｜工業自動化 / 智慧製造 (Industrial Automation)', '工業自動化', '智慧機器人', '涵蓋 PLC/伺服控制、IPC 工業電腦、AMR/AGV 移動機器人與智慧工廠整合。', 'amber', 'Factory'),
    ('ar-vr-xr-optics', '消費終端｜AR/VR/XR 光學供應鏈 (AR/VR/XR Optics)', 'AR/VR/XR 光學', '消費終端', '涵蓋 AR/VR/XR 裝置所需的 Pancake 折疊鏡頭、光波導元件及微顯示器。', 'sky', 'Eye'),
    ('pc-nb-tablet', '消費終端｜PC 與筆記型電腦 (PC & Notebook)', 'PC 與筆記型電腦', '消費終端', '涵蓋全球筆記型電腦、桌上型電腦及平板電腦的設計、代工與品牌銷售。', 'sky', 'Smartphone'),
    ('mobile', '消費終端｜智慧型手機供應鏈 (Mobile & Smartphone)', '智慧型手機', '消費終端', '聚焦 Apple iPhone 供應鏈、Android 旗艦機代工與摺疊機技術。', 'sky', 'Smartphone'),
    ('e-commerce', '消費終端｜電商零售平台 (E-Commerce)', '電商零售', '消費終端', '聚焦台灣電商零售平台、垂直社群電商與 OMO 虛實整合零售。', 'sky', 'ShoppingCart'),
    ('ess-storage', '綠能環保｜儲能系統整合 (Energy Storage System)', '儲能系統整合', '綠能環保', '專注於電網級與工商業儲能系統（ESS）整合與建置。', 'green', 'Bolt'),
    ('solar-energy', '綠能環保｜太陽能產業 (Solar Energy)', '太陽能產業', '綠能環保', '太陽能產業正經歷從內需轉向出口的重大轉折。', 'green', 'Sun'),
    ('water-environment', '綠能環保｜水資源工程與環保 (Water Infrastructure & Environmental Engineering)', '水資源環保工程', '綠能環保', '涵蓋海水淡化統包、再生水廠興建與半導體超純水系統。', 'green', 'Waves'),
    ('offshore-wind', '綠能環保｜離岸風電 (Offshore Wind Energy)', '離岸風電', '綠能環保', '台灣政府重大能源轉型政策，推動本土供應鏈國產化。', 'green', 'Wind'),
    ('electrical_equipment', '綠能環保｜電器電纜與重電 (Electrical Equipment)', '電器電纜', '綠能環保', '涵蓋從原材料、設備製造到系統整合的完整電力產業鏈。', 'amber', 'Bolt'),
    ('circular-economy-ewaste', '綠能環保｜電子廢料與製程回收 (Circular Economy & E-Waste)', '電子廢料與回收', '綠能環保', '涵蓋電子產業製程廢液回收、半導體電解金屬提取。', 'green', 'Recycle'),
    ('battery-materials', '綠能環保｜電池關鍵材料 (Battery Materials)', '電池關鍵材料', '綠能環保', '涵蓋電池最核心的正極、負極、電解液與隔離膜材料。', 'green', 'Layers'),
    ('battery-cell-module', '綠能環保｜電芯製造與模組 Pack (Battery Cell & Module)', '電芯與模組', '綠能環保', '聚焦於電芯製造與電池模組封裝。', 'green', 'Battery'),
    ('leo-satellite', '網通衛星｜低軌衛星通訊系統 (LEO Satellite Communication)', '低軌衛星', '網通衛星', '低軌衛星（LEO）以低延遲、高頻寬與全球覆蓋為核心特性。', 'sky', 'Satellite'),
    ('silicon-photonics', '網通衛星｜矽光子與 CPO (Silicon Photonics & CPO)', '矽光子與 CPO', '網通衛星', '半導體異質整合的尖端技術，將光通訊元件與邏輯晶片共同封裝。', 'sky', 'Radio'),
    ('networking-equipment', '網通衛星｜高速交換器與 WiFi 7 (Networking Equipment)', '網通設備', '網通衛星', '聚焦於 AI 資料中心高速交換器、WiFi 7 設備、5G/6G 接取設備及低軌衛星地面站。', 'sky', 'Network'),
    ('high-speed-optics', '網通衛星｜高速光收發模組 (High-Speed Transceiver)', '高速光模組', '網通衛星', '聚焦 AI 資料中心對 800G 與 1.6T 高速插拔式光收發模組的剛性升級需求。', 'sky', 'Radio'),
    ('mlcc-capacitor', '被動元件｜MLCC 電容', 'MLCC 電容', '被動元件', 'MLCC（積層陶瓷電容）因 AI 伺服器與電動車需求爆發，成為高成長焦點。', 'slate', 'Layers'),
    ('passive-inductor', '被動元件｜功率電感', '功率電感', '被動元件', '電感器是電源管理與 EMI 抑制的核心被動元件。', 'slate', 'Layers'),
    ('quartz-components', '被動元件｜石英頻率控制元件 (Quartz Frequency Control)', '石英頻率控制', '被動元件', '石英諧振器、振盪器與 SAW/BAW 濾波器。', 'slate', 'Waves'),
    ('passive-resistor', '被動元件｜電阻與被動保護元件 (Resistor & Passive Protection)', '電阻與被動保護', '被動元件', '晶片電阻、精密薄膜電阻與過電流保護元件。', 'slate', 'Layers'),
    ('cxl-technology', '記憶體｜CXL 記憶體池化 (Compute Express Link)', 'CXL 技術', '記憶體', '旨在解決 AI 運算中「記憶體牆」瓶頸的次世代開放互連協定。', 'indigo', 'Cpu'),
    ('hbm', '記憶體｜HBM 高頻寬記憶體供應鏈 (High Bandwidth Memory)', 'HBM 供應鏈', '記憶體', 'HBM 是 AI 伺服器的核心元件，透過 3D 堆疊技術大幅提升記憶體頻寬。', 'purple', 'Cpu'),
    ('niche-memory', '記憶體｜NOR Flash 與利基記憶體 (NOR Flash & Niche Memory)', 'NOR Flash/利基記憶體', '記憶體', '聚焦 NOR Flash 與利基型 DRAM。', 'purple', 'Cpu'),
    ('memory-modules', '記憶體｜記憶體模組 (Memory Modules)', '記憶體模組', '記憶體', '採購 DRAM 與 NAND Flash 晶片，進行封裝組裝、測試，並以自有品牌銷售。', 'cyan', 'HardDrive'),
    ('enterprise-saas', '軟體資安｜企業軟體與 SaaS (Enterprise SaaS)', '企業 SaaS', '軟體資安', '聚焦於具備自主研發能力、提供訂閱制 (SaaS) 或軟體授權的企業級應用。', 'sky', 'AppWindow'),
    ('it-si', '軟體資安｜系統整合與委外 (IT SI & Outsourcing)', '整合與委外', '軟體資安', '提供企業 IT 架構規劃、軟硬體整合專案及技術人力委外服務。', 'sky', 'Cpu'),
    ('cybersecurity', '軟體資安｜資安防護 (Cybersecurity)', '資安防護', '軟體資安', 'AI 驅動的網路攻擊激增、政府零信任政策強制推行。', 'red', 'Shield'),
    ('cloud-msp', '軟體資安｜雲端服務與代管 (Cloud & MSP)', '雲端與 MSP', '軟體資安', '涵蓋公有雲平台代理、雲端搬遷、MSP 託管服務與雲端算力代管。', 'sky', 'Cloud'),
    ('sic-gan-power', '電動車｜第三代半導體 (SiC/GaN Power)', '第三代半導體', '電動車', 'SiC 聚焦電動車 800V 與 AI 高壓直流架構，GaN 則商轉於 Wi-Fi 7 與衛星通訊。', 'emerald', 'Zap'),
    ('connector-automotive', '電動車｜車用連接器 (Automotive Connector)', '車用連接器', '電動車', '電動車高壓/大電流連接器、FAKRA/HSD 訊號線束與 EV 充電接頭。', 'emerald', 'CarFront'),
    ('automotive-ic', '電動車｜車載半導體與系統整合 (Automotive Semis & Systems)', '車用電子與系統', '電動車', '隨著電動車滲透率提升與 ADAS 技術進步，單車半導體價值大幅提升。', 'emerald', 'CarFront'),
    ('motor-drive-discrete', '電動車｜馬達驅動與離散功率元件 (Motor Drive & Discrete Power)', '馬達驅動與功率元件', '電動車', '聚焦於馬達驅動 IC 設計與離散功率元件製造。', 'emerald', 'Zap'),
    ('pcb-manufacturing', '電子零組件｜PCB 硬板製造', 'PCB 硬板製造', '電子零組件', '印刷電路板（PCB）是電子系統的物理骨架。', 'slate', 'Grid2x2'),
    ('precision-metal-casing', '電子零組件｜精密機構件 (Precision Metal Casing)', '精密機構件', '電子零組件', '涵蓋智慧型手機、筆記型電腦、AI 伺服器及電動車等終端裝置的高精度金屬機殼。', 'slate', 'Box'),
    ('fpc', '電子零組件｜軟板 (FPC)', '軟板', '電子零組件', '具備高撓曲性與輕薄特性的印刷電路板。', 'slate', 'Scroll'),
    ('connector', '電子零組件｜連接器 (Connector)', '連接器', '電子零組件', '標準型與客製化連接器，廣泛應用於消費性電子與工業設備。', 'slate', 'Plug'),
    ('psu', '電子零組件｜電源供應器 (Power Supply Unit)', '電源供應器', '電子零組件', '電子設備的核心動力來源，負責將交流電轉換為設備所需的直流電。', 'slate', 'BatteryCharging'),
    ('connector-highspeed', '電子零組件｜高速連接器 (High-Speed Connector)', '高速連接器', '電子零組件', 'CPU Socket、PCIe 高速連接器與 AI Server 高速線纜組件。', 'slate', 'Zap')
ON CONFLICT (topic_id) DO UPDATE SET
    name        = EXCLUDED.name,
    short_name  = EXCLUDED.short_name,
    group_name  = EXCLUDED.group_name,
    description = EXCLUDED.description,
    color       = EXCLUDED.color,
    icon        = EXCLUDED.icon,
    updated_at  = now();
