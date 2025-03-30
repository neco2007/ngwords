// メルカリNGワードブロッカー最終強化版 - 完全修正版

// 設定
const CONFIG = {
  // デバッグモード (false = 本番環境用)
  debugMode: false,
  // 検索結果の一括処理数
  batchSize: 30,
  // DOM変更の監視間隔 (ms)
  observerDebounce: 300,
  // ブロック強度
  blockStrength: 'max',
  // リダイレクト先URL
  homeUrl: 'https://jp.mercari.com/',
  // リダイレクト遅延時間 (ms)
  redirectDelay: 1500
};

// グローバル変数
let isFilterActive = false;           // フィルタの有効/無効状態
let observer = null;                  // MutationObserver
let observerTimeout = null;           // 監視タイムアウト
let searchInputMonitored = false;     // 検索入力監視状態
let lastUrl = location.href;          // URL変更検知用
let customNgWords = [];               // ユーザー設定のNGワード
let blockCount = 0;                   // ブロックした商品数のカウンター
let controlPanelVisible = true;       // コントロールパネルの表示状態
let isAdvancedPanelOpen = false;      // 詳細パネルの表示状態
let isProcessing = false;             // 処理中フラグ
let processedElements = new Set();    // 処理済み要素を追跡するためのセット

// 最小限のログ出力用関数
function log(message, type = 'info') {
  if (!CONFIG.debugMode && type === 'debug') return;
  
  const prefix = type === 'error' ? '🛑 エラー:' : 
                 type === 'warn' ? '⚠️ 警告:' : 
                 '✓';
  
  console.log(`[NGブロッカー] ${prefix} ${message}`);
}

