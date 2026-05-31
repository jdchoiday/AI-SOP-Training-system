# Kiwooza SOP 라이브러리 — 전체 인벤토리 & 커버리지 매니페스트

> 생성: 2026-05-31 · 출처: Google Drive 전체 스캔 (마스터 폴더 `1jy5fZyy…` + 레거시 작업 폴더)
> 목적: 트레이닝 시스템에 변환할 실제 운영 SOP를 빠짐없이 파악하고, 빌드 진행 상태를 추적한다.

## 0. 요약 (한눈에)

- **공식 번호 카테고리(01~10)는 대부분 빈 껍데기**다. `05 Market` `07 Strong` `08 Birthday` `10 Art` `04 Omi Cafe` `09 AION Kinder` 모두 **파일 0개**. `01 Playground`는 PDF 가이드북 3개뿐.
- **실제 운영 SOP 문서는 전부 레거시 작업 폴더에 몰려 있다** → INFO/Cashier, Workshop, Bar/Omi, Party, Market(단독), Playground Manual, Strong.
- **훈련 대상 운영 SOP ≈ 41건** (시트·바로가기·중복·투자덱 제외).
- **변환 완료(추정) ≈ 7건** → 커버리지 약 **17%**. 라이브 앱/Supabase에 발행돼 있고 레포엔 한국어 시드 7개만 존재.

---

## 1. 부서별 SOP 목록 (훈련 대상)

상태 범례: 🟢 Drive 발행완료 · ✅ 변환완료(확인필요) · 🟨 추출완료(PUBLISH-ME, 발행대기) · 🔶 부분/유사문서로 커버 · ⬜ 미착수 · ⛔ 훈련대상 아님

> **발행 규칙 (중요):** 원문 SOP(kus@/mari@ 소유)는 **절대 수정·이동하지 않는다.** 모든 발행본은
> 사용자 My Drive의 신규 폴더 **`Kiwooza SOP - 트레이닝 발행본 (AI생성)`** (`1VujP0_C9pjPmyiA4jPEpgMuZ35ObiSHT`)
> 안에만 새 GDoc으로 생성한다.

### A. WORKSHOP (키즈카페 / Kiwooza Workshop)
폴더: `1ZlP_6hp0NeVqDnGEs_occHEHgGEF-m5x`

| # | 제목 | 형식 | fileId | 상태 |
|---|------|------|--------|------|
| A1 | SOP - QUY TRÌNH VẬN HÀNH WORKSHOP (2024) | docx 5.7MB | `1zL8yaKJM1E5WvBrv5iCBSy8vFHySD254` | 🔶 |
| A2 | SOP - QUY TRÌNH VẬN HÀNH WORKSHOP (2021, 중복) | docx 18.9MB | `1p_kleECPxzV9aVgPCjMqiNalzS1P9YDi` | ⛔ 중복 |
| A3 | WORKSHOP SOP - ART CLASS (8단계) | GDoc | `1d75H7lLJFYqzX34jO0VhP2wFbmgkDhFROZA005eeFLQ` | 🟢 발행 `1u-DKMxynq_GSbqJho_zGeg2UpIlKt27oBNp3EetFT_I` · src `WS-01-art-class.md` (read 검증) |
| A4 | WORKSHOP SOP - CANDLE CLASS (14섹션) | GDoc | `1XlvBgmyabBw1U8EicRDQpB1GZBlr_gZPomf_tbbbbik` | 🟢 발행 `1YZPKflDG72PFyytzXjFDB3-MkqLYT1oWP5l8meqB9PY` · src `WS-02-candle-class.md` (read 검증) |
| A5 | WORKSHOP SOP - SETUP SLIME CHO TIỆC SINH NHẬT (14섹션) | GDoc | `1aRq1nkwLNvYLHZlf-onuKUgSoRqeAZQwk6xrD2KWuUs` | 🟢 발행 **v2** `1OPBIpgXNmafHPozgUjyvhl8y_hAUqhrK1AjSbet2DKQ` · src `WS-03-slime-class.md` ⚠️원문 5장~=양초내용(파일오류) · 구버전 `18ffduhp…`(추출오류) 폐기 |
| A6 | Workshop - Teaching Class Manual | GDoc | `1mSPwlhpFF9mN4_wPl0xWzfwkYFlKZ24nPZwVV3buR00` | 🟢 발행 **v2** `16QF9JGX3T9ukFn2j827DeF6hnrn7dYESfPvoetj1Xo4` · src `WS-04-teaching-class.md` (Pizza예시·VN/EN) · 구버전 `1FROZf…`(부정확) 폐기 |
| A7 | Workshop airdry clay manual | 바로가기 | `1c2RPzj-sWy2t1Gml-mTgnri93QC2krnC` | ⬜ |
| A8 | Workshop cooking manual | 바로가기 | `1zGnyRR65fJD5pk5W2173pJJ2LwbotpH2` | ⬜ |
| A9 | WORKSHOP SALE SCRIPT 2025 | 바로가기 | `1fFzJxVvFoGikJy_wS--Pbx7RmWx6AIRh` | ⬜ |
| A10 | Workshop Cleaning Checklist | 바로가기 | `1jHvkFMC6yQBQKgbguiEpnKOajybKGDis` | ⬜ |
| A11 | WORKSHOP STAFF TRAINING 2024.pdf | 바로가기 | `16rTJjKNTZVX5K4uMFCTleodQfuJKqrNG` | ⬜ |
| A12 | Workshop slime manual (하위폴더) | 폴더 | `1ac5giTEf6P-VJofxUgkqFCOsZrcw5Wsg` | 🔶 |

