## 財經資料庫

### 台股



#### 回測基準 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|發行量加權股價報酬指數 | `data.get('benchmark_return:發行量加權股價報酬指數')`  | float |


#### 可轉換公司債成交資訊 vip
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|成交張數 | `data.get('cb_price:成交張數')`  | float |
|成交筆數 | `data.get('cb_price:成交筆數')`  | float |
|成交金額 | `data.get('cb_price:成交金額')`  | float |
|收盤價 | `data.get('cb_price:收盤價')`  | float |
|開盤價 | `data.get('cb_price:開盤價')`  | float |
|最低價 | `data.get('cb_price:最低價')`  | float |
|最高價 | `data.get('cb_price:最高價')`  | float |


#### 上市櫃變更交易 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|變更交易 | `data.get('change_transaction:變更交易')`  | int |
|分盤交易 | `data.get('change_transaction:分盤交易')`  | int |


#### 還原權值股價 free

FinLab 資料庫的還原股價是向後還原，這邊的「前後」是指時間上。FinLab 資料庫使用的方式，歷史資料不會被改動，適合用來回測。其他看盤軟體幾乎都是向前還原，所以您可能自然以為那個數字才是對的～而不管是向前還原，還是向後還原，最重要的是換算報酬的百分比是正確的，而非絕對數值喔～
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|adj_close | `data.get('etl:adj_close')`  | float |
|adj_open | `data.get('etl:adj_open')`  | float |
|adj_high | `data.get('etl:adj_high')`  | float |
|adj_low | `data.get('etl:adj_low')`  | float |


#### 排除處置股 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|disposal_stock_filter | `data.get('etl:disposal_stock_filter')`  | bool |


#### 大盤市況指標 vip
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|finlab_tw_stock_market_ind | `data.get('etl:finlab_tw_stock_market_ind')`  | float |



#### 排除全額交割股 free
官方資料更新時間緣故，若要使用此濾網，請每日早上0820後更新。
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|full_cash_delivery_stock_filter | `data.get('etl:full_cash_delivery_stock_filter')`  | bool |


#### 排除注意股 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|noticed_stock_filter | `data.get('etl:noticed_stock_filter')`  | bool |


#### 上市櫃盤中零股成交資訊 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|成交股數 | `data.get('intraday_odd_lot_trade:成交股數')`  | int |
|成交筆數 | `data.get('intraday_odd_lot_trade:成交筆數')`  | int |
|成交金額 | `data.get('intraday_odd_lot_trade:成交金額')`  | int |
|收盤價 | `data.get('intraday_odd_lot_trade:收盤價')`  | float |
|開盤價 | `data.get('intraday_odd_lot_trade:開盤價')`  | float |
|最低價 | `data.get('intraday_odd_lot_trade:最低價')`  | float |
|最高價 | `data.get('intraday_odd_lot_trade:最高價')`  | float |
|最後揭示買價 | `data.get('intraday_odd_lot_trade:最後揭示買價')`  | float |
|最後揭示賣價 | `data.get('intraday_odd_lot_trade:最後揭示賣價')`  | float |
|最後揭示買量 | `data.get('intraday_odd_lot_trade:最後揭示買量')`  | int |
|最後揭示賣量 | `data.get('intraday_odd_lot_trade:最後揭示賣量')`  | int |


#### 現股當沖成交資訊 free

出現在此資料的stock_id為可進行先買後賣現股當沖的標的。
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|當日沖銷交易成交股數 | `data.get('intraday_trading:當日沖銷交易成交股數')`  | float |
|當日沖銷交易買進成交金額 | `data.get('intraday_trading:當日沖銷交易買進成交金額')`  | float |
|當日沖銷交易賣出成交金額 | `data.get('intraday_trading:當日沖銷交易賣出成交金額')`  | float |
|得先賣後買當沖 | `data.get('intraday_trading:得先賣後買當沖')`  | int |


#### 整體市場當沖統計 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|當日沖銷交易總成交股數 | `data.get('intraday_trading_stat:當日沖銷交易總成交股數')`  | float |
|當日沖銷交易總成交股數占市場比重 | `data.get('intraday_trading_stat:當日沖銷交易總成交股數占市場比重')`  | float |
|當日沖銷交易總買進成交金額 | `data.get('intraday_trading_stat:當日沖銷交易總買進成交金額')`  | float |
|當日沖銷交易總買進成交金額占市場比重 | `data.get('intraday_trading_stat:當日沖銷交易總買進成交金額占市場比重')`  | float |
|當日沖銷交易總賣出成交金額 | `data.get('intraday_trading_stat:當日沖銷交易總賣出成交金額')`  | float |
|當日沖銷交易總賣出成交金額占市場比重 | `data.get('intraday_trading_stat:當日沖銷交易總賣出成交金額占市場比重')`  | float |


#### 上市、上櫃整體市場成交資訊 free

TAIEX為上市大盤加權指數成交資訊，OTC為櫃檯買賣指數成交資訊。
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|成交股數 | `data.get('market_transaction_info:成交股數')`  | float |
|成交金額 | `data.get('market_transaction_info:成交金額')`  | float |
|成交筆數 | `data.get('market_transaction_info:成交筆數')`  | float |
|收盤指數 | `data.get('market_transaction_info:收盤指數')`  | float |


#### 上市櫃市場成交資訊 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|成交股數 | `data.get('price:成交股數')`  | int |
|成交筆數 | `data.get('price:成交筆數')`  | int |
|成交金額 | `data.get('price:成交金額')`  | int |
|收盤價 | `data.get('price:收盤價')`  | float |
|開盤價 | `data.get('price:開盤價')`  | float |
|最低價 | `data.get('price:最低價')`  | float |
|最高價 | `data.get('price:最高價')`  | float |
|最後揭示買價 | `data.get('price:最後揭示買價')`  | float |
|最後揭示賣價 | `data.get('price:最後揭示賣價')`  | float |


#### 隔天開盤參考價 free

|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|收盤價 | `data.get('reference_price')`  | float |
|漲停價 | `data.get('reference_price')`  | float |
|跌停價 | `data.get('reference_price')`  | float |


#### 興櫃市場成交資訊 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|成交股數 | `data.get('rotc_price:成交股數')`  | float |
|成交金額 | `data.get('rotc_price:成交金額')`  | float |
|開盤價 | `data.get('rotc_price:開盤價')`  | float |
|收盤價 | `data.get('rotc_price:收盤價')`  | float |
|最高價 | `data.get('rotc_price:最高價')`  | float |
|最低價 | `data.get('rotc_price:最低價')`  | float |
|日均價 | `data.get('rotc_price:日均價')`  | float |
|成交筆數 | `data.get('rotc_price:成交筆數')`  | float |
|最後揭示買價 | `data.get('rotc_price:最後揭示買價')`  | float |
|最後揭示賣價 | `data.get('rotc_price:最後揭示賣價')`  | float |


#### 指數資訊 free

若需要用到上市櫃各類股、主題指數的收盤指數，請從此資料查詢。
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|收盤指數 | `data.get('stock_index_price:收盤指數')`  | float |
|漲跌百分比(%) | `data.get('stock_index_price:漲跌百分比(%)')`  | float |


#### 指數成交量資訊 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|成交股數 | `data.get('stock_index_vol:成交股數')`  | int |
|成交金額 | `data.get('stock_index_vol:成交金額')`  | float |
|成交筆數 | `data.get('stock_index_vol:成交筆數')`  | int |


#### 發行量加權股價指數歷史資料 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|開盤指數 | `data.get('taiex_total_index:開盤指數')`  | float |
|最高指數 | `data.get('taiex_total_index:最高指數')`  | float |
|最低指數 | `data.get('taiex_total_index:最低指數')`  | float |
|收盤指數 | `data.get('taiex_total_index:收盤指數')`  | float |


#### 董事會決擬議分配股利公告 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|決議（擬議）進度 | `data.get('board_dividend_announcement')`  | str |
|董事會決議（擬議）股利分派日 | `data.get('board_dividend_announcement')`  | datetime |
|期別 | `data.get('board_dividend_announcement')`  | str |
|股東會日期 | `data.get('board_dividend_announcement')`  | datetime |
|期初未分配盈餘/待彌補虧損(元) | `data.get('board_dividend_announcement')`  | int |
|本期淨利(淨損)(元) | `data.get('board_dividend_announcement')`  | int |
|可分配盈餘(元) | `data.get('board_dividend_announcement')`  | int |
|分配後期末未分配盈餘(元) | `data.get('board_dividend_announcement')`  | int |
|盈餘分配之現金股利(元/股) | `data.get('board_dividend_announcement')`  | float |
|法定盈餘公積發放之現金(元/股) | `data.get('board_dividend_announcement')`  | float |
|資本公積發放之現金(元/股) | `data.get('board_dividend_announcement')`  | float |
|股東配發之現金(股利)總金額(元) | `data.get('board_dividend_announcement')`  | int |
|盈餘轉增資配股(元/股) | `data.get('board_dividend_announcement')`  | float |
|法定盈餘公積轉增資配股(元/股) | `data.get('board_dividend_announcement')`  | float |
|資本公積轉增資配股(元/股) | `data.get('board_dividend_announcement')`  | float |
|股東配股總股數(股) | `data.get('board_dividend_announcement')`  | int |
|摘錄公司章程-股利分派部分 | `data.get('board_dividend_announcement')`  | str |
|備註 | `data.get('board_dividend_announcement')`  | str |
|證券名稱 | `data.get('board_dividend_announcement')`  | str |


#### 上櫃減資 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|恢復買賣日期 | `data.get('capital_reduction_otc:恢復買賣日期')`  | str |
|減資原因 | `data.get('capital_reduction_otc:減資原因')`  | str |
|開始交易基準價 | `data.get('capital_reduction_otc:開始交易基準價')`  | float |
|最後交易之收盤價格 | `data.get('capital_reduction_otc:最後交易之收盤價格')`  | float |
|減資恢復買賣開始日參考價格 | `data.get('capital_reduction_otc:減資恢復買賣開始日參考價格')`  | float |
|漲停價格 | `data.get('capital_reduction_otc:漲停價格')`  | float |
|跌停價格 | `data.get('capital_reduction_otc:跌停價格')`  | float |
|除權參考價 | `data.get('capital_reduction_otc:除權參考價')`  | float |
|otc_cap_divide_ratio | `data.get('capital_reduction_otc:otc_cap_divide_ratio')`  | float |


#### 上市減資 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|恢復買賣日期 | `data.get('capital_reduction_tse:恢復買賣日期')`  | datetime |
|減資原因 | `data.get('capital_reduction_tse:減資原因')`  | str |
|恢復買賣參考價 | `data.get('capital_reduction_tse:恢復買賣參考價')`  | float |
|停止買賣前收盤價格 | `data.get('capital_reduction_tse:停止買賣前收盤價格')`  | float |
|漲停價格 | `data.get('capital_reduction_tse:漲停價格')`  | float |
|跌停價格 | `data.get('capital_reduction_tse:跌停價格')`  | float |
|開盤競價基準 | `data.get('capital_reduction_tse:開盤競價基準')`  | float |
|除權參考價 | `data.get('capital_reduction_tse:除權參考價')`  | float |
|twse_cap_divide_ratio | `data.get('capital_reduction_tse:twse_cap_divide_ratio')`  | float |


#### 可轉換公司債發行資訊 vip

原始發行總額、上月底發行餘額的單位為「元」。可轉債每股面額為100，每張面額為100000，每張面額\*發行張數=原始發行總額。
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|債券簡稱 | `data.get('cb_published_info')`  | str |
|轉換起日 | `data.get('cb_published_info')`  | datetime |
|轉換迄日 | `data.get('cb_published_info')`  | datetime |
|轉換價格 | `data.get('cb_published_info')`  | float |
|下次轉換價格生效日期 | `data.get('cb_published_info')`  | datetime |
|最近賣回權起日 | `data.get('cb_published_info')`  | datetime |
|最近賣回權迄日 | `data.get('cb_published_info')`  | datetime |
|最近賣回權價格 | `data.get('cb_published_info')`  | float |
|強制贖回起日 | `data.get('cb_published_info')`  | datetime |
|強制贖回迄日 | `data.get('cb_published_info')`  | datetime |
|強制贖回價格 | `data.get('cb_published_info')`  | float |
|終止櫃檯買賣日 | `data.get('cb_published_info')`  | datetime |
|原始發行總額 | `data.get('cb_published_info')`  | int |
|上月底發行餘額 | `data.get('cb_published_info')`  | int |
|轉債參考價格 | `data.get('cb_published_info')`  | float |
|轉換標的股票價格 | `data.get('cb_published_info')`  | float |
|停止交易起日 | `data.get('cb_published_info')`  | datetime |
|停止交易迄日 | `data.get('cb_published_info')`  | datetime |
|票面利率 | `data.get('cb_published_info')`  | float |


