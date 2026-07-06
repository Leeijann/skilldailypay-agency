param([switch]$Silent)
$ErrorActionPreference = "Continue"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$tokenFile = Join-Path $here "fb-token.txt"
$linksFile = Join-Path $here "links.txt"
$logFile   = Join-Path $here "posted-log.txt"
if (Test-Path $tokenFile) { $ut = (Get-Content $tokenFile -Raw).Trim() }
elseif (-not $Silent) { $ut = Read-Host "Paste your Facebook token (asked only once)"; Set-Content $tokenFile $ut }
else { Write-Host "No token saved. Run once manually first."; exit 1 }
if (-not (Test-Path $linksFile)) { Set-Content $linksFile "ghl=https://affiliate.gohighlevel.com?sref=kozaykj" }
$links = @{}
Get-Content $linksFile | ForEach-Object { if ($_ -match "^\s*([a-z0-9]+)\s*=\s*(https?://\S+)") { $links[$Matches[1]] = $Matches[2] } }
$pages = @(
  @{ key="fashion"; id="110264651436978"; name="Leeijann Design"; products=@(
      @{ id="aliexpress"; pain="overpaying retail for pieces that come from the same factories"; dream="the exact look for a third of the price"; proof="millions of buyer photo reviews to check before you order" },
      @{ id="shein"; pain="wanting the look without the designer price tag"; dream="a full outfit refresh for the price of one department store top"; proof="the finds are unreal when you know where to look" },
      @{ id="945"; pain="the same mass produced stuff everybody else has"; dream="pieces that make your whole setup stand out"; proof="I get these direct so the pricing stays right" }
  )},
  @{ key="grooming"; id="112057537294624"; name="Smooth CUT Barbershop"; products=@(
      @{ id="beardkit"; pain="a dry patchy beard doing you no favors"; dream="walking in the room with fresh cut confidence every single day"; proof="the right kit changes everything, ask any barber" },
      @{ id="selfcut"; pain="forty dollars every two weeks and still waiting an hour at the shop"; dream="a crispy lineup at home any night before any event"; proof="the mirror system the pros recommend for home cuts" },
      @{ id="beardoil"; pain="itchy flaky beard making you want to shave it all off"; dream="the beard that gets compliments from strangers"; proof="small batch oils made by actual barbers" }
  )},
  @{ key="mmo"; id="119491680317834"; name="Skill Sprint"; products=@(
      @{ id="ghl"; pain="paying for six different tools just to run one business"; dream="trying the exact platform I run my brands on, free for 14 days, funnels, follow ups and booking in one place"; proof="a zero risk yes, cancel anytime inside the trial" },
      @{ id="skillshare"; pain="wanting to learn a money making skill but tutorials are scattered everywhere"; dream="one month of unlimited classes and a real skill you can charge for"; proof="the free trial makes it a zero risk yes" },
      @{ id="fiverr"; pain="doing everything yourself and burning out"; dream="a fifteen dollar freelancer handling what eats your whole weekend"; proof="I stopped trading my Saturdays for tasks somebody else loves doing" }
  )}
)
$frameworks = @(
  { param($p,$l) "#ad | Real talk: $($p.pain). Most people just accept it, day after day. But imagine this instead, $($p.dream). That is not a fantasy, that is a decision. $($p.proof). $l" },
  { param($p,$l) "#ad | Somebody asked me how I stay consistent. Truth is I stopped tolerating $($p.pain). Now? $($p.dream). $($p.proof). Your move. $l" },
  { param($p,$l) "#ad | Nobody is coming to fix $($p.pain) for you. That is the hard truth. But you are one decision away from $($p.dream). $($p.proof). The people who win move when the door opens. $l" }
)
$day = [int]([DateTime]::UtcNow - [DateTime]"2026-01-01").TotalDays
try { $acc = Invoke-RestMethod "https://graph.facebook.com/v21.0/me/accounts?access_token=$ut" }
catch { Write-Host "TOKEN FAILED - delete fb-token.txt and run again with a fresh token" -ForegroundColor Red; exit 1 }
foreach ($pg in $pages) {
  $fb = $acc.data | Where-Object { $_.id -eq $pg.id }
  if (-not $fb) { Write-Host "SKIP $($pg.name): token cannot see this page" -ForegroundColor Yellow; continue }
  $prod = $pg.products[$day % $pg.products.Count]
  $fw   = $frameworks[($day + [array]::IndexOf($pages,$pg)) % $frameworks.Count]
  $link = if ($links[$prod.id]) { "Here: " + $links[$prod.id] } else { "Link in the comments." }
  $msg  = & $fw $prod $link
  try {
    $r = Invoke-RestMethod -Method Post -Uri "https://graph.facebook.com/v21.0/$($pg.id)/feed" -Body @{ message=$msg; access_token=$fb.access_token }
    $line = "$(Get-Date -Format s) POSTED $($pg.name) [$($prod.id)] $($r.id)"
    Write-Host $line -ForegroundColor Green; Add-Content $logFile $line
  } catch {
    $err = try { (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch { $_.Exception.Message }
    $line = "$(Get-Date -Format s) FAILED $($pg.name): $err"
    Write-Host $line -ForegroundColor Red; Add-Content $logFile $line
  }
}
$liTokFile = Join-Path $here "li-token.txt"
if (Test-Path $liTokFile) {
  $lt = (Get-Content $liTokFile -Raw).Trim()
  $liMsgs = @(
    "Running three brands taught me something nobody tells you: the tool stack is the silent killer. I was paying for six platforms before I moved everything, funnels, follow ups, booking, into one. If you are building something, simplify first. The platform I use has a 14 day free trial, link in the comments of my page or here: https://affiliate.gohighlevel.com?sref=kozaykj #ad",
    "The best operational decision I made this year was consolidating my tools. One dashboard instead of six logins. One bill instead of six. If you run a small business or a side venture, audit your stack this week, you are probably overpaying. This is what I consolidated onto, free to try for 14 days: https://affiliate.gohighlevel.com?sref=kozaykj #ad",
    "Advice I would give anyone starting an online business in 2026: do not build your operation on six disconnected tools. Pick one platform that does funnels, CRM and booking together, and learn it deeply. I use this one daily and it has a 14 day free trial: https://affiliate.gohighlevel.com?sref=kozaykj #ad"
  )
  $liMsg = $liMsgs[$day % $liMsgs.Count]
  try {
    $meLi = Invoke-RestMethod "https://api.linkedin.com/v2/userinfo" -Headers @{Authorization="Bearer $lt"}
    $bLi = @{ author="urn:li:person:$($meLi.sub)"; lifecycleState="PUBLISHED"; specificContent=@{ "com.linkedin.ugc.ShareContent"=@{ shareCommentary=@{ text=$liMsg }; shareMediaCategory="NONE" } }; visibility=@{ "com.linkedin.ugc.MemberNetworkVisibility"="PUBLIC" } } | ConvertTo-Json -Depth 6
    $rLi = Invoke-RestMethod -Method Post -Uri "https://api.linkedin.com/v2/ugcPosts" -Headers @{Authorization="Bearer $lt";"X-Restli-Protocol-Version"="2.0.0";"Content-Type"="application/json"} -Body $bLi
    $line = "$(Get-Date -Format s) POSTED LinkedIn $($rLi.id)"; Write-Host $line -ForegroundColor Green; Add-Content $logFile $line
  } catch {
    $line = "$(Get-Date -Format s) FAILED LinkedIn (token expired? regenerate and replace li-token.txt)"; Write-Host $line -ForegroundColor Red; Add-Content $logFile $line
  }
}
$baFile = Join-Path (Join-Path $env:USERPROFILE "Downloads") "blogger-auth.json"
$bq = Join-Path (Join-Path $env:USERPROFILE "Downloads") "blog-queue"
$bp = Join-Path (Join-Path $env:USERPROFILE "Downloads") "blog-posted"
$dow = (Get-Date).DayOfWeek
if ((Test-Path $baFile) -and ($dow -in "Monday","Thursday")) {
  $art = Get-ChildItem $bq -Filter *.txt | Sort-Object Name | Select-Object -First 1
  if ($art) {
    try {
      $a = Get-Content $baFile -Raw | ConvertFrom-Json
      $tk = (Invoke-RestMethod -Method Post -Uri "https://oauth2.googleapis.com/token" -Body @{client_id=$a.client_id;client_secret=$a.client_secret;refresh_token=$a.refresh_token;grant_type="refresh_token"}).access_token
      $parts = (Get-Content $art.FullName -Raw) -split "\|\|\|",2
      $bj = @{ title=$parts[0].Trim(); content=$parts[1] } | ConvertTo-Json
      $rB = Invoke-RestMethod -Method Post -Uri ("https://www.googleapis.com/blogger/v3/blogs/" + $a.blog_id + "/posts/") -Headers @{Authorization="Bearer $tk";"Content-Type"="application/json"} -Body $bj
      Move-Item $art.FullName $bp
      $line = "$(Get-Date -Format s) POSTED Blog: $($rB.url)"; Write-Host $line -ForegroundColor Green; Add-Content $logFile $line
    } catch { $line = "$(Get-Date -Format s) FAILED Blog: $($_.ErrorDetails.Message)"; Write-Host $line -ForegroundColor Red; Add-Content $logFile $line }
  } else { Add-Content $logFile "$(Get-Date -Format s) Blog queue EMPTY - ask Claude for a refill" }
}
if (-not $Silent) { Read-Host "Done. Press ENTER to close" }