### B. MARKET (키즈카페 / Kiwooza Market)
단독 문서, 폴더 `1-swu89fBf2MHaRxFk9cOSORck7SkxT4b`

| # | 제목 | 형식 | fileId | 상태 |
|---|------|------|--------|------|
| B1 | SOP-MARKET-QUY TRÌNH VẬN HÀNH MARKET (170°, Wappen, cukcuk) | GDoc | `160vgFVTJC-nYIEcNgQKB95YX6Ru7m-1pFK7JF5XeQt0` | ✅ |

### C. PARTY (키즈카페 / Birthday Party)
폴더: `14I8DBIF1tdcAZoR9c1VUKDoueiTT-Fwc`

| # | 제목 | 형식 | fileId | 상태 |
|---|------|------|--------|------|
| C1 | SOP - PARTY - Cách sử dụng BEO | GDoc | `1tSqbtfnGQDWQ8vyDoFjxXcQKn7GQtpeGPqp4KloPSN8` | ✅ |
| C2 | SOP - PARTY - Check list Tiệc | Sheet | `1eS5NvkDS5Lu85w1miRWgNIYexdWJuZTvsMilfgOVomI` | ⛔ 체크리스트 |
| C3 | SOP - Quy trình trang trí, chuẩn bị tiệc ELIS | GDoc | `1LVRp5qI_gFQMhTV3hNrgrRg_WdknyKzqk1YKFtqX--A` | 🟢 발행 `1NGFtsi0zfvbpx1l2wlu7soHKtABpmGw6i0ynDjgR7Gc` · src `content/키즈카페/_PUBLISH-ME/PARTY-02-elis-setup.md` |
| C4 | PUBLISH-ME — SOP PARTY BEO (full text extract, 내가 생성) | GDoc | `1Isz4cXhw2ODl0XN1tCjfsMxEBhWw9fTXU-7h60PFl04` | ✅ 추출본 |

### D. INFO DESK / CASHIER / SERVICE (키즈카페 공통 운영)
폴더: `1EyQIupojUYBlnfT4pze9szUIJlzgkbF6` (+ CRM 폴더 `1TSl18lkEgwA1-A89z-27kYZX2R0fjsnK`)