#### 企業基本資訊 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|公司簡稱| `data.get('company_basic_info')`  | str |
|公司名稱 | `data.get('company_basic_info')`  | str |
|產業類別 | `data.get('company_basic_info')`  | str |
|外國企業註冊地國 | `data.get('company_basic_info')`  | str |
|住址 | `data.get('company_basic_info')`  | str |
|營利事業統一編號 | `data.get('company_basic_info')`  | str |
|董事長 | `data.get('company_basic_info')`  | str |
|總經理 | `data.get('company_basic_info')`  | str |
|發言人 | `data.get('company_basic_info')`  | str |
|發言人職稱 | `data.get('company_basic_info')`  | str |
|代理發言人 | `data.get('company_basic_info')`  | str |
|總機電話 | `data.get('company_basic_info')`  | str |
|成立日期 | `data.get('company_basic_info')`  | str |
|上市日期 | `data.get('company_basic_info')`  | str |
|普通股每股面額 | `data.get('company_basic_info')`  | str |
|實收資本額(元) | `data.get('company_basic_info')`  | int |
|已發行普通股數或TDR原發行股數 | `data.get('company_basic_info')`  | int |
|私募普通股(股) | `data.get('company_basic_info')`  | int |
|特別股(股) | `data.get('company_basic_info')`  | int |
|編製財務報告類型 | `data.get('company_basic_info')`  | str |
|普通股盈餘分派或虧損撥補頻率 | `data.get('company_basic_info')`  | str |
|普通股年度(含第4季或後半年度)現金股息及紅利決議層級 | `data.get('company_basic_info')`  | str |
|股票過戶機構 | `data.get('company_basic_info')`  | str |
|過戶電話 | `data.get('company_basic_info')`  | str |
|過戶地址 | `data.get('company_basic_info')`  | str |
|簽證會計師事務所 | `data.get('company_basic_info')`  | str |
|簽證會計師1 | `data.get('company_basic_info')`  | str |
|簽證會計師2 | `data.get('company_basic_info')`  | str |
|英文簡稱 | `data.get('company_basic_info')`  | str |
|英文通訊地址 | `data.get('company_basic_info')`  | str |
|傳真機號碼 | `data.get('company_basic_info')`  | str |
|電子郵件信箱 | `data.get('company_basic_info')`  | str |
|公司網址 | `data.get('company_basic_info')`  | str |
|投資人關係聯絡人 | `data.get('company_basic_info')`  | str |
|投資人關係聯絡人職稱 | `data.get('company_basic_info')`  | str |
|投資人關係聯絡電話 | `data.get('company_basic_info')`  | str |
|投資人關係聯絡電子郵件 | `data.get('company_basic_info')`  | str |
|公司網站內利害關係人專區網址 | `data.get('company_basic_info')`  | str |
|市場別 | `data.get('company_basic_info')`  | str |
|上櫃日期 | `data.get('company_basic_info')`  | str |
|興櫃日期 | `data.get('company_basic_info')`  | str |


#### 企業主要經營業務 free

|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|公司名稱| `data.get('company_main_business')`  | str |
|主要經營業務 | `data.get('company_main_business')`  | str |


#### 下市、下櫃之公司 free

|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|公司名稱| `data.get('delisted_companies')`  | str |
|住址 | `data.get('delisted_companies')`  | str |
|營利事業統一編號 | `data.get('delisted_companies')`  | str |
|董事長 | `data.get('delisted_companies')`  | str |
|總經理 | `data.get('delisted_companies')`  | str |
|發言人 | `data.get('delisted_companies')`  | str |
|發言人職稱 | `data.get('delisted_companies')`  | str |
|代理發言人 | `data.get('delisted_companies')`  | str |
|總機電話 | `data.get('delisted_companies')`  | str |
|成立日期 | `data.get('delisted_companies')`  | datetime |
|上市日期 | `data.get('delisted_companies')`  | datetime |
|下市日期 | `data.get('delisted_companies')`  | datetime |
|實收資本額 | `data.get('delisted_companies')`  | str |
|股票過戶機構 | `data.get('delisted_companies')`  | str |
|過戶電話 | `data.get('delisted_companies')`  | str |
|產業類別 | `data.get('delisted_companies')`  | str |
|市場別 | `data.get('delisted_companies')`  | str |
|上櫃日期 | `data.get('delisted_companies')`  | datetime |
|下櫃日期 | `data.get('delisted_companies')`  | datetime |
|stock_id | `data.get('delisted_companies')`  | str |


#### 終止上櫃公司 free

|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|公司名稱| `data.get('delisted_companies_otc')`  | str |
|備註 | `data.get('delisted_companies_otc')`  | str |
|下櫃轉上市 | `data.get('delisted_companies_otc')`  | str |


#### 終止上市公司 free

|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|公司名稱| `data.get('delisted_companies_tse')`  | str |


#### 上櫃除權息 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|除權息前收盤價 | `data.get('dividend_otc:除權息前收盤價')`  | float |
|除權息參考價 | `data.get('dividend_otc:除權息參考價')`  | float |
|權值 | `data.get('dividend_otc:權值')`  | float |
|息值 | `data.get('dividend_otc:息值')`  | float |
|權+息值 | `data.get('dividend_otc:權+息值')`  | float |
|權息 | `data.get('dividend_otc:權息')`  | float |
|漲停價格 | `data.get('dividend_otc:漲停價格')`  | float |
|跌停價格 | `data.get('dividend_otc:跌停價格')`  | float |
|開盤競價基準 | `data.get('dividend_otc:開盤競價基準')`  | float |
|減除股利參考價 | `data.get('dividend_otc:減除股利參考價')`  | float |
|現金股利 | `data.get('dividend_otc:現金股利')`  | float |
|每千股無償配股 | `data.get('dividend_otc:每千股無償配股')`  | float |
|現金增資股數 | `data.get('dividend_otc:現金增資股數')`  | float |
|現金增資認購價 | `data.get('dividend_otc:現金增資認購價')`  | float |
|公開承銷股數 | `data.get('dividend_otc:公開承銷股數')`  | float |
|員工認購股數 | `data.get('dividend_otc:員工認購股數')`  | float |
|原股東認購數 | `data.get('dividend_otc:原股東認購數')`  | float |
|按持股比例千股認購 | `data.get('dividend_otc:按持股比例千股認購')`  | float |
|otc_divide_ratio | `data.get('dividend_otc:otc_divide_ratio')`  | float |


#### 上市除權息 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|除權息前收盤價 | `data.get('dividend_tse:除權息前收盤價')`  | float |
|除權息參考價 | `data.get('dividend_tse:除權息參考價')`  | float |
|權值+息值 | `data.get('dividend_tse:權值+息值')`  | float |
|權息 | `data.get('dividend_tse:權息')`  | str |
|漲停價格 | `data.get('dividend_tse:漲停價格')`  | float |
|跌停價格 | `data.get('dividend_tse:跌停價格')`  | float |
|開盤競價基準 | `data.get('dividend_tse:開盤競價基準')`  | float |
|減除股利參考價 | `data.get('dividend_tse:減除股利參考價')`  | float |
|詳細資料 | `data.get('dividend_tse:詳細資料')`  | str |
|最近一次申報資料 季別日期 | `data.get('dividend_tse:最近一次申報資料 季別日期')`  | str |
|最近一次申報每股 (單位)淨值 | `data.get('dividend_tse:最近一次申報每股 (單位)淨值')`  | float |
|最近一次申報每股 (單位)盈餘 | `data.get('dividend_tse:最近一次申報每股 (單位)盈餘')`  | float |
|twse_divide_ratio | `data.get('dividend_tse:twse_divide_ratio')`  | float |


#### 財報截止日 free
|資料名稱 | 用方法  型態 |
| -- | -- | -- |
|financial_statements_deadline | `data.get('etl:financial_statements_deadline')`  | datetime |


#### 財報電子檔上傳日 free
|資料名稱 | 用方法  型態 |
| -- | -- | -- |
|financial_statements_disclosure_dates | `data.get('etl:financial_statements_disclosure_dates')`  | datetime |


#### 個股市值 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|market_value | `data.get('etl:market_value')`  | float |


#### 財報 free

因應IFRS會計新制，財報資料目前僅提供2013-Q1後的資料，方便比較。一般公司的季別/財報截止日對應為：{'Q1':'5-15','Q2':'8-14','Q3':'11-14','Q4':'3-31'}。金融業的季別/財報截止日對應為：{'Q1':'5-15','Q2':'8-31','Q3':'11-14','Q4':'3-31'}。保險業的季別/財報截止日對應為：{'Q1':'4-30','Q2':'8-31','Q3':'10-31','Q4':'3-31'}。2021年後KY股因監管法規改變，Q2截止日為|8-31  止 假日則遞延到下一個交易日。若欲將索引格式轉為財報電子檔上傳日，可使用下列方法，`data.get('financial_statement:現金及約當現金').index_str_to_date()`。若欲將索引格式轉為財報截止日，可使用下列方法，`data.get('financial_statement:現金及約當現金').deadline()`。

