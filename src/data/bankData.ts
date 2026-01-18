import { BankContact, BankRedemptionInfo } from "@/types";

// Local interface matching the seed data structure
interface LocalBankContact {
    credit_system?: string;
    bank_name?: string;
    name?: string;
    branch?: string;
    email?: string;
    phone?: string;
}

export const BANK_CONTACTS: LocalBankContact[] = [
    { credit_system: "富邦", name: "俊平", email: "chunping.lee@fubon.com" },
    { credit_system: "富邦", name: "藝馨", email: "betty.fan@fubon.com" },
    { credit_system: "富邦", name: "演龍", email: "joe.wong@fubon.com" },
    { credit_system: "富邦", name: "昀成", email: "yuncheng.chen@fubon.com" },
    { credit_system: "富邦", name: "奕丞", email: "jerry.yc.lu@fubon.com" },
    { credit_system: "富邦", name: "慶餘", email: "edward.cy.liu@fubon.com" },
    { credit_system: "富邦", name: "橫綱", email: "hengkang.kuo@fubon.com" },
    { credit_system: "富邦", name: "耀升", email: "sheng.liu@fubon.com" },
    { credit_system: "台新", name: "吳瑋倫", email: "1121112@taishinbank.com.tw" },
    { credit_system: "台新", name: "維席", email: "Jeff.Chang@taishinbank.com.tw" },
    { credit_system: "渣打", name: "育菁", email: "Christine.Chang@sc.com" },
    { credit_system: "渣打", name: "詩昌", email: "Eddie.Hung@sc.com" },
    { credit_system: "匯豐", name: "于哲", email: "66335605twm@hsbc.com.tw" },
    { credit_system: "富邦壽", name: "董育婕", email: "yuchieh.tung@fubon.com" },
    { credit_system: "兆豐", name: "陶融", branch: "內科", email: "010134@megabank.com.tw" },
    { credit_system: "兆豐", name: "黃小姐", branch: "基隆", email: "007220@megabank.com.tw, 11148@megabank.com.tw, jinging@megabank.com.tw" },
    { credit_system: "兆豐", name: "施柏光", branch: "東內湖", email: "012895@megabank.com.tw, 010216@megabank.com.tw" },
    { credit_system: "兆豐", name: "劉芯妍", branch: "大安", email: "011216@megabank.com.tw" },
    { credit_system: "華南", name: "廖述正", branch: "潭美", email: "ralph.liao@hncb.com.tw" },
    { credit_system: "華南", name: "王麒雲", branch: "大同", email: "chitun.wang@hncb.com.tw" },
    { credit_system: "台銀", name: "陳永嘉", branch: "北投", email: "132846@mail.bot.com.tw, 台銀劍潭 劉先生 *233" },
    { credit_system: "玉山", name: "玉山南港", email: "michael-07969@esunbank.com, 143173@mail.bot.com.tw", branch: "chishanyang-08241@esunbank.com" },
    { credit_system: "上海", name: "huangcc@scsb.com.tw", branch: "bingchen@scsb.com.tw" },
    { credit_system: "永豐", name: "Vansary@sinopac.com", branch: "yuen0512@sinopac.com" },
    { credit_system: "國泰", name: "singing@cathaylife.com.tw", email: "singing0129@gmail.com", branch: "john031092@gmail.com" },
    { credit_system: "中信", name: "junwei.huang@ctbcbank.com", branch: "kuanping.lan@ctbcbank.com" },
    // Keeping existing mock data that wasn't in JSON but might be useful or generic
    { credit_system: "新光", name: "怡君", email: "T011686@skbank.com.tw" },
    { credit_system: "新光", name: "雨柔", email: "T013890@skbank.com.tw" },
    { credit_system: "國泰", name: "李佳憲", email: "cathaybk@cathaybk.com.tw" },
    { credit_system: "台銀", name: "放款", branch: "信義", email: "088656@mail.bot.com.tw" },
    { credit_system: "遠東", name: "雅惠", email: "sophia1020@feib.com.tw" },
    { credit_system: "中信", name: "作業", email: "callcenter.loan@ctbcbank.com" },
    { credit_system: "永豐", name: "作業", email: "008899@sinopac.com" },
    { credit_system: "玉山", name: "個金", email: "ESB10620@esunbank.com.tw" },
    { credit_system: "一銀", name: "消金", email: "i63013@firstbank.com.tw" },
    { credit_system: "農金", name: "客服", email: "service@agribank.com.tw" }
];

export const BANK_REDEMPTION_INFO: BankRedemptionInfo[] = [
    {
        bank_name: "台新",
        phone: "02-2182-1313#2#3#1#1",
        account_info: "99+ID",
        processing_days: "3個工作天",
        pickup_location: "建北(分行領/掛號)",
        requirements: "借款人雙證件+印章",
        notes: "傳真:02-5576-1888"
    },
    {
        "bank_name": "國泰",
        "phone": "02-8758-0115 (北區)",
        "account_info": "14+ID (分行)",
        "processing_days": "3個工作天",
        "pickup_location": "分行領取/總行掛號",
        "requirements": "清償證明申請書",
        "notes": "07-2623351 (南區)"
    },
    {
        "bank_name": "富邦",
        "phone": "02-8751-6665#9 (北區)",
        "account_info": "總行代墊專戶",
        "processing_days": "3-5個工作天",
        "pickup_location": "各分行",
        "requirements": "代償證明申請書",
        "notes": "客服分機轉9"
    }
];