| # | 제목 | fileId | 상태 |
|---|------|--------|------|
| D1 | SOP-INFO-QUY TRÌNH CHECK IN - ĐÓN KHÁCH | `1Hvr0NI2uDVmsNaKbYcj-QL0TNpzjxpjw` | 🟢 발행 `18yr6lwuNPJl0uH6pIqCUGMN-N3vOeepcBAkbEGoTdKk` · src `content/키즈카페/_PUBLISH-ME/INFO-01-check-in.md` |
| D2 | SOP-INFO-QUY TRÌNH MỞ QUẦY INFORMATION (오픈) | `1UCIjpDODTDUCtSyxbZAxpgvRQI3H19jy` | 🟢 발행 `1dxewOkJqlCaJ98G92CW7tMGzScVfP3ujlmSr87qV2_o` · src `content/키즈카페/_PUBLISH-ME/INFO-02-open-counter.md` |
| D3 | SOP-INFO-QUY TRÌNH ĐÓNG QUẦY INFORMATION (마감) | `1SDZTXlKYLCJ6wCKcujQTvxVNFSvpR4Cj` | 🟢 발행 `16lpZ200dzeT1LZS_Um2GtvrSpJTXMs26g_ZWCsDrBmw` · src `content/키즈카페/_PUBLISH-ME/INFO-03-close-counter.md` |
| D4 | SOP-INFO-SẮP XẾP/DỌN VỆ SINH QUẦY CASHIER | `1nSTnB5jo7sf6tnmY72xY44WnFbC94Cfu` | 🟢 발행 `1ydiSW9T0rUfU-ig0LNpHNmfbcQjubju3tb9a7Nrosb0` · src `content/키즈카페/_PUBLISH-ME/INFO-08-cashier-cleanup.md` |
| D5 | SOP-INFO-ÁP DỤNG CHO HOTESS | `1b1qGS_tQvBKJa5xljBVdWV1d_6R9241I` | 🟢 발행 `1oPBSoLLPzVwHTGivb7hTRMYjN64Wt4VOWe5fwzg6FQ4` · src `content/키즈카페/_PUBLISH-ME/INFO-07-hostess.md` ⚠️INFO-01과 불일치(문서내 명시) |
| D6 | SOP-INFO-QUY TRÌNH ORDER TRÊN CUKCUK | `1LwePRDC1ekTa3BAUTUn8epx0JycYHZ81` | 🟢 발행 `11H5fKSp0K_EUtnNcJydDlhBD4YKWQ3FJyzAKIriuMAc` · src `content/키즈카페/_PUBLISH-ME/INFO-04-cukcuk-order.md` |
| D7 | SOP-SERVICE-NHÂN VIÊN THỰC HIỆN ORDER | `1N1_2GiFSfPwCSeEPB3TaAnQ3T-YjA8lk` | 🟢 발행 `1IH158t3Zcbsc-94JPzl7IFwemj7-aguMzgJNKTSFB5w` · src `content/키즈카페/_PUBLISH-ME/INFO-05-staff-take-order.md` |
| D8 | SOP-INFO-TẠO ĐẶT CỌC TRÊN CUKCUK | `1ZJR6YXLwq8NuoKKscYyLDp-9k09jWn7d` | 🟢 발행 `14WcZBPqwxdfGh4ypkptkIwxc1dxfvPJ6bqCVg0PC13c` · src `content/키즈카페/_PUBLISH-ME/INFO-09-deposit-create-cukcuk.md` |
| D9 | SOP-INFO-Đặt cọc tiệc và cách trừ đặt cọc | `1eSlGb4klhtZWBC3weIPRsblVlcF-Mzxthkfg29B81O4` | 🟢 발행 `10_BSv0e7IoIJf5Jw1Z-U-K-pFhmFhm928iTpYEtVnCs` · src `content/키즈카페/_PUBLISH-ME/INFO-10-party-deposit-policy.md` |
| D10 | SOP-INFO-LÀM BÁO CÁO DOANH THU (매출보고) | `1_Lfagi_l6XELaQ2RNHmEjrpeccz3vA0C` | 🟢 발행 `1FQpyel0C2yXneyX4lPvwPvbYY_AX6nx6S53eEt-7kV4` · src `content/키즈카페/_PUBLISH-ME/INFO-06-daily-revenue-report.md` |
| D11 | SOP-INFO-Thanh toán mới cho Cashier 2025 | `1A4f8qmsAwleFsd7rgYc83KlS4SepzRrD` | 🟢 발행 `1gZvtDOUcAWuhBY064tHTsKWa3rpyQofdA2N69yZl3P0` · src `content/키즈카페/_PUBLISH-ME/INFO-11-cashier-rules-2025.md` |
| D12 | SOP-INFO-Xuất hoá đơn VAT | `1buIS-_3vVjRYV1zZrgwBVIY9cGtxw7wJX5ELxdWeYUQ` | 🟢 발행 `1r8Rn_h1SJd1OeSNkz7JJ9biKxU_FPhZAOKKBysPKA_Q` · src `content/키즈카페/_PUBLISH-ME/INFO-12-vat-invoice.md` |
| D13 | SOP-INFO-Đóng gói bill gửi Cơ quan thuế | `1QrATZHxNbHC09H8ncmNFSAlHcsS6UxBj9H5XldEJgNM` | 🟢 발행 `1Mv6OPm0nBxjCWZaWElAFmgfU1VU4gEVIgY8Gn_LaO5I` · src `content/키즈카페/_PUBLISH-ME/INFO-13-tax-bill-packaging.md` |
| D14 | SOP-INFO-15 LOST AND FOUND REGISTER | `1Na05K5p3yYsk15QfUdtAPz8fpPZblnJw7iDgaBXFnF4` | 🟢 발행 `1h1pVR7VKOH8H66b1aFLB8R334phSBTQM1k4Vdf5vpLw` · src `content/키즈카페/_PUBLISH-ME/INFO-14-lost-and-found.md` |
| D15 | THISO-CHECKIN-OUT CHI NHÁNH KIWOOZA THISO | `1PdjhuJd9X5j3fS6tST4l2J8OJodnzBu1mrGdnySAAJM` | 🟢 발행 `1YLOQ7d6pdr2WYjKZnnfrHr_0-eoZEYrX6_zAR_qZwxw` · src `content/키즈카페/_PUBLISH-ME/INFO-15-thiso-checkin-out.md` |
| D16 | THISO-ĐĂNG KÝ XNH-THI CÔNG HỆ THỐNG ONLINE | `1-lGPNUTWqa9DU0yrzPpBNzNfs_1F4dOT-hCmPdG3k3Q` | 🟢 발행 `1dBj6hU8vkRxZkaSaVdAcaemTM-4cSKE5AyUOpHgq2_8` · src `content/키즈카페/_PUBLISH-ME/INFO-16-thiso-online-registration.md` |
| D17 | SOP-TẮT/MỞ HỆ THỐNG ĐIỆN CHI NHÁNH THISO | `1gCgcfGdlrmnATY9oYJvWa_Wcj05BKnvOu45IR16b2vY` | 🟢 발행 `1AQLMW9anSV0E4f0j8SnBTkeu_LE41uWuT2eJ9F2DXRg` · src `content/키즈카페/_PUBLISH-ME/INFO-17-thiso-electrical.md` |
| D18 | THISO-BÁO CÁO HÌNH ẢNH ĐÓNG CA | `1kWDswk9ektRJZTXWjUzgbWZQ_JrbyluimCyJ56WWBOI` | 🟢 발행 `1wlWQu8-zJDZhZ3j_KeTmHLSmUE8jmCumnlBj9hFW2MY` · src `content/키즈카페/_PUBLISH-ME/INFO-18-thiso-closing-photo-report.md` |
| D19 | 2025-SOP-CASHIER-NHẬP DATA KHÁCH HÀNG | `1rHaP5tnpwueUJfKMOGRiIqIUH0GUkJ9vPxl9-YyTC98` | 🟢 발행 `1xuS5p-CPpZsqxCtggnrMQn7njcLmyvS_YYK-0QT2YLE` · src `INFO-19-cashier-customer-data.md` (원문=YouTube 링크뿐) |
| D20 | 2025 SOP-CRM-Zalo OA | `1iHN8n0dPKb2pVIVGij0JOOlClWtmqO0kfFm2poNNrsI` | 🟢 발행 `1Ead26FQo7096rQMWvye1hvdgFuv7lD-f28dQJ7vgJdc` · src `INFO-20-crm-zalo-oa.md` (원문 제목=Zalo OA지만 내용=Misa편집 7단계) |
| D21 | 2025 SOP-CRM-Misa Lomas | `1Ywf6I6xO0YEfCktdqBZJX51NlJAepydstgt2917wH7k` | 🟢 발행 `11k49ZhraxH3cMq1DIVS1xb9Wt1L_64yDC6gV0zeN-S4` · src `INFO-21-crm-misa-lomas.md` (원문=도움말 링크뿐) |