|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|現金及約當現金 | `data.get('financial_statement:現金及約當現金')`  | float |
|透過損益按公允價值衡量之金融資產_流動 | `data.get('financial_statement:透過損益按公允價值衡量之金融資產_流動')`  | float |
|透過其他綜合損益按公允價值衡量之金融資產_流動 | `data.get('financial_statement:透過其他綜合損益按公允價值衡量之金融資產_流動')`  | float |
|按攤銷後成本衡量之金融資產_流動 | `data.get('financial_statement:按攤銷後成本衡量之金融資產_流動')`  | float |
|避險之金融資產_流動 | `data.get('financial_statement:避險之金融資產_流動')`  | float |
|合約資產_流動 | `data.get('financial_statement:合約資產_流動')`  | float |
|應收帳款及票據 | `data.get('financial_statement:應收帳款及票據')`  | float |
|其他應收款 | `data.get('financial_statement:其他應收款')`  | float |
|存貨 | `data.get('financial_statement:存貨')`  | float |
|待出售非流動資產 | `data.get('financial_statement:待出售非流動資產')`  | float |
|當期所得稅資產_流動 | `data.get('financial_statement:當期所得稅資產_流動')`  | float |
|其他流動資產 | `data.get('financial_statement:其他流動資產')`  | float |
|流動資產 | `data.get('financial_statement:流動資產')`  | float |
|透過損益按公允價值衡量之金融資產_非流動 | `data.get('financial_statement:透過損益按公允價值衡量之金融資產_非流動')`  | float |
|透過其他綜合損益按公允價值衡量之金融資產_非流動 | `data.get('financial_statement:透過其他綜合損益按公允價值衡量之金融資產_非流動')`  | float |
|按攤銷後成本衡量之金融資產_非流動 | `data.get('financial_statement:按攤銷後成本衡量之金融資產_非流動')`  | float |
|避險之金融資產_非流動 | `data.get('financial_statement:避險之金融資產_非流動')`  | float |
|合約資產_非流動 | `data.get('financial_statement:合約資產_非流動')`  | float |
|採權益法之長期股權投資 | `data.get('financial_statement:採權益法之長期股權投資')`  | float |
|預付投資款 | `data.get('financial_statement:預付投資款')`  | float |
|不動產廠房及設備 | `data.get('financial_statement:不動產廠房及設備')`  | float |
|商譽及無形資產合計 | `data.get('financial_statement:商譽及無形資產合計')`  | float |
|遞延所得稅資產 | `data.get('financial_statement:遞延所得稅資產')`  | float |
|遞延資產合計 | `data.get('financial_statement:遞延資產合計')`  | float |
|使用權資產 | `data.get('financial_statement:使用權資產')`  | float |
|投資性不動產淨額 | `data.get('financial_statement:投資性不動產淨額')`  | float |
|其他非流動資產 | `data.get('financial_statement:其他非流動資產')`  | float |
|非流動資產 | `data.get('financial_statement:非流動資產')`  | float |
|資產總額 | `data.get('financial_statement:資產總額')`  | float |
|短期借款 | `data.get('financial_statement:短期借款')`  | float |
|應付商業本票∕承兌匯票 | `data.get('financial_statement:應付商業本票∕承兌匯票')`  | float |
|透過損益按公允價值衡量之金融負債_流動 | `data.get('financial_statement:透過損益按公允價值衡量之金融負債_流動')`  | float |
|避險之金融負債_流動 | `data.get('financial_statement:避險之金融負債_流動')`  | float |
|按攤銷後成本衡量之金融負債_流動 | `data.get('financial_statement:按攤銷後成本衡量之金融負債_流動')`  | float |
|合約負債_流動 | `data.get('financial_statement:合約負債_流動')`  | float |
|應付帳款及票據 | `data.get('financial_statement:應付帳款及票據')`  | float |
|其他應付款 | `data.get('financial_statement:其他應付款')`  | float |
|當期所得稅負債 | `data.get('financial_statement:當期所得稅負債')`  | float |
|負債準備_流動 | `data.get('financial_statement:負債準備_流動')`  | float |
|與待出售非流動資產直接相關之負債 | `data.get('financial_statement:與待出售非流動資產直接相關之負債')`  | float |
|租賃負債─流動 | `data.get('financial_statement:租賃負債─流動')`  | float |
|一年內到期長期負債 | `data.get('financial_statement:一年內到期長期負債')`  | float |
|特別股負債_流動 | `data.get('financial_statement:特別股負債_流動')`  | float |
|流動負債 | `data.get('financial_statement:流動負債')`  | float |
|透過損益按公允價值衡量之金融負債_非流動 | `data.get('financial_statement:透過損益按公允價值衡量之金融負債_非流動')`  | float |
|避險之金融負債_非流動 | `data.get('financial_statement:避險之金融負債_非流動')`  | float |
|按攤銷後成本衡量之金融負債_非流動 | `data.get('financial_statement:按攤銷後成本衡量之金融負債_非流動')`  | float |
|合約負債_非流動 | `data.get('financial_statement:合約負債_非流動')`  | float |
|特別股負債_非流動 | `data.get('financial_statement:特別股負債_非流動')`  | float |
|應付公司債_非流動 | `data.get('financial_statement:應付公司債_非流動')`  | float |
|銀行借款_非流動 | `data.get('financial_statement:銀行借款_非流動')`  | float |
|租賃負債_非流動 | `data.get('financial_statement:租賃負債_非流動')`  | float |
|負債準備_非流動 | `data.get('financial_statement:負債準備_非流動')`  | float |
|遞延貸項 | `data.get('financial_statement:遞延貸項')`  | float |
|應計退休金負債 | `data.get('financial_statement:應計退休金負債')`  | float |
|遞延所得稅 | `data.get('financial_statement:遞延所得稅')`  | float |
|非流動負債 | `data.get('financial_statement:非流動負債')`  | float |
|負債總額 | `data.get('financial_statement:負債總額')`  | float |
|普通股股本 | `data.get('financial_statement:普通股股本')`  | float |
|特別股股本 | `data.get('financial_statement:特別股股本')`  | float |
|預收股款 | `data.get('financial_statement:預收股款')`  | float |
|待分配股票股利 | `data.get('financial_statement:待分配股票股利')`  | float |
|換股權利證書 | `data.get('financial_statement:換股權利證書')`  | float |
|股本 | `data.get('financial_statement:股本')`  | float |
|資本公積合計 | `data.get('financial_statement:資本公積合計')`  | float |
|法定盈餘公積 | `data.get('financial_statement:法定盈餘公積')`  | float |
|未分配盈餘 | `data.get('financial_statement:未分配盈餘')`  | float |
|保留盈餘 | `data.get('financial_statement:保留盈餘')`  | float |
|其他權益 | `data.get('financial_statement:其他權益')`  | float |
|庫藏股票帳面值 | `data.get('financial_statement:庫藏股票帳面值')`  | float |
|母公司股東權益合計 | `data.get('financial_statement:母公司股東權益合計')`  | float |
|共同控制下前手權益 | `data.get('financial_statement:共同控制下前手權益')`  | float |
|合併前非屬共同控制股權 | `data.get('financial_statement:合併前非屬共同控制股權')`  | float |
|非控制權益 | `data.get('financial_statement:非控制權益')`  | float |
|股東權益總額 | `data.get('financial_statement:股東權益總額')`  | float |
|負債及股東權益總額 | `data.get('financial_statement:負債及股東權益總額')`  | float |
|營業收入淨額 | `data.get('financial_statement:營業收入淨額')`  | float |
|營業成本 | `data.get('financial_statement:營業成本')`  | float |
|營業毛利 | `data.get('financial_statement:營業毛利')`  | float |
|營業費用 | `data.get('financial_statement:營業費用')`  | float |
|研究發展費 | `data.get('financial_statement:研究發展費')`  | float |
|推銷費用 | `data.get('financial_statement:推銷費用')`  | float |
|管理費用 | `data.get('financial_statement:管理費用')`  | float |
|預期信用減損_損失_利益_營業費用 | `data.get('financial_statement:預期信用減損_損失_利益_營業費用')`  | float |
|其他收益及費損淨額 | `data.get('financial_statement:其他收益及費損淨額')`  | float |
|營業利益 | `data.get('financial_statement:營業利益')`  | float |
|財務成本 | `data.get('financial_statement:財務成本')`  | float |
|採權益法之關聯企業及合資損益之份額 | `data.get('financial_statement:採權益法之關聯企業及合資損益之份額')`  | float |
|營業外收入及支出 | `data.get('financial_statement:營業外收入及支出')`  | float |
|稅前淨利 | `data.get('financial_statement:稅前淨利')`  | float |
|所得稅費用 | `data.get('financial_statement:所得稅費用')`  | float |
|繼續營業單位損益 | `data.get('financial_statement:繼續營業單位損益')`  | float |
|停業單位損益 | `data.get('financial_statement:停業單位損益')`  | float |
|合併前非屬共同控制股權損益 | `data.get('financial_statement:合併前非屬共同控制股權損益')`  | float |
|合併總損益 | `data.get('financial_statement:合併總損益')`  | float |
|本期綜合損益總額 | `data.get('financial_statement:本期綜合損益總額')`  | float |
|歸屬母公司淨利_損 | `data.get('financial_statement:歸屬母公司淨利_損')`  | float |
|歸屬非控制權益淨利_損 | `data.get('financial_statement:歸屬非控制權益淨利_損')`  | float |
|歸屬共同控制下前手權益淨利_損 | `data.get('financial_statement:歸屬共同控制下前手權益淨利_損')`  | float |
|綜合損益歸屬母公司 | `data.get('financial_statement:綜合損益歸屬母公司')`  | float |
|綜合損益歸屬非控制權益 | `data.get('financial_statement:綜合損益歸屬非控制權益')`  | float |
|綜合損益歸屬共同控制下前手權益 | `data.get('financial_statement:綜合損益歸屬共同控制下前手權益')`  | float |
|每股盈餘 | `data.get('financial_statement:每股盈餘')`  | float |
|繼續營業單位稅前淨利_淨損 | `data.get('financial_statement:繼續營業單位稅前淨利_淨損')`  | float |
|本期稅前淨利_淨損 | `data.get('financial_statement:本期稅前淨利_淨損')`  | float |
|折舊費用 | `data.get('financial_statement:折舊費用')`  | float |
|攤銷費用 | `data.get('financial_statement:攤銷費用')`  | float |
|呆帳費用提列_轉列收入_數 | `data.get('financial_statement:呆帳費用提列_轉列收入_數')`  | float |
|透過損益按公允價值衡量金融資產及負債之淨損失_利益 | `data.get('financial_statement:透過損益按公允價值衡量金融資產及負債之淨損失_利益')`  | float |
|利息費用 | `data.get('financial_statement:利息費用')`  | float |
|利息收入 | `data.get('financial_statement:利息收入')`  | float |
|股利收入 | `data.get('financial_statement:股利收入')`  | float |
|採用權益法認列之關聯企業及合資損失_利益_之份額 | `data.get('financial_statement:採用權益法認列之關聯企業及合資損失_利益_之份額')`  | float |
|處分及報廢不動產_廠房及設備損失_利益 | `data.get('financial_statement:處分及報廢不動產_廠房及設備損失_利益')`  | float |
|處分無形資產損失_利益 | `data.get('financial_statement:處分無形資產損失_利益')`  | float |
|處分投資損失_利益 | `data.get('financial_statement:處分投資損失_利益')`  | float |
|非金融資產減損迴轉利益 | `data.get('financial_statement:非金融資產減損迴轉利益')`  | float |
|未實現銷貨利益_損失 | `data.get('financial_statement:未實現銷貨利益_損失')`  | float |
|已實現銷貨損失_利益 | `data.get('financial_statement:已實現銷貨損失_利益')`  | float |
|未實現外幣兌換損失_利益 | `data.get('financial_statement:未實現外幣兌換損失_利益')`  | float |
|收益費損項目合計 | `data.get('financial_statement:收益費損項目合計')`  | float |
|應收帳款_增加_減少 | `data.get('financial_statement:應收帳款_增加_減少')`  | float |
|應收帳款_關係人_增加_減少 | `data.get('financial_statement:應收帳款_關係人_增加_減少')`  | float |
|存貨_增加_減少 | `data.get('financial_statement:存貨_增加_減少')`  | float |
|與營業活動相關之資產之淨變動合計 | `data.get('financial_statement:與營業活動相關之資產之淨變動合計')`  | float |
|應付帳款增加_減少 | `data.get('financial_statement:應付帳款增加_減少')`  | float |
|應付帳款_關係人增加_減少 | `data.get('financial_statement:應付帳款_關係人增加_減少')`  | float |
|與營業活動相關之負債之淨變動合計 | `data.get('financial_statement:與營業活動相關之負債之淨變動合計')`  | float |
|營運產生之現金流入_流出 | `data.get('financial_statement:營運產生之現金流入_流出')`  | float |
|退還_支付_之所得稅 | `data.get('financial_statement:退還_支付_之所得稅')`  | float |
|營業活動之淨現金流入_流出 | `data.get('financial_statement:營業活動之淨現金流入_流出')`  | float |
|取得透過其他綜合損益按公允價值衡量之金融資產 | `data.get('financial_statement:取得透過其他綜合損益按公允價值衡量之金融資產')`  | float |
|處分透過其他綜合損益按公允價值衡量之金融資產 | `data.get('financial_statement:處分透過其他綜合損益按公允價值衡量之金融資產')`  | float |
|取得不動產_廠房及設備 | `data.get('financial_statement:取得不動產_廠房及設備')`  | float |
|處分不動產_廠房及設備 | `data.get('financial_statement:處分不動產_廠房及設備')`  | float |
|取得無形資產 | `data.get('financial_statement:取得無形資產')`  | float |
|處分無形資產 | `data.get('financial_statement:處分無形資產')`  | float |
|收取之利息 | `data.get('financial_statement:收取之利息')`  | float |
|收取之股利 | `data.get('financial_statement:收取之股利')`  | float |
|其他投資活動 | `data.get('financial_statement:其他投資活動')`  | float |
|投資活動之淨現金流入_流出 | `data.get('financial_statement:投資活動之淨現金流入_流出')`  | float |
|短期借款增加 | `data.get('financial_statement:短期借款增加')`  | float |
|短期借款減少 | `data.get('financial_statement:短期借款減少')`  | float |
|應付短期票券增加 | `data.get('financial_statement:應付短期票券增加')`  | float |
|應付短期票券減少 | `data.get('financial_statement:應付短期票券減少')`  | float |
|發行公司債 | `data.get('financial_statement:發行公司債')`  | float |
|償還公司債 | `data.get('financial_statement:償還公司債')`  | float |
|舉借長期借款 | `data.get('financial_statement:舉借長期借款')`  | float |
|償還長期借款 | `data.get('financial_statement:償還長期借款')`  | float |
|存入保證金增加 | `data.get('financial_statement:存入保證金增加')`  | float |
|存入保證金減少 | `data.get('financial_statement:存入保證金減少')`  | float |
|發放現金股利 | `data.get('financial_statement:發放現金股利')`  | float |
|支付之利息 | `data.get('financial_statement:支付之利息')`  | float |
|籌資活動之淨現金流入_流出 | `data.get('financial_statement:籌資活動之淨現金流入_流出')`  | float |
|本期現金及約當現金增加_減少_數 | `data.get('financial_statement:本期現金及約當現金增加_減少_數')`  | float |
|期初現金及約當現金餘額 | `data.get('financial_statement:期初現金及約當現金餘額')`  | float |
|期末現金及約當現金餘額 | `data.get('financial_statement:期末現金及約當現金餘額')`  | float |
|資產負債表帳列之現金及約當現金 | `data.get('financial_statement:資產負債表帳列之現金及約當現金')`  | float |


#### 財報電子檔上傳紀錄 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|upload_date | `data.get('financial_statements_upload_detail:upload_date')`  | datetime |
|correction | `data.get('financial_statements_upload_detail:correction')`  | str |


#### 財務指標 free  