// 直接指定するNGワードリスト
const directNgWords = [
  // 4300以上のブランド名などのNGワードがここに定義されています（省略）
  "Copic", "IL BISONTE", "Lindt", "'47", "★wy★", "101 DALMATIANS", "10Gtek", "17906697543", 
              "2pac", "397395458?", "3CE", "3Dペン", "3M", "5 Seconds Of Summer", "5.11", "52TOYS", 
              "551HORAI", "551蓬莱", "8tail", "A Bathing Ape", "A. LANGE & SOHNE", "A.D.M.J.", 
              "A.LANGE&SOHNE", "A.P.C.", "a.v.v", "A&F", "A＆J", "A＆W", "A|X ARMANI EXCHANGE", 
              "AAAHH!!! REAL MONSTERS", "ABAHOUSE", "ABITOKYO", "Aboniton", "Abu Garcia", "ABUS", 
              "Acco Brand", "AcecooK", "acer", "ACG", "ACGカード", "ACQUA DI PARMA", "adabat", 
              "Adam & Eve", "Adam & Eve", "aden + anais", "aden + anais", "aden+anais", "ADERIA", 
              "adidas", "adidas", "Adobe", "ADVENTURE TIME", "AESCO", "AESCO", "Aesop", "AESTURA", 
              "AFURI", "agnes b.", "Agnes b.", "AGV", "Ahsoka", "Aigle", "aimoha", "AIR JORDAN", 
              "AIRBORNE", "AIRFIX", "AIRFIX", "AIRFIX", "airkaol", "AirPods", "AIRWALK", "airweave", 
              "AirWrap", "AISFA", "AIXUAN", "AJAX", "Ajinomoto", "Akebono", "AKOMEYA TOKYO", "AKTR", 
              "ALBERTO GIACOMETTI", "ALBION", "ALDIOUS", "Alexander McQueen", "Alfa Romeo", 
              "Alice in Chains", "Alice in Wonderland", "ALICIA KEYS", "Alienware", "ALLMIRA", 
              "ALPHA INDUSTRIES", "Alpinestars", "ALSOK", "Amarikan", "Amazon", "AMCREST", "Ameri", 
              "AMI PARIS", "amiibo", "amiibo", "AMIMOC", "Amiparis", "Among Us", "AmorePacifi", 
              "Amway", "Amway Queen", "Amy Winehouse", "Anchor Hocking", "AND THE FRIET", 
              "AND THE FRIET", "Andux", "Andy Warhol", "ANGFA", "ANGRY BIRD", "ANGRY BIRDS", "Anker", 
              "ANNA SUI", "Anne of Green Gables", "Anopono", "ANPANMAN", "Ansell", "ANT-MAN", 
              "ANTEPRIMA", "ANTI SOCIAL SOCIAL CLUB", "ANUA", "aoashi", "AONCIA", "aosta", "AOWOFS", 
              "apc", "Ape", "APEX LEGENDS", "Aphex Twin", "APHISON", "Apollo", "Apple", "Apple Watch", 
              "AQA", "Aqua Garage", "AQUAMAN", "ARABIA", "ARAMIS", "Arc'teryx", "Arc'teryx", 
              "Arc'teryx", "Arc'teryx", "Arc'teryx", "Arch Enemy", "ARCOROC", "ARCTIC MONKEYS", 
              "Ardbeg", "Ares", "Ariana Grande", "ARIAT", "Arizona Diamondbacks", "ARM＆HAMMER", 
              "Armuje", "Arnold Palmer", "aromab", "ARSOA", "ARTEC", "ARTEZA", "ARTIBETTER", 
              "article number", "Asahipen", "asics", "ASRock", "ASSASSIN'S CREED", "ASTRO", 
              "ASTRO gaming", "ASUS", "ASVEL", "Asvine", "ATAO", "ATEEZ", "ATEX", "ATHLETA", 
              "Attack on Titan", "Attenir", "Attipas", "Audemars Piguet", "AUDI", "Audio-Technica", 
              "Aujen", "AUKEY", "AUTOBOT", "AVEDA", "Avenged Sevenfold", "AVENGERS", "AVerMedia", 
              "ａｖｅｘ", "avex trax", "Aviationtag", "AVICII", "Avirex", "AVON", "Avril Lavigne", 
              "AWASAKA", "AWS", "AWS", "AXLUCE", "AXXZIA", "AYANOKOJI", "Azarxis", "AZUL by moussy", 
              "azuma", "b.glen", "B.V.D", "B´full", "Babbi", "Babolat", "Baby Bus", "Baby Shark", 
              "BabyBjorn", "BABYMETAL", "babymetal", "Babymetal", "BACARDI", "Baccarat", 
              "BACK TO THE FUTURE", "Back To The Future", "Backstreet Boys", "Bad Religion", "Bafup", 
              "BAGGU", "bagsmart", "BAGUETTE", "BAHCO", "BAILEYS", "Bailive", "BAKUGAN", "Balenciaga", 
              "BALLARINI", "Ballsey", "BALLY", "Balmain", "BamBam", "BAN INOUE", "BANANA FISH", 
              "BANANA REPUBLIC", "BANDAI", "BANDAI NAMCO Entertainment", "BANDEL", "BANG & OLUFSEN", 
              "bankoo", "BANPREST", "BANPRESTO", "BAPE", "barbie", "BARBOUR", "Barebones", 
              "Barefoot Dreams", "Barkbox", "Barkbox", "BASARA", "Bass Pro Shops", "Bassday", 
              "Bath & Body Works", "BATMAN", "BATMOBILE", "Battlestar Galactica", "BAUME &MERCIER", 
              "BBB", "BBK", "BBM", "BBS", "BBT", "BE@RBRICK", "BE+WANTS", "beabadoobee", "beabadoobee", 
              "BEARDSLEY", "Beastie Boys", "Beatles", "Beavis and Butt-Head", "Beefeater", 
              "BEETLEJUICE", "BEIJING 2022", "BELLA＋CANVAS", "BELLE MAISON", "BeMoLo", 
              "Bendy and the Ink", "Benee", "Benefique", "Benefit", "BenQ", "Beretta", "Berluti", 
              "BESTEVER", "Bestway", "BETTY BOOP", "bettyboop", "Beverly Hills Polo Club", 
              "BEY BLADE", "ＢＥＹＢＬＡＤＥ", "BEYBLADE", "ＢＥＹＢＬＡＤＥ ベイブレードバースト", 
              "BEYBLADEバースト", "Beyoncé", "BFGOODRICH", "BGM", "Bialetti", "BIANCHI", "bibigo", 
              "BiC", "BiC", "BICYCLE PRESTIGE", "Bidason", "Bieye", "BifiX", "BIGHIT MUSIC", 
              "BILLA BONG", "BILLABONG", "Billie Eilish", "Billy Joel", "bing", "BIOHEAL BOH", 
              "Bioré", "BIOTHERM", "BIRKENSTOCK", "Birkis", "Black Butler", "Black Clover", 
              "Black Hawk", "Black Label Society", "BLACK LAGOON", "Black Sabbath", "BLACK&DECKER", 
              "BLACKDEER", "BLACKHAWK", "BLACKPINK", "BLACKSTAR", "Blancpain", "BLENCIAGA", 
              "Bleu Bleuet", "Blink 182", "BLUCO", "BLUE BLUE", "BLUE MEN", "BlueBlue", "BluFied", 
              "Blythe", "BMW", "Bob Dylan", "Bob Marley", "bodum", "BODY CHAN", "BOGS", "Bon Jovi", 
              "Bonchi", "BONFORM", "BORMIOLI Rocco", "Boruto", "Bosch", "BOSE", "Boshiho", "boshiho", 
              "BOSS", "BOSS BABY", "Boston Red Sox", "Bottega Veneta", "Boy Pablo", "Boys be", 
              "BOZLES", "Branshes", "BRATZ", "BRATZ", "BRAVESHINE", "Brawl Stars", "Breitling", 
              "Brembo", "BrewDog", "Brewers", "Brewers", "Bric's", "BRIDGESTONE", "BRIEFING", 
              "BRIGGS & RILEY", "BRILBE", "Bring Me The Horizon", "Brioni", "BRITA", "BRITNEY SPEARS", 
              "Brixton", "BROCKHAMPTON", "Brooks Brothers", "Broptical", "BROS BY WACOAL MEN", 
              "Brother", "Bruce Lee", "BRUCE SPRINGSTEEN", "BRUNO", "Bruno Mars", "BT21", 
              "BTF-LIGHTING", "BTM", "BTS", "Budweiser", "BUFF", "BUGS BUNNY", "BULK HOMME", 
              "Bullet For My Valentine", "Bulova", "Bumkins", "Bungo Stray Dogs", "Bunnytoo", 
              "BURBERRY", "Burton", "BURTON", "Butterfly", "Butterfly", "BVLGARI", "ByFshow", 
              "C&F Design", "C&S", "CA4LA", "Cacharel", "Calbee", "CALL OF DUTY", "callaway", 
              "Callaway", "Callaway", "CalmMax", "CALQS", "Calvin klein", "Calyrex", "CamelBak", 
              "CAMELBAK", "Campagnolo", "CAMPARI", "CANADA GOOSE", "CanDo", "CanDo", "CANMAKE", 
              "Cannibal Corpse", "Canon", "Canterbury", "canterbury", "CAPCOM", "Capitol Records", 
              "Captain america", "CAPTAINSTAG", "Caran d'Ache", "Cardi B", "Care Bears", "CARESTAR", 
              "Carhartt", "Carhatt", "Caribou Coffee", "CARL", "CARLSBERG", "Caron", "CARRERA", 
              "Cartier", "CASDON", "Case-Mate", "CASETiFY", "CASIO", "Casio", "Castelli", "Castrol", 
              "CAT", "Catch me if you can", "Catch me if you can", "Cath kidston", "CATWOMAN", 
              "CAZAL", "CCILU", "CCINEE", "CELINE", "Celine Dion", "CERVELO", "Chacott", "Champion", 
              "CHANEL", "chanel", "chaps", "CHARLIE", "CHAUMET", "CHEECH & CHONG", "cheerios", 
              "CHEMICAL BROTHERS", "Chevrolet", "Chevrolet", "Chicago Bulls", "Chicago Cubs", 
              "chicco", "Chiikawa", "Chisafly", "Chloe", "Chloé", "Chopard", "Chopard ショパール", 
              "CHRIS CORNELL", "Chris Jericho", "Christian Louboutin", "Christofle", "Chrome Hearts", 
              "CHUMS", "Chupa Chups", "CIAO", "ciilee", "Cincinnati Reds", "Cinelli", "CINNAMOROLL", 
              "CipiCipi", "Circulon", "CIRCUS TRADING", "CIRCUS TRADING", "Cirque du Soleil", 
              "CITIZEN", "Clakllie", "CLARINS", "CLARINS", "Clé de Peau Beauté", "Cleveland Golf", 
              "Cleveland Guardians", "Cleveland Guardians", "CLINIQUE", "CLIO", "cloudstop", "CMC", 
              "COACH", "coach", "COBRA", "Cobra Kai", "Coca Cola", "Coca-Cola", "cocalero", 
              "CoComelon", "Code Geass", "COFFRET", "Colantotte", "COLDPLAY", "Cole Haan", "Coleman", 
              "COLGATE", "collex", "Colorado Rockies", "Columbia", "Comandante", "COMME des GARCONS", 
              "COMME des GARCONS", "Comme des Garcons", "COMTEC", "CONCISE", "Contac", "contigo", 
              "Continental", "Converse", "CONVERSE", "Converse", "Cookie Monster", "COOKPAD", "Copco", 
              "CORELLE", "Corkcicle", "ＣＯＲＰＥＲ・ＴＯＹＳ", "Cosme Decorte", "COSPA", "COSPLEE", 
              "COSRX", "COWBOY BEBOP", "Cowboy Bebop", "cozycube", "cp company", "CR7", 
              "Crankbrothers", "Crash Bandicoot", "CRAYOLA", "CRESSI", "Creva", "CRISTIANO RONALDO", 
              "Crocodile Creek", "Crocs", "CROSS", "CROSS", "CROSSFAITH", "Crpich", "Crucial", 
              "CRUELLA DE VIL", "CRYSIS", "Cuervo", "CUESOUL", "CUTEBEE", "Cyber Punk 2077", 
              "Cyberpunk 2077", "Cyberpunk2077", "Cygames", "Cypress Hill", "D-BROS", 
              "d'alba Piedmont", "DABADA", "DADWAY", "Daft Punk", "Daft Punk", "DAHON", "Daikin", 
              "DAIWA", "Dakine", "DANCYU", "DANGANRONPA", "Daniel Wellington", "DANSK", "DANSKIN", 
              "Daoko", "Dark Souls", "DARLING IN THE FRANXX", "DARTSLIVE", "DASCO", "DASKIN", 
              "DAYLILY", "Daytona", "DBPOWER", "DC Comics", "DC SHOES", "DDintex", "Dead By Daylight", 
              "DEADPOOL", "DeAGOSTINI", "DEAN & DELUCA", "DEAN＆DELUCA", "DEATH NYC", 
              "DEATH STRANDING", "DECENCIA", "DEELUXE", "deenor", "DEEPCOOL", "Def Leppard", 
              "Deftones", "Del Monte", "DELFONICS", "deli", "DELL", "Demon slayer Kimetsu", 
              "Demon slayer Kimetsu", "Demon's Souls", "DENSO", "Department 56", "DERAYEE", 
              "DESCENTE", "DESCENTE", "Desigual", "DESPICABLE ME", "Detroit Tigers", 
              "DEUTSCHER FUSSBALL-BUND", "DEWALT", "DexShell", "DHC", "dholic", "Diamondbacks", 
              "Dickies", "Diddl", "Digimon", "DINTO", "Dio", "Dior", "Diptyque", "Disney", 
              "Disney Moana", "DISNEY WISH", "DJI", "DKNY", "DMC", "DMV", "Doberman", "Dociote", 
              "DOCTOR WHO", "DOD", "Dodgers", "Dodgers", "DOG MAN", "DoggyMan", "Dolce&Gabbana", 
              "Dollfie", "Dollfie Dream", "Dolly Parton", "Dom Pérignon", "DOMINA", "Domina Games", 
              "Dora the Explorer", "Doritos", "Doritos", "Dotene", "doTERRA", "DOULTON", "DOULTON", 
              "DOULTON", "DPEAN", "Dr Pepper", "Dr Stone", "Dr. Martens", "Dr.Martens", "Dr.コパ", 
              "Dr.トーム", "Draft Top", "Dragon Ball", "Dream Theater", "Dreamparty", 
              "DREAMWORKS GABBY'S DOLLHOUSE", "DREAMWORKS THE BOSS BABY", "Dressy", "dretec", 
              "DREW HOUSE", "DTTO", "Dua Lipa", "Dualeco", "DUCAN", "DUcare", "DUKES OF HAZZARD", 
              "DULTON", "Dunhill", "Dunkin'", "Dunkin' Donuts", "DUNLOP", "DUOLEIMI", "DUPONT", 
              "Duracell", "DURALEX", "Duran Duran", "DUSKIN", "DXRacer", "dydo", "DYNAZENON", 
              "Dyson", "EA SPORTS", "EarthQuaker Devices", "Eastpack", "eastpak", "EASTPAK", 
              "Easy Sweep", "EASYDEW", "EAZY-E", "ebten", "Ecogear", "ed sheeran", "Edelbrock", 
              "EDISONThom Yorke", "EDWIN", "EENOUR", "EHEIM", "ekement", "EKORROT", "ELDEN RING", 
              "ELECOM", "Element", "ELGIN", "elitegrips", "ELLESSE", "elrinrin", "Elton John", 
              "Elvis Presley", "EMART", "Emerica", "Emilio Pucci", "EMILY IN PARIS", "EMINEM", 
              "EMIRATES", "Enagic", "Enagic", "Enagic", "EnderToys", "ENEOS", "EnergyPower", 
              "enesco", "enherb", "ENHYPEN", "ENRICO", "ENSKY", "EOTECH", "EPOCH", "EPOCH", "EPSON", 
              "erbaviva", "Ergobaby", "ERIC CLAPTON", "ERNIE BALL", "ESMERALDA", "ESPERANZA", 
              "Espoir", "ESPRIQUE", "Esselte", "Estée Lauder", "ete", "ETUDE", "ETUDE HOUSE", 
              "EUTHYMOL", "Evanescence", "EVE LOM", "Everlast", "evian", "EVISU", "EXO", "EXPO2025", 
              "F1 GRAND PRIX", "FABER CASTELL", "FABER-CASTELL", "FABER-CASTELL", "Fairtex", 
              "FAJNYDO", "Falcom", "FALCON", "FALKEN", "Fall Guys", "Fall Out Boy", "Fallout", 
              "FAMULIA", "FANCL", "Fangamer", "Fanta", "FANTASTIC BEASTS", "fao schwarz", 
              "Fashion Nova", "Fast & Furious", "Fast & Furious", "Fast & Furious", "Fast & Furious", 
              "Fast & Furious", "Fast&Furious", "FAUCHON", "FC Bayern", "FCS", "FEANDREA", 
              "Fear Of God", "febi bilstein", "FEDECA", "FEELCYCLE", "Feemom", "FEILER", "feliamo", 
              "Felimoa", "Felisi", "FELIX THE CAT", "Fender", "FENDI", "FERM LIVING", "FERNANDES", 
              "FERRAGAMO", "Ferrero Rocher", "FFBE", "FHLHY", "Fi.n.t", "Fiat", "FIELDOOR", "FIFA", 
              "FIGARO", "figma", "FILA", "FILLIMILLI", "Filofax", "Filson", "FINAL FANTASY", "Finelnno", 
              "fino", "Fire emblem", "Fireplace Tongs", "fischer", "Fisher-Price", "Fisher-Price", 
              "Fishman", "FISKARS", "Five Nights at Freddy", "Five Nights at Freddy's", 
              "Five Nights at Freddy's", "FiveFingerDeathPunch", "Fjällräven", "FLAIR FRAGRANCE", 
              "FLINTSTONES", "Fluffy Puffy", "FLYFLYGO", "FLYFUPPY", "Fodsports", "FOMANSH", 
              "FoMoCo", "FOO FIGHTERS", "FOODSAVER", "FootJoy", "Ford", "FORTNITE", "Fossil", 
              "FOX 40", "Fox Nation", "Fox Racing", "FOXFire", "fracora", "Francfranc", 
              "FRANCK MULLER", "Frank Ocean", "Frank Zappa", "Franklin Sports", "FRAY I.D", "FRCOLOR", 
              "FRED", "Fred Perry", "FREDDIE MERCURY", "FREDDIE MERCURY", "Freell", "FREEWHEELERS", 
              "FREIXENET", "French Kiwi Juice", "Frida Kahlo", "Friendshill", "FRIXION", "FRODO", 
              "FRODO G.", "FROMIS_9", "FRUIT OF THE LOOM", "fsalisa", "FTC", "FUECOCO", "Fuggler", 
              "Fuggler", "FUJIFILM", "FUJIMI", "Fujitsu", "FullMetal Alchemist", 
              "FULLMETAL ALCHEMIST", "Fun Deal", "FunFun", "Funko", "Funko", "FUNKY工房", "Funtec", 
              "Furla", "Futurama", "fuwara", "g colorgram", "G-Shock", "G.I. JOE", "G.l.JOE", 
              "G.l.ジョー", "Gaiam", "Gakken", "GALAXY", "GALERIE VIE", "Galler", "Gamakatsu", 
              "Game of Thrones", "GAMECUBE", "GANTZ", "GAP", "GAP", "GARDENA", "Garfield", "Garmin", 
              "GARNIER", "GARY YAMAMOTO", "GAS MONKEY GARAGE", "GAS MONKEY GARAGE", "GATORADE", 
              "gawr gura", "gawr gura", "GBC", "GBL", "gears of war", "GEECRACK", "GeeRA", 
              "gelato pique", "Gemarwel", "General Motors", "Generic", "GENGAR", "GENSHIN IMPACT", 
              "GENTEN", "Gentle Monster", "ＧＥＮＴＯＳ", "Geomag", "Georg Jensen", "Gethoo", "GGAViC", 
              "Ghost in the Shell", "Ghost in the Shell", "Ghost Rider", "Ghostbusters", "Gibson", 
              "GiGant", "GILDAN", "Gillette", "Gintama", "givenchy", "GIVENCHY", "GJTr", 
              "Glenfiddich", "GLEVIO", "glico", "Glimmis", "GLOCK", "Goal Zero", "GODHANDS", 
              "GODIVA", "Godiva Chocolatier", "Godzilla", "GOHEMP", "Gold's Gym", 
              "Golden State Warriors", "GOLDWIN", "Golf Pride", "GOMEXUS", "good smile company", 
              "Good Smile Company", "goodal", "GOODGLAS", "GOODSMILE", "goodspoon", "Goodyear", 
              "Google", "GOOGLE PIXEL", "Goorin Bros.", "GoPro", "GORILLA", "Gorillaz", "GOSEN", 
              "GOSEN", "Goyard", "GRAMICCI", "graniph", "Grateful Dead", "GReddy", "GreenMind", 
              "GREGORY", "GRIDMAN", "GRIP SWANY", "GRIP SWANY", "GSI CREOS", "Gucci", "Gudetama", 
              "GUERLAIN", "GUESS", "GuGuWorld", "Guinness", "GUND", "Gundam", "Gundam", "GUNPLA", 
              "Guns N' Roses", "Guns N` Roses", "GUNZE", "GUOOL", "Gurren Lagann", "GUY LAROCHE", 
              "GYMSHARK", "H&M", "HABA", "HABA", "Hackett", "HAGOOGI", "HAKAWAFLY", "HAKKO", 
              "Hakoya", "Halco", "Halka Fishing", "HAMANO", "HAMILO", "Hamilton", "Hamleys", "HAMON", 
              "HANASPEAK", "hanatora", "hanauta", "Hanes", "Hankins", "hansgrohe", "HAPA KRISTIN", 
              "Hape", "Happy Socks", "Hari Mari", "HARIBO", "HARIBO", "Hario", "HARIO", 
              "HARLEY DAVIDSON", "HARLEY QUINN", "Harley Quinn", "HARLEY-DAVIDSON", "Harris Tweed", 
              "Harrods", "Harry Potter", "Harry Styles", "Hartz", "HASBRO", "Hasbro Gaming", 
              "Hasbro Gaming", "HAUSHOF", "Havaianas", "Hayabusa", "he Chainsmokers", "Healthknit", 
              "HEIKO", "Heineken", "HEINZ", "Helen Kaminski", "Helen Kaminski", "Helinox", 
              "HELLO KITTY", "HelloKitty", "hellokitty", "hellolulu", "HELLSING", "Hennessy", 
              "Herman Miller", "hermes", "HERMES", "HERNO", "HERON PRESTON", "Herschel", "HERSHEY'S", 
              "HERSHEY'S", "HESTRA", "HI-TEC", "Hibiki", "HIFUMI", "HIKARIMIRAI", "HIKEMAN", 
              "Hikenture", "HIKOKI", "Hilander", "Hilleberg", "HILTI", "himawari", "Hisamitsu", 
              "HISASHI", "HISDERN", "Hisense", "HITACHI", "HITBOX", "HKS", "HMKL", "HobbyJAPAN", 
              "Hogwarts", "HOKTO", "HOKURIKUALUMI", "HOKUTO NO KEN", "HOLBEIN", "HOLIKA HOLIKA", 
              "HOLME GAARD", "HOLMEGAARD", "Hololive", "HolyHigh", 
              "HOME ROASTED SAZA COFFEE SINCE 1969", "Homever", "HOMFINE", "Honma", "Hoppetta", 
              "HORI", "HORIBA", "HOSCO", "Hostaro", "Hot Toys", "Hot Wheels", "Hot Wheels", 
              "Hotvivid", "HotWheels", "HOUSTON", "Houston Astros", "Houston Texans", 
              "How To Train Your Dragon", "HOYA", "HOZAN", "Hozier", "HP", "HSHRISH", "HUAWEI", 
              "Hublot", "HUBLOT", "HUF", "Hugo Boss", "HUMAN MADE", "hummel", "humminbird", 
              "Hunter x Hunter", "hurley", "HUSKEE", "Husqvarna", "HYBE", "Hyde", "Hydro Flask", 
              "Hydro Flask", "Hydro Flask", "Ｈydro Flask", "HydroFlask", "HYUNDAI", "I Love Lucy", 
              "I'M MEME", "IBANEZ", "ICE-WATCH", "ideaco", "Ideaco", "IDENTITY V", "IdentityV", 
              "iDIMPLE", "IDOHEMO", "IDOLY PRIDE", "ifme", "Iggy Pop", "IGLOO", "Iittala", "IKARI", 
              "IKEA", "Ikiruhisi", "iLiFE", "ILIFE", "ILLIYOON", "ILLUMS", "illy", "Imperia", 
              "IN THE PAINT", "Inateck", "INAX", "Indiana Jones", "Indiana Jones", "INDIVI", 
              "INDOMIE", "innisfree", "insta360", "instax", "intel", "INTERMODE", "Invader Zim", 
              "ION SUPPLY DRINK POCARI SWEAT", "iPad", "IPBEN", "iphone", "IPPON", "IPSA", "iQOS", 
              "IREENUO", "Iris Ohyama", "iRobot", "Iron Maiden", "IRON MAN", "Ironclad", "iSETO", 
              "isoi", "ISSEY MIYAKE", "ITALERI", "Itisyou", "ITO EN", "IVECO", "IVORY", "Iwachu", 
              "IwaiLoft", "IwaiLoft", "Iwaki", "IWC", "IWGP", "Izod", "J Balvin", "J World New York", 
              "J-FISH", "Jack Daniel's", "Jack Daniel's", "Jack Wolfskin", "JACKDANIEL'S", 
              "Jägermeister", "James Bond", "Jameson", "JAMIROQUAI", "JANET JACKSON", "Janis Joplin", 
              "JANOME", "JANSPORT", "JAPAN JFA", "JAPAN JFA", "JAYJUN", "JB", "JCB", 
              "Jean Michel Basquiat", "JEAN PAUL GAULTIER", "JEAN-MICHEL BASQUIAT", "jecimco", 
              "Jeep", "Jelly Belly", "Jellycat", "Jellycat", "JEMA", "JEMYGINS", "JENNI", "Jerzees", 
              "Jetpilot", "JETSTREAM", "JHENE AIKO", "JHS Pedals", "Jibbitz", "JIL SANDER", 
              "Jim Beam", "Jimi Hendrix", "JIMMY CHOO", "Jinmoioy", "JINSELF", "JJ Cole", 
              "Jo MALONE", "Joan Miro", "Jocomomola", "JOE STRUMMER", "John Deere", "JOHN DEERE", 
              "John Legend", "John Lennon", "John Masters", "John Wick", "JOHNNIE WALKER", 
              "Johnny Cash", "Johnstons of Elgin", "joie", "JoJo's Bizarre Adventure", "JOKER", 
              "JOMISS", "JONATHAN Y", "Joseph Joseph", "JOYETECH", "JOYSOUND", "JRTA", "JTC", 
              "JTT Online 福耳", "Judas Priest", "Judge Dredd", "JUICY COUTURE", "JUMPMAN", 
              "Jurassic Park", "Jurassic World", "Jurassic World", "Jurlique", "JUST BORN", 
              "Just Do It", "JUSTICEL LEAGUE", "Justin Bieber", "JUVENTUS", "JVC", "JW", "JXK", 
              "JYLTT", "Jマイケル", "K-WAY", "K&N", "K2", "KADOKAWA", "Kaedear", "kaene", "Kaepa", 
              "KAGOME", "Kaikai Kiki", "KAKAO FRIENDS", "KAKUDAI", "KAKURI", "kalavika", "kamacco", 
              "kamjove", "Kanebo", "KANGOL", "KANYE WEST", "Kappa", "Karimoku", "KARL LAGERFELD", 
              "KARLLAGERFELD", "Karrimor", "KASABIAN", "KASHIMA ANTLERS", "KASHIMA ANTLERS", 
              "KASHWERE", "Kaspersky", "Kate Bush", "Kate Spade New York", "KAWADA", "KAWAHOME", 
              "KAWAJUN", "Kawasaki", "Kaweco", "Kaweco", "Kaweco", "KAWS", "KDDI", "KEEN", "KEIBA", 
              "Keihin", "Keith Haring", "Kellogg's", "KEMIMOTO", "KEN YOKOYAMA", "Kendrick Lamar", 
              "KENWOOD", "KENZO", "KÉRASTASE", "Keurig", "KEWPIE", "KEY SMART", "Keyence", 
              "KI NO BI", "ki-gu-mi", "KICKER", "Kid 'n Play", "KID CUDI", "KidKraft", "kidzania", 
              "Kiehl's", "Kiehl's", "KIKKERLAND", "Kikkoman", "Kill Bill", "KILLSTAR", 
              "ＫＩＭＣＨＥＥ　ＢＡＳＥ", "KINCHO", "King Crimson", "KING DIAMOND", "King Gnu", 
              "KingCamp", "KINGDOM HEARTS", "KINOKUNIYA", "KINTO", "kipling", "KIPPIS", "KIRBY", 
              "KIRORAN", "KIRORAN", "KIRSH", "KISS", "KIT KAT", "Kitan Club", "kitta", "KIYOHARA", 
              "KLAVUU", "Klean Kanteen", "KN-KIKAKU", "Knorr", "Kobe Bryant", "KODAK", "KODANSHA", 
              "Kodansha Comics", "Koh-I-Noor", "KOJIMA PRODUCTIONS", "Kokka fabric", "KollyKolla", 
              "KOMONO", "KONAMI", "KONOE", "KONOSUBA", "kontex", "Kool-Aid", "korosuke", 
              "kotobukiya", "KOWA", "KOWA", "Kraft", "Kreator", "Kreator", "KRIFF MAYER", 
              "Krispy Kreme", "Krug", "Kstarplus", "Kubota", "kullcandy", "KUMATAN", "Kung Fu Panda", 
              "kuraray", "Kuretake", "Kuromi", "KURT COBAIN", "KUSMI TEA", "kusuguRu", "KVASS", 
              "KVK", "KYB", "KYLIE MINOGUE", "KYOCERA", "KYOSHO", "KYUKYUTTO", "L.L.Bean", 
              "L.O.L. Surprise!", "L.O.L.Surprise!", "L'OCCITANE", "LA JOLIE MUSE", "La Roche-Posay", 
              "La Sportiva", "labato", "Lacoste", "Lady and the Tramp", "LADY GAGA", "LALAFINA", 
              "lalaloopsy", "Lamborghini", "Lamicall", "LamPlanning", "LAMY", "Lana Del Rey", 
              "LANA GROSSA", "LANCEL", "LANCETTI", "Lancôme", "Land Rover", "Lands' End", "LANEIGE", 
              "Lanvin", "Lanxivi", "LAPITA", "LaQ", "LARA Christie", "Las Vegas Raiders", 
              "Laura Ashley", "laura mercier", "Lausatek", "LAVIEN", "LayLax", "LAZYSUSAN", "LDT", 
              "Le Coq Sportif", "Le Coq Sportif", "LE CREUSET", "LE CREUSET", "Le Petit Prince", 
              "League of Legends", "LEATHERMAN", "LeBron", "LeBron", "LED ZEPPELIN", "LEGO", 
              "LEISURE TIME", "lekue", "LEMESO", "LEMMY KILMISTER", "LENOX", "leo&aoi", "LEOFOTO", 
              "LEOHEX", "LeSportsac", "Levi's", "Levis", "LEVY'S LEATHERS LIMITED", "LEXUS", 
              "LEYTON HOUSE", "LEZYNE", "LIAM GALLAGHER", "LIbbey", "Libellud", "Lifewave", 
              "Lightning", "LIHAO", "Lil Uzi Vert", "LILAY", "LilySilk", "LINDT & SUPRUNGLI Japan", 
              "LINDY", "LINE FRIENDS", "Linkin Park", "Linkin Park", "LION", "LION HEART", 
              "Lionel Richie", "Lipton", "LISA LARSON", "LISA LARSON", "LITHON", "Litorange", 
              "Little Mix", "Little My", "Little Trees", "LIV HEART", "LIVE NATION", "Liverpool FC", 
              "LIVIA", "Livole", "LIXIL", "Lizzo", "LIZZO×QUAY", "Loacker", "LOCTITE", "LOEWE", 
              "LOFREE", "LOGI", "LOGOS", "Lomography", "Longchamp", "LONGINES", "LONGMAN", "Loomis", 
              "LOONA", "LOONEY TUNES", "LOQI", "Loro Piana", "Los Angeles Angels", 
              "Los Angeles Dodgers", "LOS ANGELS ANGELS", "LOS ANGELS DODGERS", "LosAngeles", 
              "LOTR", "Louis Vuitton", "LOUIS VUITTON", "Love-KANKEI", "LSA International", 
              "ltimate Guard", "Luigi Bormioli", "lululemon", "LuLuLun", "Luminara", "LUMINTOP", 
              "LUPICIA", "LVYUAN", "Lyft", "Lypo-C", "M&M's", "M+home", "M3GAN", "ma:nyo", 
              "Mac Miller", "Machine Aerosmith", "MACMILLAN", "MACPHEE", "maffon", "MAG", 
              "Magic The Gathering", "Magic: The Gathering", "MAGICAL MOSH MISFITS", 
              "MAGICAL MOSH MISFITS", "Magic桜", "Magpul", "MagSafe", "mahagrid", "Mai Factory", 
              "Mai Factory", "Mai Factory", "Mai Factory", "Mai Kuraki", "Maileg", "MAIMO", 
              "maison blanche", "Maison Kitsune", "Maison Margiela", "MAISON MARTIN MARGIELA", 
              "Maisto", "MAJOR LEAGUE BASEBALL", "makavelic", "Makeblock", "Makita", "MALBON", 
              "Malie Organics", "Mammut", "MANARA", "MANASTASH", "MANCHESTER CITY", 
              "Manchester City FC", "Manduka", "MANESKIN", "MANESKIN", "Manhattan Portage", 
              "ManhattanPortage", "ＭＡＰＥＰＥ", "MAPLESTORY", "MARADONA", "MARANTZ", "Marc Jacobs", 
              "Mardi Mercredi", "MARGARET HOWELL", "Marilyn Manson", "Marilyn Monroe", "Marimekko", 
              "MARK GONZALES", "MARK'S", "MARK＆LONA", "MARLBORO", "MARLMARL", "Marmot", "MARNA", 
              "MARNI", "Maroon 5", "Maroon 5", "Maroon5", "MARS", "Marshall", "Marshmello", 
              "Martha Stewart", "MARTIN", "Maruchan", "MARUKO", "Marukyu", "maruman", "MARUSAN", 
              "Marvel", "MARVEL", "MARVEL COMICS", "Mary Engelbreit", "Mary J. Blige", "MARY QUANT", 
              "Masahiro", "Maserati", "MASSIVE ATTACK", "MASTER BUNNY", "MASTER LOCK", 
              "Masters of the Universe", "Matchbox Twenty", "Mattel", "Maui Jim", "MAUNA LOA", 
              "MAVIC", "Max Factory", "Maxell", "MaxWant", "Maxxi", "Maybelline", "mayukadori", 
              "MAZDA", "MBOYU", "McLaren", "Mechanix Wear", "Medela", "MedianField", "MEDICOM", 
              "MEDIHEAL", "MEGA BLOKS", "MEGA DRIVE", "Mega Man", "Megabass", "Megadeth", 
              "Megahouse", "Meguru Yamaguchi", "Melissa & Doug", "Melissa&Doug", "Melitta", 
              "Melvita", "MENARD", "mentos", "MEPAL", "Mercedes Benz", "Mercedes-Benz", 
              "Mercedes-Benz", "merci", "Mercs-X", "MERCURYDUO", "MERIN", "MERRELL", "Merries", 
              "Messi", "Metallica", "METALLlCA", "Miami Dolphins", "mianshe", "MIATONE", 
              "Michael Jackson", "Michael Jordan", "Michael Kors", "Michael Myers", "Miche Beauty", 
              "MICHELANGELO", "MICHELIN", "MICK JAGGER", "MICKEY MOUSE", "Microsoft", "MIESROHE", 
              "MIFA", "Miffy", "MIHI", "miHoYo", "mikan", "Mikasa", "Mike Trout", "MiKiHOUSE", 
              "Mila Owen", "Mila schon", "MILESTO", "MiliCamp", "Milkbarn", "MILKFED.", 
              "MILLION LIVE ミリオンライブ　アイドルマスター", "MILLION LIVE！", 
              "ＭＩＬＬＩＯＮ　ＬＩＶＥ！", "MILVION LIVE", "MiMC", "MINECRAFT", "MINI COOPE", 
              "MINION", "Minmin", "MINNIE MOUSE", "Minor Threat", "MINTON", "Minute Maid", 
              "Miraculous", "Mirai Tenshi", "MIRRO", "Misaki Aono", "Mishima", "MISITU", "MISSHA", 
              "MISSONI", "Mitchell & Ness", "Mitchell&Ness", "Mitsuba", "Mitutoyo", "miumiu", 
              "Miwalock", "Miyawo", "Mizkan", "Mizuno", "MKJP", "MLB", "MOB PSYCHO", "MOBI GARDEN", 
              "Mobil", "MOCHIPAN", "MOËT & CHANDON", "MOFMOFRIENDS", "MOFT", "MOGU", "moimoln", 
              "moin moin", "Moleskine", "Molten", "MOMA", "MOMA", "Moncler", "Monkey　47", "monoii", 
              "MONOPOLY", "MONOPOLY", "Monster Energy", "Monster Energy", "Monster High", 
              "Monster Hunter", "Monster Jam", "MONT MARTE", "mont-bell", "Montagna", "montbell", 
              "MONTBLANC", "Montblanc", "MOOMIN", "MoonStar", "Mopar", "Morakniv", "Morethan", 
              "Morethan", "MORISMOS", "morning place", "MORPEKO", "Morpilot", "MOSCHINO", "MOSCOT", 
              "MOSH!", "Motley Crue", "Mötley Crüe", "motorola", "MOTTERU", "Mountain hardwear", 
              "moussy", "mpi松香フォニックス", "Mr.トーム", "MSA", "MSGM", "msi", "MSR", "MSS", 
              "MUJI", "MuMu", "Munchkin", "Munsingwear", "MUPPETS", "Mutant Ninja Turtles", "Muuto", 
              "MY CHEMICAL ROMANCE", "My Hero Academia", "My Little Pony", "My Melody", "MYCARBON", 
              "Myethos", "MYTREX", "MYZONE", "N-STRIKE", "N.", "n95", "Nachtmann", "NACIFIC", 
              "Nagatanien", "Naler", "Nalgene", "Nalini", "Namie Amuro", "namie amuro", 
              "Namie Amuro", "Namiki", "nanaco", "nanacoカード", "nanoblock", "Napapijri", "NAPOLEX", 
              "NARDI", "NARS", "NARUMI", "naruto", "NARUTO", "NASCAR", "NASCAR", "NASCAR", 
              "NATIONAL GEOGRAPHIC", "Natori", "Naturehike", "Naturehike", "NAUTICA", "Nayuta", 
              "NBA", "NCNL ランタン legare", "NCT 127", "NCT127", "NE-YO", "NEC", "NECA", "NEIKIDNIS", 
              "NEMO", "Neon Genesis Evangelion", "nepia", "NERF", "NERU", "Nescafe", "Nespresso", 
              "Nespresso", "Nestlé", "Nestlé", "Netflix", "Never Broke Again", "New Balance", 
              "New Era", "New Kids On The Block", "New York Mets", "New York Yankees", "NEWJEANS", 
              "Newtral", "NEWYORKER", "NFL", "NGK", "NHKエンタープライズ", "NHL", "NHL", "Niceday", 
              "NICETOWN", "NICHIGAN", "NICI", "Nickelback", "Nickelodeon", "NiCO", "Nidec", 
              "NieR Automata", "nier:Automata", "NieRAutomata", "nifty colors", "NIID", "niiDor", 
              "nijisanji", "Nike", "NIKE", "NIKKE", "NikoMaku", "Nikon", "Nina Ricci", 
              "Nine Inch Nails", "Ninonly", "Nintendo", "NINTENDO", "nippon kodo", "NIRVANA", 
              "NISSAN", "NISSAN", "NISSIN", "NITORI", "Nittaku", "NIUBEE", "NIVEA", "Nivea Sun", 
              "NO TIME TO DIE", "NOCO", "NOKIA", "Norah Jones", "Norton", "NOS", "Notorious B.I.G.", 
              "NSYNC", "NTTドコモ", "NU SKIN", "NUCKILY", "NUDE", "NUDIE JEANS", "Numberblocks", 
              "NUOLUX", "Nutella", "NYYankees", "NZXT", "O'NEILL", "Oakley", "Obagi", "OBEST", 
              "obi-wan kenobi", "Obitsu", "Oculus", "Odoland", "OFF-WHITE", "OHLINS", "ohora", 
              "Oisix", "OJAGA DESIGN", "OKURA", "Old Spice", "Old World Christmas", "OLFA", "OLIGHT", 
              "OLIVER PEOPLES", "Olivia Burton", "OLLY MURS", "OLYMPUS", "Omega", "OMEW", "OMI", 
              "OMI ANSWER", "omi kogyo", "Omron", "OMUKY", "ONE 'N ONLY", "ONE N' ONLY", "One Piece", 
              "ONE PIECE MARCHANDISE", "One Punch Man", "ONEILL", "ONEPLUS", "ONETIGRIS", "ONF", 
              "Onkyo", "Only Fools And Horses", "OOFOS", "OPINEL", "Opiqcey", "OPTATUM", 
              "Optimus Prime", "Orbis", "Ore, Tsushima", "oreo", "ORIHICA", "Orioles", "ORTLIEB", 
              "OSAMU GOODS", "Oswald the Lucky Rabbit", "OTAKUMARKET", "Outkast", "Overmont", "ovo", 
              "oyaide", "Ozzy Osbourne", "P5 PERSONA5", "ＰＡＣ－ＭＡＮ", "Pacom", "Paddington Bear", 
              "Pagani Design", "PAIRMANON", "Paladone", "Palworld", "panasonic", "Panasonic", 
              "Pandora", "PANERAI", "Pantera", "PANTONE", "papagorilla", "papico", "Paramore", 
              "PARCO", "PARIS 2024", "PARIS 2024", "Paris Saint - Germain", "Paris Saint Germain", 
              "Paris Saint-Germain", "Paris Saint‐Germain", "Paris Sainto", "PARIS2024", "Parker", 
              "Party City", "Pasco", "PATAGONIA", "Patek Philippe", "PATOU", "Paul & Joe", 
              "Paul McCartney", "Paul Smith", "PAUL&JOE", "Paw patrol", "PAWPATROL", "PAXTON", 
              "PAYOT", "Pazdesign", "PEACE", "Peak Design", "PEANUTS", "PEARLY GATES", "PEARLYGATES", 
              "PEBEO", "Pedigree", "peeps", "Pelican", "Pelikan", "Peltor", "Peltor", "PENALTY", 
              "PENDLETON", "Pentatonix", "pentel", "Peppa Pig", "Peppa Pig", "Pepsi", 
              "Perfume Genius", "Peripera", "Persol", "PETER RABBIT", "PETER RABBIT", "petio", "Petit Bateau", "Peto-Raifu", 
              "PETZL", "Peugeot", "Pfaltzgraff", "Pflueger", "PGA TOUR", "PHANTASY STAR ON LINE", 
              "PHANTASY STAR ON LINE", "PharMeDoc", "Pharrell Williams", "PHILADELPHIA 76ERS", 
              "PHILIP MORRIS", "philippe starck", "PHILIPS", "PHILIPS", "phiten", "PHLOX", 
              "Phoebe Bridgers", "PHOLSY", "PHYSIOGEL", "PIAA", "PIA株式会社", "PICOGRILL", 
              "PICONE CLUB", "pierre cardin PARIS", "PIGEON", "Pikachu", "Pikachu", "Pikmin", 
              "Pillsbury", "Pillsbury", "Pilotfly", "PINARELLO", "PING", "PININFARINA", "PINK FLOYD", 
              "PINK PANTHER", "PINK PANTHER", "Pinkfong", "Pinocchio", "Pioneer", "PIPLUP", "PIPLUP", 
              "PIRARUCU", "Pirelli", "Pirelli", "Piscifun", "Pit Viper", "pitaka", 
              "Pittsburgh Pirates", "PIXAR", "Pizza Hut", "Pknoclan", "PLANETAGS", "PLANETWAVES", 
              "PLANO", "Play-Doh", "PLAYERUNKNOWN'S BATTLEGROUNDS", "Playgro", "playmobil", 
              "PLAYSKOOL", "playstation", "Ploom TECH", "PloomTECH", "Plus Office", "POCHI", 
              "pokémon", "Pokemon", "POKETLE", "Polly Pocket", "POLO RALPH LAUREN", "POLO RALPHLAUREN", 
              "POLO ラルフローレン", "Ponta", "pontaカード", "Poolmaster", "POP MART", "POP MART", 
              "POPMART", "Poppy Playtime", "Poppy Playtime", "popsockets", "PORCO ROSSO", "PORMIDO", 
              "Porsche", "POSCA", "POST MALONE", "Post-it", "Post-it", "POTENZA", "povo", 
              "POWER RANGERS", "Powerbar", "POWERPUFF GIRLS", "PRADA", "prada", "prAna", "PRIME", 
              "Pringles", "Printworks", "Propper", "Prostaff", "PROX", "PSG", "PSVITA", 
              "Psycho Bunny", "Puella Magi Madoka Magica", "Pulp Fiction", "PUMA", "PUNYUS", 
              "Pusheen", "PUTH KISS", "PuttOut", "PXG", "Pyrenex", "Pyrex", "Q & Q", "Q & Q", 
              "Qatar 2022", "Qribo", "QUADRIFOGLIO", "QUAXLY", "QUICKCAMP", "Quiksilver", "Quntis", 
              "QUO VADIS", "QUOカード", "QWER", "RADICA", "Radio Flyer", "Radiohead", 
              "RAGE AGAINST THE MACHINE", "Rainbow Sandals", "Rainmakers", "Ralph Lauren", "Ramones", 
              "RAMPAGE", "RAMPAGE PRODUCTS", "Rapala", "Rapara", "Raspberry Pi", "Rat Fink", "RATT", 
              "Ravensburger", "Rawlings", "Ray Ban", "Ray Charles", "Ray-Ban", "RayBan", "RAYMARC", 
              "RAZER", "Real Madrid", "Realtree", "RECARO", "RECYCO", "RED BULL", 
              "RED DEAD REDEMPTION", "Red Hot Chili Peppers", "Red Hot Chili Peppers", "RED KAP", 
              "Red Points", "Reebok", "Reese's", "Refa", "REGAL", "ＲＥＧＺＡ", "Remault", 
              "Remy Martin", "Renault", "REPTI ZOO", "Resident Evil", "Retrosuperfuture", 
              "Return of the Jedi", "Reveur", "RevoMax", "Rezard", "Rhodia", "RICARD", "RICCA", 
              "Richell", "RICK AND MORTY", "RICOH", "Ricola", "RIDGID", "RIEDEL", "riemot", 
              "Rilakkuma", "Rimmel London", "RIMOWA", "Rinnai", "Riot Games", "Ripndip", "RipStik", 
              "Ririmew", "Ririmew", "RITZ", "RIZAP", "RMK", "Rob Zombie", "Robin Ruth", "Roblox", 
              "Robocar Pol", "Robocar Poli", "Robocop", "ROBOTIME", "ROCKPORT", "Rockyu", "Rocotto", 
              "Rod Stewart", "RODY", "Roger Dubuis", "ROIVISUAL", "ROKR", "roku", "ROLA", "Rolex", 
              "Rolife", "Rolling Stones", "rom&nd", "RON HERMAN", "Ronald Reagan", "Ronotico", 
              "RONSON", "ROOPOL", "ROOTOTE", "Rosemadame", "ROSIER by Her lip to", "ROSSIGNOL", 
              "rotring", "ROWEN", "Rowoon", "ROXY", "Roy Lichtenstein", "Royal Canin", "ROYCE", 
              "ROYCE'", "RRL", "RTIC", "Rugby World Cup", "rugrats", "Rummikub", "Run DMC", 
              "RunElves", "Rurudo", "RVCA", "RWBY", "Ryder Cup", "RYOBI", "S.H.Figuarts", 
              "S.T.Dupont", "S'well", "S'well", "S&S", "SABON", "Safariland", "Sailor Moon", 
              "SAINT LAURENT", "Saint Seiya", "sakuracos", "Salomon", "SALONIA", "SAM SMITH", 
              "Samsonite", "SAMSUNG", "SAN DIEGO PADRES", "San Francisco Giants", "San-X", "SanDisk", 
              "SANGO TOKI", "Sangria", "SanMori", "SANNO", "Sanrio", "Santa Cruz", "Santen", "Santen", 
              "SANYU", "SAPASLIFE", "SAPPORO", "Sasaki", "SASUKE", "SATAbuilder's", "SAUNA VIBES", 
              "Sauza", "SAVATAGE", "SAVATAGE", "SAZAC", "SBクリエイティブ", "Schecter", "Schick", 
              "Schott NYC", "Schott Zwiesel", "Schwarzkopf", "Schylling", "ScoLar Parity", 
              "SCOOBY-DOO", "Scooby-Doo!", "Scooby-Doo!", "Scoot & Ride", "SCORBUNNY", 
              "Scotch-Brite", "Scotty Cameron", "Scotty Cameron", "Scrub Daddy", "SCプロジェクト", 
              "SEACRET", "SEATTLE MARINERS", "SEATTLE SEAHAWKS", "SECOM", "SEED", "Segafredo", 
              "Seiei", "SEIKO", "SEIRYU", "SEIWA", "selecta", "SENSAH", "SENSARTE", "Sesame Street", 
              "Seventeen", "SEVENTEEN carat land", "Sex Pistols", "SEXYTINE", "SGS", "shachihata", 
              "Shakespeare and Company", "Shaklee", "Sharp", "Shaun the Sheep", "Shaun the Sheep", 
              "SHAWN MENDES", "SHEAFFER", "SHEIN", "SHFiguarts", "SHIMANO", "shinee", "SHIRO", 
              "SHIROHATO", "Shiseido", "SHISEIDO", "SHlNee", "Shoei", "Shohei Ohtani", "SHOKZ", 
              "shopfeliz", "SHOWA", "SHREK", "shu uemura", "Shupatto", "SHURE", "SHフィギュアーツ", 
              "si-gu-mi", "SIG SAUER", "SIGGI", "Signare", "silikomart", "SIMMONS", "Simms", 
              "SINLAND", "siroca", "sitengle", "SIXPAD", "sixplus", "SixTONES", "Sizzix", "SK Japan", 
              "SK-II", "Skechers", "Skillmatics", "SKIP HOP", "Skoda", "Skullcandy", "Sky", 
              "SKYTUBE", "SKZOO", "SLAMDUNK", "sledar", "Sleepy Princess in the Demon Castle", 
              "SLINX", "SLIPKNOT", "sloggi", "SmartShake", "Smartwool", "SMIRNOFF", "Smiski", "SMP", 
              "SMS Santini", "Snap-on", "SnapDragon Monitoring", "snidel", "SNK", "SnooII", 
              "Snoop dogg", "SNOOPY", "SNOOPY", "Snow Man", "Snow Peak", "Snugpak", "SoBuy", 
              "Social Distortion", "Sockwell", "SOFT99", "Soi couleur", "SOLIDO", "SONIC", 
              "Sonic The Hedgehog", "Sonic The Hedgehog", "Sonic The Hedgehog", "SONICARE", 
              "SONICSUPERSTARS", "Sonny Angel", "Sons of Anarchy", "sony", "Soomloom", "SOREL", 
              "SOTCAR", "soundcore", "Soundgarden", "SOUTH PARK", "SOYJOY", "SPACE JAM", "Spalding", 
              "SPAM", "SPARCO", "SPARCO", "specR", "SPEEDO", "SPICARE", "Spice Girls", "SPIDER-MAN", 
              "SPIEGELAU", "Spilay", "SPIRITED AWAY", "Splatoon", "SPONGEBOB", "SPONGEBOB", 
              "SPONGEBOB", "sportful", "SPORTS SPECIALTIES", "SPRAYGROUND", "Springbok", 
              "SPY×FAMILY", "SPYDERCO", "SQUARE ENIX", "SQUARE ENIX", "SQUID GAME", "Squirtle", 
              "Squishmallows", "SRAM", "Srixon", "SSSS.GRIDMAN", "ST DUPON", "STABILO", "STABILO", 
              "STAEDTLER", "Stance", "ＳＴＡＮＣＥＮＡＴＩＯＮ", "STANLEY", "STAR TREK", "Star Wars", 
              "staub", "SteelSeries", "steiff", "STELLA ARTOIS", "STELLA McCARTNEY", "Stelton", 
              "STEVEN UNIVERSE", "STIGA", "STIHL", "STIHL", "STM", "stone island", 
              "Stone Temple Pilots", "STRANGER THINGS", "Stranger Things", "Stranger Things", 
              "STRAY KIDS", "straykids", "strik_green", "STUDIO GHIBLI", "STUSSY", "stussy", 
              "Style Stanard", "SUAVECITO", "Subaru", "SUCK UK", "SUEHIRO", "SUICIDE SQUAD", 
              "Suicoke", "Sum 41", "Sum41", "sumall", "SUMIKA", "SUMIKKOGURASHI", "summiko gurashi", 
              "Sun Company", "SUNTORY", "SUNTQ", "Supacaz", "Super Dollfie", "SUPER MARIO", 
              "SUPER MARIO BROS.", "SUPERDRY", "Supreme", "Supreme", "SUQQU", "SUREFIRE", 
              "SurLuster", "SUWADA", "ＳＵＺＵＫＩ", "Swaddle Up", "SwaddleMe", "SWANLAKE", 
              "SWAROVSKI", "Swatch", "SWIX", "SWOOSH", "SWOOSH", "Sword Art Online", 
              "Sylvanian Families", "syngenta", "System of a Down", "SZsic", "T-fal", "T-ROC", 
              "Tabata", "Tachikara", "TAG Heuer", "TAIKO", "tailwalk", "TAIMONIK", "TAION", "TAITO", 
              "Tajima", "Takasho", "Tamagotchi", "Tamahashi", "TAMIYA", "TAMPA BAY DEVIL RAYS", 
              "Tangle Teezer", "tanita", "TaoTech", "Tapout", "Tapout", "targa", "Tartine", "Tarzan", 
              "Taylor Made", "Taylor Swift", "TaylorMade", "TBC", "TCL", "TEAC", "TEAMGROUP", 
              "TEARS FOR FEARS", "TEAVANA", "Tecnifibre", "Ted Nugent", "Teenage Mutant Ninja Turtles", 
              "TEIJIN", "TEKKEN", "Teletubbies", "TEMPO", "TEMPUR", "TENERITA", "TENGA", "TENTIAL", 
              "Tentock", "Tenyo", "TENYO", "tera's", "Terry Pratchett", "Tervis", "teserakku21", 
              "TESLA", "Tetris", "TEVA", "TEXACO", "TEXAS RANGERS", "THE BIG BANG THEORY", 
              "THE BISCATS", "The Dark Knight", "The ELF on the SHELF", "THE ERAS TOUR", 
              "THE FACE SHOP", "THE FAST AND THE FURIOUS", "THE FLAMING LIPS", "THE FLAMING LIPS", 
              "The Godfather", "THE GOONIES", "The Grinch", "the highland mint", "THE IDOLM@STER", 
              "THE IDOLMASTER", "THE KID LAROI", "The Last Of Us", "The Laundress", 
              "The Little Mermaid", "The Lord of the Rings", "The Mandalorian", "THE MANDALORIAN", 
              "THE METROPOLITAN MUSEUM OF ART", "The Monkees", "The Nightmare Before Christmas", 
              "The Nightmare Before Christmas", "THE NORTH FACE", "The North Face", "The Notorious BIG", 
              "The Phantom of the Opera", "The Pogues", "THE POWERPUFF GIRLS", "THE ROLLING STONES", 
              "The Simpsons", "THE SMURFS", "THE TEXAS CHAINSAW MASSACRE", 
              "THE TEXAS CHAINSAW MASSACRE", "The Twilight Zone", "The Walking Dead", "THE WEEKND", 
              "The Who", "The Witcher", "THE-PEACOCK", "ThermoFlask", "THERMOS", "Thin Lizzy", 
              "ThinkFun", "Thom Yorke", "THOMAS & FRIENDS", "THOMAS & FRIENDS", "Thomas&Friends", 
              "THRASHER", "THRASHER", "Thrustmaster", "THULE", "Tide", "Tiemco", "Tiffany", "TIGA", 
              "tiktok", "Tim Hortons", "Tim Hortons", "TIMBER RIDGE", "Timberland", "TIMEX", "TIMEX", 
              "TINHAO", "TINTIN", "TINY TOON", "Tirrinia", "TIRTIR", "TISSOT", "TISUR", "TITICACA", 
              "TITIROBA", "titivate", "Titleist", "TITLEIST", "TKG", "tkone", "TM COLLECTION", 
              "TMNT", "TOAMIT", "ToARUHi", "TOCCA", "TOGEPI", "Toirxarn", "TOIVO", "TOKYO CRAFTS", 
              "Tokyo Ghoul", "TOKYO REVENGERS", "tokyo sauna", "TOKYO TOWER", "TOKYO2020", 
              "Tom & Jerry", "Tom & Jerry", "TOM and JERRY", "Tom Petty", "Tom＆Jerry", "Tomb Raider", 
              "TOMIX", "Tommee Tippee", "Tommy Bahama", "Tommy Hilfiger", "Tomorrow x Together", 
              "tomorrow×together", "TOMORROWLAND", "TOMORROWXTOGETHER", "TOMOUNT", "TONY THE TIGER", 
              "Too Faced", "TOP GUN", "TOP OF THE POPS", "TOPGUN", "TOPKAPI", "Topo Gigio", "Topps", 
              "Torani", "Tori Richard", "Torriden", "Tory Burch", "TOSHIBA", "TOTEME", "TOTONOE LIGHT", 
              "Totoro", "Totoro", "TOWER OF GOD BUCK", "TOY STORY", "Toyo Tires", "TOYOTA", "TOZO", 
              "Tracy Brown", "TRADIS", "TRAINIART", "TRAMONTINA", "Trangia", "TRANSFORMERS", 
              "TRANSFORMERS", "Trident", "Trijicon", "TROIKA", "Trolli", "TRU-SPEC", "TRX", "TSP", 
              "TSUCIA", "TSUM TSUM", "TULALA", "TULLY'S", "TULTEX", "Tumaz", "TUMI", "tumugu", 
              "Tupac", "Tupperware", "tutu anna", "tutu anna", "Tuxedosam", "TWEETY", 
              "Twenty One Pilots", "TWG", "Twice", "TWILLY", "TWINBIRD", "Twinings", "Twins Special", 
              "TWSBI", "txt", "ty", "TYESO", "TYPE O NEGATIVE", "Tカード", "U-NEXT", "U.S. NAVY", 
              "UB40", "UBeesize", "UBEREATS", "UCHINO", "UEFA", "UES", "UGEARS", "UGG", "Uhlsport", 
              "uka", "ULTRAMAN", "ultrapro", "Umbra", "UMBRO", "UNDER ARMOUR", "ungrid", "uni-ball", 
              "uniball", "UNIDRAGON", "UNIFLAME", "Unilerver", "UNIQLO", "Unit", "United Athle", 
              "United Colors of Benetton", "UNO", "UQ mobile", "UQWiMAX", "UROCO", "UUROBA", "UUUM", 
              "UVION", "uxcell", "Vacheron Constantin", "VAIIGO", "VAIO", "Valentino Garavani", 
              "Valery Madelyn", "VALEXTRA", "VALORANT", "VAMPIRE DIARIES", "Van Cleef & Arpels", 
              "Van Cleef & Arpels", "Van Cleef & Arpels", "Van Halen", "Vandoren", "VANGUARD", 
              "VANS", "Varivas", "Vasilisa", "VASTLAND", "VAVA", "VEELIKE", "Veet", "VELAZZIO", 
              "VELENO", "Vemuram", "VENA", "Vera Bradley", "VERSACE", "VIAHART", "VICTAS", 
              "Victoria's Secret", "VICTORIA'S SECRET", "Victorinox", "Villeroy & Boch", 
              "VILLEROY&BOCH", "Villeroy＆Boch", "Violet Evergarden", "VIPITH", "VIVEL", "VIVID", 
              "Vivien Westwood", "Vivienne Westwood", "VIVO", "VK Living", "VOGUE", "VOICECADDIE", 
              "Volcom", "Volcom", "VOLKS", "VOLKSWAGEN", "VOLKSWAGEN", "Volvic", "VOLVO", 
              "Von Dutch", "Vortex", "VT COSMETICS", "VTech", "VW", "WACHIFIELD", "WACHIFIELED", 
              "Wacoal", "Wahl", "WAIPER", "Wakanda Forever", "WAKO", "Wako's", "walkers", "Wallows", 
              "WALT DISNEY", "Wancher", "WAQ", "warframe", "WARHAMMER", "WARNE BROS", "WARNER BROS", 
              "Waterman", "WAYNE GRETZKY", "WCCF FOOTISTA", "wearlizer", "wearlizer", "wearlizer", 
              "Wearmoi", "WeatherBeeta", "WEAVER", "Weber", "WEDGEWOOD", "wedgwood", "WEDSSPORT", 
              "WEEN CHARM", "WEGO", "weider", "Welch's", "WELDON", "WESCO", "Westinghouse", 
              "Wet Brush", "WHAM-O", "whipbunny", "WhiteLeaf", "Whitney Houston", 
              "Whole Foods Market", "WICKED", "WILLCOM", "WILLIE NELSON", "Willy Wonka", "Wilson", 
              "Wimbledon", "WinCraft", "WINDTOOK", "WINNIE THE POOH", "Winthome", "Wiz Khalifa", 
              "WIZARD OF OZ", "WMF", "WONDER WOMAN", "Wonho", "wonjungyo", "WoodWick", 
              "World of Warcraft", "WOSADO", "Wrangler", "Wu Wear", "WU-TANG CLAN", "Wu-Tang Clan", 
              "Würth", "WWE", "WWF", "WZLPY", "X-Men", "Xbox", "XENOBLADE", "XEZO", "XGAMES", 
              "Xiaomi", "XINXIKEJI", "XSAJU", "YA-MAN", "YAIBA", "YAJIN CRAFT", "YAJIN CRAFT", 
              "Yakult", "YAMABIKO", "YAMAHA", "YAMAHA", "YAMAMOTO KANSAI", "Yamasa", "yamatoya", 
              "YAMAZEN", "YANKEE CANDLE", "Yasaka", "YAYOI KUSAMA", "YAYOI　KUSAMA", "Yazawa", 
              "Yazoo", "YEEZY", "YETI", "YFFSFDC", "YIBO", "YINKE", "Yino", "YKK", "Yngwie Malmsteen", 
              "Yo-Zuri", "Yobenki", "YODA", "Yogibo", "YOKA", "YOKOHAMA CANON EAGLES", "YOKOMO", 
              "Yolrky", "YOMEGA", "Yonanas", "Yonex", "YonTens", "YOOHOO", "Yoshimura", "You Tooz", 
              "YOUSHY", "YSL", "yu-gi-oh", "Yu-Gi-Oh!", "YUBBAEX", "YUNKER", "yutori", "YUWA", 
              "YVES SAINT LAURENT", "Z-DRAGON", "ZacT craft", "ZALMAN", "ZARUDE", "ZDZDZ", "ZEAKE", 
              "ZEKOO", "ZENB", "Zespri", "ZETT", "ZIGGY", "zipit", "Zippo", "ZIPPO", "Zoff", 
              "ZOJIRUSHI", "Zootopia", "ZUCCa", "ZUMA", "Zunea", "ZURU", "Zvezda", "ZZR", 
              "アークシステムワークス", "アークテリクス", "アークライト", "アースカイト", 
              "アーセナルベース", "アーティクルナンバー", "アイアンマン", "アイコス", "アイシン", 
              "アイスノン", "アイスノン", "アイドリープライド", "アイドリープライド", 
              "アイドルマスター", "アイドルマスター", "アイドルマスターSideM", "アイビル", "アイマス", 
              "アイマス ミリオンライブ ！", "アイマスク", "アイモハ", "アイライフ", "アイリスオーヤマ", 
              "アイリスプラザ", "アウディ", "アオアシ", "アクアビーズ", "アクシージア", "アサヒビール", 
              "あしたのジョー", "あしたのジョー", "アストロプロダクツ", "アセス", "あたしンち", 
              "アタック", "アダバット", "アップルウォッチ", "アテニア", "アデリアレトロ", "アトラス", 
              "アナザーエデン", "アニエスベー", "アピカ", "アビステ", "アヒル隊長", "あひる隊長", 
              "アフロ", "アマノフーズ", "アムウェイ", "アメリ", "アラレ", "アリナミン", "アルインコ", 
              "アルビオン", "アルファックス", "アルファプラス", "アレグラ", "アヲハタ", 
              "アングリーバード", "アングリッド", "あんさんぶるスターズ", "あんさんぶるスターズ！", 
              "あんさんぶるスターズ！！", "アンテプリマ", "アンドザフリット", "アンパンマン", 
              "アンパンマン", "アンファー", "アンブロ", "イヴサンローラン", "イカゲーム", "イカリ消毒", 
              "イケア", "いち髪", "イッタラ", "イラン産", "イルビゾンテ", "イルムス", "ウータンクラン", 
              "ヴァイオレットエヴァーガーデン", "ヴァイスシュヴァルツ", "ヴァシリーサ", "ヴァストランド", 
              "ヴァレンティノ", "ヴィヴィアン ウエストウッド", "ヴィヴィアンウエストウッド", "ウィキッド", 
              "ウィゴー", "ウィルキンソン", "ウェッジウッド", "ウェッズスポーツ", "ウエッティ", 
              "ウエットティッシュ", "ウェットブラシ", "ウォーハンマー", "ウクライナ", "ウタマロ", 
              "ウッディプッディ", "ウマ娘", "ウマ娘 プリティーダービー", "ウマ娘 プリティダービー", 
              "ウルトラマン", "うる星やつら", "うる星やつら", "ウンクルハウス", "エースコック", 
              "エーデルブロック", "エーモン", "エアーかおる", "エアーポッズ", "エアボーン", 
              "エイトザタラソ", "エヴァンゲリオン", "エヴァンゲリオン", "エシレ", "エスエス製薬", 
              "エスケイジャパン", "エスダーツ", "エスプリーク", "エスメラルダ", "エチケットブラシ", 
              "エッチ・ケー・エス", "エドシーラン", "エバース", "エバーピーラー", "エビデン", 
              "エビングハウスフセン", "エリートグリップ", "エリエール", "エリオスライジングヒーローズ", 
              "エルシオン", "エルジン", "エルメス", "エンハイプン", "オーデマ・ピゲ", "オーデマ・ピゲ", 
              "オーデマ・ピゲ", "オーデマピゲ", "オーバンド", "おいしっくす", "オウルテック", 
              "おおかみこどもの雨と雪", "おくだけ吸着", "おさるのジョージ", "オジーオズボーン", 
              "オニヤンマ", "おにやんま君", "オバジ", "おぱんちゅうさぎ", "オムロン", "おもちゃの神様", 
              "おもひでぽろぽろ", "オリヒカ", "オルビス", "オルファ", "オルルド釣具", "お文具といっしょ", 
              "カーテン魂", "ガーフィールド", "かいじゅうステップ", "カヴェコ", "がうる・ぐら", 
              "がうるぐら", "カオナシ", "カカオフレンズ", "カガミクリスタル", "カクダイ", 
              "かぐや姫の物語", "カゴメ", "かごや", "ガス・モンキー・ガレージ)", "カスペルスキー", "カタカムナ", "かっぱえびせん", "かどや製油", "カバヤ食品", "カバヤ食品", 
              "カピバラ", "カフア", "カプコン", "カプリチョーザ", "カメヤマ", "カラーグラム", "カラコン", 
              "カリタ", "カリモク", "カルシファー", "カルティエ", "カルバンクライン", "カルバンクライン", 
              "カルビー", "カルピス", "カレルチャペック", "カンケン", "カンタベリー", "ガンダム", 
              "ガンバ大阪", "カンフーパンダ", "ガンプラ", "キーエンス", "キース ヘリング", "キールズ", 
              "きかんしゃトーマス", "キシマ", "キシリトール", "キタンクラブ", "キッコーマン", "キッピス", 
              "キプリング", "キムチの素", "キムラタン", "ギャガ", "キャッチミーイフユーキャン", 
              "キャッチミーイフユーキャン", "ギャビー", "キャプテンA", "キャベジン", "キューサイ", 
              "キユーピー", "キューピーコーワ", "キューポット", "キュキュット", "キラキラ", "きらり", 
              "キングダムハーツ", "ギンビス", "グースリー", "クーリア", "クアドリフォリオ", 
              "クアトロガッツ", "クイックウォーマー", "クイックキャンプ", "クオカード", "クォカード", 
              "グッチ", "グッドグラス", "クッピーラムネ", "ぐでたま", "クラウン", "グラマラスパッツ", 
              "クラランス", "クラレ", "グランツーリスモ", "グリコ", "グリッドマン", "クリナップ", 
              "グリンチ", "くるくるスッキリラック", "クレイツイオン", "グレヴィオ", "グレゴリー", 
              "クレパス", "クレパス", "クレヨンしんちゃん", "グレンフィディック", "クロエ", "クロス", 
              "クロックス", "クロムハーツ", "クロレッツ", "ゲーリーヤマモト", "ケイアンドエフ・オフィス", 
              "ゲド戦記", "ケミホタル", "ケユカ", "けりぐるみ", "ケロッグ", "ケロリン", "ゲンガー", 
              "ゲンセン", "ケンドリックラマー", "ゴーセン", "ゴールドウィン", "コールドプレイ", 
              "コイズミ", "コイル", "コカコーラ", "コカボムタワー", "コカレロ", "ごきげんぱんだ", 
              "こぎみゅん", "コクリコ坂から", "ココピタ", "ゴジラ", "コスパ", "コスベイビー", 
              "コスメデコルテ", "こたつ", "こたつソックス", "ゴディバ", "こどもちゃれんじ", "コノエ", 
              "コハク", "コピック", "コヒノール", "コブラ", "コフレ", "ゴブレットゴブラーズ", 
              "コフレドールグラン", "コペルタ", "コムデギャルソン", "ゴムポンつるつる", "コモライフ", 
              "コラントッテ", "ゴリラズ", "コンサイス", "ゴンチャロフ", "ゴンチャロフ", "コンテックス", 
              "サーモス", "サーモス株式会社", "サーモフラスク", "サイコバニー", "サカタのタネ", 
              "さかなかるた", "ザクトクラフト", "サタビルダーズ", "サッカー日本代表", "サッカー日本代表", 
              "サッポロビール", "ザバス", "サボン", "サマーウォーズ", "サマータイムレンダ", 
              "サランラップ", "サルゲッチュ", "サローネ", "サロニア", "サロンジェ", "サンアート", 
              "サンアロー", "サンスター", "サンテ", "サントリー", "さんど模型", "サンビー", 
              "サンフランシスコ ジャイアンツ", "サンフランシスコ フォーティナイナーズ", "サンメニー", 
              "サンリオ", "サンローラン", "ジーク", "ジークラック", "シーシーピー", "ジードラゴン", 
              "ジェマ", "ジェラートピケ", "ジェリーキャット", "ジェントルモンスター", "シカゴブルズ", 
              "ジギンガーZ", "ジジ", "シダーエイト", "ジップロン", "シナモロール", "ジバンシィ", 
              "シピシピ", "ジビッツ", "ジブリ", "しまじろう", "ジミン", "〆ルカリ", "シモンズ", 
              "シャイニーカラーズ", "シャウエッセン", "シヤチハタ", "ジャックスパロウ", "ジャックダニエル", 
              "ジャックバニー", "シャディ", "シャトレーゼ", "シャネル", "シャレもん", "シャンシャン", 
              "ジャンプマン", "ジャンポールゴルチエ", "シュウウエムラ", "シュナイダーエレクトリック", 
              "シュパット", "ジュラシックパーク", "ジュラシックワールド", "ジョージ ジェンセン", 
              "ジョーマローン", "ジョニーウォーカー", "ジョニーキャッシュ", "ショパール", "ジョンディア", 
              "ジョンマスターオーガニック", "シリコマート", "ジルサンダー", "シルバニアファミリー", 
              "シロクマ", "シロハト", "シンカリオン", "スーパードルフィー", "スーパーマリオ", 
              "スイコック", "スイスイおえかき", "スクイーズ", "スクイッドマニア", "すくっと", 
              "スコッティキャメロン", "すごろくや", "スズキ", "スターウォーズ", "スターバックス", 
              "スタイル スタンダード", "スタジオジブリ", "スタンレー", "ステューシー", "スヌーピー", 
              "スノーピーク", "スパイダーマン", "スパイファミリー", "スピンギア", "スプラトゥーン", 
              "スプラトゥーン", "スプラトゥーン3", "スポンジボブ", "スマイルキッズ", "スマイルスライム", 
              "すみっコぐらし", "スミノエ", "スミノフ", "スラムダンク", "スリクソン", "スワドルアップ", 
              "セーラームーン", "セガトイズ", "セサミストリート", "ゼスプリ", "セノッピー", "セリーヌ", 
              "セルスター", "ゼルダの伝説", "ゼルダの伝説", "ソードアート・オンライン", 
              "ソニー・インタラクティブエンタテインメント", "ソニックスーパースターズ", "ゾフ", 
              "ソフト99", "ダーツライブ", "タイオン", "ダイキ工業", "ダイゴー", "ダイドー", "ダイドー", 
              "ダイドーブレンド", "ダイワ", "タオル研究所", "タケルくん", "ダスキン", "タッパー", 
              "タバタ", "たまごっち", "タマハシ", "タヨ", "ダラス", "タリーズ", "タルガ", "タルティン", 
              "タルテックス", "ダルトン", "たれぱんだ", "たれぱんだ", "ダンガンロンパ", 
              "ダンキンドーナツ", "タンスのゲン", "タンタンの冒険", "ダンヒル", "ダンボ", "ダンロップ", 
              "ちいかわ", "ちいくバッグ", "チチカカ", "チチヤス", "チチロバ", "ちびっこバス・タヨ", 
              "チビ列車ティティポ", "チャムス", "チャンピオン", "チューブラー", "チュチュベビー", 
              "ちりとりのいらないほうき", "ツイステッドワンダーランド", "つくるんです", "ツムラ", 
              "デアゴスティーニ", "デアゴスティーニ ジャパン", "デアゴスティーニ・ジャパン", 
              "ティーエムコレクション", "ディーディーインテックス", "ディーラックス", "ディーン&デルーカ", 
              "ディオール", "ディオール", "ディズニー", "ディズニーディフューザー", "ティティポ", 
              "ティファール", "デットバイデイライト", "デッドプール", "テテ", "テネリータ", "テネリータ", 
              "デュエルマスターズ", "デュエルモンスターズ", "デュオ", "テレカ", "テレタビーズ", 
              "テレフォンカード", "テンピュール", "トーテム", "とーとつにエジプト神", "トーヨータイヤ", 
              "トイザらス", "トイレットペーパー", "トゥバ", "どうぶつの森", "トゥルースリーパー", 
              "ドギーマン", "ドキドキ文芸部", "ドクターエア", "ドクターケイ", "ドクターシーラボ", 
              "どこでもいっしょ", "トコトコ", "トッカ", "トップガン", "トッポジージョ", "トトノエライト", 
              "トトロ", "となりのトトロ", "となりのトトロ", "となりの山田くん", "トミーヒルフィガー", 
              "トミカ", "トミックス", "トム・ヨーク", "トムアンドジェリー", "トムとジェリー", "トモエ", 
              "トライオン", "トライデントミュージックエンタテインメント", "ドラえもん", "ドラクエ", 
              "ドラゴンクエスト", "ドラゴンボール", "トラモンティーナ", "とらや", "トランスフォーマー", 
              "トリコット", "トリス", "ドリズラー", "ドリテック", "トリプルエス", "トリプルバリア", 
              "ドルガバ", "ドルチェ＆ガッバーナ", "ドルチェナ", "ドルフィードリーム", "トロピカーナ", 
              "どんぐり共和国", "どん兵衛", "ド変態", "ド変態", "ナーフ", "ナイスデイ", "ナイトメア", 
              "ナイトメア ビフォアクリスマス", "ナウシカ", "なっちゃん", "ナノブロック", "ナパピリ", 
              "ナルディ", "ナルミ", "ナンジャモンジャ", "ニーア オート マタ", "ニーア　オートマタ", 
              "ニーア オートマタ", "ニーアオートマタ", "ニコニコ", "にじさんじ", "ニチガン", "ニチレイ", 
              "ニッスイ", "ニッタク", "にっぽん丸", "ニデック", "ニトムズ", "ニトリ", "ニナリッチ", 
              "にゃんこ大戦争", "ニューエラ", "ニュージーンズ", "ニューバランス", "ぬいぐるみの三英", 
              "ネコぱら", "ネジザウルス", "ネスカフェ", "ネスレ", "ネピアGENKI!", "ねんどろいど", 
              "ノースフェイス", "ノースフェイス", "ノートン", "ノエビア", "ノクターン", "のどごし", 
              "ノラネコぐんだん", "ハート", "ハードコアチョコレート", "ハーバー", "バーバリー", 
              "ハーバリウム", "バービー", "バーブァー", "パーマン", "パーリーゲイツ", 
              "ハーレーダビッドソン", "ハイキュー", "ハイコーキ", "ハイドロ　フラスク", "ハイドロフラスク", 
              "ハイランダー", "パウパトロール", "ハウル", "ハウルの動く城", "ハウルの動く城", 
              "ハウルの動く城", "ばかうけ", "バギーボード", "ハクキンカイロ", "ぱくぱく", "ハグモッチ", 
              "バケモノの子", "はじめてのおままごと", "パジャマ工房", "ハスブロ", "バターバトラー", 
              "パタゴニア", "パック マン", "パックマン", "ハッシュパピー", "バトスピ", "バナナフィッシュ", 
              "パピコ", "ハマノ", "ハミルトン", "バムとケロ", "バリー", "ハリーポッター", 
              "パリオリンピック", "パリサンジェルマン", "ハリスツイード", "ハルカフィッシング", 
              "パルスイクロス", "バルで飲んだ サングリア", "バレンシアガ", "ハローキティ", "ハローズ", 
              "バロン", "パワーパフガールズ", "ぱんどろぼう", "パンどろぼう", "バンブルビー", 
              "ピーコック魔法瓶工業", "ビートルズ", "ビオレ", "ヒガシマル醤油", "ピカチュウ", 
              "ピカピカレイン", "ひかりのくに", "ヒカリミライ", "ヒグチユウコ展", "ピクミン", "ピクミン", 
              "ヒサゴ", "ビスキャッツ", "ヒステリックミニ", "ビタゴラス", "ぴちょんくん", 
              "ひつじのショーン", "ひつじのメイプル ", "ピットバイパー", "ヒトカゲ", "ビモロ", 
              "ヒューストン", "ビリー・アイリッシュ", "ビリーアイリッシュ", "ビリージョエル", "ヒルティ", 
              "ヒルトップクラウド", "ヒロアカ", "ヒロアカ", "ピンクパンサー", "プーチン", "フードマン", 
              "フーファイターズ", "ファイアーエムブレム", "ファイアーエンブレム", "ファイアーエンブレム", 
              "ファイテン", "ファイナルファンタジー", "ファイヤープレーストング", "ファンケル", 
              "ファンタシースターオンライン", "フィーノ", "フィガロ", "フィギュア グッズ整理中(-_- 無限堂", 
              "フィギュアーツ", "フィットボクシング", "フエキ", "フェリモア", "フェンディ", 
              "フォートナイト", "フォルクスワーゲン", "フクヤ", "ふくや", "フジテレビジョン", 
              "フジテレビジョン", "フタバ", "プチジョア", "プチバトー", "フマキラー", "フマキラー", 
              "フライングボール", "プラダ", "プラチナゲームズ", "ブラックレーベルソサイアティ", 
              "フランクリン", "ブランシェス", "ブリーフィング", "プリキュア", "プリマハム", "プリングルス", 
              "ブルーアーカイブ", "フルーツオブザルーム", "ブルーブルー", "ブルーブルーエ", 
              "ブルーロック", "ブルーロック", "ブルガリ", "フレームアームズ", "フレアフレグランス", 
              "フレッドペリー", "プレディア", "プロジェクトスカイ COLORFUL STAGE!", "プロジェクトセカイ", 
              "プロジェクトセカイ　ＣＯＬＯＲＦＵＬ　ＳＴＡＧＥ！", "ブロス バイ ワコールメン", 
              "プロスタッフ", "プロスペック", "プロセカ", "プロックス", "ふわふわ", 
              "ベーシックスタンダード", "ペアマノン", "ベイブレード", "ベストコ", "ベストコ", 
              "ヘブンテント", "ヘリーハンセン", "ヘリノックス", "ヘルスニット", "ベルミス", 
              "ベルルッティ", "ベンザブロック", "ぺんてる", "ボークス", "ボーネルンド", "ボーネルンド", 
              "ポール&ジョー", "ポールアンドジョー", "ポールスミス", "ホイップバニー", "ポカポン", 
              "ホカロン", "ポケットモンスター", "ポケットモンスター", "ポケモン", "ぼっち・ざ・ろっく！", 
              "ボッテガヴェネタ", "ホットウィール", "ホットプレート", "ポニーキャニオン", 
              "ポニーキャニオン", "ポニョ", "ホビージャパン", "ほぼ日", "ほぼ日手帳", "ポルコロッソ", 
              "ホロライブ", "ポロラルフローレン", "ポンポリース", "マーガレット　ゴールド", "マーキュリー", 
              "マーキュリーデュオ", "マークス", "マーサスチュアート", "マーサスチュワート", 
              "マーダーミステリー", "マーナ", "マイケル ジョーダン", "マイケルジョーダン", 
              "マイケルジョーダン", "マイメロ", "マインクラフト", "マウジー", "マキタ", "マグビルド", 
              "マクラーレン", "マザーガーデン", "まさめや", "マシュハド産", "マスターバニー", 
              "マナーウェア", "マナマナ", "マハグリッド", "マペペ", "ママ＆キッズ", "マランツ", 
              "マリークワント", "マリオブラザーズ", "マリネス", "マリメッコ", "マルエス", "マルサン", 
              "マルサン", "マルチビジネスリュック", "マルちゃん", "マルディ", "マルボン", "マル二", 
              "マロン", "まんがタイムきらら", "マンシングウエア", "マンチェスターシティ", "マンドゥカ", 
              "マンナンライフ", "ミキハウス", "ミキプルーン", "ミケランジェロ", "ミシュラン", 
              "ミステリーボックス", "ミズノ", "ミチョ", "ミツウロコ", "ミツカン", "ミニオン", "ミニオンズ", 
              "みのり苑", "ミャクミャク", "ミュータントタートルズ", "ミラ オーウェン", "ミラキュラス", 
              "ミラショーン", "ミリオンライブ", "ミリオンライブ！", "ミルクフェド", "ムーニー", "ムーミン", 
              "ムーンスター", "ムジーナ", "むにゅぐるみ", "ムビチケ", "メイレグ", "メガシャキ", 
              "メガミデバイス", "メサイア", "メジャークラフト", "メゾン マルタン マルジェラ", 
              "メゾンキツネ", "メゾンマルジェラ", "メダル", "メディアファクトリー", "メディカルペンライト", 
              "メナード", "メリー", "メリタ", "メルシャン", "メルスト", "メルセデス・ベンツ", 
              "メルセデス・ベンツ", "メルセデスベンツ", "メルセデスベンツ", "メルちゃん", "メルテック", 
              "メルヘン", "メルローズ", "モイストダイアン", "モイン モイン", "モケケ", "モシモハック", 
              "もち吉", "モトローラ", "もののけ姫", "もののけ姫", "モブサイコ", "モルペコ", "モレスキン", 
              "モンクレール", "モンスターイーター", "モンスターエナジー", "ヤーマン", "ヤクルト", 
              "やずや", "ヤマコー", "ヤマサ", "ヤマソロ", "ヤマト住建", "ヤマト運輸", "ヤンキース", 
              "ユーハイム", "ユーワ", "ユカイ工学", "ユナイテッドアスレ", "ユニクロ", "ゆるキャン", 
              "ユンケル", "よーじや", "ヨコズナクリエーション", "ヨコハマキヤノンイーグルス", "ヨコピタ", 
              "ヨコモ", "ヨックモック", "ヨッシースタンプ", "ヨネキチ", "ライオン", "ライオンハート", 
              "ライスフォース", "ラコステ", "ラドンナ", "ラパラ", "ラピスラズリ", "ラピュタ", 
              "ラプンツェル", "ラロッシュポゼ", "ラングスジャパン", "ラングスジャパン", "ランチャーグリップ", 
              "ランボルギーニ", "らんま1/2", "リヴァプールFC", "リカちゃん", "リクシル", 
              "リズム時計工業株式会社", "リック・アンド・モーティ", "リッチェル", "リッチェル", 
              "リトルマーメイド", "リネアストリア", "リバージュ", "リライズ", "リラックマ", 
              "リラックマとカオルさん展", "リンキンパーク", "リンツ", "ルーニー・テューンズ", 
              "ルービックキューブ", "ルイヴィトン", "ルイヴィトン", "ルクルーゼ", "ルピシア", "ルルルン", 
              "レイエ", "レイバン", "レイマーク", "レガロ", "レゴ", "レジカゴバッグ", "レック", 
              "レッドタートル ある島の物語", "レッドブル", "レミーマルタン", "レンズボール", "レンズボール", 
              "ローキー", "ローズマダム", "ローリングストーンズ", "ロイズ", "ロイヤル化粧品", "ロエベ", 
              "ロクシタン", "ロジクール", "ロボカー", "ロボカーポリー", "ワイルドアニマル", "ワコーズ", 
              "ワコウ", "ワセリン", "わちふぃーるど", "ワムオー", "ワンピース", "ヱビスビール", "一期一会", 
              "一番搾り", "三ツ矢", "三分妄想", "三分妄想", "三立製菓", "三菱ケミカル", "三菱ケミカル", 
              "三郷陶器", "下村企販", "不二玩家", "不二越", "世田谷自然食品", "中島みゆき", 
              "丸モ高木陶器", "丸美屋", "丸美屋食品工業", "主婦の友社", "九谷焼", "九鬼", 
              "亀の子スポンジ", "亀田製菓", "井上トロ", "井上企画", "井上企画・幡", "亜土工房", 
              "今治タオル", "仮面ライダー", "仮面ライダーゼロワン", "任天堂", "伊藤園", "佐藤製薬", 
              "信楽焼", "俺つしま", "倉木麻衣", "借りぐらしのアリエッティ", "僕のヒーローアカデミア", 
              "優美社", "八宮めぐる", "六花亭", "共立食品", "切り抜き", "切手", "初音ミク", "前畑", 
              "助六の日常", "北の快適工房", "北電子", "匠 彩", "匠彩", "千と千尋の神隠し", 
              "千と千尋の神隠し", "半妖の夜叉姫", "卑弥香", "原神", "古見さんは、コミュ症です。", "吉徳", "吉野石膏", 
              "名探偵コナン", "君たちはどう生きるか", "呉竹", "呪術廻戦", "味の素", "和平フレイズ", 
              "図書カード", "坂角", "坊ねずみ", "墨文字製作所", "大正製薬", "大船観音寺", "大谷翔平", 
              "天空の城ラピュタ", "天音かなた", "太鼓の達人", "妖怪舎", "姚 尭", "季の美", "宇宙の破片", 
              "安室透", "宝鐘マリン", "寄生虫博物館", "富士達", "将碁屋", "小島瑠璃子", "小川珈琲", 
              "小松マテーレ", "山田養蜂場", "岩波書店", "崖の上のポニョ", "崖の上のポニョ", "平成フラミンゴ", 
              "平成狸合戦ぽんぽこ", "広島東洋カープ", "広江礼威", "忍者フード", "思い出のマーニー", 
              "成美堂", "手裏剣", "招喜屋", "攻殻機動隊", "攻殻機動隊", "文明堂", "文豪ストレイドッグス", 
              "新サクラ大戦", "新世紀エヴァンゲリオン", "新日本プロレス", "新潮社", "日本ハム", 
              "日本レコード商業組合", "日本相撲協会", "日東", "日清紡", "日清製粉", "日産", "星のカービィ", 
              "星野", "星野太郎", "朝鮮漬", "木村硝子店", "未来のミライ", "未来天使", "未来工業", 
              "本麒麟", "東京 2020", "東京2020", "東京2020", "東京ミルクチーズ工場", 
              "東京ミルクチーズ工場", "東京リベンジャーズ", "東北楽天ゴールデンイーグルス", 
              "東方project", "東方プロジェクト", "東洋水産", "松岡はな", "松竹梅", "柳瀬久", 
              "株式会社Key-th", "株式会社すごろくや", "株式会社ベストエバージャパン", 
              "株式会社世田谷自然食品", "桃屋のもと", "森行エリーナ", "榛原", "模型工房", "檸檬堂", 
              "殺菌", "水曜どうでしょう", "水森かおり", "水瀬いのり", "氷点下パック", "江戸切子", 
              "消臭力", "湯たんぽ", "漬@プロフ必読", "激落ちくん", "火垂るの墓", "無印良品", "無水鍋", 
              "犬夜叉", "犯人は踊る", "猫の恩返し", "猫壱", "猫村さん", "珪藻土", "白湯専科", 
              "直筆サイン生写真", "真面目", "矢沢永吉", "硬貨", "硬貨", "硬貨", "福井", "空調服", 
              "空調服", "竜とそばかすの姫", "竜とそばかすの姫", "第5人格", "第一精工", "第五人格", 
              "粧美堂", "紀伊國屋書店", "紅の豚", "羽生結弦", "耳をすませば", "肉しか信じない", 
              "肌ナチュール", "良品計画", "花の大和", "草間 彌生", "草間彌生", "萌えニャンコ", 
              "葛飾北斎", "葬送のフリーレン", "藍男色", "藤井風", "西海陶器", "記念切手", "谷沢製作所", 
              "資生堂", "赤ちゃんの城", "透明急須", "通販生活", "造形村", "進撃の巨人", "遊戯王", 
              "野沢民芸", "金鳥", "釣りスピリッツ", "銀貨", "鎌倉紅谷", "関西急行物語", "阪神タイガース", 
              "隠岐の海", "雨の日アリス", "雪印", "雪印メグミルク", "雪印メグミルク", "青嵐ルアー", 
              "頭文字D", "風の谷のナウシカ", "風の谷のナウシカ", "風の音", "風林火山", "風立ちぬ", 
              "香蘭社", "鬼滅の刃", "魔女の宅急便", "魔女の宅急便", "魔女宅", "魔法少女まどか☆マギカ", 
              "魔王城でおやすみ", "鳩居堂", "鳩居堂", "鹿島アントラーズ", "黒子のバスケ", "黒鯛工房",
              "すとぷり","sutopuri","ストロベリープリンス","すとろべりーぷりんす","ウエハース","缶バッチ",
              "しまさか","鬼太郎","きたろう","ユニフォーム","マスターボール","ブラッキー","あんスタ",
              "あんすた","アンサンブルスターズ",
];