### E. BAR / OMI CAFE (KBBQ 테넌트, 영문 SOP)
폴더: `10UxiQ898Tk2ZKj8JM1ZBnDTVONyY6mpl` (+ 주방 `1zmZPWp1…`, 구매 `19D7Sdtex…`)

| # | 제목 | fileId | 상태 |
|---|------|--------|------|
| E1 | SOP-OPEN and CLOSING THE BAR | `1KawBDSGQm6yC0BdrsOXel5Y8rz8dqkr6` | 🟢 발행 `1g2D-rqhFq9w92wPYseu8wZiO7JGB9w6bWsno8g6B-uw` · src `BAR-01-open-close.md` |
| E2 | SOP-CLEANLINESS OF THE BAR | `19UeyZHCKe7FNWoygENaJkCafPV1IUNrD` | 🟢 발행 `1PCL32AEi3sQg9VWngFpC0Fil2AAOmEtoMbDEVOyEc4w` · src `BAR-02-cleanliness.md` |
| E3 | SOP-HOW TO OPERATE MINI BAR | `1njQx_BOBSDTbji_hDjb-rFVcO2afApfzoSjTuw7a8Wg` | 🟢 발행 `1v89yzt3IcHy2lRdtZxb4ZHDJYRgvi_47IPsDdzASKcg` · src `BAR-03-mini-bar.md` |
| E4 | SOP-INVENTORY CONTROL | `1t3vSqWWh3_wic4U3nRS5tWegO92A8BIK` | 🟢 발행 `1ecSiPsmIq455_piro-vHSKXaakj322KXS55l9J1W5jM` · src `BAR-04-inventory-control.md` |
| E5 | SOP-OPEN/SERVE RED WINE | `1eXBN-PHhXKjaBkr52-UUZqf-8R7Ih3-p` | 🟢 발행 `1v4nfzc4pV6pHpIejzjuDe6VoJRl8luhRtSboJk1RKWs` · src `BAR-05-red-wine.md` |
| E6 | SOP-OPEN/SERVE WHITE WINE | `1BOyMCwN82sOZSH2ZSeNerEj8GP3b8hPB` | 🟢 발행 `1p37uIJR59joNvysK5cgcC05riaagXXL60gmCIlsdMqs` · src `BAR-06-white-wine.md` |
| E7 | SOP-OPEN/SERVE SPARKLING WINE | `1xEfafzTThMMCb6hkS4GHGhWhDS0OjQE2` | 🟢 발행 `19ML_Vjn2PtmBaKOOz3wSOkkuEFQgvsJXr4hZh-jBIh0` · src `BAR-07-sparkling-wine.md` |
| E8 | SOP-SERVING DRAFT BEER | `1LK9CsZMovGJ0YgwwaUpB2P232j2cXWPN` | 🟢 발행 `1Hw-yYCmMsCgqDL2EtF2Y7f3XLGR2RitQmLzoHcPwsOk` · src `BAR-08-draft-beer.md` |
| E9 | SOP-CHECKING COOLING EQUIPMENT | `1RvahRn9liRjpNtsmc4cIP9adV6t2DwFm` | 🟨 src `BAR-09-cooling-equipment.md` · 발행대기 |
| E10 | SOP-RECEIVE AND STOCK STORAGE | `1s6-S7-u5F9qwNlkzt_i-vb2xTFyYl1xt` | 🟨 src `BAR-10-receive-stock-storage.md` · 발행대기 |
| E11 | SOP-SANITATION / FOOD BORNE ILLNESS | `1j8lZoQnmR4MOzsMJgmubQeZ05x9zR7JO` | 🟨 src `BAR-11-sanitation.md` · 발행대기 |
| E12 | SOP-SETTING UP COFFEE MACHINE | `1RgMkMupUBMcxxKAUzgiHPS1M9tIe-Ej2` | 🟨 src `BAR-12-coffee-machine-setup.md` · 발행대기 |
| E13 | SOP-STOCKING REFRIGERATOR | `1F3Sql_17htejnRdz-6xoKXYyx8T4beFQ` | 🟨 src `BAR-13-stocking-refrigerator.md` · 발행대기 |
| E14 | SOP-CLEANLINESS OF THE KITCHEN | `1yvr-c2nxlDIao08n1Oqxyjn2Ip-JjNvf` | 🟨 src `BAR-14-kitchen-cleanliness.md` · 발행대기 |
| E15 | SOP PURCHASING | `1CkrN9qDOc3ZSf2pKQslTvBMpjLrsuC9t` | 🟨 src `BAR-15-purchasing.md` · 발행대기 |