指標皆為單季數值，成長率為年增率。一般公司的季別/財報截止日對應：{'Q1':'5-15','Q2':'8-14','Q3':'11-14','Q4':'3-31'}。金融業的季別/財報截止日對應為：{'Q1':'5-15', 2':'8-31','Q3':'11-14','Q4':'3-31'}。保險業的季別/財報截止日對應為：{'Q1':'4-30','Q2':'8-31','Q3':'10-31','Q4':'3-31'}。2021年後KY股因監管法規改變，Q2截止日為|8-31。截止日遇假日則遞延到下一個  日。若欲將索引格式轉為財報電子檔上傳日，可使用下列方法|，`data.get('fundamental_features:營業利益').index_str_to_date()`。若欲將索引格式轉為財報截止日，可使用下列方法，`data. t('fundamental_features:營業利益').deadline()`。

|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|營業利益 | `data.get('fundamental_features:營業利益')`  | float |
|EBITDA | `data.get('fundamental_features:EBITDA')`  | float |
|營運現金流 | `data.get('fundamental_features:營運現金流')`  | float |
|歸屬母公司淨利 | `data.get('fundamental_features:歸屬母公司淨利')`  | float |
|折舊 | `data.get('fundamental_features:折舊')`  | float |
|流動資產 | `data.get('fundamental_features:流動資產')`  | float |
|流動負債 | `data.get('fundamental_features:流動負債')`  | float |
|取得不動產廠房及設備 | `data.get('fundamental_features:取得不動產廠房及設備')`  | float |
|經常稅後淨利 | `data.get('fundamental_features:經常稅後淨利')`  | float |
|ROA稅後息前 | `data.get('fundamental_features:ROA稅後息前')`  | float |
|ROA綜合損益 | `data.get('fundamental_features:ROA綜合損益')`  | float |
|ROE稅後 | `data.get('fundamental_features:ROE稅後')`  | float |
|ROE綜合損益 | `data.get('fundamental_features:ROE綜合損益')`  | float |
|稅前息前折舊前淨利率 | `data.get('fundamental_features:稅前息前折舊前淨利率')`  | float |
|營業毛利率 | `data.get('fundamental_features:營業毛利率')`  | float |
|營業利益率 | `data.get('fundamental_features:營業利益率')`  | float |
|稅前淨利率 | `data.get('fundamental_features:稅前淨利率')`  | float |
|稅後淨利率 | `data.get('fundamental_features:稅後淨利率')`  | float |
|業外收支營收率 | `data.get('fundamental_features:業外收支營收率')`  | float |
|貝里比率 | `data.get('fundamental_features:貝里比率')`  | float |
|營業費用率 | `data.get('fundamental_features:營業費用率')`  | float |
|推銷費用率 | `data.get('fundamental_features:推銷費用率')`  | float |
|管理費用率 | `data.get('fundamental_features:管理費用率')`  | float |
|研究發展費用率 | `data.get('fundamental_features:研究發展費用率')`  | float |
|現金流量比率 | `data.get('fundamental_features:現金流量比率')`  | float |
|稅率 | `data.get('fundamental_features:稅率')`  | float |
|每股營業額 | `data.get('fundamental_features:每股營業額')`  | float |
|每股營業利益 | `data.get('fundamental_features:每股營業利益')`  | float |
|每股現金流量 | `data.get('fundamental_features:每股現金流量')`  | float |
|每股稅前淨利 | `data.get('fundamental_features:每股稅前淨利')`  | float |
|每股綜合損益 | `data.get('fundamental_features:每股綜合損益')`  | float |
|每股稅後淨利 | `data.get('fundamental_features:每股稅後淨利')`  | float |
|總負債除總淨值 | `data.get('fundamental_features:總負債除總淨值')`  | float |
|負債比率 | `data.get('fundamental_features:負債比率')`  | float |
|淨值除資產 | `data.get('fundamental_features:淨值除資產')`  | float |
|營收成長率 | `data.get('fundamental_features:營收成長率')`  | float |
|營業毛利成長率 | `data.get('fundamental_features:營業毛利成長率')`  | float |
|營業利益成長率 | `data.get('fundamental_features:營業利益成長率')`  | float |
|稅前淨利成長率 | `data.get('fundamental_features:稅前淨利成長率')`  | float |
|稅後淨利成長率 | `data.get('fundamental_features:稅後淨利成長率')`  | float |
|經常利益成長率 | `data.get('fundamental_features:經常利益成長率')`  | float |
|資產總額成長率 | `data.get('fundamental_features:資產總額成長率')`  | float |
|淨值成長率 | `data.get('fundamental_features:淨值成長率')`  | float |
|流動比率 | `data.get('fundamental_features:流動比率')`  | float |
|速動比率 | `data.get('fundamental_features:速動比率')`  | float |
|利息支出率 | `data.get('fundamental_features:利息支出率')`  | float |
|營運資金 | `data.get('fundamental_features:營運資金')`  | float |
|總資產週轉次數 | `data.get('fundamental_features:總資產週轉次數')`  | float |
|應收帳款週轉率 | `data.get('fundamental_features:應收帳款週轉率')`  | float |
|存貨週轉率 | `data.get('fundamental_features:存貨週轉率')`  | float |
|固定資產週轉次數 | `data.get('fundamental_features:固定資產週轉次數')`  | float |
|淨值週轉率次數 | `data.get('fundamental_features:淨值週轉率次數')`  | float |
|自由現金流量 | `data.get('fundamental_features:自由現金流量')`  | float |


#### 企業重要子公司資訊 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|主要經營務 | `data.get('important_subsidiary')`  | str |
|地區 | `data.get('important_subsidiary')`  | str |
|符合重要子公司認定之標準(註) | `data.get('important_subsidiary')`  | str |
|市場別 | `data.get('important_subsidiary')`  | str |


#### 上市櫃月營收 free  

月營收截止日回測是每月10日，10日遇到假日則是遞延到下一個交易日。M09營收是10月公告，M10營收是11月公告，以此類推...若欲將索引格式轉為月營收截止日，可使用下列方法，`data. t('monthly_revenue:當月營收').index_str_to_date()`。

|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|當月營收 | `data.get('monthly_revenue:當月營收')`  | int |
|上月營收 | `data.get('monthly_revenue:上月營收')`  | int |
|去年當月營收 | `data.get('monthly_revenue:去年當月營收')`  | int |
|上月比較增減(%) | `data.get('monthly_revenue:上月比較增減(%)')`  | float |
|去年同月增減(%) | `data.get('monthly_revenue:去年同月增減(%)')`  | float |
|當月累計營收 | `data.get('monthly_revenue:當月累計營收')`  | int |
|去年累計營收 | `data.get('monthly_revenue:去年累計營收')`  | int |
|前期比較增減(%) | `data.get('monthly_revenue:前期比較增減(%)')`  | float |


#### 企業海外轉投資 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|公司名稱 | `data.get('oversea_investment')`  | str |
|投資公司名稱 | `data.get('oversea_investment')`  | str |
|地區別代號 | `data.get('oversea_investment')`  | str |
|本期期末持股比例 | `data.get('oversea_investment')`  | float |
|原始投資金額本期期末 | `data.get('oversea_investment')`  | float |
|原始投資金額去年年底 | `data.get('oversea_investment')`  | float |
|本期期末投資餘額 | `data.get('oversea_investment')`  | float |
|本期認列之投資損益 | `data.get('oversea_investment')`  | float |
|市場別 | `data.get('oversea_investment')`  | str |


#### 上櫃變更股票面額恢復買賣參考價格 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|恢復買賣日期 | `data.get('par_value_change_otc:恢復買賣日期')`  | datetime |
|最後交易日之收盤價格 | `data.get('par_value_change_otc:最後交易日之收盤價格')`  | float |
|恢復買賣開始日參考價 | `data.get('par_value_change_otc:恢復買賣開始日參考價')`  | float |
|漲停價格 | `data.get('par_value_change_otc:漲停價格')`  | float |
|跌停價格 | `data.get('par_value_change_otc:跌停價格')`  | float |
|開始交易基準價 | `data.get('par_value_change_otc:開始交易基準價')`  | float |
|otc_par_value_change_divide_ratio | `data.get('par_value_change_otc:otc_par_value_change_divide_ratio')`  | float |


#### 上市變更股票面額恢復買賣參考價格 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|恢復買賣日期 | `data.get('par_value_change_tse:恢復買賣日期')`  | datetime |
|停止買賣前收盤價格 | `data.get('par_value_change_tse:停止買賣前收盤價格')`  | float |
|恢復買賣參考價 | `data.get('par_value_change_tse:恢復買賣參考價')`  | float |
|漲停價格 | `data.get('par_value_change_tse:漲停價格')`  | float |
|跌停價格 | `data.get('par_value_change_tse:跌停價格')`  | float |
|開盤競價基準 | `data.get('par_value_change_tse:開盤競價基準')`  | float |
|twse_par_value_change_divide_ratio | `data.get('par_value_change_tse:twse_par_value_change_divide_ratio')`  | float |


#### 個股日本益比、殖利率及股價淨值比 free

殖利率 = 每股股利／收盤價\*100%，其中每股股利採用該公司近期每股配發之盈餘分配之現金股利(元/股) + 法定盈餘公積、資本公積發放之現金 (元/股) + 盈餘轉增資股票股利(元/股)為計算基礎。股價淨值比 = 收盤價／每股參考淨值，其中每股參考淨值採用公開資訊觀測站公告之最近一季每股參考淨值，於102年5月中旬之前採用該公司最近一季淨值除以除權變動之採樣股數為推計基礎。
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|殖利率(%) | `data.get('price_earning_ratio:殖利率(%)')`  | float |
|本益比 | `data.get('price_earning_ratio:本益比')`  | float |
|股價淨值比 | `data.get('price_earning_ratio:股價淨值比')`  | float |


#### 品質因子_Z_score free

品質因子為巴菲特常用的指標，主要用途為篩選擁有高品質財務指標的標地。數據使用各季截止日的財報資料，依據獲利性、成長性、安全性各指標，使用Z-score標準化分數。
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|profitability | `data.get('quality_factor_z_score:profitability')`  | float |
|growth | `data.get('quality_factor_z_score:growth')`  | float |
|safety | `data.get('quality_factor_z_score:safety')`  | float |


#### 興櫃月營收 free  

月營收截止日回測是每月10日，10日遇到假日則是遞延到下一個交易日。M09營收是10月公告，M10營收是11月公告，以此類推...若欲將索引格式轉為月營收截止日，可使用下列方法，`data. t('rotc_monthly_revenue:當月營收').index_str_to_date()`。

|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|當月營收 | `data.get('rotc_monthly_revenue:當月營收')`  | float |
|上月營收 | `data.get('rotc_monthly_revenue:上月營收')`  | float |
|去年當月營收 | `data.get('rotc_monthly_revenue:去年當月營收')`  | float |
|上月比較增減(%) | `data.get('rotc_monthly_revenue:上月比較增減(%)')`  | float |
|去年同月增減(%) | `data.get('rotc_monthly_revenue:去年同月增減(%)')`  | float |
|當月累計營收 | `data.get('rotc_monthly_revenue:當月累計營收')`  | float |
|去年累計營收 | `data.get('rotc_monthly_revenue:去年累計營收')`  | float |
|前期比較增減(%) | `data.get('rotc_monthly_revenue:前期比較增減(%)')`  | float |
|備註 | `data.get('rotc_monthly_revenue:備註')`  | str |


#### 台股證券分類 free

|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|name | dat.get('security_categories')`  | str |
|category | `data.get('security_categories')`  | str |
|market | `data.get('security_categories')`  | str |


#### 產業題材 vip
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|name | dat.get('security_industry_themes')`  | str |
|category | `data.get('security_industry_themes')`  | str |


#### 當前 股票期貨/股票選擇權 交易標的 free

|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|標的證券| `data.get('single_stock_futures_and_equity_options_underlying')`  | str |
|標的證券簡稱 | `data.get('single_stock_futures_and_equity_options_underlying')`  | str |
|是否為股票期貨標的 | `data.get('single_stock_futures_and_equity_options_underlying')`  | str |
|是否為股票選擇權標的 | `data.get('single_stock_futures_and_equity_options_underlying')`  | str |
|上市普通股標的證券 | `data.get('single_stock_futures_and_equity_options_underlying')`  | str |
|上櫃普通股標的證券 | `data.get('single_stock_futures_and_equity_options_underlying')`  | str |
|上市ETF標的證券 | `data.get('single_stock_futures_and_equity_options_underlying')`  | str |
|標準型證券股數 | `data.get('single_stock_futures_and_equity_options_underlying')`  | float |


#### 券商分點名稱對照表 vip

|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
| name | dat.get('broker_mapping')`  | str |


#### 券商分點買賣超前15大券商明細 vip

為節省資料傳輸大小與速度，broker欄位轉為id整數型態 |的unique index。有延伸運用想
得到券商分點名稱的可以使用 broker_mapping 取得 broker 欄位來對照。
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|buy | `data.get('broker_transactions')`  | int32 |
|sell | `data.get('broker_transactions')`  | int32 |
|broker | `data.get('broker_transactions')`  | category |


#### 可轉換公司債每月轉換普通股 vip

每月1日公告上月轉換資訊
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|本月轉換張數 | `data.get('cb_converted_status:本月轉換張數')`  | float |
|轉(交)換或認股價格(元) | `data.get('cb_converted_status:轉(交)換或認股價格(元)')`  | float |
|債券轉(交)換或認購普通股 | `data.get('cb_converted_status:債券轉(交)換或認購普通股')`  | int |


#### 暫停先賣後買當日沖銷交易 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|股票名稱 | `data.get('day_trade_short_suspension')`  | str |
|停止先賣後買開始日 | `data.get('day_trade_short_suspension')`  | datetime |
|停止先賣後買結束日 | `data.get('day_trade_short_suspension')`  | datetime |
|原因 | `data.get('day_trade_short_suspension')`  | str |


#### 外資持股比率 free

影響外資持股因素，除櫃檯買賣市場外資淨買賣數外，另有非市場交易因素同時影響外資持股數， 例如：借券市場交易、海外存託憑證異動股數、海外可轉換公司債轉換股數、上櫃公司增減資或股東會、除權申報或ETF申購買回、投資人變更國籍等
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|發行股數 | `data.get('foreign_investors_shareholding:發行股數')`  | int |
|外資及陸資尚可投資股數 | `data.get('foreign_investors_shareholding:外資及陸資尚可投資股數')`  | int |
|全體外資及陸資持有股數 | `data.get('foreign_investors_shareholding:全體外資及陸資持有股數')`  | int |
|外資及陸資尚可投資比率 | `data.get('foreign_investors_shareholding:外資及陸資尚可投資比率')`  | float |
|全體外資及陸資持股比率 | `data.get('foreign_investors_shareholding:全體外資及陸資持股比率')`  | float |
|外資及陸資共用法令投資上限比率 | `data.get('foreign_investors_shareholding:外資及陸資共用法令投資上限比率')`  | float |
|陸資法令投資上限比率 | `data.get('foreign_investors_shareholding:陸資法令投資上限比率')`  | float |


#### 內部人持股轉讓宣告 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|公司名稱 | `data.get('insider_shareholding_transfer_declaration')`  | str |
|申報人身分 | `data.get('insider_shareholding_transfer_declaration')`  | str |
|預定轉讓方式及股數_轉讓股數 | `data.get('insider_shareholding_transfer_declaration')`  | float |
|每日於盤中交易最大得轉讓股數 | `data.get('insider_shareholding_transfer_declaration')`  | float |
|目前持有股數_自有持股 | `data.get('insider_shareholding_transfer_declaration')`  | float |
|目前持有股數_保留運用決定權信託股數 | `data.get('insider_shareholding_transfer_declaration')`  | float |
|預定轉讓總股數_自有持股 | `data.get('insider_shareholding_transfer_declaration')`  | float |
|預定轉讓總股數_保留運用決定權信託股數 | `data.get('insider_shareholding_transfer_declaration')`  | float |
|預定轉讓後持股_自有持股 | `data.get('insider_shareholding_transfer_declaration')`  | float |
|預定轉讓後持股_保留運用決定權信託股數 | `data.get('insider_shareholding_transfer_declaration')`  | float |
|是否申報持股未完成轉讓 | `data.get('insider_shareholding_transfer_declaration')`  | str |
|有效轉讓開始日 | `data.get('insider_shareholding_transfer_declaration')`  | datetime |
|有效轉讓截止日 | `data.get('insider_shareholding_transfer_declaration')`  | datetime |
|市場別 | `data.get('insider_shareholding_transfer_declaration')`  | str |


#### 整體市場三大法人買賣金額統計 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|買進金額 | `data.get('institutional_investors_trading_all_market_summary:買進金額')`  | int |
|賣出金額 | `data.get('institutional_investors_trading_all_market_summary:賣出金額')`  | int |
|買賣超 | `data.get('institutional_investors_trading_all_market_summary:買賣超')`  | int |


#### 三大法人買賣超 free

於每一交易日18：00(不含鉅額)及21:00(含鉅額交易)各產生一次，若策略自動更新需精準回測，請於每日21:10後執行。
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|外陸資買進股數(不含外資自營商) | `data.get('institutional_investors_trading_summary:外陸資買進股數(不含外資自營商)')`  | int |
|外陸資賣出股數(不含外資自營商) | `data.get('institutional_investors_trading_summary:外陸資賣出股數(不含外資自營商)')`  | int |
|外陸資買賣超股數(不含外資自營商) | `data.get('institutional_investors_trading_summary:外陸資買賣超股數(不含外資自營商)')`  | int |
|外資自營商買進股數 | `data.get('institutional_investors_trading_summary:外資自營商買進股數')`  | int |
|外資自營商賣出股數 | `data.get('institutional_investors_trading_summary:外資自營商賣出股數')`  | int |
|外資自營商買賣超股數 | `data.get('institutional_investors_trading_summary:外資自營商買賣超股數')`  | int |
|投信買進股數 | `data.get('institutional_investors_trading_summary:投信買進股數')`  | int |
|投信賣出股數 | `data.get('institutional_investors_trading_summary:投信賣出股數')`  | int |
|投信買賣超股數 | `data.get('institutional_investors_trading_summary:投信買賣超股數')`  | int |
|自營商買進股數(自行買賣) | `data.get('institutional_investors_trading_summary:自營商買進股數(自行買賣)')`  | int |
|自營商賣出股數(自行買賣) | `data.get('institutional_investors_trading_summary:自營商賣出股數(自行買賣)')`  | int |
|自營商買賣超股數(自行買賣) | `data.get('institutional_investors_trading_summary:自營商買賣超股數(自行買賣)')`  | int |
|自營商買進股數(避險) | `data.get('institutional_investors_trading_summary:自營商買進股數(避險)')`  | int |
|自營商賣出股數(避險) | `data.get('institutional_investors_trading_summary:自營商賣出股數(避險)')`  | int |
|自營商買賣超股數(避險) | `data.get('institutional_investors_trading_summary:自營商買賣超股數(避險)')`  | int |


#### 內部人持股變化 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|發行股數 | `data.get('internal_equity_changes:發行股數')`  | float |
|董監增加股數 | `data.get('internal_equity_changes:董監增加股數')`  | float |
|董監減少股數 | `data.get('internal_equity_changes:董監減少股數')`  | float |
|董監持有股數 | `data.get('internal_equity_changes:董監持有股數')`  | float |
|董監持有股數占比 | `data.get('internal_equity_changes:董監持有股數占比')`  | float |
|經理人持有股數 | `data.get('internal_equity_changes:經理人持有股數')`  | float |
|百分之十以上大股東持有股數 | `data.get('internal_equity_changes:百分之十以上大股東持有股數')`  | float |
|市場別 | `data.get('internal_equity_changes:市場別')`  | str |


#### 內部人持股不足數 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|發行股數 | `data.get('internal_equity_insufficient:發行股數')`  | float |
|全體董事(不包含獨立董事)應持有股數 | `data.get('internal_equity_insufficient:全體董事(不包含獨立董事)應持有股數')`  | float |
|全體董事(不包含獨立董事)實際持有股數 | `data.get('internal_equity_insufficient:全體董事(不包含獨立董事)實際持有股數')`  | float |
|全體董事(不包含獨立董事)法人代表人分戶集保股數 | `data.get('internal_equity_insufficient:全體董事(不包含獨立董事)法人代表人分戶集保股數')`  | float |
|全體董事(不包含獨立董事)保留運用決定權信託股數 | `data.get('internal_equity_insufficient:全體董事(不包含獨立董事)保留運用決定權信託股數')`  | float |
|全體董事(不包含獨立董事)不足股數 | `data.get('internal_equity_insufficient:全體董事(不包含獨立董事)不足股數')`  | float |
|監察人應持有股數 | `data.get('internal_equity_insufficient:監察人應持有股數')`  | float |
|監察人應持有股數實際持有股數 | `data.get('internal_equity_insufficient:監察人應持有股數實際持有股數')`  | float |
|監察人應持有股數法人代表人分戶集保股數 | `data.get('internal_equity_insufficient:監察人應持有股數法人代表人分戶集保股數')`  | float |
|監察人應持有股數保留運用決定權信託股數 | `data.get('internal_equity_insufficient:監察人應持有股數保留運用決定權信託股數')`  | float |
|監察人應持有股數不足股數 | `data.get('internal_equity_insufficient:監察人應持有股數不足股數')`  | float |
|持股不足已通知其董監 | `data.get('internal_equity_insufficient:持股不足已通知其董監')`  | str |
|市場別 | `data.get('internal_equity_insufficient:市場別')`  | str |


#### 內部人質押 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|董監持股 | `data.get('internal_equity_pledge:董監持股')`  | float |
|董監設質 | `data.get('internal_equity_pledge:董監設質')`  | float |
|董監解質 | `data.get('internal_equity_pledge:董監解質')`  | float |
|董監累計設質 | `data.get('internal_equity_pledge:董監累計設質')`  | float |
|董監設質股數占比 | `data.get('internal_equity_pledge:董監設質股數占比')`  | float |
|經理人持股 | `data.get('internal_equity_pledge:經理人持股')`  | float |
|百分之十以上大股東持有股數 | `data.get('internal_equity_pledge:百分之十以上大股東持有股數')`  | float |
|經理人及百分之十以上大股東設質股數 | `data.get('internal_equity_pledge:經理人及百分之十以上大股東設質股數')`  | float |
|經理人及百分之十以上大股東設質股數占比 | `data.get('internal_equity_pledge:經理人及百分之十以上大股東設質股數占比')`  | float |
|市場別 | `data.get('internal_equity_pledge:市場別')`  | str |


#### 集保餘額 free

此資料範圍包含「興櫃」股。分級/對應持股數 - {1:'1-999',2:'1,000-5,000',3:'5,001-10,000',4:'10,001-15,000',5:'15,001-20,000',6:'20,001-30,000',7:'30,001-40,000',8:'40,001-50,000',9:'50,001-100,000',10:'100,001-200,000',11:'200,001-400,000',12:'400,001-600,000',13:'600,001-800,000',14:'800,001-1,000,000',15:'1,000,001以上',17:'合計'}
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|人數 | `data.get('inventory')`  | int |
|持有股數 | `data.get('inventory')`  | int |
|占集保庫存數比例 | `data.get('inventory')`  | float |


#### 整體市場融資券統計 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|融資券總買進 | `data.get('margin_balance:融資券總買進')`  | float |
|融資券總賣出 | `data.get('margin_balance:融資券總賣出')`  | float |
|現金(券)總償還 | `data.get('margin_balance:現金(券)總償還')`  | float |
|融資券總餘額 | `data.get('margin_balance:融資券總餘額')`  | float |


#### 融資融券有價證券停券歷史 free

索引日期為融券最後回補日，通常原因為除權息、分配收益、現金增資、減資、股東常會。得為融資融券之有價證券，自發行公司停止過戶前六個營業日起，停止融券賣出四日；已融券者，應於停止過戶第六個營業日前，還券了結。以上訊息若有變動，以實際公告為主。本表自108年12月16日起含停止買賣證券。
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|證券名稱 | `data.get('margin_short_sale_suspension')`  | str |
|停券迄日 | `data.get('margin_short_sale_suspension')`  | datetime |


#### 融資券 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|融資買進 | `data.get('margin_transactions:融資買進')`  | int |
|融資賣出 | `data.get('margin_transactions:融資賣出')`  | int |
|融資現金償還 | `data.get('margin_transactions:融資現金償還')`  | int |
|融資前日餘額 | `data.get('margin_transactions:融資前日餘額')`  | int |
|融資今日餘額 | `data.get('margin_transactions:融資今日餘額')`  | int |
|融資限額 | `data.get('margin_transactions:融資限額')`  | int |
|融券買進 | `data.get('margin_transactions:融券買進')`  | int |
|融券賣出 | `data.get('margin_transactions:融券賣出')`  | int |
|融券現券償還 | `data.get('margin_transactions:融券現券償還')`  | int |
|融券前日餘額 | `data.get('margin_transactions:融券前日餘額')`  | int |
|融券今日餘額 | `data.get('margin_transactions:融券今日餘額')`  | int |
|融券限額 | `data.get('margin_transactions:融券限額')`  | int |
|資券互抵 | `data.get('margin_transactions:資券互抵')`  | int |
|註記 | `data.get('margin_transactions:註記')`  | str |
|融資使用率 | `data.get('margin_transactions:融資使用率')`  | float |
|融券使用率 | `data.get('margin_transactions:融券使用率')`  | float |


#### 興櫃分點進出 vip
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|買進股數 | `data.get('rotc_broker_transactions')`  | float |
|賣出股數 | `data.get('rotc_broker_transactions')`  | float |
|買進成本 | `data.get('rotc_broker_transactions')`  | float |
|賣出成本 | `data.get('rotc_broker_transactions')`  | float |


#### 借券 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|前日借券餘額 | `data.get('security_lending:前日借券餘額')`  | int |
|借券 | `data.get('security_lending:借券')`  | int |
|借券還券 | `data.get('security_lending:借券還券')`  | int |
|借券增減 | `data.get('security_lending:借券增減')`  | int |
|借券餘額 | `data.get('security_lending:借券餘額')`  | int |


#### 借券賣出 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|借券賣出 | `data.get('security_lending_sell:借券賣出')`  | int |
|借券賣出還券 | `data.get('security_lending_sell:借券賣出還券')`  | int |
|借券賣出餘額 | `data.get('security_lending_sell:借券賣出餘額')`  | int |
|借券賣出限額 | `data.get('security_lending_sell:借券賣出限額')`  | int |


#### 處置股 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|證券名稱 | `data.get('disposal_information')`  | str |
|處置條件 | `data.get('disposal_information')`  | str |
|處置措施 | `data.get('disposal_information')`  | str |
|處置內容 | `data.get('disposal_information')`  | str |
|處置開始時間 | `data.get('disposal_information')`  | datetime |
|處置結束時間 | `data.get('disposal_information')`  | datetime |
|分時交易 | `data.get('disposal_information')`  | float |


#### 除權息資訊公告 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|公司名稱 | `data.get('dividend_announcement')`  | str |
|股利所屬期間 | `data.get('dividend_announcement')`  | str |
|權利分派基準日 | `data.get('dividend_announcement')`  | datetime |
|盈餘轉增資配股(元/股) | `data.get('dividend_announcement')`  | float |
|法定盈餘公積、資本公積轉增資配股(元/股) | `data.get('dividend_announcement')`  | float |
|除權交易日 | `data.get('dividend_announcement')`  | datetime |
|盈餘分配之股東現金股利(元/股) | `data.get('dividend_announcement')`  | float |
|法定盈餘公積、資本公積發放之現金(元/股) | `data.get('dividend_announcement')`  | float |
|除息交易日 | `data.get('dividend_announcement')`  | datetime |
|現金股利發放日 | `data.get('dividend_announcement')`  | datetime |
|現金增資總股數(股) | `data.get('dividend_announcement')`  | float |
|現金增資認股比率(%) | `data.get('dividend_announcement')`  | float |
|現金增資認購價(元/股) | `data.get('dividend_announcement')`  | float |
|參加分派總股數 | `data.get('dividend_announcement')`  | float |
|公告時間 | `data.get('dividend_announcement')`  | str |
|普通股每股面額 | `data.get('dividend_announcement')`  | str |
|市場別 | `data.get('dividend_announcement')`  | str |


#### 重訊公告 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|name | `data.get('important_info_announcement')`  | str |
|title | `data.get('important_info_announcement')`  | str |
|info | `data.get('important_info_announcement')`  | str |


#### 法說會期程 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|公司名稱 | `data.get('investors_conference')`  | str |
|召開法人說明會時間 | `data.get('investors_conference')`  | str |
|召開法人說明會地點 | `data.get('investors_conference')`  | str |
|法人說明會擇要訊息 | `data.get('investors_conference')`  | str |
|公司網站是否提供法人說明會相關資訊 | `data.get('investors_conference')`  | str |
|影音連結資訊(國內自辦應揭露，受邀參加可自願揭露) | `data.get('investors_conference')`  | str |
|其他應敘明事項 | `data.get('investors_conference')`  | str |
|市場別 | `data.get('investors_conference')`  | str |


#### 企業依規發布重大訊息之訴訟案件 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|name | `data.get('lawsuit_info')`  | str |
|title | `data.get('lawsuit_info')`  | str |
|market | `data.get('lawsuit_info')`  | str |


#### 國安基金進退場統計 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|啟動時間 | `data.get('national_security_fund')`  | datetime |
|退場時間 | `data.get('national_security_fund')`  | datetime |
|時空背景 | `data.get('national_security_fund')`  | str |
|護盤金額(億) | `data.get('national_security_fund')`  | float |


#### 股東會期程 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|公司名稱 | `data.get('shareholders_meeting')`  | str |
|公司地址 | `data.get('shareholders_meeting')`  | str |
|股東會類別 | `data.get('shareholders_meeting')`  | str |
|開會地點 | `data.get('shareholders_meeting')`  | str |
|是否改選董監 | `data.get('shareholders_meeting')`  | str |
|聯絡電話 | `data.get('shareholders_meeting')`  | str |
|股務單位 | `data.get('shareholders_meeting')`  | str |
|股務單位電話 | `data.get('shareholders_meeting')`  | str |
|行使期間 | `data.get('shareholders_meeting')`  | str |
|電子投票平台 | `data.get('shareholders_meeting')`  | str |
|投票網址 | `data.get('shareholders_meeting')`  | str |
|公告日期 | `data.get('shareholders_meeting')`  | datetime |
|公告時間 | `data.get('shareholders_meeting')`  | str |
|市場別 | `data.get('shareholders_meeting')`  | str |


#### 注意股 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|注意交易資訊 | `data.get('trading_attention')`  | str |
|收盤價 | `data.get('trading_attention')`  | float |
|本益比 | `data.get('trading_attention')`  | float |


#### 庫藏股 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|買回目的 | `data.get('treasury_stock:買回目的')`  | str |
|買回股份總金額上限 | `data.get('treasury_stock:買回股份總金額上限')`  | float |
|預定買回股數 | `data.get('treasury_stock:預定買回股數')`  | float |
|買回價格區間-最低 | `data.get('treasury_stock:買回價格區間-最低')`  | float |
|買回價格區間-最高 | `data.get('treasury_stock:買回價格區間-最高')`  | float |
|預定買回期間-起 | `data.get('treasury_stock:預定買回期間-起')`  | datetime |
|預定買回期間-迄 | `data.get('treasury_stock:預定買回期間-迄')`  | datetime |
|是否執行完畢 | `data.get('treasury_stock:是否執行完畢')`  | str |
|本次已買回股數 | `data.get('treasury_stock:本次已買回股數')`  | float |
|本次執行完畢已註銷或轉讓股數 | `data.get('treasury_stock:本次執行完畢已註銷或轉讓股數')`  | float |
|本次已買回股數佔預定買回股數比例(%) | `data.get('treasury_stock:本次已買回股數佔預定買回股數比例(%)')`  | float |
|本次已買回總金額 | `data.get('treasury_stock:本次已買回總金額')`  | float |
|本次平均每股買回價格 | `data.get('treasury_stock:本次平均每股買回價格')`  | float |
|本次買回股數佔公司已發行股份總數比例(%) | `data.get('treasury_stock:本次買回股數佔公司已發行股份總數比例(%)')`  | float |
|本次未執行完畢之原因 | `data.get('treasury_stock:本次未執行完畢之原因')`  | str |


#### 台股新聞(cnyes) free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|title | `data.get('tw_news_cnyes')`  | string |
|stock_ids | `data.get('tw_news_cnyes')`  | string |


#### 台灣景氣指標 free

注意領先指標可能會校正回歸過去序列，用於回測時須留意
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|景氣對策信號(分) | `data.get('tw_business_indicators:景氣對策信號(分)')`  | float |
|領先指標綜合指數(點) | `data.get('tw_business_indicators:領先指標綜合指數(點)')`  | float |
|領先指標不含趨勢指數(點) | `data.get('tw_business_indicators:領先指標不含趨勢指數(點)')`  | float |
|同時指標綜合指數(點) | `data.get('tw_business_indicators:同時指標綜合指數(點)')`  | float |
|同時指標不含趨勢指數(點) | `data.get('tw_business_indicators:同時指標不含趨勢指數(點)')`  | float |
|落後指標綜合指數(點) | `data.get('tw_business_indicators:落後指標綜合指數(點)')`  | float |
|落後指標不含趨勢指數(點) | `data.get('tw_business_indicators:落後指標不含趨勢指數(點)')`  | float |


#### 台灣景氣指標細項 free

注意領先指標可能會校正回歸過去序列，用於回測時須留意
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|領先指標綜合指數(點) | `data.get('tw_business_indicators_details:領先指標綜合指數(點)')`  | float |
|領先指標不含趨勢指數(點) | `data.get('tw_business_indicators_details:領先指標不含趨勢指數(點)')`  | float |
|外銷訂單動向指數(以家數計) | `data.get('tw_business_indicators_details:外銷訂單動向指數(以家數計)')`  | float |
|貨幣總計數 M1B(百萬元) | `data.get('tw_business_indicators_details:貨幣總計數 M1B(百萬元)')`  | float |
|股價指數(Index 1966=100) | `data.get('tw_business_indicators_details:股價指數(Index 1966=100)')`  | float |
|工業及服務業受僱員工淨進入率 | `data.get('tw_business_indicators_details:工業及服務業受僱員工淨進入率')`  | float |
|建築物開工樓地板面積(千平方公尺) | `data.get('tw_business_indicators_details:建築物開工樓地板面積(千平方公尺)')`  | float |
|半導體設備進口值(新台幣百萬元) | `data.get('tw_business_indicators_details:半導體設備進口值(新台幣百萬元)')`  | float |
|同時指標綜合指數(點) | `data.get('tw_business_indicators_details:同時指標綜合指數(點)')`  | float |
|同時指標不含趨勢指數(點) | `data.get('tw_business_indicators_details:同時指標不含趨勢指數(點)')`  | float |
|工業生產指數(Index 2016=100) | `data.get('tw_business_indicators_details:工業生產指數(Index 2016=100)')`  | float |
|電力(企業)總用電量(十億度) | `data.get('tw_business_indicators_details:電力(企業)總用電量(十億度)')`  | float |
|製造業銷售量指數(Index 2016=100) | `data.get('tw_business_indicators_details:製造業銷售量指數(Index 2016=100)')`  | float |
|批發、零售及餐飲業營業額(十億元) | `data.get('tw_business_indicators_details:批發、零售及餐飲業營業額(十億元)')`  | float |
|非農業部門就業人數(千人) | `data.get('tw_business_indicators_details:非農業部門就業人數(千人)')`  | float |
|海關出口值(十億元) | `data.get('tw_business_indicators_details:海關出口值(十億元)')`  | float |
|機械及電機設備進口值(十億元) | `data.get('tw_business_indicators_details:機械及電機設備進口值(十億元)')`  | float |
|落後指標綜合指數(點) | `data.get('tw_business_indicators_details:落後指標綜合指數(點)')`  | float |
|落後指標不含趨勢指數(點) | `data.get('tw_business_indicators_details:落後指標不含趨勢指數(點)')`  | float |
|失業率 | `data.get('tw_business_indicators_details:失業率')`  | float |
|製造業單位產出勞動成本指數(Index 2016=100) | `data.get('tw_business_indicators_details:製造業單位產出勞動成本指數(Index 2016=100)')`  | float |
|金融業隔夜拆款利率(年息百分比) | `data.get('tw_business_indicators_details:金融業隔夜拆款利率(年息百分比)')`  | float |
|全體金融機構放款與投資(10億元) | `data.get('tw_business_indicators_details:全體金融機構放款與投資(10億元)')`  | float |
|製造業存貨價值(千元) | `data.get('tw_business_indicators_details:製造業存貨價值(千元)')`  | float |


#### 台灣各產業非製造業採購經理人指數 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|非製造業NMI | `data.get('tw_industry_nmi:非製造業NMI')`  | float |
|商業活動 | `data.get('tw_industry_nmi:商業活動')`  | float |
|新增訂單 | `data.get('tw_industry_nmi:新增訂單')`  | float |
|人力僱用 | `data.get('tw_industry_nmi:人力僱用')`  | float |
|供應商交貨時間 | `data.get('tw_industry_nmi:供應商交貨時間')`  | float |
|存貨 | `data.get('tw_industry_nmi:存貨')`  | float |
|採購價格 | `data.get('tw_industry_nmi:採購價格')`  | float |
|未完成訂單 | `data.get('tw_industry_nmi:未完成訂單')`  | float |
|服務輸出出口 | `data.get('tw_industry_nmi:服務輸出出口')`  | float |
|服務輸入進口 | `data.get('tw_industry_nmi:服務輸入進口')`  | float |
|服務收費價格 | `data.get('tw_industry_nmi:服務收費價格')`  | float |
|存貨觀感 | `data.get('tw_industry_nmi:存貨觀感')`  | float |


#### 台灣各產業製造業採購經理人指數 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|製造業PMI | `data.get('tw_industry_pmi:製造業PMI')`  | float |
|新增訂單數量 | `data.get('tw_industry_pmi:新增訂單數量')`  | float |
|生產數量 | `data.get('tw_industry_pmi:生產數量')`  | float |
|人力僱用數量 | `data.get('tw_industry_pmi:人力僱用數量')`  | float |
|供應商交貨時間 | `data.get('tw_industry_pmi:供應商交貨時間')`  | float |
|存貨 | `data.get('tw_industry_pmi:存貨')`  | float |
|客戶存貨 | `data.get('tw_industry_pmi:客戶存貨')`  | float |
|原物料價格 | `data.get('tw_industry_pmi:原物料價格')`  | float |
|未完成訂單 | `data.get('tw_industry_pmi:未完成訂單')`  | float |
|新增出口訂單 | `data.get('tw_industry_pmi:新增出口訂單')`  | float |
|進口原物料數量 | `data.get('tw_industry_pmi:進口原物料數量')`  | float |
|未來六個月展望 | `data.get('tw_industry_pmi:未來六個月展望')`  | float |


#### 貨幣總計數年增率 free

M1B ＝ 活期儲蓄存款，為銀行存戶流動性較強的資金。M2 ＝ M1B＋準備貨幣（如定存），流動性較 M1B 低，代表整體市場的資金
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|年增率(%) | `data.get('tw_monetary_aggregates:年增率(%)')`  | float |


#### 台灣非製造業採購經理人指數 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|臺灣非製造業NMI | `data.get('tw_total_nmi:臺灣非製造業NMI')`  | float |
|商業活動 | `data.get('tw_total_nmi:商業活動')`  | float |
|新增訂單 | `data.get('tw_total_nmi:新增訂單')`  | float |
|人力僱用 | `data.get('tw_total_nmi:人力僱用')`  | float |
|供應商交貨時間 | `data.get('tw_total_nmi:供應商交貨時間')`  | float |
|存貨 | `data.get('tw_total_nmi:存貨')`  | float |
|採購價格 | `data.get('tw_total_nmi:採購價格')`  | float |
|未完成訂單 | `data.get('tw_total_nmi:未完成訂單')`  | float |
|服務輸出出口 | `data.get('tw_total_nmi:服務輸出出口')`  | float |
|服務輸入進口 | `data.get('tw_total_nmi:服務輸入進口')`  | float |
|服務收費價格 | `data.get('tw_total_nmi:服務收費價格')`  | float |
|存貨觀感 | `data.get('tw_total_nmi:存貨觀感')`  | float |
|未來六個月展望 | `data.get('tw_total_nmi:未來六個月展望')`  | float |


#### 台灣製造業採購經理人指數 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|製造業PMI | `data.get('tw_total_pmi:製造業PMI')`  | float |
|新增訂單數量 | `data.get('tw_total_pmi:新增訂單數量')`  | float |
|生產數量 | `data.get('tw_total_pmi:生產數量')`  | float |
|人力僱用數量 | `data.get('tw_total_pmi:人力僱用數量')`  | float |
|供應商交貨時間 | `data.get('tw_total_pmi:供應商交貨時間')`  | float |
|存貨 | `data.get('tw_total_pmi:存貨')`  | float |
|客戶存貨 | `data.get('tw_total_pmi:客戶存貨')`  | float |
|原物料價格 | `data.get('tw_total_pmi:原物料價格')`  | float |
|未完成訂單 | `data.get('tw_total_pmi:未完成訂單')`  | float |
|新增出口訂單 | `data.get('tw_total_pmi:新增出口訂單')`  | float |
|進口原物料數量 | `data.get('tw_total_pmi:進口原物料數量')`  | float |
|未來六個月展望 | `data.get('tw_total_pmi:未來六個月展望')`  | float |

* * *

_

美股
--


#### 美股企業活動 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|事件 | `data.get('us_actions')`  | str |
|公司名稱 | `data.get('us_actions')`  | str |
|數值 | `data.get('us_actions')`  | float |
|對造公司代號 | `data.get('us_actions')`  | str |
|對造公司名稱 | `data.get('us_actions')`  | str |


#### 美股常用估值指標 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|企業價值 | `data.get('us_daily_metrics:ev')`  | float |
|企業價值倍數_稅前息前獲利 | `data.get('us_daily_metrics:evebit')`  | float |
|企業價值倍數_稅前息前折舊攤銷前的獲利 | `data.get('us_daily_metrics:evebitda')`  | float |
|市值 | `data.get('us_daily_metrics:marketcap')`  | float |
|本益比 | `data.get('us_daily_metrics:pe')`  | float |
|股價淨值比 | `data.get('us_daily_metrics:pb')`  | float |
|股價營收比 | `data.get('us_daily_metrics:ps')`  | float |


#### 美股財報(單季) free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|非控制股權 | `data.get('us_fundamental:accoci')`  | float |
|資產總額 | `data.get('us_fundamental:assets')`  | float |
|流動資產 | `data.get('us_fundamental:assetsc')`  | float |
|非流動資產 | `data.get('us_fundamental:assetsnc')`  | float |
|短期現金及現金等價物 | `data.get('us_fundamental:cashneq')`  | float |
|短期現金及現金等價物(美元) | `data.get('us_fundamental:cashnequsd')`  | float |
|總負債 | `data.get('us_fundamental:debt')`  | float |
|流動負債 | `data.get('us_fundamental:debtc')`  | float |
|非流動負債 | `data.get('us_fundamental:debtnc')`  | float |
|總負債(美元) | `data.get('us_fundamental:debtusd')`  | float |
|透過損益按比例分攤的收入 | `data.get('us_fundamental:deferredrev')`  | float |
|存款 | `data.get('us_fundamental:deposits')`  | float |
|股東權益 | `data.get('us_fundamental:equity')`  | float |
|股東權益(美元) | `data.get('us_fundamental:equityusd')`  | float |
|無形資產 | `data.get('us_fundamental:intangibles')`  | float |
|存貨 | `data.get('us_fundamental:inventory')`  | float |
|投資 | `data.get('us_fundamental:investments')`  | float |
|投資 (流動) | `data.get('us_fundamental:investmentsc')`  | float |
|投資 (非流動) | `data.get('us_fundamental:investmentsnc')`  | float |
|負債 | `data.get('us_fundamental:liabilities')`  | float |
|負債 (流動) | `data.get('us_fundamental:liabilitiesc')`  | float |
|負債 (非流動) | `data.get('us_fundamental:liabilitiesnc')`  | float |
|應付帳款 | `data.get('us_fundamental:payables')`  | float |
|固定資產淨值 | `data.get('us_fundamental:ppnenet')`  | float |
|應收帳款 | `data.get('us_fundamental:receivables')`  | float |
|保留盈餘 | `data.get('us_fundamental:retearn')`  | float |
|延稅資產 | `data.get('us_fundamental:taxassets')`  | float |
|延稅負債 | `data.get('us_fundamental:taxliabilities')`  | float |
|營業成本 | `data.get('us_fundamental:cor')`  | float |
|綜合收益 | `data.get('us_fundamental:consolinc')`  | float |
|每股股息 | `data.get('us_fundamental:dps')`  | float |
|息稅前利潤 | `data.get('us_fundamental:ebit')`  | float |
|息稅前利潤(美元) | `data.get('us_fundamental:ebitusd')`  | float |
|每股盈餘 | `data.get('us_fundamental:eps')`  | float |
|稀釋每股盈餘 | `data.get('us_fundamental:epsdil')`  | float |
|每股盈餘(美元) | `data.get('us_fundamental:epsusd')`  | float |
|毛利 | `data.get('us_fundamental:gp')`  | float |
|無形資產攤銷 | `data.get('us_fundamental:intexp')`  | float |
|淨利 | `data.get('us_fundamental:netinc')`  | float |
|淨利 (彌補非常項目後) | `data.get('us_fundamental:netinccmn')`  | float |
|淨利 (彌補非常項目後)(美元) | `data.get('us_fundamental:netinccmnusd')`  | float |
|淨利 (扣除 discontinued operations) | `data.get('us_fundamental:netincdis')`  | float |
|淨利 (非經常性項目後) | `data.get('us_fundamental:netincnci')`  | float |
|營業費用 | `data.get('us_fundamental:opex')`  | float |
|營業利益 | `data.get('us_fundamental:opinc')`  | float |
|優先股股息 | `data.get('us_fundamental:prefdivis')`  | float |
|營收 | `data.get('us_fundamental:revenue')`  | float |
|營收 (美元) | `data.get('us_fundamental:revenueusd')`  | float |
|研發費用 | `data.get('us_fundamental:rnd')`  | float |
|銷售、一般及行政費用 | `data.get('us_fundamental:sgna')`  | float |
|稀釋加權平均股數 | `data.get('us_fundamental:shareswa')`  | float |
|稀釋股份的加權平均數 | `data.get('us_fundamental:shareswadil')`  | float |
|所得稅費用 | `data.get('us_fundamental:taxexp')`  | float |
|資本支出 | `data.get('us_fundamental:capex')`  | float |
|折舊和攤銷費用 | `data.get('us_fundamental:depamor')`  | float |
|現金流量淨額 | `data.get('us_fundamental:ncf')`  | float |
|現金流量淨額 (營業) | `data.get('us_fundamental:ncfbus')`  | float |
|現金流量淨額 (普通股) | `data.get('us_fundamental:ncfcommon')`  | float |
|現金流量淨額 (債務) | `data.get('us_fundamental:ncfdebt')`  | float |
|現金流量淨額 (股息) | `data.get('us_fundamental:ncfdiv')`  | float |
|現金流量淨額 (自由現金流量) | `data.get('us_fundamental:ncff')`  | float |
|現金流量淨額 (投資) | `data.get('us_fundamental:ncfi')`  | float |
|現金流量淨額 (投資活動) | `data.get('us_fundamental:ncfinv')`  | float |
|現金流量淨額 (營運活動) | `data.get('us_fundamental:ncfo')`  | float |
|現金流量淨額 (融資活動) | `data.get('us_fundamental:ncfx')`  | float |
|關聯企業及合資公司的純收益 | `data.get('us_fundamental:sbcomp')`  | float |
|財報發佈日 | `data.get('us_fundamental:datekey')`  | datetime |
|財報週期 | `data.get('us_fundamental:reportperiod')`  | datetime |
|最近更新日期 | `data.get('us_fundamental:lastupdated')`  | datetime |
|股價 | `data.get('us_fundamental:price')`  | float |
|股份轉換因子 | `data.get('us_fundamental:sharefactor')`  | float |
|基本股數 | `data.get('us_fundamental:sharesbas')`  | float |
|平均資產總額 | `data.get('us_fundamental:assetsavg')`  | float |
|總資產週轉率 | `data.get('us_fundamental:assetturnover')`  | float |
|每股淨資產 | `data.get('us_fundamental:bvps')`  | float |
|流動比率 | `data.get('us_fundamental:currentratio')`  | float |
|負債對股東權益比率 | `data.get('us_fundamental:de')`  | float |
|股息收益率 | `data.get('us_fundamental:divyield')`  | float |
|息稅折舊前利潤 | `data.get('us_fundamental:ebitda')`  | float |
|息稅折舊前利潤率 | `data.get('us_fundamental:ebitdamargin')`  | float |
|息稅折舊前利潤(美元) | `data.get('us_fundamental:ebitdausd')`  | float |
|稅前利潤 | `data.get('us_fundamental:ebt')`  | float |
|平均股東權益 | `data.get('us_fundamental:equityavg')`  | float |
|企業價值 | `data.get('us_fundamental:ev')`  | float |
|EV/息稅前利潤 | `data.get('us_fundamental:evebit')`  | float |
|EV/息稅折舊前利潤 | `data.get('us_fundamental:evebitda')`  | float |
|自由現金流 | `data.get('us_fundamental:fcf')`  | float |
|每股自由現金流 | `data.get('us_fundamental:fcfps')`  | float |
|外幣兌換率 | `data.get('us_fundamental:fxusd')`  | float |
|毛利率 | `data.get('us_fundamental:grossmargin')`  | float |
|投資人投入資本 | `data.get('us_fundamental:invcap')`  | float |
|平均投資人投入資本 | `data.get('us_fundamental:invcapavg')`  | float |
|市值 | `data.get('us_fundamental:marketcap')`  | float |
|淨利率 | `data.get('us_fundamental:netmargin')`  | float |
|股利發放比率 | `data.get('us_fundamental:payoutratio')`  | float |
|市淨比 | `data.get('us_fundamental:pb')`  | float |
|市盈率 | `data.get('us_fundamental:pe')`  | float |
|市盈率 (預估) | `data.get('us_fundamental:pe1')`  | float |
|市銷比 | `data.get('us_fundamental:ps')`  | float |
|市銷比 (預估) | `data.get('us_fundamental:ps1')`  | float |
|總資產報酬率 | `data.get('us_fundamental:roa')`  | float |
|股東權益報酬率 | `data.get('us_fundamental:roe')`  | float |
|投入資本回報率 | `data.get('us_fundamental:roic')`  | float |
|銷售毛利率 | `data.get('us_fundamental:ros')`  | float |
|每股銷售額 | `data.get('us_fundamental:sps')`  | float |
|有形資產 | `data.get('us_fundamental:tangibles')`  | float |
|每股淨資產 | `data.get('us_fundamental:tbvps')`  | float |
|營運資金 | `data.get('us_fundamental:workingcapital')`  | float |


#### 美股財報(近4季累計) free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|非控制股權 | `data.get('us_fundamental_ART:accoci')`  | float |
|資產總額 | `data.get('us_fundamental_ART:assets')`  | float |
|流動資產 | `data.get('us_fundamental_ART:assetsc')`  | float |
|非流動資產 | `data.get('us_fundamental_ART:assetsnc')`  | float |
|短期現金及現金等價物 | `data.get('us_fundamental_ART:cashneq')`  | float |
|短期現金及現金等價物(美元) | `data.get('us_fundamental_ART:cashnequsd')`  | float |
|總負債 | `data.get('us_fundamental_ART:debt')`  | float |
|流動負債 | `data.get('us_fundamental_ART:debtc')`  | float |
|非流動負債 | `data.get('us_fundamental_ART:debtnc')`  | float |
|總負債(美元) | `data.get('us_fundamental_ART:debtusd')`  | float |
|透過損益按比例分攤的收入 | `data.get('us_fundamental_ART:deferredrev')`  | float |
|存款 | `data.get('us_fundamental_ART:deposits')`  | float |
|股東權益 | `data.get('us_fundamental_ART:equity')`  | float |
|股東權益(美元) | `data.get('us_fundamental_ART:equityusd')`  | float |
|無形資產 | `data.get('us_fundamental_ART:intangibles')`  | float |
|存貨 | `data.get('us_fundamental_ART:inventory')`  | float |
|投資 | `data.get('us_fundamental_ART:investments')`  | float |
|投資 (流動) | `data.get('us_fundamental_ART:investmentsc')`  | float |
|投資 (非流動) | `data.get('us_fundamental_ART:investmentsnc')`  | float |
|負債 | `data.get('us_fundamental_ART:liabilities')`  | float |
|負債 (流動) | `data.get('us_fundamental_ART:liabilitiesc')`  | float |
|負債 (非流動) | `data.get('us_fundamental_ART:liabilitiesnc')`  | float |
|應付帳款 | `data.get('us_fundamental_ART:payables')`  | float |
|固定資產淨值 | `data.get('us_fundamental_ART:ppnenet')`  | float |
|應收帳款 | `data.get('us_fundamental_ART:receivables')`  | float |
|保留盈餘 | `data.get('us_fundamental_ART:retearn')`  | float |
|延稅資產 | `data.get('us_fundamental_ART:taxassets')`  | float |
|延稅負債 | `data.get('us_fundamental_ART:taxliabilities')`  | float |
|營業成本 | `data.get('us_fundamental_ART:cor')`  | float |
|綜合收益 | `data.get('us_fundamental_ART:consolinc')`  | float |
|每股股息 | `data.get('us_fundamental_ART:dps')`  | float |
|息稅前利潤 | `data.get('us_fundamental_ART:ebit')`  | float |
|息稅前利潤(美元) | `data.get('us_fundamental_ART:ebitusd')`  | float |
|每股盈餘 | `data.get('us_fundamental_ART:eps')`  | float |
|稀釋每股盈餘 | `data.get('us_fundamental_ART:epsdil')`  | float |
|每股盈餘(美元) | `data.get('us_fundamental_ART:epsusd')`  | float |
|毛利 | `data.get('us_fundamental_ART:gp')`  | float |
|無形資產攤銷 | `data.get('us_fundamental_ART:intexp')`  | float |
|淨利 | `data.get('us_fundamental_ART:netinc')`  | float |
|淨利 (彌補非常項目後) | `data.get('us_fundamental_ART:netinccmn')`  | float |
|淨利 (彌補非常項目後)(美元) | `data.get('us_fundamental_ART:netinccmnusd')`  | float |
|淨利 (扣除 discontinued operations) | `data.get('us_fundamental_ART:netincdis')`  | float |
|淨利 (非經常性項目後) | `data.get('us_fundamental_ART:netincnci')`  | float |
|營業費用 | `data.get('us_fundamental_ART:opex')`  | float |
|營業利益 | `data.get('us_fundamental_ART:opinc')`  | float |
|優先股股息 | `data.get('us_fundamental_ART:prefdivis')`  | float |
|營收 | `data.get('us_fundamental_ART:revenue')`  | float |
|營收 (美元) | `data.get('us_fundamental_ART:revenueusd')`  | float |
|研發費用 | `data.get('us_fundamental_ART:rnd')`  | float |
|銷售、一般及行政費用 | `data.get('us_fundamental_ART:sgna')`  | float |
|稀釋加權平均股數 | `data.get('us_fundamental_ART:shareswa')`  | float |
|稀釋股份的加權平均數 | `data.get('us_fundamental_ART:shareswadil')`  | float |
|所得稅費用 | `data.get('us_fundamental_ART:taxexp')`  | float |
|資本支出 | `data.get('us_fundamental_ART:capex')`  | float |
|折舊和攤銷費用 | `data.get('us_fundamental_ART:depamor')`  | float |
|現金流量淨額 | `data.get('us_fundamental_ART:ncf')`  | float |
|現金流量淨額 (營業) | `data.get('us_fundamental_ART:ncfbus')`  | float |
|現金流量淨額 (普通股) | `data.get('us_fundamental_ART:ncfcommon')`  | float |
|現金流量淨額 (債務) | `data.get('us_fundamental_ART:ncfdebt')`  | float |
|現金流量淨額 (股息) | `data.get('us_fundamental_ART:ncfdiv')`  | float |
|現金流量淨額 (自由現金流量) | `data.get('us_fundamental_ART:ncff')`  | float |
|現金流量淨額 (投資) | `data.get('us_fundamental_ART:ncfi')`  | float |
|現金流量淨額 (投資活動) | `data.get('us_fundamental_ART:ncfinv')`  | float |
|現金流量淨額 (營運活動) | `data.get('us_fundamental_ART:ncfo')`  | float |
|現金流量淨額 (融資活動) | `data.get('us_fundamental_ART:ncfx')`  | float |
|關聯企業及合資公司的純收益 | `data.get('us_fundamental_ART:sbcomp')`  | float |
|財報發佈日 | `data.get('us_fundamental_ART:datekey')`  | datetime |
|財報週期 | `data.get('us_fundamental_ART:reportperiod')`  | datetime |
|最近更新日期 | `data.get('us_fundamental_ART:lastupdated')`  | datetime |
|股價 | `data.get('us_fundamental_ART:price')`  | float |
|股份轉換因子 | `data.get('us_fundamental_ART:sharefactor')`  | float |
|基本股數 | `data.get('us_fundamental_ART:sharesbas')`  | float |
|平均資產總額 | `data.get('us_fundamental_ART:assetsavg')`  | float |
|總資產週轉率 | `data.get('us_fundamental_ART:assetturnover')`  | float |
|每股淨資產 | `data.get('us_fundamental_ART:bvps')`  | float |
|流動比率 | `data.get('us_fundamental_ART:currentratio')`  | float |
|負債對股東權益比率 | `data.get('us_fundamental_ART:de')`  | float |
|股息收益率 | `data.get('us_fundamental_ART:divyield')`  | float |
|息稅折舊前利潤 | `data.get('us_fundamental_ART:ebitda')`  | float |
|息稅折舊前利潤率 | `data.get('us_fundamental_ART:ebitdamargin')`  | float |
|息稅折舊前利潤(美元) | `data.get('us_fundamental_ART:ebitdausd')`  | float |
|稅前利潤 | `data.get('us_fundamental_ART:ebt')`  | float |
|平均股東權益 | `data.get('us_fundamental_ART:equityavg')`  | float |
|企業價值 | `data.get('us_fundamental_ART:ev')`  | float |
|EV/息稅前利潤 | `data.get('us_fundamental_ART:evebit')`  | float |
|EV/息稅折舊前利潤 | `data.get('us_fundamental_ART:evebitda')`  | float |
|自由現金流 | `data.get('us_fundamental_ART:fcf')`  | float |
|每股自由現金流 | `data.get('us_fundamental_ART:fcfps')`  | float |
|外幣兌換率 | `data.get('us_fundamental_ART:fxusd')`  | float |
|毛利率 | `data.get('us_fundamental_ART:grossmargin')`  | float |
|投資人投入資本 | `data.get('us_fundamental_ART:invcap')`  | float |
|平均投資人投入資本 | `data.get('us_fundamental_ART:invcapavg')`  | float |
|市值 | `data.get('us_fundamental_ART:marketcap')`  | float |
|淨利率 | `data.get('us_fundamental_ART:netmargin')`  | float |
|股利發放比率 | `data.get('us_fundamental_ART:payoutratio')`  | float |
|市淨比 | `data.get('us_fundamental_ART:pb')`  | float |
|市盈率 | `data.get('us_fundamental_ART:pe')`  | float |
|市盈率 (預估) | `data.get('us_fundamental_ART:pe1')`  | float |
|市銷比 | `data.get('us_fundamental_ART:ps')`  | float |
|市銷比 (預估) | `data.get('us_fundamental_ART:ps1')`  | float |
|總資產報酬率 | `data.get('us_fundamental_ART:roa')`  | float |
|股東權益報酬率 | `data.get('us_fundamental_ART:roe')`  | float |
|投入資本回報率 | `data.get('us_fundamental_ART:roic')`  | float |
|銷售毛利率 | `data.get('us_fundamental_ART:ros')`  | float |
|每股銷售額 | `data.get('us_fundamental_ART:sps')`  | float |
|有形資產 | `data.get('us_fundamental_ART:tangibles')`  | float |
|每股淨資產 | `data.get('us_fundamental_ART:tbvps')`  | float |
|營運資金 | `data.get('us_fundamental_ART:workingcapital')`  | float |


#### 美股sp500歷史異動名單 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |

|動作 | dat.get('us_sp500')`  | str |
|公司名稱 | `data.get('us_sp500')`  | str |
|對造公司代號 | `data.get('us_sp500')`  | str |
|對造公司名稱 | `data.get('us_sp500')`  | str |
|註解 | `data.get('us_sp500')`  | str |


#### 美股企業基本資訊 free

|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|永久代號| `data.get('us_tickers')`  | str |
|公司名稱 | `data.get('us_tickers')`  | str |
|交易所 | `data.get('us_tickers')`  | str |
|是否下市 | `data.get('us_tickers')`  | str |
|類別 | `data.get('us_tickers')`  | str |
|證券識別碼 | `data.get('us_tickers')`  | str |
|標準工業碼 | `data.get('us_tickers')`  | str |
|標準部門 | `data.get('us_tickers')`  | str |
|標準工業 | `data.get('us_tickers')`  | str |
|法瑪部門 | `data.get('us_tickers')`  | str |
|法瑪工業 | `data.get('us_tickers')`  | str |
|部門 | `data.get('us_tickers')`  | str |
|工業 | `data.get('us_tickers')`  | str |
|市值規模 | `data.get('us_tickers')`  | str |
|營收規模 | `data.get('us_tickers')`  | str |
|相關代號 | `data.get('us_tickers')`  | str |
|貨幣 | `data.get('us_tickers')`  | str |
|地點 | `data.get('us_tickers')`  | str |
|第一季度 | `data.get('us_tickers')`  | str |
|近期季度 | `data.get('us_tickers')`  | str |
|sec監理網址 | `data.get('us_tickers')`  | str |
|公司網站 | `data.get('us_tickers')`  | str |


#### 美股普通股與特別股成交資訊 free
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|開盤價 | `data.get('us_price:open')`  | float |
|最高價 | `data.get('us_price:high')`  | float |
|最低價 | `data.get('us_price:low')`  | float |
|收盤價 | `data.get('us_price:close')`  | float |
|成交股數 | `data.get('us_price:volume')`  | float |
|還原收盤價 | `data.get('us_price:adj_close')`  | float |
|還原開盤價 | `data.get('us_price:adj_open')`  | float |
|還原最高價 | `data.get('us_price:adj_high')`  | float |
|還原最低價 | `data.get('us_price:adj_low')`  | float |


#### 美國失業率(季調) free

原則為每月第一個星期五公布上月失業率，取每月10好當安全截止日，避免回測到未來資料。
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|失業率 | `data.get('us_unemployment_rate_seasonally_adjusted:value')`  | float |

* * *

_

世界
--


#### 世界指數 free

國際主要股票指數，常用指數代碼:^GSPC(S&P 500),^DJI(Dow Jones Industrial Average),^IXIC(NASDAQ Composite),^TWII(TSEC weighted index)，詳細指數名稱對照請參考 https://finance.yahoo.com/world-indices
|資料名稱 | 使用方法 | 型態 |
| -- | -- | -- |
|open | `data.get('world_index:open')`  | float |
|high | `data.get('world_index:high')`  | float |
|low | `data.get('world_index:low')`  | float |
|close | `data.get('world_index:close')`  | float |
|adj_close | `data.get('world_index:adj_close')`  | float |
|vol | `data.get('world_index:vol')`  | float |

* * *