// すべて小文字のNGワードリスト（検索用）
const lowerCaseNgWords = directNgWords.map(word => word.toLowerCase());

// スタイルを直接挿入
function injectStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* NGワードブロッカーのスタイル */
    .ng-blocked {
      position: absolute !important;
      height: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
      overflow: hidden !important;
      opacity: 0 !important;
      visibility: hidden !important;
      display: none !important;
      pointer-events: none !important;
      clip: rect(0, 0, 0, 0) !important;
      width: 0 !important;
      min-height: 0 !important;
      min-width: 0 !important;
      max-height: 0 !important;
      max-width: 0 !important;
      transform: scale(0) !important;
      z-index: -9999 !important;
    }
    
    /* 親要素の調整 */
    .ng-parent-of-blocked {
      min-height: 0 !important;
      height: auto !important;
    }
    
    /* ステータスメッセージのスタイル */
    .ng-status-message {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 14px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      text-align: center;
      font-weight: bold;
      font-size: 15px;
      animation: fadeInOut 3s forwards;
      max-width: 80%;
    }
    
    /* 無効化された検索ボタンのスタイル */
    .ng-button-disabled {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
      background-color: #ccc !important;
      pointer-events: none !important;
    }
    
    /* NGワード警告ラベルのスタイル */
    .ng-warning {
      color: #ff0000;
      font-weight: bold;
      margin-right: 10px;
      animation: pulse 2s infinite;
    }
    
    /* NGワード検索警告オーバーレイ */
    .ng-search-warning {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
    }
    
    .ng-search-warning-content {
      background-color: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
      text-align: center;
      max-width: 90%;
      width: 450px;
    }
    
    .ng-search-warning-title {
      color: #e53935;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    
    .ng-search-warning-message {
      color: #333;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    
    .ng-search-warning-button {
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
      transition: background-color 0.2s;
    }
    
    .ng-search-warning-button:hover {
      background-color: #45a049;
    }
    
    /* コントロールパネルのスタイル */
    #ng-control-panel {
      position: fixed;
      top: 100px;
      right: 0;
      width: 280px;
      background-color: rgba(255, 255, 255, 0.95);
      border: 1px solid #ccc;
      border-right: none;
      border-radius: 8px 0 0 8px;
      box-shadow: -2px 2px 10px rgba(0, 0, 0, 0.2);
      z-index: 99999;
      font-family: Arial, sans-serif;
      color: #333;
      transition: transform 0.3s ease;
      max-height: 80vh;
      overflow-y: auto;
    }
    
    #ng-control-panel.ng-panel-collapsed {
      transform: translateX(280px) !important;
    }
    
    .ng-panel-header {
      background-color: #4CAF50;
      color: white;
      padding: 8px 12px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: grab;
      border-radius: 6px 0 0 0;
    }
    
    .ng-panel-toggle {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      width: 30px;
      height: 30px;
      text-align: center;
      cursor: pointer;
      font-size: 18px;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      margin-left: 5px;
      transition: background-color 0.2s;
    }
    
    .ng-panel-toggle:hover {
      background-color: rgba(255, 255, 255, 0.4);
    }
    
    .ng-panel-body {
      padding: 10px;
    }
    
    .ng-control-group {
      margin-bottom: 10px;
    }
    
    .ng-control-label {
      font-weight: bold;
      margin-bottom: 5px;
      display: block;
    }
    
    .ng-control-switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 24px;
      margin-right: 10px;
    }
    
    .ng-control-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .ng-control-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      border-radius: 24px;
      transition: .3s;
    }
    
    .ng-control-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      border-radius: 50%;
      transition: .3s;
    }
    
    input:checked + .ng-control-slider {
      background-color: #4CAF50;
    }
    
    input:checked + .ng-control-slider:before {
      transform: translateX(26px);
    }
    
    .ng-flex-row {
      display: flex;
      align-items: center;
    }
    
    .ng-status-text {
      margin-left: 10px;
    }
    
    .ng-button {
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin-right: 5px;
    }
    
    .ng-button:hover {
      background-color: #45a049;
    }
    
    .ng-button.ng-secondary {
      background-color: #f1f1f1;
      color: #333;
      border: 1px solid #ccc;
    }
    
    .ng-button.ng-secondary:hover {
      background-color: #e8e8e8;
    }
    
    .ng-keyword-list {
      max-height: 120px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 5px;
      margin-top: 5px;
      margin-bottom: 5px;
      font-size: 12px;
    }
    
    .ng-keyword-item {
      padding: 3px 5px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .ng-keyword-item:last-child {
      border-bottom: none;
    }
    
    .ng-keyword-delete {
      color: #ff0000;
      cursor: pointer;
      font-weight: bold;
    }
    
    .ng-counter-display {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .ng-mode-select {
      padding: 5px;
      border-radius: 4px;
      border: 1px solid #ccc;
      width: 100%;
      margin-top: 5px;
    }
    
    .ng-advanced-panel {
      background-color: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 8px;
      margin-top: 10px;
      display: none;
    }
    
    .ng-advanced-panel.ng-panel-visible {
      display: block;
    }
    
    .ng-text-input {
      width: calc(100% - 10px);
      padding: 5px;
      border-radius: 4px;
      border: 1px solid #ccc;
      margin-top: 5px;
    }
    
    /* パネルトグル用の追加スタイル */
    .ng-permanent-toggle {
      position: fixed;
      right: 0;
      width: 24px;
      height: 24px;
      background-color: #4CAF50;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      border-radius: 4px 0 0 4px;
      box-shadow: -2px 2px 5px rgba(0, 0, 0, 0.2);
      z-index: 100000;
      font-weight: bold;
      transition: all 0.3s ease;
      font-size: 14px;
    }
    
    .ng-permanent-toggle.panel-visible {
      right: 280px;
    }
    
    @keyframes fadeInOut {
      0% { opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { opacity: 0; }
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
  `;
  
  document.head.appendChild(styleEl);
  log('スタイルを適用しました', 'debug');
}

// スタイルを挿入
injectStyles();

// コントロールパネルを作成
function createControlPanel() {
  // 既存のパネルがあれば削除
  const existingPanel = document.getElementById('ng-control-panel');
  if (existingPanel) {
    existingPanel.remove();
  }
  
  // パネル要素を作成
  const panel = document.createElement('div');
  panel.id = 'ng-control-panel';
  if (!controlPanelVisible) {
    panel.classList.add('ng-panel-collapsed');
  }
  
  // ヘッダー
  const header = document.createElement('div');
  header.className = 'ng-panel-header';
  header.innerHTML = `
    <span>メルカリNGワードブロッカー</span>
    <span class="ng-panel-toggle">${controlPanelVisible ? '◀' : '▶'}</span>
  `;
  
  // ドラッグ機能
  let isDragging = false;
  let initialY, initialTop;
  
  header.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('ng-panel-toggle')) return;
    isDragging = true;
    initialY = e.clientY;
    initialTop = parseInt(window.getComputedStyle(panel).top);
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const newTop = initialTop + (e.clientY - initialY);
    if (newTop >= 50 && newTop <= window.innerHeight - 200) {
      panel.style.top = newTop + 'px';
      // 常時表示タブの位置も同期
      const permanentTab = document.getElementById('ng-permanent-toggle');
      if (permanentTab) {
        permanentTab.style.top = (newTop + 10) + 'px';
      }
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  // トグルボタンのクリックイベント
  header.querySelector('.ng-panel-toggle').addEventListener('click', () => {
    togglePanelVisibility();
  });
  
  // パネル本体
  const body = document.createElement('div');
  body.className = 'ng-panel-body';
  
  // フィルタースイッチ
  const filterGroup = document.createElement('div');
  filterGroup.className = 'ng-control-group';
  filterGroup.innerHTML = `
    <div class="ng-flex-row">
      <label class="ng-control-switch">
        <input type="checkbox" id="ng-filter-toggle" ${isFilterActive ? 'checked' : ''}>
        <span class="ng-control-slider"></span>
      </label>
      <span class="ng-status-text">${isFilterActive ? 'フィルター有効' : 'フィルター無効'}</span>
    </div>
  `;
  
  // ブロックカウンター
  const counterGroup = document.createElement('div');
  counterGroup.className = 'ng-control-group';
  counterGroup.innerHTML = `
    <div class="ng-counter-display">ブロック数: <span id="ng-block-count">${blockCount}</span>件</div>
  `;
  
  // NGワードリスト
  const keywordGroup = document.createElement('div');
  keywordGroup.className = 'ng-control-group';
  keywordGroup.innerHTML = `
    <label class="ng-control-label">カスタムNGワード:</label>
    <div id="ng-keyword-list" class="ng-keyword-list">
      ${customNgWords.length > 0 
        ? customNgWords.map(word => `
            <div class="ng-keyword-item">
              <span>${word}</span>
              <span class="ng-keyword-delete" data-word="${word}">×</span>
            </div>
          `).join('')
        : '<div class="ng-keyword-item">カスタムNGワードはありません</div>'
      }
    </div>
    <div style="display: flex; margin-top: 5px;">
      <input type="text" id="ng-new-keyword" class="ng-text-input" placeholder="新しいNGワードを入力" style="flex: 1; margin-right: 5px;">
      <button id="ng-add-keyword" class="ng-button">追加</button>
    </div>
  `;
  
  // ページ操作ボタン
  const pageActionsGroup = document.createElement('div');
  pageActionsGroup.className = 'ng-control-group';
  pageActionsGroup.innerHTML = `
    <button id="ng-rescan-page" class="ng-button">ページを再スキャン</button>
    <button id="ng-clear-all" class="ng-button ng-secondary">クリア</button>
  `;
  
  // パネルを組み立て
  body.appendChild(filterGroup);
  body.appendChild(counterGroup);
  body.appendChild(keywordGroup);
  body.appendChild(pageActionsGroup);
  
  panel.appendChild(header);
  panel.appendChild(body);
  document.body.appendChild(panel);
  
  // イベントリスナーの設定
  // フィルタートグル
  document.getElementById('ng-filter-toggle').addEventListener('change', function(e) {
    toggleFilter();
    updateControlPanel();
  });
  
  // ページの再スキャン
  document.getElementById('ng-rescan-page').addEventListener('click', function() {
    // 処理済みフラグをリセット
    processedElements.clear();
    
    // ページを再処理
    processPage();
    updateControlPanel();
    
    // フィードバック
    showStatusMessage('ページを再スキャンしました');
  });
  
  // すべてクリア
  document.getElementById('ng-clear-all').addEventListener('click', function() {
    if (confirm('すべてのブロック設定をクリアしますか？')) {
      // ブロック解除
      const blockedItems = document.querySelectorAll('.ng-blocked');
      blockedItems.forEach(function(item) {
        item.classList.remove('ng-blocked');
        item.removeAttribute('style');
      });
      
      // 処理済みフラグをリセット
      processedElements.clear();
      
      // 親要素の設定をリセット
      const parentItems = document.querySelectorAll('.ng-parent-of-blocked');
      parentItems.forEach(function(item) {
        item.classList.remove('ng-parent-of-blocked');
        item.removeAttribute('style');
      });
      
      // カウントをリセット
      blockCount = 0;
      updateControlPanel();
      
      // フィードバック
      showStatusMessage('すべてのブロック設定をクリアしました');
    }
  });
  
  // NGワードの追加
  document.getElementById('ng-add-keyword').addEventListener('click', function() {
    const input = document.getElementById('ng-new-keyword');
    const keyword = input.value.trim();
    
    if (keyword) {
      // 重複チェック
      if (customNgWords.includes(keyword) || directNgWords.includes(keyword)) {
        showStatusMessage('このNGワードは既に登録されています');
        return;
      }
      
      // 追加
      customNgWords.push(keyword);
      updateCustomNgWords(customNgWords);
      
      // 入力フィールドをクリア
      input.value = '';
      
      // リストを更新
      updateKeywordList();
      
      // フィードバック
      showStatusMessage(`NGワード「${keyword}」を追加しました`);
    }
  });
  
  // NGワードの追加（Enterキー）
  document.getElementById('ng-new-keyword').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      document.getElementById('ng-add-keyword').click();
    }
  });
  
  // NGワードの削除
  document.querySelectorAll('.ng-keyword-delete').forEach(function(elem) {
    elem.addEventListener('click', function() {
      const word = this.dataset.word;
      
      // 配列から削除
      customNgWords = customNgWords.filter(item => item !== word);
      updateCustomNgWords(customNgWords);
      
      // リストを更新
      updateKeywordList();
      
      // フィードバック
      showStatusMessage(`NGワード「${word}」を削除しました`);
    });
  });
  
  // 常時表示タブを追加
  createPermanentToggleTab();
  
  log('コントロールパネルを作成しました', 'debug');
}

// 常時表示される制御タブを作成
function createPermanentToggleTab() {
  // 既存のタブがあれば削除
  const existingTab = document.getElementById('ng-permanent-toggle');
  if (existingTab) existingTab.remove();
  
  // パネル要素の参照を取得
  const panel = document.getElementById('ng-control-panel');
  if (!panel) return;
  
  // パネルの位置を取得
  const panelTop = parseInt(window.getComputedStyle(panel).top) || 100;
  
  // 新しいタブを作成
  const toggleTab = document.createElement('div');
  toggleTab.id = 'ng-permanent-toggle';
  toggleTab.className = 'ng-permanent-toggle ' + (controlPanelVisible ? 'panel-visible' : 'panel-hidden');
  toggleTab.innerHTML = controlPanelVisible ? '◀' : '▶';
  toggleTab.title = controlPanelVisible ? 'パネルを非表示にする' : 'パネルを表示する';
  toggleTab.style.top = (panelTop + 10) + 'px';
  
  // クリックイベント
  toggleTab.addEventListener('click', function() {
    togglePanelVisibility();
  });
  
  // ボディに追加
  document.body.appendChild(toggleTab);
  
  return toggleTab;
}

// パネル表示状態を切り替え
function togglePanelVisibility() {
  // 表示状態を反転
  controlPanelVisible = !controlPanelVisible;
  
  // パネルの表示状態を更新
  const panel = document.getElementById('ng-control-panel');
  if (panel) {
    if (controlPanelVisible) {
      panel.classList.remove('ng-panel-collapsed');
    } else {
      panel.classList.add('ng-panel-collapsed');
    }
  }
  
  // パネル内のトグルボタンも更新
  const toggleButton = panel?.querySelector('.ng-panel-toggle');
  if (toggleButton) {
    toggleButton.textContent = controlPanelVisible ? '◀' : '▶';
  }
  
  // 常時表示タブも更新
  const permanentTab = document.getElementById('ng-permanent-toggle');
  if (permanentTab) {
    permanentTab.textContent = controlPanelVisible ? '◀' : '▶';
    permanentTab.className = 'ng-permanent-toggle ' + (controlPanelVisible ? 'panel-visible' : 'panel-hidden');
    // タブの位置も調整
    permanentTab.style.right = controlPanelVisible ? '280px' : '0';
  }
  
  // 設定を保存
  chrome.storage.local.set({controlPanelVisible: controlPanelVisible});
}

// キーワードリストを更新
function updateKeywordList() {
  const keywordList = document.getElementById('ng-keyword-list');
  if (!keywordList) return;
  
  if (customNgWords.length > 0) {
    keywordList.innerHTML = customNgWords.map(word => `
      <div class="ng-keyword-item">
        <span>${word}</span>
        <span class="ng-keyword-delete" data-word="${word}">×</span>
      </div>
    `).join('');
    
    // 削除ボタンにイベントリスナーを追加
    keywordList.querySelectorAll('.ng-keyword-delete').forEach(function(elem) {
      elem.addEventListener('click', function() {
        const word = this.dataset.word;
        
        // 配列から削除
        customNgWords = customNgWords.filter(item => item !== word);
        updateCustomNgWords(customNgWords);
        
        // リストを更新
        updateKeywordList();
        
        // フィードバック
        showStatusMessage(`NGワード「${word}」を削除しました`);
      });
    });
  } else {
    keywordList.innerHTML = '<div class="ng-keyword-item">カスタムNGワードはありません</div>';
  }
}

// コントロールパネルを更新
function updateControlPanel() {
  const toggle = document.getElementById('ng-filter-toggle');
  const statusText = toggle?.parentElement.nextElementSibling;
  const blockCountElem = document.getElementById('ng-block-count');
  
  if (toggle) toggle.checked = isFilterActive;
  if (statusText) statusText.textContent = isFilterActive ? 'フィルター有効' : 'フィルター無効';
  if (blockCountElem) blockCountElem.textContent = blockCount;
}

// メッセージリスナー（拡張機能アイコンクリック検知など）
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  log(`メッセージ受信: ${request.action}`, 'debug');
  
  try {
    if (request.action === 'toggleNgWordFilter') {
      toggleFilter();
      sendResponse({status: 'success'});
    } 
    else if (request.action === 'getNgWordCount') {
      const totalCount = directNgWords.length + customNgWords.length;
      sendResponse({count: totalCount});
    }
    else if (request.action === 'updateCustomNgWords') {
      updateCustomNgWords(request.additionalNgWords);
      sendResponse({status: 'success'});
    }
    else if (request.action === 'updateNgWords') {
      updateCustomNgWords(request.customNgWords);
    }
    else if (request.action === 'updateSettings') {
      if (request.settings) {
        // 各設定を更新
        if (request.settings.customNgWords !== undefined) {
          updateCustomNgWords(request.settings.customNgWords);
        }
        if (request.settings.controlPanelVisible !== undefined) {
          controlPanelVisible = request.settings.controlPanelVisible;
          const panel = document.getElementById('ng-control-panel');
          if (panel) {
            if (controlPanelVisible) {
              panel.classList.remove('ng-panel-collapsed');
            } else {
              panel.classList.add('ng-panel-collapsed');
            }
          }
        }
      }
      sendResponse({status: 'success'});
    }
    else if (request.action === 'applyFilter') {
      if (isFilterActive) {
        processedElements.clear();
        processPage();
      }
      sendResponse({status: 'success'});
    }
    // トレンドデータのリクエストを処理
    else if (request.action === 'fetchTrendData') {
      log(`トレンドデータのリクエストを受信: カテゴリ=${request.category}, 期間=${request.period}`, 'debug');
      
      // 非同期でトレンドデータを収集
      collectTrendData(request.category, request.period)
        .then(data => {
          sendResponse({
            status: 'success',
            data: data
          });
        })
        .catch(error => {
          log(`トレンドデータ収集エラー: ${error.message}`, 'error');
          sendResponse({
            status: 'error',
            message: error.message
          });
        });
        
      return true; // 非同期レスポンスを有効化
    }
  } catch (e) {
    log(`メッセージハンドラでエラー: ${e.message}`, 'error');
    sendResponse({status: 'error', message: e.message});
  }
  
  return true;
});

// カスタムNGワードを更新する関数
function updateCustomNgWords(newWords) {
  customNgWords = newWords || [];
  
  // ローカルストレージに保存
  chrome.storage.local.set({customNgWords: customNgWords});
  
  // コントロールパネルのキーワードリストを更新
  updateKeywordList();
  
  // フィルタがアクティブならページを再処理
  if (isFilterActive) {
    processedElements.clear();
    processPage();
  }
}

// フィルタのオン/オフを切り替え
function toggleFilter() {
  isFilterActive = !isFilterActive;
  
  if (isFilterActive) {
    // フィルタをオン
    activateFilter();
    showStatusMessage('NGワードフィルタをオンにしました');
  } else {
    // フィルタをオフ
    deactivateFilter();
    showStatusMessage('NGワードフィルタをオフにしました');
  }
  
  // フィルタの状態を保存
  chrome.storage.local.set({isFilterActive: isFilterActive});
  
  // コントロールパネルを更新
  updateControlPanel();
}

// フィルタを有効化
function activateFilter() {
  // コントロールパネルの作成（まだなければ）
  if (!document.getElementById('ng-control-panel')) {
    createControlPanel();
  }
  
  // 現在のページを処理
  processPage();
  
  // 監視を開始
  startObserving();
  
  // 検索入力監視を開始
  if (!searchInputMonitored) {
    monitorSearchInput();
  }
}

// フィルタを無効化
function deactivateFilter() {
  // 監視を停止
  stopObserving();
  
  // ブロックされた商品を表示に戻す
  const blockedItems = document.querySelectorAll('.ng-blocked');
  
  blockedItems.forEach(function(item) {
    item.classList.remove('ng-blocked');
    item.removeAttribute('style');
  });
  
  // 親要素のスタイルをリセット
  const parentItems = document.querySelectorAll('.ng-parent-of-blocked');
  parentItems.forEach(function(item) {
    item.classList.remove('ng-parent-of-blocked');
    item.removeAttribute('style');
  });
  
  // 検索ボタンを有効化
  const disabledButtons = document.querySelectorAll('.ng-button-disabled');
  disabledButtons.forEach(function(button) {
    button.disabled = false;
    button.classList.remove('ng-button-disabled');
    button.removeAttribute('title');
  });
  
  // 警告表示を削除
  const warnings = document.querySelectorAll('.ng-warning');
  warnings.forEach(function(warning) {
    warning.remove();
  });
  
  // 処理済み記録をクリア
  processedElements.clear();
  
  // コントロールパネルを更新
  updateControlPanel();
  
  // カウントをリセット
  blockCount = 0;
}

// 商品を確実に非表示にする強化版
function forceHideElement(element) {
  // 既に処理済みならスキップ
  if (element.classList.contains('ng-blocked')) return;
  
  // 処理済み要素に追加
  processedElements.add(element);
  
  try {
    // クラスを追加
    element.classList.add('ng-blocked');
    
    // 要素を物理的に非表示にするスタイルを直接適用
    const hideStyles = `
      display: none !important; 
      visibility: hidden !important; 
      opacity: 0 !important; 
      height: 0 !important; 
      width: 0 !important; 
      position: absolute !important;
      pointer-events: none !important;
      clip: rect(0,0,0,0) !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      overflow: hidden !important;
      z-index: -9999 !important;
      max-height: 0 !important;
      max-width: 0 !important;
      min-height: 0 !important;
      min-width: 0 !important;
    `;
    element.setAttribute('style', hideStyles);
    
    // 親要素も処理（最大5階層まで）
    let parent = element.parentElement;
    for (let i = 0; parent && i < 5; i++) {
      parent.classList.add('ng-parent-of-blocked');
      parent.style.minHeight = '0';
      parent.style.height = 'auto';
      
      // 親も要素の変更を監視から除外
      processedElements.add(parent);
      
      parent = parent.parentElement;
    }
    
    // JavaScript経由で確実に非表示にする
    setTimeout(() => {
      if (element && element.style) {
        element.style.setProperty('display', 'none', 'important');
        element.style.setProperty('visibility', 'hidden', 'important');
        element.style.setProperty('opacity', '0', 'important');
        element.style.setProperty('height', '0', 'important');
        element.style.setProperty('width', '0', 'important');
        element.style.setProperty('position', 'absolute', 'important');
        element.style.setProperty('pointer-events', 'none', 'important');
        element.style.setProperty('z-index', '-9999', 'important');
        element.style.setProperty('max-height', '0', 'important');
        element.style.setProperty('max-width', '0', 'important');
        element.style.setProperty('min-height', '0', 'important');
        element.style.setProperty('min-width', '0', 'important');
      }
      
      // クリックイベントを無効化
      element.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }, true);
      
      // 子要素のイベントも無効化
      const allChildren = element.querySelectorAll('*');
      allChildren.forEach(child => {
        child.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }, true);
      });
    }, 0);
  } catch (e) {
    log(`要素の非表示処理中にエラー: ${e.message}`, 'error');
  }
}

// ページ処理メイン関数
function processPage() {
  // フィルタが無効なら何もしない
  if (!isFilterActive || isProcessing) {
    return;
  }
  
  // 処理中フラグを立てる
  isProcessing = true;
  
  try {
    // 現在のページに応じた処理
    if (window.location.href.includes('search')) {
      // 検索結果ページの場合
      setTimeout(() => {
        blockSearchResults();
        isProcessing = false;
      }, 100);
    } else if (window.location.href.includes('item/')) {
      // 商品詳細ページの場合
      setTimeout(() => {
        checkProductPage();
        isProcessing = false;
      }, 100);
    } else {
      // その他のページの場合（トップページやカテゴリページなど）
      setTimeout(() => {
        blockGeneralPage();
        isProcessing = false;
      }, 100);
    }
  } catch (e) {
    log(`ページ処理中にエラー: ${e.message}`, 'error');
    isProcessing = false;
  }
}

// メルカリの商品要素を取得するためのセレクター（大幅に強化）
function getItemSelectors() {
  return [
    // 検索結果ページの商品
    'li[data-testid="item-cell"]',
    'div[data-testid="item-cell"]',
    
    // カテゴリページの商品
    'article[data-testid^="item-"]',
    'a[data-testid="thumbnail-item-container"]',
    
    // 一般的な商品リンク
    'a[href*="/item/m"]',
    'div[class*="item-card"], div[class*="ItemCard"]',
    'div[class*="merItem"], div[class*="itemTile"]',
    
    // 商品コンテナ
    'div[class*="Product"], div[class*="product-"]',
    'div[class*="ItemContainer"], div[class*="item-container"]',
    
    // 他の可能性のあるセレクター
    '.merItemThumbnail',
    '.merItemCell',
    '.merItem',
    '.ItemView',
    '.merItemList > li',
    '.merItemList > div',
    '.search-result-item',
    '.item-box',
    '.item-cell',
    '.ListingCardItem',
    '.ItemCardRoot',
    '[data-jsx="merItemThumbnail"]'
  ].join(',');
}

// 商品タイトルを取得するためのセレクター
function getTitleSelectors() {
  return [
    '[data-testid="thumbnail-item-name"]',
    '.item-name',
    '.ItemName',
    '.item-title',
    '.item-label',
    '.item-text',
    '.Name',
    'h3',
    'h4'
  ].join(',');
}

// 一般ページの商品をブロックする関数
function blockGeneralPage() {
  if (!isFilterActive) return;

  // 商品カードの要素を取得（未処理のもの）
  const itemElements = Array.from(document.querySelectorAll(getItemSelectors()))
    .filter(item => !processedElements.has(item));
  
  // 一度に処理する要素数を制限
  const batchSize = CONFIG.batchSize;
  const totalItems = itemElements.length;
  
  // バッチ処理
  let blockedInBatch = 0;
  for (let i = 0; i < Math.min(batchSize, totalItems); i++) {
    const item = itemElements[i];
    
    try {
      // 処理済みとしてマーク
      processedElements.add(item);
      
      // 商品名を取得（複数の可能性があるセレクター対応）
      const titleElement = item.querySelector(getTitleSelectors());
      const itemTitle = titleElement ? titleElement.textContent : (item.textContent || '');
      
      // NGワードチェック
      if (containsNgWord(itemTitle)) {
        // 商品をブロック
        forceHideElement(item);
        
        // ブロックカウントを増やす
        blockCount++;
        blockedInBatch++;
      }
    } catch (e) {
      log(`商品処理中にエラー: ${e.message}`, 'error');
    }
  }
  
  // ブロック数を更新
  if (blockedInBatch > 0) {
    updateControlPanel();
  }
  
  // まだ処理していない要素がある場合は次のバッチを予約
  if (totalItems > batchSize && isFilterActive) {
    setTimeout(blockGeneralPage, 10);
  }
}

// 検索結果をブロックする関数
function blockSearchResults() {
  if (!isFilterActive) return;

  // 商品リストの要素を取得（未処理のもの）
  const itemElements = Array.from(document.querySelectorAll(getItemSelectors()))
    .filter(item => !processedElements.has(item));
  
  if (itemElements.length === 0) {
    return; // 商品が見つからない場合は終了
  }
  
  // 一度に処理する要素数を制限
  const batchSize = CONFIG.batchSize;
  const totalItems = itemElements.length;
  
  // バッチ処理
  let blockedInBatch = 0;
  for (let i = 0; i < Math.min(batchSize, totalItems); i++) {
    const item = itemElements[i];
    
    try {
      // 処理済みとしてマーク
      processedElements.add(item);
      
      // 商品名を取得（複数の可能性があるセレクター対応）
      const titleElement = item.querySelector(getTitleSelectors());
      const itemTitle = titleElement ? titleElement.textContent : (item.textContent || '');
      
      // NGワードチェック
      if (containsNgWord(itemTitle)) {
        // 商品をブロック
        forceHideElement(item);
        
        // ブロックカウントを増やす
        blockCount++;
        blockedInBatch++;
      }
    } catch (e) {
      log(`検索商品処理中にエラー: ${e.message}`, 'error');
    }
  }
  
  // ブロック数を更新
  if (blockedInBatch > 0) {
    updateControlPanel();
  }
  
  // まだ処理していない要素がある場合は次のバッチを予約
  if (totalItems > batchSize && isFilterActive) {
    setTimeout(blockSearchResults, 10);
  }
}

// 商品詳細ページをチェックする関数
function checkProductPage() {
  if (!isFilterActive) return;
  
  // 商品タイトル要素を取得
  const titleElement = document.querySelector('h1, [data-testid="name"]');
  if (!titleElement) {
    return;
  }
  
  const title = titleElement.textContent || '';
  
  // NGワードチェック
  if (containsNgWord(title)) {
    // 既存の警告を削除
    const existingWarning = document.querySelector('.ng-product-warning');
    if (existingWarning) existingWarning.remove();
    
    // 警告メッセージを表示
    showNgProductWarning();
    
    // ブロックカウントを増やす
    if (!document.body.classList.contains('ng-counted')) {
      blockCount++;
      document.body.classList.add('ng-counted');
      updateControlPanel();
    }
  }
}

// NGワード商品ページの警告を表示
function showNgProductWarning() {
  // オーバーレイを作成
  const overlay = document.createElement('div');
  overlay.className = 'ng-search-warning';
  
  // 内容を作成
  overlay.innerHTML = `
    <div class="ng-search-warning-content">
      <div class="ng-search-warning-title">NGワードが含まれる商品ページです</div>
      <div class="ng-search-warning-message">
        この商品にはNGワードが含まれています。<br>
        メルカリのトップページに戻ります。
      </div>
      <button class="ng-search-warning-button">OK</button>
    </div>
  `;
  
  // ボディに追加
  document.body.appendChild(overlay);
  
  // OKボタンにイベントリスナーを追加
  overlay.querySelector('.ng-search-warning-button').addEventListener('click', () => {
    window.location.href = CONFIG.homeUrl;
  });
  
  // 自動リダイレクト
  setTimeout(() => {
    window.location.href = CONFIG.homeUrl;
  }, CONFIG.redirectDelay);
}

// NGワードが含まれているかチェックする関数
function containsNgWord(text) {
  if (!text) {
    return false;
  }
  
  // テキストを小文字に変換して比較
  const lowerText = text.toLowerCase();
  
  // デフォルトNGワードチェック
  for (let i = 0; i < lowerCaseNgWords.length; i++) {
    if (lowerText.includes(lowerCaseNgWords[i])) {
      return true;
    }
  }
  
  // カスタムNGワードチェック
  for (let i = 0; i < customNgWords.length; i++) {
    const lowerCustomWord = customNgWords[i].toLowerCase();
    if (lowerText.includes(lowerCustomWord)) {
      return true;
    }
  }
  
  return false;
}

// 監視を開始
function startObserving() {
  if (observer) {
    // 既に監視中なら何もしない
    return;
  }
  
  // MutationObserverの設定
  observer = new MutationObserver(function(mutations) {
    // DOM変更が検出されるたびに呼び出される
    
    // 短時間に複数回の呼び出しを防ぐ（デバウンス処理）
    if (observerTimeout) {
      clearTimeout(observerTimeout);
    }
    
    observerTimeout = setTimeout(function() {
      // 有意義な変更かどうかをチェック
      let significantChanges = false;
      
      for (const mutation of mutations) {
        // 新しい商品要素が追加された場合
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // 追加されたノードがHTMLElement（DOMノード）であるものだけを確認
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 商品関連の要素が含まれているか確認
              if ((node.querySelector && node.querySelector(getItemSelectors())) || 
                  (node.matches && node.matches(getItemSelectors()))) {
                significantChanges = true;
                break;
              }
              
              // 商品要素が多数ある場合の追加チェック
              if (node.querySelector && (
                  node.querySelectorAll('a[href*="/item"]').length > 0 ||
                  node.querySelectorAll('[class*="item"]').length > 3 ||
                  node.querySelectorAll('[class*="Item"]').length > 3
              )) {
                significantChanges = true;
                break;
              }
            }
          }
          if (significantChanges) break;
        }
        
        // URLが変わった場合も意味のある変更
        if (lastUrl !== location.href) {
          lastUrl = location.href;
          significantChanges = true;
          break;
        }
      }
      
      // 意味のある変更があった場合のみ処理を実行
      if (significantChanges && isFilterActive) {
        processPage();
      }
      
      observerTimeout = null;
    }, CONFIG.observerDebounce);
  });
  
  // 監視設定（本文全体を監視）
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });
}

// 監視を停止
function stopObserving() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  
  if (observerTimeout) {
    clearTimeout(observerTimeout);
    observerTimeout = null;
  }
}

// 検索入力フィールドの監視
function monitorSearchInput() {
  // 検索要素の取得をより堅牢に
  function getSearchElements() {
    const searchInput = document.querySelector('input[type="search"]') || 
                      document.querySelector('input[placeholder*="検索"]') ||
                      document.querySelector('input[placeholder*="キーワード"]') ||
                      document.querySelector('form input[type="text"]');
    
    const searchForm = searchInput ? searchInput.closest('form') : null;
    
    const searchButton = searchForm ? 
                      (searchForm.querySelector('button[type="submit"]') || 
                        searchForm.querySelector('button')) : null;
    
    return { searchInput, searchForm, searchButton };
  }
  
  // 検索要素を取得
  let { searchInput, searchForm, searchButton } = getSearchElements();
  
  if (searchInput) {
    // 入力時にリアルタイムでボタン状態を更新
    searchInput.addEventListener('input', function(e) {
      if (!isFilterActive) return;
      
      const value = e.target.value;
      
      // NGワードチェック
      if (containsNgWord(value)) {
        // 警告表示
        showSearchWarning(value);
        
        // 入力値をクリア
        e.target.value = '';
      }
    });
    
    // フォーム送信時のチェック
    if (searchForm) {
      searchForm.addEventListener('submit', function(e) {
        if (!isFilterActive) return;
        
        const value = searchInput.value;
        if (containsNgWord(value)) {
          // 検索を防止
          e.preventDefault();
          e.stopPropagation();
          
          // 警告表示
          showSearchWarning(value);
          
          return false;
        }
      });
    }
    
    searchInputMonitored = true;
    log('検索入力の監視を開始しました', 'debug');
  } else {
    // 検索入力フィールドが見つからない場合は後で再試行
    setTimeout(monitorSearchInput, 1000);
  }
}

// NGワード検索の警告表示
function showSearchWarning(keyword) {
  // オーバーレイを作成
  const overlay = document.createElement('div');
  overlay.className = 'ng-search-warning';
  
  // 内容を作成
  overlay.innerHTML = `
    <div class="ng-search-warning-content">
      <div class="ng-search-warning-title">NGワードが含まれています</div>
      <div class="ng-search-warning-message">
        検索キーワードにNGワードが含まれているため、<br>
        検索を中止しました。<br>
        メルカリのトップページに移動します。
      </div>
      <button class="ng-search-warning-button">OK</button>
    </div>
  `;
  
  // ボディに追加
  document.body.appendChild(overlay);
  
  // OKボタンにイベントリスナーを追加
  overlay.querySelector('.ng-search-warning-button').addEventListener('click', () => {
    overlay.remove();
    window.location.href = CONFIG.homeUrl;
  });
  
  // 自動リダイレクト
  setTimeout(() => {
    window.location.href = CONFIG.homeUrl;
  }, CONFIG.redirectDelay);
}

// ステータスメッセージを表示
function showStatusMessage(message) {
  // 既存のメッセージがあれば削除
  const existingMessage = document.querySelector('.ng-status-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // メッセージ要素を作成
  const messageDiv = document.createElement('div');
  messageDiv.className = 'ng-status-message';
  messageDiv.textContent = message;
  
  // ボディに追加
  document.body.appendChild(messageDiv);
  
  // 3秒後に消える
  setTimeout(function() {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 3000);
}

// URL変更を検知するための監視
window.addEventListener('popstate', function() {
  if (isFilterActive) {
    lastUrl = location.href;
    setTimeout(() => {
      processedElements.clear();
      processPage();
    }, 100);
  }
});

// パネルがドラッグされた時に常時表示タブも移動させる
document.addEventListener('mousemove', function(e) {
  // ドラッグ中にパネルの位置が変わった場合
  const panel = document.getElementById('ng-control-panel');
  const permanentTab = document.getElementById('ng-permanent-toggle');
  
  if (panel && permanentTab) {
    const panelTop = parseInt(window.getComputedStyle(panel).top) || 100;
    permanentTab.style.top = (panelTop + 10) + 'px';
  }
});

// DOMの監視
let panelEnhanceInterval = null;

// パネルが生成された後に拡張機能を適用
function initPanelEnhancement() {
  // 定期的にチェック（パネルが後から生成される場合のため）
  if (!panelEnhanceInterval) {
    panelEnhanceInterval = setInterval(function() {
      const panel = document.getElementById('ng-control-panel');
      const permanentTab = document.getElementById('ng-permanent-toggle');
      
      // パネルがあってタブがまだなければ拡張する
      if (panel && !permanentTab) {
        createPermanentToggleTab();
      }
    }, 1000);
    
    // 一定時間後に監視を停止（10秒後）
    setTimeout(function() {
      if (panelEnhanceInterval) {
        clearInterval(panelEnhanceInterval);
        panelEnhanceInterval = null;
      }
    }, 10000);
  }
}

// トレンドデータを収集する関数
async function collectTrendData(category, period) {
  try {
    // 1. 人気商品データの取得（カテゴリ別）
    const trendItems = await fetchPopularItems(category, period);
    
    // 2. データを整形して返す
    return {
      category: getCategoryName(category),
      period: getPeriodName(period),
      timestamp: new Date().toISOString(),
      items: trendItems
    };
  } catch (error) {
    log(`トレンドデータ収集プロセスでエラー: ${error.message}`, 'error');
    throw error;
  }
}

// 実際のメルカリページからデータを収集する関数
async function fetchPopularItems(category, period) {
  // 検索パラメータの構築
  const params = new URLSearchParams();
  
  // カテゴリ指定
  if (category !== 'all') {
    params.append('category_id', category);
  }
  
  // 並べ替え（人気順）
  params.append('sort', 'popular');
  
  // 期間指定（API実装によるが、モックとしてパラメータ追加）
  if (period === 'weekly') {
    params.append('time_span', '7d');
  } else if (period === 'monthly') {
    params.append('time_span', '30d');
  }
  
  try {
    // メルカリの検索結果ページからデータを取得
    let items = [];
    
    // 現在のページがメルカリならそのページから情報収集を試みる
    if (window.location.hostname.includes('mercari.com')) {
      // 現在表示されている商品アイテムを取得
      items = await extractVisibleItems();
      
      // 十分なアイテムが取得できない場合は検索APIからも取得
      if (items.length < 10) {
        const apiItems = await fetchItemsFromAPI(params);
        
        // 重複を避けつつマージ
        const existingIds = new Set(items.map(item => item.id));
        for (const item of apiItems) {
          if (!existingIds.has(item.id)) {
            items.push(item);
            existingIds.add(item.id);
          }
        }
      }
    } else {
      // メルカリのページが開かれていない場合はAPIからのみ取得
      items = await fetchItemsFromAPI(params);
    }
    
    // アイテム数を制限（最大20個）
    return items.slice(0, 20);
  } catch (error) {
    log(`商品データ取得エラー: ${error.message}`, 'error');
    
    // エラー時はデモデータを返す
    return generateMockItems(category, period);
  }
}

// 現在表示されているページから商品情報を抽出
async function extractVisibleItems() {
  try {
    const items = [];
    
    // 商品アイテム要素を取得
    const itemElements = document.querySelectorAll(
      'li[data-testid="item-cell"], div[data-testid="item-cell"], a[data-testid="thumbnail-item-container"]'
    );
    
    // 各アイテムを処理
    for (const element of itemElements) {
      try {
        // 商品ID（URLから抽出）
        let id = '';
        const linkElement = element.querySelector('a[href*="/item/"]') || element;
        if (linkElement.href) {
          const match = linkElement.href.match(/\/item\/([^/?]+)/);
          if (match) id = match[1];
        }
        
        // 商品名
        const nameElement = element.querySelector('.item-name, [data-testid="thumbnail-item-name"]');
        const name = nameElement ? nameElement.textContent.trim() : '';
        
        // 価格
        const priceElement = element.querySelector('.item-price, [data-testid="price"]');
        const priceText = priceElement ? priceElement.textContent.trim() : '';
        const price = priceText.replace(/[^0-9]/g, '');
        
        // 画像URL
        const imgElement = element.querySelector('img');
        const imageUrl = imgElement ? imgElement.src : '';
        
        // カテゴリ（ページ内では取得困難なため仮設定）
        let category = '不明';
        const categoryElement = element.querySelector('.item-category');
        if (categoryElement) {
          category = categoryElement.textContent.trim();
        }
        
        // 必須項目があれば追加
        if (id && name && price) {
          items.push({
            id,
            name,
            price: formatPrice(price),
            imageUrl,
            category,
            date: new Date().toISOString(),
            views: Math.floor(Math.random() * 2000) + 500, // ダミーデータ
            watchCount: Math.floor(Math.random() * 100) + 10 // ダミーデータ
          });
        }
      } catch (error) {
        log(`アイテム抽出エラー: ${error.message}`, 'error');
      }
    }
    
    return items;
  } catch (error) {
    log(`ページからのアイテム抽出でエラー: ${error.message}`, 'error');
    return [];
  }
}

// APIから商品情報を取得（モック実装）
async function fetchItemsFromAPI(params) {
  // 注: 実際にはメルカリのAPIを使いますが、この例ではモックデータを返します
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(generateMockItems());
    }, 500);
  });
}

// モック商品データを生成
function generateMockItems() {
  const items = [
    { name: 'Apple AirPods Pro', category: '家電・スマホ', price: '18,500', views: 2450, watchCount: 152 },
    { name: 'Nintendo Switch 有機ELモデル', category: 'ゲーム', price: '32,800', views: 2190, watchCount: 143 },
    { name: 'ノースフェイス ダウンジャケット', category: 'メンズ', price: '15,900', views: 1980, watchCount: 129 },
    { name: 'PlayStation 5', category: 'ゲーム', price: '54,800', views: 1870, watchCount: 121 },
    { name: 'iPad Pro 11インチ', category: '家電・スマホ', price: '78,000', views: 1760, watchCount: 115 },
    { name: 'ダイソン ヘアドライヤー', category: '家電・スマホ', price: '29,800', views: 1650, watchCount: 108 },
    { name: 'ルイヴィトン ショルダーバッグ', category: 'レディース', price: '85,000', views: 1540, watchCount: 100 },
    { name: 'シャネル 香水', category: 'コスメ・美容', price: '9,800', views: 1430, watchCount: 93 },
    { name: 'ナイキ エアジョーダン', category: 'スポーツ', price: '12,500', views: 1320, watchCount: 86 },
    { name: 'アニヤハインドマーチ トートバッグ', category: 'レディース', price: '22,800', views: 1210, watchCount: 79 },
    { name: 'ロレックス デイトジャスト', category: 'メンズ', price: '950,000', views: 1100, watchCount: 72 },
    { name: 'キッチンエイド ミキサー', category: '家電', price: '35,800', views: 990, watchCount: 65 },
    { name: 'チャムス フリースジャケット', category: 'アウトドア', price: '8,900', views: 880, watchCount: 57 },
    { name: 'ゼルダの伝説 ティアーズオブキングダム', category: 'ゲーム', price: '5,980', views: 770, watchCount: 50 },
    { name: 'BOSE ワイヤレスイヤホン', category: '家電', price: '22,000', views: 660, watchCount: 43 },
    { name: 'アディダス スタンスミス', category: 'スポーツ', price: '9,800', views: 550, watchCount: 36 },
    { name: '無印良品 収納ケース', category: 'インテリア', price: '2,500', views: 440, watchCount: 29 },
    { name: 'ドラゴンボール フィギュア', category: 'ホビー', price: '4,800', views: 330, watchCount: 22 },
    { name: 'ユニクロ ヒートテック', category: 'メンズ', price: '1,200', views: 220, watchCount: 14 },
    { name: 'コールマン テント', category: 'アウトドア', price: '18,900', views: 110, watchCount: 7 }
  ];
  
  // 日付のランダムなばらつきを追加
  const today = new Date();
  return items.map((item, index) => {
    // ランダムな分と秒を生成
    const randomMinutes = Math.floor(Math.random() * 59);
    const randomSeconds = Math.floor(Math.random() * 59);
    const randomHours = Math.floor(Math.random() * 6); // 最近の6時間以内
    
    // 日付を設定
    const date = new Date(today);
    date.setHours(today.getHours() - randomHours);
    date.setMinutes(randomMinutes);
    date.setSeconds(randomSeconds);
    
    // ユニークIDを生成
    const randomId = 'm' + Math.floor(Math.random() * 1000000000);
    
    return {
      id: randomId,
      ...item,
      date: date.toISOString()
    };
  });
}

// 価格を表示用にフォーマット
function formatPrice(price) {
  if (!price) return '0';
  
  // 数値として処理
  if (typeof price === 'number') {
    return price.toLocaleString();
  }
  
  // 文字列の場合
  if (typeof price === 'string') {
    // 既にカンマ形式なら返す
    if (price.includes(',')) return price;
    
    // 数字のみの場合はカンマ区切りに
    return parseInt(price).toLocaleString();
  }
  
  return '0';
}

// カテゴリIDから名前を取得
function getCategoryName(categoryId) {
  const categories = {
    'all': 'すべてのカテゴリ',
    '1': 'レディース',
    '2': 'メンズ',
    '3': 'ベビー・キッズ',
    '4': 'インテリア・住まい',
    '5': '本・音楽・ゲーム',
    '6': 'おもちゃ・ホビー',
    '7': 'コスメ・香水・美容',
    '8': '家電・スマホ・カメラ',
    '9': 'スポーツ・レジャー',
    '10': 'ハンドメイド',
    '11': '自動車・バイク',
    '12': 'その他'
  };
  
  return categories[categoryId] || 'すべてのカテゴリ';
}

// 期間IDから名前を取得
function getPeriodName(periodId) {
  const periods = {
    'daily': '24時間',
    'weekly': '1週間',
    'monthly': '1ヶ月'
  };
  
  return periods[periodId] || '24時間';
}

// 初期化: ページロード時の処理
window.addEventListener('load', function() {
  // ストレージから設定を読み込み
  chrome.storage.local.get(
    ['isFilterActive', 'customNgWords', 'controlPanelVisible'], 
    function(result) {
      // フィルタの有効/無効状態を復元
      if (result.isFilterActive !== undefined) {
        isFilterActive = result.isFilterActive;
      }
      
      // カスタムNGワードを復元
      if (result.customNgWords && Array.isArray(result.customNgWords)) {
        customNgWords = result.customNgWords;
      }
      
      // コントロールパネル表示状態を復元
      if (result.controlPanelVisible !== undefined) {
        controlPanelVisible = result.controlPanelVisible;
      }
      
      // コントロールパネルを作成
      createControlPanel();
      
      // パネル拡張機能の初期化
      initPanelEnhancement();
      
      // フィルタがアクティブなら初期処理を実行
      if (isFilterActive) {
        activateFilter();
      }
      
      log(`メルカリNGワードブロッカー: 初期化完了（フィルター${isFilterActive ? '有効' : '無効'}）`, 'info');
    }
  );
});

// すでにDOMが読み込まれている場合も実行
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  log(`メルカリNGワードブロッカー: 準備完了（フィルター${isFilterActive ? '有効' : '無効'}）`, 'info');
}