### F. PLAYGROUND / STRONG (레거시 매뉴얼 — 2차 우선순위)
PLAYGROUND Manual `1eKM0if0b6G17zG7Qj0DTT3anaZslxGkp` (하위: Staff/Areas/Games Manual) · Strong `1uF114phltfPnvGOCGM69B6gR0f0K750A`

| # | 제목 | fileId | 상태 |
|---|------|--------|------|
| F1 | Kiwooza Play Manual - Giới Thiệu Và Mục Đích (VN) | `1ZVqqLuwtKENyB8NELCwbP1e3V2QAz5rcyB8uBYpqLuI` | ⬜ |
| F2 | Kiwooza Play Manual - Introduce And Purpose (EN) | `1lGJ86v1YfhzI8tA5ldkkJIQ32rRbNOrLo9ezkvh_PGo` | ⬜ |
| F3 | Playground Defect Manual (폴더) | `1VSkrxs0HQxUUAQbSvWigfqx6d5VJ7kw8` | ⬜ |
| F4 | Staff/Areas/Games Manual (하위폴더, 미열람) | `1gwZW7…/10gGHM2…/17xpejCe…` | ⬜ |
| F5 | Kiwooza Strong Program Story + Strong Teacher Manual(EN/VN) | `11SWke4Rl8…` / `1uA9BE8sTm…` | ⬜ |

---

## 2. 변환 완료 추정 7건 (라이브 앱/Supabase) — **사용자 확인 필요**
이전 세션에서 작업한 것으로 추정: MARKET(B1), SLIME(A5), CANDLE(A4·유사), Teaching(A6), WORKSHOP운영(A1), BEO(C1), + 1건.
→ 레포엔 한국어 generic 시드만 존재(`js/sop-content-kids.js`: open/service/safety/equipment/hygiene/emergency/closing). 정확한 발행 목록은 앱에서 확인할 것.

## 3. 권장 빌드 순서
1. **ART CLASS(A3)** — 가장 알찬 8단계 교육매뉴얼인데 누락. 최우선.
2. Workshop 잔여: airdry clay(A7)·cooking(A8)·sale script(A9). Workshop 세트 완성.
3. INFO 핵심 4종: 체크인(D1)·오픈(D2)·마감(D3)·order cukcuk(D6). 키즈카페 운영 골격.
4. PARTY ELIS(C3) + Party 세트 완성.
5. KBBQ 테넌트: Bar 오픈/마감(E1)·위생(E2,E14)·와인 3종(E5~E7)·생맥주(E8) 등.

## 4. 제외 항목(훈련대상 아님)
브랜드덱·투자덱(`[ENG] Kiwooza Edutainment`, `Diamond City`, `Partnership`…), Application/Communication PDF, SOP Template, master 스프레드시트, 99 Brand Guides, 00 archive, 03 VBM, 09 AION Kinder(빈 폴더), 04 Omi Cafe(빈 폴더).
